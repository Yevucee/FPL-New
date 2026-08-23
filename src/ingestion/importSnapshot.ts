import { and, eq, ne, notInArray } from "drizzle-orm";

import type { LeagueSnapshot } from "@/contracts/snapshot";
import { db } from "@/db/client";
import {
  entryEventResults,
  events,
  leagues,
  managers,
  seasonEntries,
  seasons,
  syncRuns,
} from "@/db/schema";
import type { FantasyDataProvider } from "@/providers/types";

export interface ImportCounts {
  inserted: number;
  updated: number;
  skipped: number;
  failed: number;
  /** Live imports only — managers no longer in the FPL league snapshot. */
  removed: number;
}

export type ImportSnapshotMode = "live" | "history";

export interface ImportSnapshotOptions {
  /** `live` activates the season and archives other active seasons. `history` writes summary archives only. */
  mode?: ImportSnapshotMode;
  /** Override sync_runs.scope (e.g. schedule:post-deadline-gw1). */
  scope?: string;
}

/**
 * Idempotent league import (specification section 8).
 *
 * Every write is an upsert keyed by a unique constraint, so importing the same
 * snapshot twice produces no duplicates. A sync_run row records the outcome and
 * is visible to the admin area.
 */
export async function importSnapshot(
  provider: FantasyDataProvider,
  options: ImportSnapshotOptions = {},
): Promise<ImportCounts> {
  const mode = options.mode ?? "live";
  const defaultScope = mode === "history" ? "league-history" : "league-current";
  const scope = options.scope ?? defaultScope;
  const correlationId = crypto.randomUUID();
  const [run] = await db
    .insert(syncRuns)
    .values({
      provider: provider.name,
      scope,
      status: "running",
      correlationId,
      codeVersion: process.env.GIT_SHA ?? "dev",
    })
    .returning();

  const counts: ImportCounts = {
    inserted: 0,
    updated: 0,
    skipped: 0,
    failed: 0,
    removed: 0,
  };

  try {
    const snapshot = await provider.getLeagueSnapshot();
    await applySnapshot(snapshot, counts, mode);

    await db
      .update(syncRuns)
      .set({
        status: "succeeded",
        finishedAt: new Date(),
        inserted: counts.inserted,
        updated: counts.updated,
        skipped: counts.skipped,
        failed: counts.failed,
      })
      .where(eq(syncRuns.id, run!.id));

    return counts;
  } catch (err) {
    await db
      .update(syncRuns)
      .set({
        status: "failed",
        finishedAt: new Date(),
        errorSummary: err instanceof Error ? err.message : String(err),
      })
      .where(eq(syncRuns.id, run!.id));
    throw err;
  }
}

async function applySnapshot(
  snapshot: LeagueSnapshot,
  counts: ImportCounts,
  mode: ImportSnapshotMode = "live",
): Promise<void> {
  const seasonState = mode === "history" ? "archived-summary" : "active";

  if (mode === "live") {
    await db
      .update(seasons)
      .set({ state: "archived" })
      .where(and(eq(seasons.state, "active"), ne(seasons.name, snapshot.season.name)));
  }

  const [season] = await db
    .insert(seasons)
    .values({
      name: snapshot.season.name,
      providerId: snapshot.season.providerId ?? null,
      startEvent: snapshot.season.startEvent,
      state: seasonState,
    })
    .onConflictDoUpdate({
      target: seasons.name,
      set: {
        providerId: snapshot.season.providerId ?? null,
        ...(mode === "live"
          ? { state: "active" as const }
          : { state: "archived-summary" as const }),
      },
    })
    .returning();

  const [league] = await db
    .insert(leagues)
    .values({
      slug: snapshot.league.slug,
      name: snapshot.league.name,
      providerId: snapshot.league.providerId ?? null,
      visibility: snapshot.league.visibility,
      timezone: snapshot.league.timezone,
    })
    .onConflictDoUpdate({
      target: leagues.slug,
      set: {
        name: snapshot.league.name,
        visibility: snapshot.league.visibility,
        providerId: snapshot.league.providerId ?? null,
      },
    })
    .returning();

  // Events
  const eventIdByNumber = new Map<number, string>();
  for (const ev of snapshot.events) {
    const [row] = await db
      .insert(events)
      .values({
        seasonId: season!.id,
        eventNumber: ev.eventNumber,
        deadline: ev.deadline ? new Date(ev.deadline) : null,
        phase: ev.phase,
        phaseName: ev.phaseName ?? null,
        finished: ev.finished,
        checked: ev.checked,
        sealed: ev.finished && ev.checked,
      })
      .onConflictDoUpdate({
        target: [events.seasonId, events.eventNumber],
        set: {
          deadline: ev.deadline ? new Date(ev.deadline) : null,
          phase: ev.phase,
          phaseName: ev.phaseName ?? null,
          finished: ev.finished,
          checked: ev.checked,
          sealed: ev.finished && ev.checked,
        },
      })
      .returning();
    eventIdByNumber.set(ev.eventNumber, row!.id);
    counts.updated += 1;
  }

  // Entries + results
  for (const entry of snapshot.entries) {
    const manager = await upsertManager(entry.managerName);
    const entryMeta = entry as {
      overallFplRank?: number | null;
      careerBestSeason?: string | null;
      careerBestPoints?: number | null;
      seasonTransfers?: number | null;
    };

    const [entryRow] = await db
      .insert(seasonEntries)
      .values({
        seasonId: season!.id,
        leagueId: league!.id,
        managerId: manager.id,
        provider: snapshot.provider,
        providerEntryId: entry.providerEntryId,
        teamName: entry.teamName,
        joinEvent: entry.joinEvent,
        overallFplRank: entryMeta.overallFplRank ?? null,
        careerBestSeason: entryMeta.careerBestSeason ?? null,
        careerBestPoints: entryMeta.careerBestPoints ?? null,
        seasonTransfers: entryMeta.seasonTransfers ?? null,
      })
      .onConflictDoUpdate({
        target: [
          seasonEntries.seasonId,
          seasonEntries.provider,
          seasonEntries.providerEntryId,
        ],
        set: {
          teamName: entry.teamName,
          joinEvent: entry.joinEvent,
          overallFplRank: entryMeta.overallFplRank ?? null,
          careerBestSeason: entryMeta.careerBestSeason ?? null,
          careerBestPoints: entryMeta.careerBestPoints ?? null,
          seasonTransfers: entryMeta.seasonTransfers ?? null,
        },
      })
      .returning();

    for (const r of entry.results) {
      const eventId = eventIdByNumber.get(r.eventNumber);
      if (!eventId) {
        counts.skipped += 1;
        continue;
      }
      const resultMeta = r as {
        captainName?: string | null;
        captainPoints?: number | null;
        benchBoostPoints?: number | null;
      };
      await db
        .insert(entryEventResults)
        .values({
          seasonEntryId: entryRow!.id,
          eventId,
          netPoints: r.netPoints,
          grossPoints: r.grossPoints,
          transferCost: r.transferCost,
          totalPoints: r.totalPoints,
          benchPoints: r.benchPoints,
          benchBoostPoints: resultMeta.benchBoostPoints ?? null,
          chip: r.chip ?? null,
          captainName: resultMeta.captainName ?? null,
          captainPoints: resultMeta.captainPoints ?? null,
          teamValue: r.teamValue ?? null,
          bank: r.bank ?? null,
        })
        .onConflictDoUpdate({
          target: [entryEventResults.seasonEntryId, entryEventResults.eventId],
          set: {
            netPoints: r.netPoints,
            grossPoints: r.grossPoints,
            transferCost: r.transferCost,
            totalPoints: r.totalPoints,
            benchPoints: r.benchPoints,
            benchBoostPoints: resultMeta.benchBoostPoints ?? null,
            chip: r.chip ?? null,
            captainName: resultMeta.captainName ?? null,
            captainPoints: resultMeta.captainPoints ?? null,
            teamValue: r.teamValue ?? null,
            bank: r.bank ?? null,
          },
        });
      counts.updated += 1;
    }
  }

  // Drop managers who left the league (or stale dev/fixture rows). Upserts above
  // still add new joiners on every sync — this only removes IDs absent from FPL.
  // History imports also prune entries removed from reconstructed/official snapshots
  // (e.g. first-time joiners who should not appear in past seasons).
  if (snapshot.entries.length > 0) {
    const currentEntryIds = snapshot.entries.map((entry) => entry.providerEntryId);
    const removed = await db
      .delete(seasonEntries)
      .where(
        and(
          eq(seasonEntries.seasonId, season!.id),
          eq(seasonEntries.leagueId, league!.id),
          notInArray(seasonEntries.providerEntryId, currentEntryIds),
        ),
      )
      .returning({ id: seasonEntries.id });
    if (mode === "live") {
      counts.removed = removed.length;
    }
  }
}

/**
 * Link a season entry to a stable internal manager by display name.
 * A real provider link uses admin review for ambiguous cases; for the fixtures
 * slice the display name is unique and sufficient.
 */
async function upsertManager(displayName: string) {
  const existing = await db.query.managers.findFirst({
    where: and(eq(managers.displayName, displayName)),
  });
  if (existing) return existing;
  const [created] = await db
    .insert(managers)
    .values({ displayName })
    .returning();
  return created!;
}

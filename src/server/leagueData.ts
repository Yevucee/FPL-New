import { desc, eq } from "drizzle-orm";

import { db } from "@/db/client";
import {
  entryEventResults,
  events,
  leagues,
  managers,
  seasonEntries,
  syncRuns,
} from "@/db/schema";
import { gameweekWinner, monthlyWinner } from "@/metrics/awards";
import { computeStandings } from "@/metrics/standings";
import type { EntryInput, ResultInput, StandingRow } from "@/metrics/types";

export interface AwardCard {
  eventNumber?: number;
  phase?: number;
  phaseName?: string | null;
  value: number;
  joint: boolean;
  winners: { entryId: string; managerName: string; teamName: string }[];
}

export interface LeagueOverview {
  league: { slug: string; name: string; visibility: string } | null;
  seasonName: string | null;
  latestEvent: number | null;
  standings: StandingRow[];
  gameweekWinner: AwardCard | null;
  monthlyLeader: AwardCard | null;
  lastSync: { status: string; finishedAt: Date | null } | null;
}

const LEAGUE_SLUG = process.env.LEAGUE_SLUG ?? "the-gaffers-league";

/**
 * Load everything the League home / standings views need. Reads normalised rows
 * from PostgreSQL and applies the pure metric functions — the UI never contains
 * scoring formulas (specification section 9).
 */
export async function getLeagueOverview(): Promise<LeagueOverview> {
  const league = await db.query.leagues.findFirst({
    where: eq(leagues.slug, LEAGUE_SLUG),
  });

  const lastSyncRow = await db.query.syncRuns.findFirst({
    orderBy: desc(syncRuns.startedAt),
  });
  const lastSync = lastSyncRow
    ? { status: lastSyncRow.status, finishedAt: lastSyncRow.finishedAt }
    : null;

  if (!league) {
    return {
      league: null,
      seasonName: null,
      latestEvent: null,
      standings: [],
      gameweekWinner: null,
      monthlyLeader: null,
      lastSync,
    };
  }

  const entryRows = await db
    .select({
      entryId: seasonEntries.id,
      managerName: managers.displayName,
      teamName: seasonEntries.teamName,
      joinEvent: seasonEntries.joinEvent,
      seasonId: seasonEntries.seasonId,
    })
    .from(seasonEntries)
    .innerJoin(managers, eq(managers.id, seasonEntries.managerId))
    .where(eq(seasonEntries.leagueId, league.id));

  if (entryRows.length === 0) {
    return {
      league: { slug: league.slug, name: league.name, visibility: league.visibility },
      seasonName: null,
      latestEvent: null,
      standings: [],
      gameweekWinner: null,
      monthlyLeader: null,
      lastSync,
    };
  }

  const seasonId = entryRows[0]!.seasonId;
  const season = await db.query.seasons.findFirst({
    where: (s, { eq: e }) => e(s.id, seasonId),
  });

  const eventRows = await db
    .select()
    .from(events)
    .where(eq(events.seasonId, seasonId))
    .orderBy(events.eventNumber);

  const phaseByEvent = new Map<number, { phase: number; phaseName: string | null }>();
  for (const ev of eventRows) {
    phaseByEvent.set(ev.eventNumber, { phase: ev.phase, phaseName: ev.phaseName });
  }

  const resultRows = await db
    .select({
      entryId: entryEventResults.seasonEntryId,
      eventNumber: events.eventNumber,
      netPoints: entryEventResults.netPoints,
      grossPoints: entryEventResults.grossPoints,
      transferCost: entryEventResults.transferCost,
      benchPoints: entryEventResults.benchPoints,
    })
    .from(entryEventResults)
    .innerJoin(events, eq(events.id, entryEventResults.eventId))
    .where(eq(events.seasonId, seasonId));

  const entries: EntryInput[] = entryRows.map((e) => ({
    entryId: e.entryId,
    managerName: e.managerName,
    teamName: e.teamName,
    joinEvent: e.joinEvent,
  }));

  const results: ResultInput[] = resultRows.map((r) => ({
    entryId: r.entryId,
    eventNumber: r.eventNumber,
    phase: phaseByEvent.get(r.eventNumber)?.phase ?? 1,
    netPoints: r.netPoints,
    grossPoints: r.grossPoints,
    transferCost: r.transferCost,
    benchPoints: r.benchPoints,
  }));

  const latestEvent =
    eventRows.length > 0 ? Math.max(...eventRows.map((e) => e.eventNumber)) : null;

  const nameById = new Map(entries.map((e) => [e.entryId, e]));
  const toCard = (
    winner: ReturnType<typeof gameweekWinner>,
    meta: Partial<AwardCard>,
  ): AwardCard | null => {
    if (!winner) return null;
    return {
      value: winner.value,
      joint: winner.joint,
      winners: winner.entryIds.map((id) => ({
        entryId: id,
        managerName: nameById.get(id)?.managerName ?? "Unknown",
        teamName: nameById.get(id)?.teamName ?? "Unknown",
      })),
      ...meta,
    };
  };

  const standings =
    latestEvent !== null ? computeStandings(entries, results, latestEvent) : [];

  const gwCard =
    latestEvent !== null
      ? toCard(gameweekWinner(results, latestEvent), { eventNumber: latestEvent })
      : null;

  const latestPhase =
    latestEvent !== null ? phaseByEvent.get(latestEvent)?.phase ?? 1 : null;
  const monthlyCard =
    latestPhase !== null
      ? toCard(monthlyWinner(results, latestPhase), {
          phase: latestPhase,
          phaseName: phaseByEvent.get(latestEvent!)?.phaseName ?? null,
        })
      : null;

  return {
    league: { slug: league.slug, name: league.name, visibility: league.visibility },
    seasonName: season?.name ?? null,
    latestEvent,
    standings,
    gameweekWinner: gwCard,
    monthlyLeader: monthlyCard,
    lastSync,
  };
}

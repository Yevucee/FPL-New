import { and, desc, eq, inArray } from "drizzle-orm";

import { db } from "@/db/client";
import { leagues, seasonEntries, seasons } from "@/db/schema";
import { importSnapshot } from "@/ingestion/importSnapshot";
import { leagueConfig } from "@/lib/leagueConfig";
import { leagueHistoryProviderIds } from "@/lib/leagueHistoryConfig";
import { championForSeason, selChampions } from "@/lib/selChampions";
import { fetchAllLeagueMembers, fetchBootstrap } from "@/providers/fpl/client";
import {
  buildPastSeasonSnapshotFromLeagueStandings,
  buildPastSeasonSnapshotFromMemberCareers,
  RECONSTRUCTED_SEASON_PROVIDER_ID,
  seasonNameFromBootstrap,
  snapshotMatchesChampion,
} from "@/providers/fpl/buildHistorySnapshot";

import { reconstructedHistoryStale } from "./historyRefresh";

const ARCHIVED_STATES = ["archived", "archived-summary"] as const;

export interface ImportFplHistoryOptions {
  seasonName?: string;
  /** When true, only rebuild reconstructed seasons (keep official league-ID imports). */
  reconstructedOnly?: boolean;
}

export async function hasArchivedSeasons(): Promise<boolean> {
  const league = await db.query.leagues.findFirst({
    where: eq(leagues.slug, leagueConfig.slug),
  });
  if (!league) return false;

  const row = await db
    .select({ id: seasons.id })
    .from(seasons)
    .innerJoin(seasonEntries, eq(seasonEntries.seasonId, seasons.id))
    .where(
      and(
        eq(seasonEntries.leagueId, league.id),
        inArray(seasons.state, [...ARCHIVED_STATES]),
      ),
    )
    .limit(1);

  return row.length > 0;
}

/** Remove all summary archives before a full forced re-import. */
export async function purgeSummaryArchives(): Promise<number> {
  const league = await db.query.leagues.findFirst({
    where: eq(leagues.slug, leagueConfig.slug),
  });
  if (!league) return 0;

  const rows = await db
    .select({ id: seasons.id })
    .from(seasons)
    .innerJoin(seasonEntries, eq(seasonEntries.seasonId, seasons.id))
    .where(
      and(eq(seasonEntries.leagueId, league.id), eq(seasons.state, "archived-summary")),
    )
    .groupBy(seasons.id);

  if (rows.length === 0) return 0;

  await db.delete(seasons).where(
    inArray(
      seasons.id,
      rows.map((row) => row.id),
    ),
  );

  return rows.length;
}

/** Remove only chat-validated reconstructed archives (safe when new members join). */
export async function purgeReconstructedArchives(): Promise<number> {
  const league = await db.query.leagues.findFirst({
    where: eq(leagues.slug, leagueConfig.slug),
  });
  if (!league) return 0;

  const rows = await db
    .select({ id: seasons.id })
    .from(seasons)
    .innerJoin(seasonEntries, eq(seasonEntries.seasonId, seasons.id))
    .where(
      and(
        eq(seasonEntries.leagueId, league.id),
        eq(seasons.state, "archived-summary"),
        eq(seasons.providerId, RECONSTRUCTED_SEASON_PROVIDER_ID),
      ),
    )
    .groupBy(seasons.id);

  if (rows.length === 0) return 0;

  await db.delete(seasons).where(
    inArray(
      seasons.id,
      rows.map((row) => row.id),
    ),
  );

  return rows.length;
}

export async function needsReconstructedHistoryRefresh(
  currentLeagueId: string,
): Promise<{ needed: boolean; reason: string }> {
  const { members } = await fetchAllLeagueMembers(currentLeagueId);
  const currentMemberIds = new Set(members.map((member) => member.entryId));

  const league = await db.query.leagues.findFirst({
    where: eq(leagues.slug, leagueConfig.slug),
  });
  if (!league) {
    return { needed: true, reason: "league not in database" };
  }

  const bootstrap = await fetchBootstrap();
  const currentSeason = seasonNameFromBootstrap(bootstrap.events);
  const historyIds = leagueHistoryProviderIds();

  const missingArchiveSeasons: string[] = [];
  for (const row of selChampions) {
    if (row.season === currentSeason || historyIds.has(row.season)) continue;
    const seasonRow = await db.query.seasons.findFirst({
      where: eq(seasons.name, row.season),
    });
    if (!seasonRow) missingArchiveSeasons.push(row.season);
  }

  const latestReconstructed = await db
    .select({ id: seasons.id })
    .from(seasons)
    .innerJoin(seasonEntries, eq(seasonEntries.seasonId, seasons.id))
    .where(
      and(
        eq(seasonEntries.leagueId, league.id),
        eq(seasons.state, "archived-summary"),
        eq(seasons.providerId, RECONSTRUCTED_SEASON_PROVIDER_ID),
      ),
    )
    .groupBy(seasons.id, seasons.name)
    .orderBy(desc(seasons.name))
    .limit(1);

  let archivedMemberIds = new Set<string>();
  if (latestReconstructed[0]) {
    const stored = await db
      .select({ providerEntryId: seasonEntries.providerEntryId })
      .from(seasonEntries)
      .where(
        and(
          eq(seasonEntries.leagueId, league.id),
          eq(seasonEntries.seasonId, latestReconstructed[0]!.id),
        ),
      );
    archivedMemberIds = new Set(stored.map((row) => row.providerEntryId));
  }

  return reconstructedHistoryStale(currentMemberIds, archivedMemberIds, missingArchiveSeasons);
}

/**
 * Import completed seasons:
 * 1. Official — each season's FPL league ID (`LEAGUE_HISTORY_PROVIDER_IDS`)
 * 2. Reconstructed — current members ranked by FPL season totals, validated against champions list
 */
export async function importFplHistory(
  currentLeagueId: string,
  options: ImportFplHistoryOptions = {},
): Promise<number> {
  const historyIds = leagueHistoryProviderIds();
  const bootstrap = await fetchBootstrap();
  const currentSeason = seasonNameFromBootstrap(bootstrap.events);

  const officialSeasons =
    options.reconstructedOnly
      ? []
      : options.seasonName
        ? [options.seasonName].filter((name) => historyIds.has(name))
        : [...historyIds.keys()].sort((a, b) => b.localeCompare(a));

  const reconstructSeasons = options.seasonName
    ? selChampions
        .filter((row) => row.season === options.seasonName && !historyIds.has(row.season))
        .map((row) => row.season)
    : selChampions
        .map((row) => row.season)
        .filter((name) => name !== currentSeason && !historyIds.has(name))
        .sort((a, b) => b.localeCompare(a));

  if (officialSeasons.length === 0 && reconstructSeasons.length === 0) {
    console.log("[importFplHistory] no seasons configured or available to import");
    return 0;
  }

  let imported = 0;

  for (const seasonName of officialSeasons) {
    const historicalLeagueId = historyIds.get(seasonName);
    if (!historicalLeagueId) continue;

    const snapshot = await buildPastSeasonSnapshotFromLeagueStandings(
      historicalLeagueId,
      seasonName,
    );
    const champion = championForSeason(seasonName);
    if (champion && !snapshotMatchesChampion(snapshot, champion.winner)) {
      console.warn(
        `[importFplHistory] ${seasonName} league ${historicalLeagueId} leader does not match recorded champion ${champion.winner} — importing anyway`,
      );
    }

    await importSnapshot(
      {
        name: "fpl-history",
        getLeagueSnapshot: async () => snapshot,
      },
      { mode: "history" },
    );
    imported += 1;
    console.log(
      `[importFplHistory] ${seasonName} official league ${historicalLeagueId}: ${snapshot.entries.length} managers`,
    );
  }

  for (const seasonName of reconstructSeasons) {
    const champion = championForSeason(seasonName);
    if (!champion) continue;

    try {
      const snapshot = await buildPastSeasonSnapshotFromMemberCareers(
        currentLeagueId,
        seasonName,
      );
      if (!snapshotMatchesChampion(snapshot, champion.winner)) {
        console.warn(
          `[importFplHistory] skip ${seasonName} reconstruction — leader does not match ${champion.winner}`,
        );
        continue;
      }

      await importSnapshot(
        {
          name: "fpl-history",
          getLeagueSnapshot: async () => snapshot,
        },
        { mode: "history" },
      );
      imported += 1;
      console.log(
        `[importFplHistory] ${seasonName} reconstructed: ${snapshot.entries.length} managers (validated vs ${champion.winner})`,
      );
    } catch (err) {
      console.warn(
        `[importFplHistory] skip ${seasonName} reconstruction:`,
        err instanceof Error ? err.message : String(err),
      );
    }
  }

  return imported;
}

export { RECONSTRUCTED_SEASON_PROVIDER_ID };

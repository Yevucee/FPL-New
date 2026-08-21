import { and, desc, eq, inArray } from "drizzle-orm";

import { db } from "@/db/client";
import { leagues, seasonEntries, seasons } from "@/db/schema";
import { importSnapshot } from "@/ingestion/importSnapshot";
import { leagueConfig } from "@/lib/leagueConfig";
import { leagueHistoryProviderIds } from "@/lib/leagueHistoryConfig";
import { championForSeason, selChampions } from "@/lib/selChampions";
import { manualHistoricalEntryForSeason } from "@/lib/selHistoricalMembers";
import { eligibleReconstructionMemberIds, baseHistoricalParticipantIds } from "@/lib/selParticipants";
import { fetchBootstrap } from "@/providers/fpl/client";
import {
  buildPastSeasonSnapshotFromLeagueStandings,
  buildPastSeasonSnapshotFromMemberCareers,
  RECONSTRUCTED_SEASON_PROVIDER_ID,
  seasonNameFromBootstrap,
  snapshotMatchesChampion,
} from "@/providers/fpl/buildHistorySnapshot";

import { reconstructedHistoryStale } from "./historyRefresh";

const ARCHIVED_STATES = ["archived", "archived-summary"] as const;

export interface HistoryRefreshCheck {
  needed: boolean;
  reason: string;
  /** When set, only these reconstructed seasons need rebuilding (faster deploy refresh). */
  seasons?: string[];
  /** When true, run official + reconstructed imports (e.g. archives were purged). */
  fullImport?: boolean;
}

function reconstructedSeasonNames(currentSeason: string): string[] {
  const historyIds = leagueHistoryProviderIds();
  return selChampions
    .map((row) => row.season)
    .filter((name) => name !== currentSeason && !historyIds.has(name));
}

async function seasonsMissingFormerMembers(
  leagueDbId: string,
  currentSeason: string,
): Promise<string[]> {
  const historyIds = leagueHistoryProviderIds();
  const stale: string[] = [];

  for (const seasonName of reconstructedSeasonNames(currentSeason)) {
    for (const manual of manualHistoricalEntryForSeason(seasonName)) {
      const seasonRow = await db.query.seasons.findFirst({
        where: eq(seasons.name, seasonName),
      });
      if (!seasonRow) continue;

      const stored = await db
        .select({ providerEntryId: seasonEntries.providerEntryId })
        .from(seasonEntries)
        .where(
          and(
            eq(seasonEntries.leagueId, leagueDbId),
            eq(seasonEntries.seasonId, seasonRow.id),
            eq(seasonEntries.providerEntryId, manual.providerEntryId),
          ),
        )
        .limit(1);

      if (stored.length === 0) {
        stale.push(seasonName);
        break;
      }
    }
  }

  return stale;
}

export interface ImportFplHistoryOptions {
  seasonName?: string;
  /** When true, only rebuild reconstructed seasons (keep official league-ID imports). */
  reconstructedOnly?: boolean;
  /** Rebuild only these reconstructed season names (implies reconstructedOnly). */
  seasonNames?: string[];
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

/** Remove reconstructed archives for specific seasons only. */
export async function purgeReconstructedSeasonArchives(
  seasonNames: readonly string[],
): Promise<number> {
  if (seasonNames.length === 0) return 0;

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
        inArray(seasons.name, [...seasonNames]),
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

/** Remove only chat-validated reconstructed archives (safe when new members join). */
export async function purgeReconstructedArchives(): Promise<number> {
  const bootstrap = await fetchBootstrap();
  const currentSeason = seasonNameFromBootstrap(bootstrap.events);
  return purgeReconstructedSeasonArchives(reconstructedSeasonNames(currentSeason));
}

export async function needsReconstructedHistoryRefresh(
  currentLeagueId: string,
): Promise<HistoryRefreshCheck> {
  const league = await db.query.leagues.findFirst({
    where: eq(leagues.slug, leagueConfig.slug),
  });
  if (!league) {
    return { needed: true, reason: "league not in database" };
  }

  const eligibleMemberIds = await eligibleReconstructionMemberIds(league.id);

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

  if (missingArchiveSeasons.length > 0) {
    return {
      needed: true,
      reason: `missing archive for ${missingArchiveSeasons.join(", ")}`,
      fullImport: true,
    };
  }

  const formerMemberSeasons = await seasonsMissingFormerMembers(league.id, currentSeason);
  if (formerMemberSeasons.length > 0) {
    return {
      needed: true,
      reason: `former member data missing from ${formerMemberSeasons.join(", ")}`,
      seasons: formerMemberSeasons,
    };
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

  return reconstructedHistoryStale(archivedMemberIds, missingArchiveSeasons, {
    eligibleMemberIds,
  });
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

  const league = await db.query.leagues.findFirst({
    where: eq(leagues.slug, leagueConfig.slug),
  });
  let eligibleMemberIds = league
    ? await eligibleReconstructionMemberIds(league.id)
    : baseHistoricalParticipantIds();

  const officialSeasons =
    options.reconstructedOnly
      ? []
      : options.seasonName
        ? [options.seasonName].filter((name) => historyIds.has(name))
        : [...historyIds.keys()].sort((a, b) => b.localeCompare(a));

  const allReconstructSeasons = selChampions
    .map((row) => row.season)
    .filter((name) => name !== currentSeason && !historyIds.has(name))
    .sort((a, b) => b.localeCompare(a));

  const reconstructSeasons = options.seasonNames?.length
    ? allReconstructSeasons.filter((name) => options.seasonNames!.includes(name))
    : options.seasonName
      ? allReconstructSeasons.filter((name) => name === options.seasonName)
      : allReconstructSeasons;

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
    for (const entry of snapshot.entries) {
      eligibleMemberIds.add(entry.providerEntryId);
    }
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
        {
          eligibleMemberIds:
            eligibleMemberIds.size > 0 ? eligibleMemberIds : undefined,
        },
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

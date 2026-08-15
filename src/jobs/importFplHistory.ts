import { and, eq, inArray } from "drizzle-orm";

import { db } from "@/db/client";
import { leagues, seasonEntries, seasons } from "@/db/schema";
import { importSnapshot } from "@/ingestion/importSnapshot";
import { leagueConfig } from "@/lib/leagueConfig";
import { leagueHistoryProviderIds } from "@/lib/leagueHistoryConfig";
import { championForSeason, selChampions } from "@/lib/selChampions";
import { fetchBootstrap } from "@/providers/fpl/client";
import {
  buildPastSeasonSnapshotFromLeagueStandings,
  buildPastSeasonSnapshotFromMemberCareers,
  RECONSTRUCTED_SEASON_PROVIDER_ID,
  seasonNameFromBootstrap,
  snapshotMatchesChampion,
} from "@/providers/fpl/buildHistorySnapshot";

const ARCHIVED_STATES = ["archived", "archived-summary"] as const;

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

/** Remove summary archives before a forced re-import. */
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

/**
 * Import completed seasons:
 * 1. Official — each season's FPL league ID (`LEAGUE_HISTORY_PROVIDER_IDS`)
 * 2. Reconstructed — current members ranked by FPL season totals, validated against champions list
 */
export async function importFplHistory(
  currentLeagueId: string,
  options: { seasonName?: string } = {},
): Promise<number> {
  const historyIds = leagueHistoryProviderIds();
  const bootstrap = await fetchBootstrap();
  const currentSeason = seasonNameFromBootstrap(bootstrap.events);

  const officialSeasons = options.seasonName
    ? [options.seasonName].filter((name) => historyIds.has(name))
    : [...historyIds.keys()].sort((a, b) => b.localeCompare(a));

  const reconstructSeasons = options.seasonName
    ? selChampions
        .filter((row) => row.season === options.seasonName)
        .map((row) => row.season)
    : selChampions
        .map((row) => row.season)
        .filter((name) => name !== currentSeason && !historyIds.has(name))
        .sort((a, b) => b.localeCompare(a));

  if (officialSeasons.length === 0 && reconstructSeasons.length === 0) {
    console.log("[importFplHistory] no seasons configured or available to import");
    return 0;
  }

  if (process.env.FPL_FORCE_HISTORY_IMPORT === "1") {
    const purged = await purgeSummaryArchives();
    console.log(`[importFplHistory] purged ${purged} summary archive(s)`);
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

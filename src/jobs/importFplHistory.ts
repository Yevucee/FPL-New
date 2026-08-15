import { and, eq, inArray } from "drizzle-orm";

import { db } from "@/db/client";
import { leagues, seasonEntries, seasons } from "@/db/schema";
import { importSnapshot } from "@/ingestion/importSnapshot";
import { leagueConfig } from "@/lib/leagueConfig";
import { leagueHistoryProviderIds } from "@/lib/leagueHistoryConfig";
import { buildPastSeasonSnapshotFromLeagueStandings } from "@/providers/fpl/buildHistorySnapshot";

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

/** Remove summary archives (wrong career-history imports) before a forced re-import. */
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
 * Import completed seasons from each season's private FPL league ID.
 * Set LEAGUE_HISTORY_PROVIDER_IDS on Railway — see docs/HISTORICAL_DATA.md.
 */
export async function importFplHistory(
  _currentLeagueId: string,
  options: { seasonName?: string } = {},
): Promise<number> {
  const historyIds = leagueHistoryProviderIds();
  const seasonNames = options.seasonName
    ? [options.seasonName]
    : [...historyIds.keys()].sort((a, b) => b.localeCompare(a));

  if (seasonNames.length === 0) {
    console.log(
      "[importFplHistory] LEAGUE_HISTORY_PROVIDER_IDS not set — skipping past-season import",
    );
    return 0;
  }

  if (process.env.FPL_FORCE_HISTORY_IMPORT === "1") {
    const purged = await purgeSummaryArchives();
    console.log(`[importFplHistory] purged ${purged} summary archive(s)`);
  }

  let imported = 0;
  for (const seasonName of seasonNames) {
    const historicalLeagueId = historyIds.get(seasonName);
    if (!historicalLeagueId) continue;

    const snapshot = await buildPastSeasonSnapshotFromLeagueStandings(
      historicalLeagueId,
      seasonName,
    );
    await importSnapshot(
      {
        name: "fpl-history",
        getLeagueSnapshot: async () => snapshot,
      },
      { mode: "history" },
    );
    imported += 1;
    console.log(
      `[importFplHistory] ${seasonName} from league ${historicalLeagueId}: ${snapshot.entries.length} managers`,
    );
  }

  return imported;
}

import { and, eq, inArray } from "drizzle-orm";

import { db } from "@/db/client";
import { leagues, seasonEntries, seasons } from "@/db/schema";
import { importSnapshot } from "@/ingestion/importSnapshot";
import { leagueConfig } from "@/lib/leagueConfig";
import { fetchBootstrap } from "@/providers/fpl/client";
import {
  buildPastSeasonSnapshotFromFpl,
  listFplPastSeasonsForLeague,
  seasonNameFromBootstrap,
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

/** Import completed FPL seasons from official entry history (idempotent). */
export async function importFplHistory(
  leagueId: string,
  options: { seasonName?: string } = {},
): Promise<number> {
  const bootstrap = await fetchBootstrap();
  const currentSeason = seasonNameFromBootstrap(bootstrap.events);
  const seasonNames = options.seasonName
    ? [options.seasonName]
    : (await listFplPastSeasonsForLeague(leagueId)).filter(
        (name) => name !== currentSeason,
      );

  if (seasonNames.length === 0) return 0;

  for (const seasonName of seasonNames) {
    const snapshot = await buildPastSeasonSnapshotFromFpl(leagueId, seasonName);
    await importSnapshot(
      {
        name: "fpl-history",
        getLeagueSnapshot: async () => snapshot,
      },
      { mode: "history" },
    );
  }

  return seasonNames.length;
}

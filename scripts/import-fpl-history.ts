#!/usr/bin/env tsx
/**
 * Import archived seasons from official FPL entry history (`history.past`).
 *
 * FPL only exposes season-end totals for completed seasons — not GW-by-GW.
 * Full gameweek browsing is available for seasons captured via `npm run sync:fpl`
 * during the live season (auto-archived when a new season starts).
 *
 * Usage:
 *   npm run import:fpl-history
 *   FPL_HISTORY_SEASON=2025/26 npm run import:fpl-history
 */
import "dotenv/config";

import { eq } from "drizzle-orm";

import { db, sql } from "@/db/client";
import { seasons } from "@/db/schema";
import { importSnapshot } from "@/ingestion/importSnapshot";
import { leagueProviderIdOrThrow } from "@/lib/leagueConfig";
import { fetchBootstrap } from "@/providers/fpl/client";
import {
  buildPastSeasonSnapshotFromFpl,
  listFplPastSeasonsForLeague,
  seasonNameFromBootstrap,
} from "@/providers/fpl/buildHistorySnapshot";

async function main(): Promise<void> {
  const leagueId = leagueProviderIdOrThrow();
  const bootstrap = await fetchBootstrap();
  const currentSeason = seasonNameFromBootstrap(bootstrap.events);
  const requestedSeason = process.env.FPL_HISTORY_SEASON;

  const seasonNames = requestedSeason
    ? [requestedSeason]
    : (await listFplPastSeasonsForLeague(leagueId)).filter(
        (name) => name !== currentSeason,
      );

  if (seasonNames.length === 0) {
    throw new Error("No completed FPL seasons found to import");
  }

  console.log(
    `[import-fpl-history] league=${leagueId} seasons=${seasonNames.join(", ")}`,
  );

  for (const seasonName of seasonNames) {
    console.log(`[import-fpl-history] importing ${seasonName}...`);
    const snapshot = await buildPastSeasonSnapshotFromFpl(leagueId, seasonName);
    const counts = await importSnapshot({
      name: "fpl-history",
      getLeagueSnapshot: async () => snapshot,
    });

    await db
      .update(seasons)
      .set({ state: "archived-summary" })
      .where(eq(seasons.name, seasonName));

    console.log(
      `[import-fpl-history] ${seasonName}: ${snapshot.entries.length} managers, updated=${counts.updated}`,
    );
  }

  console.log("[import-fpl-history] done");
  await sql.end();
}

main().catch(async (err) => {
  console.error("[import-fpl-history] failed:", err);
  try {
    await sql.end();
  } catch {
    // ignore
  }
  process.exit(1);
});

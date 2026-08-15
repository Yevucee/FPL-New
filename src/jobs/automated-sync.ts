import "dotenv/config";

import { sql } from "@/db/client";
import { importSnapshot } from "@/ingestion/importSnapshot";
import { leagueConfig } from "@/lib/leagueConfig";
import { leagueHistoryProviderIds } from "@/lib/leagueHistoryConfig";
import { shouldRunAutomatedSync } from "@/lib/syncSchedule";
import { enrichLeagueIntel } from "@/providers/fpl/enrichIntel";
import { buildSnapshotFromFpl } from "@/providers/fpl/buildSnapshot";

import { hasArchivedSeasons, importFplHistory } from "./importFplHistory";

/**
 * Fully automated FPL pipeline for Railway cron — no manual steps.
 *
 * Cron ticks every 15 minutes; this job skips ticks outside match windows
 * (live-ish refresh) and off-peak maintenance slots (4× daily UK time).
 *
 * 1. Sync live season from FPL (standings, chips, transfers, manager meta)
 * 2. Enrich post-deadline intel (captain + most owned) when squads lock
 * 3. Bootstrap past seasons from configured historical league IDs
 */
async function main(): Promise<void> {
  const schedule = shouldRunAutomatedSync();
  if (!schedule.run) {
    console.log(`[automated-sync] skipped — ${schedule.reason}`);
    await sql.end();
    return;
  }

  const leagueId = leagueConfig.providerId.trim();
  if (!leagueId) {
    console.log(
      "[automated-sync] LEAGUE_PROVIDER_ID not set — waiting for league renewal",
    );
    await sql.end();
    return;
  }

  console.log(`[automated-sync] league=${leagueId} tier=${schedule.tier} starting`);

  const snapshot = await buildSnapshotFromFpl(leagueId);
  const counts = await importSnapshot({
    name: "fpl-public",
    getLeagueSnapshot: async () => snapshot,
  });
  console.log(
    `[automated-sync] live season: ${snapshot.entries.length} managers, updated=${counts.updated}`,
  );

  const enrich = await enrichLeagueIntel(leagueId);
  if (enrich.skipped) {
    console.log(`[automated-sync] enrich skipped: ${enrich.reason ?? "n/a"}`);
  } else {
    console.log(
      `[automated-sync] enrich GW${enrich.eventNumber}: ${enrich.managersFetched} squads`,
    );
  }

  const forceHistory = process.env.FPL_FORCE_HISTORY_IMPORT === "1";
  const needsHistory = forceHistory || !(await hasArchivedSeasons());
  if (needsHistory) {
    const imported = await importFplHistory(leagueId);
    console.log(`[automated-sync] history bootstrap: ${imported} season(s)`);
  } else {
    console.log("[automated-sync] history archive present — skip");
  }

  console.log("[automated-sync] done");
  await sql.end();
}

main().catch(async (err) => {
  console.error("[automated-sync] failed:", err);
  try {
    await sql.end();
  } catch {
    // ignore
  }
  process.exit(1);
});

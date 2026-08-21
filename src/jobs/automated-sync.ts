import "dotenv/config";

import { desc, eq } from "drizzle-orm";

import { db, sql } from "@/db/client";
import { syncRuns } from "@/db/schema";
import { importSnapshot } from "@/ingestion/importSnapshot";
import { leagueConfig } from "@/lib/leagueConfig";
import { resolveAutomatedSyncSchedule } from "@/lib/syncSchedule";
import { enrichLeagueIntel } from "@/providers/fpl/enrichIntel";
import { buildSnapshotFromFpl } from "@/providers/fpl/buildSnapshot";

import { ensureHistoryFresh } from "./ensureHistoryFresh";

const RECENT_SYNC_MINUTES = 8;

export interface RunAutomatedSyncOptions {
  force?: boolean;
  /** Close the Postgres pool when done (cron one-shot). Default true. */
  closePool?: boolean;
}

async function syncedRecently(): Promise<boolean> {
  const last = await db.query.syncRuns.findFirst({
    where: eq(syncRuns.status, "succeeded"),
    orderBy: desc(syncRuns.finishedAt),
  });
  if (!last?.finishedAt) return false;
  const ageMs = Date.now() - last.finishedAt.getTime();
  return ageMs < RECENT_SYNC_MINUTES * 60_000;
}

/**
 * Fully automated FPL pipeline — live season, enrich, history.
 * Used by Railway cron, web startup, and the background sync watcher.
 */
export async function runAutomatedSync(
  options: RunAutomatedSyncOptions = {},
): Promise<boolean> {
  const closePool = options.closePool ?? true;

  const schedule = await resolveAutomatedSyncSchedule(new Date(), options);
  if (!schedule.run) {
    console.log(`[automated-sync] skipped — ${schedule.reason}`);
    if (closePool) await sql.end();
    return false;
  }

  if (!options.force && process.env.FPL_SYNC_FORCE !== "1" && (await syncedRecently())) {
    console.log("[automated-sync] skipped — synced within the last few minutes");
    if (closePool) await sql.end();
    return false;
  }

  const leagueId = leagueConfig.providerId.trim();
  if (!leagueId) {
    console.log(
      "[automated-sync] LEAGUE_PROVIDER_ID not set — waiting for league renewal",
    );
    if (closePool) await sql.end();
    return false;
  }

  console.log(`[automated-sync] league=${leagueId} tier=${schedule.tier} starting`);

  try {
    const snapshot = await buildSnapshotFromFpl(leagueId);
    const counts = await importSnapshot({
      name: "fpl-public",
      getLeagueSnapshot: async () => snapshot,
    });
    console.log(
      `[automated-sync] live season: ${snapshot.entries.length} managers, updated=${counts.updated}, removed=${counts.removed}`,
    );

    const enrich = await enrichLeagueIntel(leagueId);
    if (enrich.skipped) {
      console.log(`[automated-sync] enrich skipped: ${enrich.reason ?? "n/a"}`);
    } else {
      console.log(
        `[automated-sync] enrich GW${enrich.eventNumber}: ${enrich.managersFetched} squads`,
      );
    }

    const history = await ensureHistoryFresh(leagueId);
    if (history.action === "skipped") {
      console.log(`[automated-sync] history archive up to date — ${history.reason}`);
    } else {
      console.log(
        `[automated-sync] history ${history.action}: ${history.reason} (purged=${history.purged}, imported=${history.imported})`,
      );
    }

    console.log("[automated-sync] done");
    return true;
  } finally {
    if (closePool) await sql.end();
  }
}

async function main(): Promise<void> {
  await runAutomatedSync({ closePool: true });
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

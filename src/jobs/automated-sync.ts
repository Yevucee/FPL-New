import "dotenv/config";

import { desc, eq } from "drizzle-orm";

import { db, sql } from "@/db/client";
import { syncRuns } from "@/db/schema";
import { importSnapshot } from "@/ingestion/importSnapshot";
import { leagueConfig } from "@/lib/leagueConfig";
import {
  recordCompletedScheduleKey,
} from "@/lib/syncScheduleState";
import { resolveAutomatedSyncSchedule, scheduleKeyComplete } from "@/lib/syncSchedule";
import { enrichLeagueIntel } from "@/providers/fpl/enrichIntel";
import { buildSnapshotFromFpl } from "@/providers/fpl/buildSnapshot";

import { ensureHistoryFresh } from "./ensureHistoryFresh";

const RECENT_SYNC_MINUTES = 8;

export interface RunAutomatedSyncOptions {
  force?: boolean;
  /** Close the Postgres pool when done (cron one-shot). Default true. */
  closePool?: boolean;
}

export interface RunAutomatedSyncResult {
  ok: boolean;
  partial?: boolean;
  error?: string;
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
): Promise<RunAutomatedSyncResult> {
  const closePool = options.closePool ?? true;

  const schedule = await resolveAutomatedSyncSchedule(new Date(), options);
  if (!schedule.run) {
    console.log(`[automated-sync] skipped — ${schedule.reason}`);
    if (closePool) await sql.end();
    return { ok: true };
  }

  if (
    !options.force &&
    process.env.FPL_SYNC_FORCE !== "1" &&
    !schedule.scheduleKey &&
    (await syncedRecently())
  ) {
    console.log("[automated-sync] skipped — synced within the last few minutes");
    if (closePool) await sql.end();
    return { ok: true };
  }

  const leagueId = leagueConfig.providerId.trim();
  if (!leagueId) {
    console.log(
      "[automated-sync] LEAGUE_PROVIDER_ID not set — waiting for league renewal",
    );
    if (closePool) await sql.end();
    return { ok: true };
  }

  console.log(`[automated-sync] league=${leagueId} tier=${schedule.tier} — ${schedule.reason}`);

  let importOk = false;
  let enrichOk = true;

  try {
    const snapshot = await buildSnapshotFromFpl(leagueId);
    const counts = await importSnapshot({
      name: "fpl-public",
      getLeagueSnapshot: async () => snapshot,
    });
    importOk = true;
    console.log(
      `[automated-sync] live season: ${snapshot.entries.length} managers, updated=${counts.updated}, removed=${counts.removed}`,
    );

    try {
      const enrich = await enrichLeagueIntel(leagueId);
      if (enrich.skipped) {
        console.log(`[automated-sync] enrich skipped: ${enrich.reason ?? "n/a"}`);
        if (
          schedule.scheduleKey?.startsWith("post-deadline") &&
          enrich.reason !== "already enriched"
        ) {
          enrichOk = false;
        }
      } else {
        console.log(
          `[automated-sync] enrich GW${enrich.eventNumber}: ${enrich.managersFetched} squads`,
        );
      }
    } catch (err) {
      enrichOk = false;
      console.error("[automated-sync] enrich failed:", err);
    }

    const skipHistory =
      schedule.tier === "match" ||
      schedule.tier === "deadline" ||
      process.env.CRON_SKIP_HISTORY === "1";

    if (skipHistory) {
      console.log("[automated-sync] history skipped — deferring to off-peak / web deploy");
    } else {
      try {
        const history = await ensureHistoryFresh(leagueId);
        if (history.action === "skipped") {
          console.log(`[automated-sync] history archive up to date — ${history.reason}`);
        } else {
          console.log(
            `[automated-sync] history ${history.action}: ${history.reason} (purged=${history.purged}, imported=${history.imported})`,
          );
        }
      } catch (err) {
        console.error("[automated-sync] history failed:", err);
      }
    }

    if (
      schedule.scheduleKey &&
      scheduleKeyComplete({ scheduleKey: schedule.scheduleKey, importOk, enrichOk })
    ) {
      await recordCompletedScheduleKey(schedule.scheduleKey);
    } else if (schedule.scheduleKey) {
      console.warn(
        `[automated-sync] one-off ${schedule.scheduleKey} incomplete — will retry on a later tick`,
      );
    }

    if (!enrichOk) {
      console.log("[automated-sync] done with partial enrich failure");
      return { ok: true, partial: true };
    }

    console.log("[automated-sync] done");
    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[automated-sync] failed:", err);
    return { ok: false, error: message };
  } finally {
    if (closePool) await sql.end();
  }
}

async function main(): Promise<void> {
  const result = await runAutomatedSync({ closePool: true });
  if (!result.ok) {
    process.exit(1);
  }
}

main().catch(async (err) => {
  console.error("[automated-sync] fatal:", err);
  try {
    await sql.end();
  } catch {
    // ignore
  }
  process.exit(1);
});

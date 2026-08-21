import { getLondonParts, isMatchInterval, resolveAutomatedSyncSchedule } from "@/lib/syncSchedule";
import { sleep } from "@/providers/fpl/client";

import { runAutomatedSync } from "./automated-sync";

const POLL_MS = 15_000;

let watchStarted = false;

/** Background loop — checks every 15s and runs schedule-gated sync on each 15-min UK slot. */
async function syncWatchLoop(): Promise<void> {
  let lastSyncedSlot = "";

  console.log("[sync-watch] started — polling for 15-minute live sync slots");

  while (true) {
    try {
      const now = new Date();
      const parts = getLondonParts(now);

      if (!isMatchInterval(parts)) {
        lastSyncedSlot = "";
      } else {
        const slot = `${parts.dayOfWeek}-${parts.hour}-${parts.minute}`;
        if (slot !== lastSyncedSlot) {
          const schedule = await resolveAutomatedSyncSchedule(now);
          if (schedule.run) {
            console.log(`[sync-watch] triggering sync — ${schedule.reason}`);
            const synced = await runAutomatedSync({ closePool: false });
            if (synced) {
              lastSyncedSlot = slot;
            }
          }
        }
      }
    } catch (err) {
      console.error("[sync-watch] tick failed:", err);
    }

    await sleep(POLL_MS);
  }
}

/** Idempotent — safe to call from the start script and CLI. */
export function startSyncWatch(): void {
  if (watchStarted) return;
  watchStarted = true;
  void (async () => {
    try {
      const synced = await runAutomatedSync({ closePool: false });
      if (synced) {
        console.log("[sync-watch] initial sync complete");
      }
    } catch (err) {
      console.error("[sync-watch] initial sync failed:", err);
    }
    await syncWatchLoop();
  })();
}

/** CLI entry when run via npm run job:sync-watch */
async function main(): Promise<void> {
  startSyncWatch();
  await new Promise(() => {
    // Keep process alive when run standalone.
  });
}

const isDirectRun = process.argv[1]?.includes("syncWatch");
if (isDirectRun) {
  main().catch((err) => {
    console.error("[sync-watch] fatal:", err);
    process.exit(1);
  });
}

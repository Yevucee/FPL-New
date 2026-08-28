import { getLondonParts, isMatchInterval, resolveAutomatedSyncSchedule } from "@/lib/syncSchedule";
import { sleep } from "@/providers/fpl/client";

import { runAutomatedSync } from "./automated-sync";

const POLL_MS = 15_000;

let watchStarted = false;

/** Background loop — live sync on 15-min slots; one-offs run as soon as due. */
async function syncWatchLoop(): Promise<void> {
  let lastLiveSlot = "";

  console.log("[sync-watch] started — fixture-driven sync polling");

  while (true) {
    try {
      const now = new Date();
      const parts = getLondonParts(now);
      const schedule = await resolveAutomatedSyncSchedule(now);

      if (schedule.run) {
        if (schedule.scheduleKey) {
          console.log(`[sync-watch] scheduled sync — ${schedule.reason}`);
          await runAutomatedSync({ closePool: false });
        } else if (isMatchInterval(parts)) {
          const slot = `${parts.dayOfWeek}-${parts.hour}-${parts.minute}`;
          if (slot !== lastLiveSlot) {
            console.log(`[sync-watch] live sync — ${schedule.reason}`);
            const result = await runAutomatedSync({ closePool: false });
            if (result.ok) lastLiveSlot = slot;
          }
        }
      }

      if (!isMatchInterval(parts)) {
        lastLiveSlot = "";
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
    const schedule = await resolveAutomatedSyncSchedule(new Date());
    if (schedule.run) {
      try {
        const result = await runAutomatedSync({ closePool: false });
        if (result.ok) {
          console.log("[sync-watch] initial sync complete");
        }
      } catch (err) {
        console.error("[sync-watch] initial sync failed:", err);
      }
    } else {
      console.log(`[sync-watch] initial sync skipped — ${schedule.reason}`);
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

import "dotenv/config";

import { getLondonParts, isMatchInterval, resolveAutomatedSyncSchedule } from "@/lib/syncSchedule";
import { sleep } from "@/providers/fpl/client";

import { runAutomatedSync } from "./automated-sync";

const POLL_MS = 30_000;

/** Background loop — checks every 30s and runs schedule-gated sync on each 15-min UK slot. */
async function main(): Promise<void> {
  let lastSlot = "";

  console.log("[sync-watch] started — polling for 15-minute live sync slots");

  while (true) {
    try {
      const now = new Date();
      const parts = getLondonParts(now);
      if (isMatchInterval(parts)) {
        const slot = `${parts.dayOfWeek}-${parts.hour}-${parts.minute}`;
        if (slot !== lastSlot) {
          const schedule = await resolveAutomatedSyncSchedule(now);
          if (schedule.run) {
            console.log(`[sync-watch] triggering sync — ${schedule.reason}`);
            await runAutomatedSync({ closePool: false });
            lastSlot = slot;
          }
        }
      }
    } catch (err) {
      console.error("[sync-watch] tick failed:", err);
    }

    await sleep(POLL_MS);
  }
}

main().catch((err) => {
  console.error("[sync-watch] fatal:", err);
  process.exit(1);
});

import "dotenv/config";

import { sql } from "@/db/client";

import { ensureHistoryFresh } from "./ensureHistoryFresh";

async function main(): Promise<void> {
  const result = await ensureHistoryFresh();
  console.log(`[ensure-history] ${result.action}: ${result.reason}`);
  if (result.purged > 0) {
    console.log(`[ensure-history] purged ${result.purged} season archive(s)`);
  }
  if (result.imported > 0) {
    console.log(`[ensure-history] imported ${result.imported} season(s)`);
  }
  await sql.end();
}

main().catch(async (err) => {
  console.error("[ensure-history] failed:", err);
  try {
    await sql.end();
  } catch {
    // ignore
  }
  process.exit(1);
});

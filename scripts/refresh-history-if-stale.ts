#!/usr/bin/env tsx
import "dotenv/config";

import { sql } from "@/db/client";

import { ensureHistoryFresh } from "../src/jobs/ensureHistoryFresh";

async function main(): Promise<void> {
  const result = await ensureHistoryFresh();
  console.log(`[refresh-history-if-stale] ${result.action}: ${result.reason}`);
  if (result.purged > 0) {
    console.log(`[refresh-history-if-stale] purged ${result.purged} season(s)`);
  }
  if (result.imported > 0) {
    console.log(`[refresh-history-if-stale] imported ${result.imported} season(s)`);
  }
  await sql.end();
}

main().catch(async (err) => {
  console.error("[refresh-history-if-stale] failed:", err);
  try {
    await sql.end();
  } catch {
    // ignore
  }
  process.exit(1);
});

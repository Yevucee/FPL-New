#!/usr/bin/env tsx
import "dotenv/config";

import { sql } from "@/db/client";
import { leagueProviderIdOrThrow } from "@/lib/leagueConfig";

import { importFplHistory } from "../src/jobs/importFplHistory";

async function main(): Promise<void> {
  const leagueId = leagueProviderIdOrThrow();
  const seasonName = process.env.FPL_HISTORY_SEASON;
  const count = await importFplHistory(leagueId, { seasonName });
  console.log(`[import-fpl-history] imported ${count} season(s)`);
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

#!/usr/bin/env tsx
/**
 * Post-deadline enrichment: captain picks + most-owned players.
 * Skips if no gameweek deadline has passed or data already exists.
 */
import "dotenv/config";

import { sql } from "@/db/client";
import { enrichLeagueIntel } from "@/providers/fpl/enrichIntel";

async function main(): Promise<void> {
  const result = await enrichLeagueIntel();
  if (result.skipped) {
    console.log(`[enrich-fpl] skipped: ${result.reason ?? "unknown"}`);
  } else {
    console.log(
      `[enrich-fpl] GW${result.eventNumber}: ${result.managersFetched} squads enriched`,
    );
  }
  await sql.end();
}

main().catch(async (err) => {
  console.error("[enrich-fpl] failed:", err);
  try {
    await sql.end();
  } catch {
    // ignore
  }
  process.exit(1);
});

#!/usr/bin/env tsx
/**
 * Fetch a public FPL classic league into data/league-snapshot.json.
 *
 * Usage (once LEAGUE_PROVIDER_ID is set in .env):
 *   npm run fetch:fpl
 *
 * Policy: uses read-only public endpoints. Run manually after each gameweek.
 */
import "dotenv/config";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { leagueSnapshotSchema } from "../src/contracts/snapshot";
import { leagueConfig, leagueProviderIdOrThrow } from "../src/lib/leagueConfig";
import { buildSnapshotFromFpl } from "../src/providers/fpl/buildSnapshot";

async function main(): Promise<void> {
  const leagueId = leagueProviderIdOrThrow();
  console.log(
    `[fetch-fpl] league="${leagueConfig.displayName}" id=${leagueId}`,
  );

  const snapshot = await buildSnapshotFromFpl(leagueId);
  const validated = leagueSnapshotSchema.parse(snapshot);

  const outPath =
    process.env.SNAPSHOT_PATH ?? path.join(process.cwd(), "data/league-snapshot.json");
  await mkdir(path.dirname(outPath), { recursive: true });
  await writeFile(outPath, `${JSON.stringify(validated, null, 2)}\n`, "utf8");

  console.log(
    `[fetch-fpl] wrote ${outPath} (${validated.entries.length} managers, ${validated.events.length} events)`,
  );
}

main().catch((err) => {
  console.error("[fetch-fpl] failed:", err);
  process.exit(1);
});

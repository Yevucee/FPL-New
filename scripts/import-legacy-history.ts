import "dotenv/config";
import { readFile } from "node:fs/promises";

import { eq } from "drizzle-orm";

import { db, sql } from "@/db/client";
import { seasons } from "@/db/schema";
import {
  buildLegacySnapshot,
  type LegacyGameweekMeta,
  type LegacySnapshotRow,
} from "@/ingestion/legacySnapshots";
import { importSnapshot } from "@/ingestion/importSnapshot";

/**
 * Import archived season data from the legacy Swiss-Expert-League Supabase export.
 *
 * Usage (JSON export — recommended):
 *   LEGACY_SEASON_NAME=2024/25 \
 *   LEGACY_SNAPSHOT_FILE=data/legacy/league_snapshots.json \
 *   npm run import:legacy
 *
 * Usage (live Supabase pull — requires service role key):
 *   LEGACY_SEASON_NAME=2024/25 \
 *   LEGACY_SUPABASE_URL=https://xxxx.supabase.co \
 *   LEGACY_SUPABASE_SERVICE_ROLE_KEY=eyJ... \
 *   npm run import:legacy
 */
async function loadRows(): Promise<{
  rows: LegacySnapshotRow[];
  gameweeks: LegacyGameweekMeta[];
}> {
  const file = process.env.LEGACY_SNAPSHOT_FILE;
  if (file) {
    const raw = JSON.parse(await readFile(file, "utf8")) as {
      snapshots?: LegacySnapshotRow[];
      gameweeks?: LegacyGameweekMeta[];
    };
    const rows = Array.isArray(raw) ? (raw as LegacySnapshotRow[]) : (raw.snapshots ?? []);
    return { rows, gameweeks: raw.gameweeks ?? [] };
  }

  const url = process.env.LEGACY_SUPABASE_URL;
  const key = process.env.LEGACY_SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "Set LEGACY_SNAPSHOT_FILE or LEGACY_SUPABASE_URL + LEGACY_SUPABASE_SERVICE_ROLE_KEY",
    );
  }

  const headers = { apikey: key, Authorization: `Bearer ${key}` };
  const snapRes = await fetch(
    `${url}/rest/v1/league_snapshots?select=*&order=gw.asc`,
    { headers },
  );
  if (!snapRes.ok) throw new Error(`Supabase snapshots: ${snapRes.status}`);
  const rows = (await snapRes.json()) as LegacySnapshotRow[];

  let gameweeks: LegacyGameweekMeta[] = [];
  try {
    const gwRes = await fetch(`${url}/rest/v1/fpl_gameweeks?select=*&order=gw.asc`, {
      headers,
    });
    if (gwRes.ok) gameweeks = (await gwRes.json()) as LegacyGameweekMeta[];
  } catch {
    // optional table
  }

  return { rows, gameweeks };
}

async function main(): Promise<void> {
  const seasonName = process.env.LEGACY_SEASON_NAME;
  if (!seasonName) {
    throw new Error("LEGACY_SEASON_NAME is required (e.g. 2024/25)");
  }

  console.log(`[import-legacy] season=${seasonName}`);
  const { rows, gameweeks } = await loadRows();
  if (rows.length === 0) throw new Error("No legacy snapshot rows found");

  const snapshot = buildLegacySnapshot({
    seasonName,
    rows,
    gameweeks,
    leagueProviderId: process.env.LEAGUE_PROVIDER_ID || undefined,
  });

  console.log(
    `[import-legacy] ${snapshot.entries.length} managers, ${snapshot.events.length} gameweeks`,
  );

  const counts = await importSnapshot({
    name: "legacy-supabase",
    getLeagueSnapshot: async () => snapshot,
  });

  await db
    .update(seasons)
    .set({ state: "archived" })
    .where(eq(seasons.name, seasonName));

  console.log(
    `[import-legacy] done updated=${counts.updated} — season marked archived`,
  );
  await sql.end();
}

main().catch(async (err) => {
  console.error("[import-legacy] failed:", err);
  try {
    await sql.end();
  } catch {
    // ignore
  }
  process.exit(1);
});

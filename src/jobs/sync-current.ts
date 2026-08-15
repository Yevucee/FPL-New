import "dotenv/config";

import { importSnapshot } from "@/ingestion/importSnapshot";
import { getProvider } from "@/providers";
import { sql } from "@/db/client";

/**
 * Current-league sync entrypoint (specification section 15: a short-lived job
 * that starts, runs, and exits — suitable for a Railway cron service).
 */
async function main(): Promise<void> {
  const provider = getProvider();
  console.log(`[sync-current] provider=${provider.name}`);
  const counts = await importSnapshot(provider);
  console.log(
    `[sync-current] done inserted=${counts.inserted} updated=${counts.updated} skipped=${counts.skipped} failed=${counts.failed}`,
  );
  await sql.end();
}

main().catch(async (err) => {
  console.error("[sync-current] failed:", err);
  try {
    await sql.end();
  } catch {
    // ignore
  }
  process.exit(1);
});

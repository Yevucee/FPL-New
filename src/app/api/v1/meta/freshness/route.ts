import { desc } from "drizzle-orm";

import { db } from "@/db/client";
import { syncRuns } from "@/db/schema";
import { ok, fail } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const last = await db.query.syncRuns.findFirst({
      orderBy: desc(syncRuns.startedAt),
    });
    return ok({
      lastSync: last
        ? {
            provider: last.provider,
            scope: last.scope,
            status: last.status,
            startedAt: last.startedAt,
            finishedAt: last.finishedAt,
            inserted: last.inserted,
            updated: last.updated,
            skipped: last.skipped,
            failed: last.failed,
          }
        : null,
      automaticSyncEnabled: process.env.AUTOMATIC_SYNC_ENABLED === "true",
    });
  } catch (err) {
    return fail(
      "FRESHNESS_UNAVAILABLE",
      err instanceof Error ? err.message : "Unknown error",
      500,
    );
  }
}

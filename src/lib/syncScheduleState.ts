import { and, eq, like } from "drizzle-orm";

import { db } from "@/db/client";
import { syncRuns } from "@/db/schema";

const SCHEDULE_SCOPE_PREFIX = "schedule:";

/** Load schedule keys for one-off syncs that already succeeded. */
export async function loadCompletedScheduleKeys(): Promise<Set<string>> {
  const rows = await db
    .select({ scope: syncRuns.scope })
    .from(syncRuns)
    .where(
      and(
        eq(syncRuns.status, "succeeded"),
        like(syncRuns.scope, `${SCHEDULE_SCOPE_PREFIX}%`),
      ),
    );

  return new Set(
    rows.map((row) => row.scope.slice(SCHEDULE_SCOPE_PREFIX.length)),
  );
}

export function scheduleScopeForKey(key: string): string {
  return `${SCHEDULE_SCOPE_PREFIX}${key}`;
}

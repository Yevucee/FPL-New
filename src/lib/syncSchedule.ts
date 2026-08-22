import { leagueConfig } from "@/lib/leagueConfig";
import {
  getLondonParts,
  isMatchInterval,
  resolveScheduleFromFpl,
  type LondonDateTimeParts,
  type SyncScheduleDecision,
} from "@/lib/syncScheduleLogic";
import { loadCompletedScheduleKeys } from "@/lib/syncScheduleState";
import {
  fetchBootstrap,
  fetchFixtures,
} from "@/providers/fpl/client";

export type { LondonDateTimeParts, SyncScheduleDecision, SyncScheduleTier } from "@/lib/syncScheduleLogic";
export { getLondonParts, isMatchInterval } from "@/lib/syncScheduleLogic";

/** @deprecated Fixture-driven schedule uses resolveAutomatedSyncSchedule. */
export function shouldRunAutomatedSync(
  now = new Date(),
  options?: { force?: boolean },
): SyncScheduleDecision {
  if (options?.force || process.env.FPL_SYNC_FORCE === "1") {
    return { run: true, tier: "forced", reason: "forced run" };
  }
  return {
    run: false,
    tier: "skip",
    reason: "use resolveAutomatedSyncSchedule for fixture-driven schedule",
  };
}

/** Fetches FPL data and applies fixture-driven sync rules. */
export async function resolveAutomatedSyncSchedule(
  now = new Date(),
  options?: { force?: boolean },
): Promise<SyncScheduleDecision> {
  if (options?.force || process.env.FPL_SYNC_FORCE === "1") {
    return { run: true, tier: "forced", reason: "forced run" };
  }

  try {
    const [fixtures, bootstrap, completedScheduleKeys] = await Promise.all([
      fetchFixtures(),
      fetchBootstrap(),
      loadCompletedScheduleKeys(),
    ]);

    return resolveScheduleFromFpl({
      now,
      fixtures,
      events: bootstrap.events,
      completedScheduleKeys,
      force: options?.force,
    });
  } catch {
    return {
      run: false,
      tier: "skip",
      reason: "FPL unreachable — skipping sync",
    };
  }
}

export const scoringTimezone = leagueConfig.scoringTimezone;

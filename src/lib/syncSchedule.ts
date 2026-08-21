import { leagueConfig } from "@/lib/leagueConfig";
import {
  fetchBootstrap,
  fetchFixtures,
  hasLiveFixtures,
} from "@/providers/fpl/client";

export type SyncScheduleTier = "forced" | "match" | "maintenance" | "skip";

export interface SyncScheduleDecision {
  run: boolean;
  tier: SyncScheduleTier;
  reason: string;
}

export interface LondonDateTimeParts {
  hour: number;
  minute: number;
  /** 0 = Sunday … 6 = Saturday */
  dayOfWeek: number;
}

const MATCH_INTERVAL_MINUTES = 15;
const MAINTENANCE_HOURS = [0, 6, 12, 18] as const;

/** Convert a UTC instant to Europe/London wall-clock parts. */
export function getLondonParts(date: Date, timeZone = leagueConfig.scoringTimezone): LondonDateTimeParts {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    weekday: "short",
    hour12: false,
  }).formatToParts(date);

  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? "0";

  const weekday = get("weekday");
  const dayMap: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };

  return {
    hour: Number(get("hour")),
    minute: Number(get("minute")),
    dayOfWeek: dayMap[weekday] ?? 0,
  };
}

function hourFraction(parts: LondonDateTimeParts): number {
  return parts.hour + parts.minute / 60;
}

/**
 * Typical Premier League kick-off windows in UK time.
 * Friday evening covers the weekly FPL deadline + immediate post-deadline sync.
 */
export function isMatchWindow(parts: LondonDateTimeParts): boolean {
  const h = hourFraction(parts);

  switch (parts.dayOfWeek) {
    case 6: // Saturday
      return h >= 11 && h < 22.5;
    case 0: // Sunday
      return h >= 11 && h < 21;
    case 5: // Friday — GW deadline + evening fixtures (extend through typical kick-offs)
      return h >= 17 && h < 22.5;
    case 1: // Monday — occasional fixtures
    case 2: // Tuesday
    case 3: // Wednesday
    case 4: // Thursday — rare but happens
      return h >= 18 && h < 22.5;
    default:
      return false;
  }
}

function isMaintenanceSlot(parts: LondonDateTimeParts): boolean {
  return parts.minute === 0 && (MAINTENANCE_HOURS as readonly number[]).includes(parts.hour);
}

export function isMatchInterval(parts: LondonDateTimeParts): boolean {
  return parts.minute % MATCH_INTERVAL_MINUTES === 0;
}

/**
 * Decide whether the automated sync job should run on this cron tick.
 *
 * - Match windows: every 15 minutes (live-ish scores)
 * - Off-peak: four maintenance runs per day (00:00, 06:00, 12:00, 18:00 UK)
 * - Everything else: skip without calling FPL
 */
export function shouldRunAutomatedSync(
  now = new Date(),
  options?: { force?: boolean },
): SyncScheduleDecision {
  if (options?.force || process.env.FPL_SYNC_FORCE === "1") {
    return { run: true, tier: "forced", reason: "forced run" };
  }

  const london = getLondonParts(now);

  if (isMatchWindow(london)) {
    if (isMatchInterval(london)) {
      return {
        run: true,
        tier: "match",
        reason: "match window — 15-minute live refresh",
      };
    }
    return {
      run: false,
      tier: "skip",
      reason: "match window — waiting for 15-minute slot",
    };
  }

  if (isMaintenanceSlot(london)) {
    return {
      run: true,
      tier: "maintenance",
      reason: "off-peak maintenance slot",
    };
  }

  return {
    run: false,
    tier: "skip",
    reason: "outside match windows and maintenance slots",
  };
}

/**
 * Cron decision with FPL live overrides — sync every 15 minutes when:
 * 1. A PL fixture is in play (started, not finished), or
 * 2. The current gameweek is live on FPL but outside day/time windows.
 */
export async function resolveAutomatedSyncSchedule(
  now = new Date(),
  options?: { force?: boolean },
): Promise<SyncScheduleDecision> {
  const base = shouldRunAutomatedSync(now, options);
  if (base.run) return base;

  const parts = getLondonParts(now);
  if (!isMatchInterval(parts)) {
    return base;
  }

  try {
    const fixtures = await fetchFixtures();
    if (hasLiveFixtures(fixtures)) {
      const liveCount = fixtures.filter((f) => f.started && !f.finished).length;
      return {
        run: true,
        tier: "match",
        reason:
          liveCount === 1
            ? "PL fixture live — 15-minute refresh"
            : `${liveCount} PL fixtures live — 15-minute refresh`,
      };
    }

    const bootstrap = await fetchBootstrap();
    const current = bootstrap.events.find((event) => event.is_current);
    if (current && !current.finished) {
      return {
        run: true,
        tier: "match",
        reason: `GW${current.id} live on FPL — 15-minute refresh`,
      };
    }
  } catch {
    // Keep the schedule skip if FPL is unreachable.
  }

  return base;
}

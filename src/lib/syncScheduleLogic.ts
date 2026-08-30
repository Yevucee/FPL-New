import type { FplBootstrapEvent, FplFixture } from "@/providers/fpl/client";

export const MATCH_INTERVAL_MINUTES = 15;
export const POST_DEADLINE_DELAY_MS = 10 * 60_000;
export const POST_GAME_BUFFER_MS = 15 * 60_000;
export const END_OF_DAY_DELAY_MS = 60 * 60_000;
export const MORNING_AFTER_HOUR_UK = 8;
/** Default match length when FPL has not populated minutes yet. */
export const DEFAULT_MATCH_MINUTES = 105;

export type SyncScheduleTier =
  | "forced"
  | "match"
  | "deadline"
  | "maintenance"
  | "skip";

export interface SyncScheduleDecision {
  run: boolean;
  tier: SyncScheduleTier;
  reason: string;
  /** When set, recorded in sync_runs.scope as schedule:{key} so one-offs fire once. */
  scheduleKey?: string;
}

export interface LondonDateTimeParts {
  hour: number;
  minute: number;
  /** 0 = Sunday … 6 = Saturday */
  dayOfWeek: number;
}

export interface ResolveScheduleInput {
  now: Date;
  fixtures: ReadonlyArray<FplFixture>;
  events: ReadonlyArray<FplBootstrapEvent>;
  completedScheduleKeys: ReadonlySet<string>;
  force?: boolean;
}

/** Convert a UTC instant to Europe/London wall-clock parts. */
export function getLondonParts(
  date: Date,
  timeZone = "Europe/London",
): LondonDateTimeParts {
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

/** UK calendar date string YYYY-MM-DD for grouping fixtures by match day. */
export function ukDateKey(date: Date, timeZone = "Europe/London"): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function isMatchInterval(parts: LondonDateTimeParts): boolean {
  return parts.minute % MATCH_INTERVAL_MINUTES === 0;
}

export function fixtureKickoff(fixture: FplFixture): Date | null {
  if (!fixture.kickoff_time) return null;
  const kickoff = new Date(fixture.kickoff_time);
  return Number.isNaN(kickoff.getTime()) ? null : kickoff;
}

/** Estimated full-time for a finished (or in-play) fixture. */
export function fixtureEstimatedEnd(fixture: FplFixture): Date | null {
  const kickoff = fixtureKickoff(fixture);
  if (!kickoff) return null;
  const mins =
    fixture.minutes > 0 ? fixture.minutes : DEFAULT_MATCH_MINUTES;
  return new Date(kickoff.getTime() + mins * 60_000);
}

export function isFixtureInPlay(fixture: FplFixture, now: Date): boolean {
  if (!fixture.started || fixture.finished) return false;
  const kickoff = fixtureKickoff(fixture);
  const estimatedEnd = fixtureEstimatedEnd(fixture);
  if (!kickoff || !estimatedEnd) return false;
  return (
    now.getTime() >= kickoff.getTime() &&
    now.getTime() <= estimatedEnd.getTime() + POST_GAME_BUFFER_MS
  );
}

/** FPL sometimes leaves finished=false long after full time — treat as done once past the buffer. */
export function isFixtureEffectivelyFinished(
  fixture: FplFixture,
  now: Date,
): boolean {
  if (fixture.finished) return true;
  if (!fixture.started) return false;
  const ended = fixtureEstimatedEnd(fixture);
  if (!ended) return false;
  return now.getTime() > ended.getTime() + POST_GAME_BUFFER_MS;
}

export function hasLiveFixtures(
  fixtures: ReadonlyArray<FplFixture>,
  now = new Date(),
): boolean {
  return fixtures.some((fixture) => isFixtureInPlay(fixture, now));
}

/** Finished within the post-game buffer (bonus / late stat tweaks). */
export function hasRecentlyFinishedFixtures(
  fixtures: ReadonlyArray<FplFixture>,
  now: Date,
  bufferMs = POST_GAME_BUFFER_MS,
): boolean {
  return fixtures.some((fixture) => {
    if (fixture.finished) {
      const ended = fixtureEstimatedEnd(fixture);
      if (!ended) return false;
      const elapsed = now.getTime() - ended.getTime();
      return elapsed >= 0 && elapsed <= bufferMs;
    }

    // FPL sometimes leaves finished=false after full time; treat as recently done
    // only while we are still inside the post-whistle buffer.
    if (!fixture.started || isFixtureInPlay(fixture, now)) return false;
    const ended = fixtureEstimatedEnd(fixture);
    if (!ended) return false;
    const elapsed = now.getTime() - ended.getTime();
    return elapsed >= 0 && elapsed <= bufferMs;
  });
}

function isCompleted(key: string, completed: ReadonlySet<string>): boolean {
  return completed.has(key);
}

/** Post-deadline sync for the latest GW whose deadline has passed (any day of week). */
export function postDeadlineSchedule(
  events: ReadonlyArray<FplBootstrapEvent>,
  now: Date,
  completed: ReadonlySet<string>,
): SyncScheduleDecision | null {
  const eligible = events
    .filter((event) => {
      const deadline = new Date(event.deadline_time);
      if (Number.isNaN(deadline.getTime())) return false;
      if (now.getTime() < deadline.getTime() + POST_DEADLINE_DELAY_MS) return false;
      if (event.finished && event.data_checked) return false;
      return true;
    })
    .sort((a, b) => b.id - a.id);

  for (const event of eligible) {
    const key = `post-deadline-gw${event.id}`;
    if (isCompleted(key, completed)) continue;
    return {
      run: true,
      tier: "deadline",
      reason: `GW${event.id} deadline passed — squad lock refresh`,
      scheduleKey: key,
    };
  }
  return null;
}

/** One hour after the last fixture of a UK calendar day has finished. */
export function endOfDaySchedule(
  fixtures: ReadonlyArray<FplFixture>,
  now: Date,
  completed: ReadonlySet<string>,
  timeZone = "Europe/London",
): SyncScheduleDecision | null {
  const byDay = new Map<string, FplFixture[]>();
  for (const fixture of fixtures) {
    const kickoff = fixtureKickoff(fixture);
    if (!kickoff) continue;
    const day = ukDateKey(kickoff, timeZone);
    const list = byDay.get(day) ?? [];
    list.push(fixture);
    byDay.set(day, list);
  }

  for (const [day, dayFixtures] of byDay) {
    if (dayFixtures.some((fixture) => !isFixtureEffectivelyFinished(fixture, now))) {
      continue;
    }

    let latestEnd = 0;
    for (const fixture of dayFixtures) {
      const ended = fixtureEstimatedEnd(fixture);
      if (ended) latestEnd = Math.max(latestEnd, ended.getTime());
    }
    if (latestEnd === 0) continue;

    const triggerAt = latestEnd + END_OF_DAY_DELAY_MS;
    if (now.getTime() < triggerAt) continue;

    const key = `end-of-day-${day}`;
    if (isCompleted(key, completed)) continue;

    return {
      run: true,
      tier: "maintenance",
      reason: `end of ${day} fixtures — final daily refresh`,
      scheduleKey: key,
    };
  }
  return null;
}

/** 08:00 UK the morning after a day that had fixtures. */
export function morningAfterSchedule(
  fixtures: ReadonlyArray<FplFixture>,
  now: Date,
  completed: ReadonlySet<string>,
  timeZone = "Europe/London",
): SyncScheduleDecision | null {
  const parts = getLondonParts(now, timeZone);
  if (parts.hour !== MORNING_AFTER_HOUR_UK || !isMatchInterval(parts)) {
    return null;
  }

  const todayKey = ukDateKey(now, timeZone);
  const yesterday = new Date(now.getTime() - 24 * 60 * 60_000);
  const yesterdayKey = ukDateKey(yesterday, timeZone);

  const hadFixturesYesterday = fixtures.some((fixture) => {
    const kickoff = fixtureKickoff(fixture);
    return kickoff && ukDateKey(kickoff, timeZone) === yesterdayKey;
  });
  if (!hadFixturesYesterday) return null;

  const key = `morning-after-${todayKey}`;
  if (isCompleted(key, completed)) return null;

  return {
    run: true,
    tier: "maintenance",
    reason: `morning after ${yesterdayKey} fixtures — catch-up refresh`,
    scheduleKey: key,
  };
}

/** Once FPL marks a GW finished and data-checked. */
export function gameweekFinalSchedule(
  events: ReadonlyArray<FplBootstrapEvent>,
  completed: ReadonlySet<string>,
): SyncScheduleDecision | null {
  for (const event of events) {
    if (!event.finished || !event.data_checked) continue;
    const key = `gw-final-gw${event.id}`;
    if (isCompleted(key, completed)) continue;
    return {
      run: true,
      tier: "maintenance",
      reason: `GW${event.id} finalised on FPL — season refresh`,
      scheduleKey: key,
    };
  }
  return null;
}

/** Periodic refresh while the current GW is still open on FPL (fallback when flags lag). */
export function liveGameweekRefreshSchedule(
  events: ReadonlyArray<FplBootstrapEvent>,
  fixtures: ReadonlyArray<FplFixture>,
  now: Date,
): SyncScheduleDecision | null {
  const current = events.find((event) => event.is_current);
  if (!current || current.finished) return null;

  const gwFixtures = fixtures.filter((fixture) => fixture.event === current.id);
  const hadKickoffs = gwFixtures.some((fixture) => {
    const kickoff = fixtureKickoff(fixture);
    return kickoff !== null && kickoff.getTime() <= now.getTime();
  });
  if (!hadKickoffs) return null;

  const parts = getLondonParts(now);
  if (!isMatchInterval(parts)) return null;

  return {
    run: true,
    tier: "match",
    reason: `GW${current.id} open on FPL — periodic score refresh`,
  };
}

/**
 * Fixture-driven sync schedule:
 * - Every 15 min while PL games are live or just finished (+15 min buffer)
 * - Once after each GW deadline (from FPL deadline_time)
 * - Once ~1 h after all fixtures on a calendar day finish
 * - Once at 08:00 UK the morning after a fixture day
 * - Once when FPL finalises a GW (finished + data_checked)
 */
export function resolveScheduleFromFpl(input: ResolveScheduleInput): SyncScheduleDecision {
  if (input.force || process.env.FPL_SYNC_FORCE === "1") {
    return { run: true, tier: "forced", reason: "forced run" };
  }

  const { now, fixtures, events, completedScheduleKeys: completed } = input;
  const parts = getLondonParts(now);

  if (isMatchInterval(parts)) {
    if (hasLiveFixtures(fixtures, now)) {
      const liveCount = fixtures.filter((f) => isFixtureInPlay(f, now)).length;
      return {
        run: true,
        tier: "match",
        reason:
          liveCount === 1
            ? "PL fixture live — 15-minute refresh"
            : `${liveCount} PL fixtures live — 15-minute refresh`,
      };
    }

    if (hasRecentlyFinishedFixtures(fixtures, now)) {
      return {
        run: true,
        tier: "match",
        reason: "fixture just finished — 15-minute post-whistle refresh",
      };
    }
  } else if (hasLiveFixtures(fixtures, now) || hasRecentlyFinishedFixtures(fixtures, now)) {
    return {
      run: false,
      tier: "skip",
      reason: "live fixture — waiting for 15-minute slot",
    };
  }

  return (
    postDeadlineSchedule(events, now, completed) ??
    gameweekFinalSchedule(events, completed) ??
    endOfDaySchedule(fixtures, now, completed) ??
    morningAfterSchedule(fixtures, now, completed) ??
    liveGameweekRefreshSchedule(events, fixtures, now) ?? {
      run: false,
      tier: "skip",
      reason: "no live fixtures or scheduled sync slot",
    }
  );
}

/** Post-deadline one-offs need enrich (captain / most-owned) before we mark them done. */
export function scheduleKeyComplete(args: {
  scheduleKey: string;
  importOk: boolean;
  enrichOk: boolean;
}): boolean {
  if (!args.importOk) return false;
  if (args.scheduleKey.startsWith("post-deadline")) return args.enrichOk;
  return true;
}

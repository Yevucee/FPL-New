import { describe, expect, it } from "vitest";

import type { FplBootstrapEvent, FplFixture } from "@/providers/fpl/client";

import {
  endOfDaySchedule,
  gameweekFinalSchedule,
  getLondonParts,
  hasLiveFixtures,
  hasRecentlyFinishedFixtures,
  isMatchInterval,
  morningAfterSchedule,
  postDeadlineSchedule,
  POST_DEADLINE_DELAY_MS,
  POST_GAME_BUFFER_MS,
  END_OF_DAY_DELAY_MS,
  resolveScheduleFromFpl,
} from "./syncScheduleLogic";

/** Build a UTC Date for a UK local wall time (handles BST in summer). */
function londonLocalToUtc(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
): Date {
  const guess = new Date(Date.UTC(year, month - 1, day, hour, minute));
  const parts = getLondonParts(guess);
  const deltaMinutes =
    (hour - parts.hour) * 60 + (minute - parts.minute);
  return new Date(guess.getTime() + deltaMinutes * 60_000);
}

function fixture(partial: Partial<FplFixture> & Pick<FplFixture, "id">): FplFixture {
  return {
    event: 1,
    kickoff_time: "2026-08-22T14:00:00Z",
    started: false,
    finished: false,
    minutes: 0,
    ...partial,
  };
}

function event(partial: Partial<FplBootstrapEvent> & Pick<FplBootstrapEvent, "id">): FplBootstrapEvent {
  return {
    name: `GW${partial.id}`,
    deadline_time: "2026-08-22T10:00:00Z",
    finished: false,
    data_checked: false,
    is_current: partial.id === 1,
    is_next: false,
    ...partial,
  };
};

describe("resolveScheduleFromFpl", () => {
  it("skips on a quiet Saturday morning with no live fixtures", () => {
    const now = londonLocalToUtc(2026, 8, 22, 9, 0);
    const fixtures: FplFixture[] = [
      fixture({
        id: 1,
        kickoff_time: "2026-08-22T11:30:00Z",
        started: false,
        finished: false,
      }),
    ];

    const decision = resolveScheduleFromFpl({
      now,
      fixtures,
      events: [event({ id: 1, deadline_time: "2026-08-21T17:30:00Z" })],
      completedScheduleKeys: new Set([
        "post-deadline-gw1",
        "end-of-day-2026-08-21",
      ]),
    });

    expect(decision.run).toBe(false);
    expect(decision.tier).toBe("skip");
  });

  it("skips repeated live sync when FPL leaves finished=false after full time", () => {
    const now = londonLocalToUtc(2026, 8, 24, 10, 30);
    const fixtures: FplFixture[] = [
      fixture({
        id: 1,
        kickoff_time: "2026-08-21T19:00:00Z",
        started: true,
        finished: false,
        minutes: 90,
      }),
    ];

    const decision = resolveScheduleFromFpl({
      now,
      fixtures,
      events: [event({ id: 1, deadline_time: "2026-08-21T17:30:00Z" })],
      completedScheduleKeys: new Set([
        "post-deadline-gw1",
        "end-of-day-2026-08-21",
        "end-of-day-2026-08-22",
        "end-of-day-2026-08-23",
        "morning-after-2026-08-22",
        "morning-after-2026-08-23",
        "morning-after-2026-08-24",
      ]),
    });

    expect(decision.run).toBe(false);
    expect(decision.reason).toContain("no live fixtures");
  });

  it("syncs every 15 minutes while a fixture is live", () => {
    const now = londonLocalToUtc(2026, 8, 22, 15, 0);
    const fixtures: FplFixture[] = [
      fixture({ id: 1, started: true, finished: false, minutes: 55 }),
    ];

    const decision = resolveScheduleFromFpl({
      now,
      fixtures,
      events: [event({ id: 1 })],
      completedScheduleKeys: new Set(),
    });

    expect(decision.run).toBe(true);
    expect(decision.tier).toBe("match");
    expect(decision.reason).toContain("live");
  });

  it("waits for quarter hour between live updates", () => {
    const now = londonLocalToUtc(2026, 8, 22, 15, 7);
    const fixtures: FplFixture[] = [
      fixture({ id: 1, started: true, finished: false, minutes: 30 }),
    ];

    const decision = resolveScheduleFromFpl({
      now,
      fixtures,
      events: [event({ id: 1 })],
      completedScheduleKeys: new Set(),
    });

    expect(decision.run).toBe(false);
    expect(decision.reason).toContain("15-minute slot");
  });

  it("syncs shortly after a fixture ends (post-whistle buffer)", () => {
    const kickoff = new Date("2026-08-22T14:00:00Z");
    const now = londonLocalToUtc(2026, 8, 22, 16, 30);

    const fixtures: FplFixture[] = [
      fixture({
        id: 1,
        kickoff_time: kickoff.toISOString(),
        started: true,
        finished: true,
        minutes: 90,
      }),
    ];

    const decision = resolveScheduleFromFpl({
      now,
      fixtures,
      events: [event({ id: 1 })],
      completedScheduleKeys: new Set(["post-deadline-gw1"]),
    });

    expect(decision.run).toBe(true);
    expect(decision.reason).toContain("post-whistle");
  });

  it("runs post-deadline sync from FPL deadline_time (not Friday-specific)", () => {
    const deadline = new Date("2026-08-22T10:00:00Z");
    const now = new Date(deadline.getTime() + POST_DEADLINE_DELAY_MS + 60_000);

    const decision = resolveScheduleFromFpl({
      now,
      fixtures: [],
      events: [
        event({
          id: 1,
          deadline_time: deadline.toISOString(),
          is_current: true,
        }),
      ],
      completedScheduleKeys: new Set(),
    });

    expect(decision.run).toBe(true);
    expect(decision.tier).toBe("deadline");
    expect(decision.scheduleKey).toBe("post-deadline-gw1");
  });

  it("does not repeat post-deadline sync", () => {
    const deadline = new Date("2026-08-22T10:00:00Z");
    const now = new Date(deadline.getTime() + POST_DEADLINE_DELAY_MS + 60_000);

    const decision = resolveScheduleFromFpl({
      now,
      fixtures: [],
      events: [event({ id: 1, deadline_time: deadline.toISOString() })],
      completedScheduleKeys: new Set(["post-deadline-gw1"]),
    });

    expect(decision.run).toBe(false);
  });

  it("runs end-of-day sync one hour after last fixture finishes", () => {
    const kickoff = new Date("2026-08-21T19:00:00Z");
    const fixtures: FplFixture[] = [
      fixture({
        id: 1,
        kickoff_time: kickoff.toISOString(),
        started: true,
        finished: true,
        minutes: 90,
      }),
    ];
    const ended = new Date(kickoff.getTime() + 90 * 60_000);
    const now = new Date(ended.getTime() + END_OF_DAY_DELAY_MS + 60_000);

    const decision = resolveScheduleFromFpl({
      now,
      fixtures,
      events: [event({ id: 1 })],
      completedScheduleKeys: new Set(),
    });

    expect(decision.run).toBe(true);
    expect(decision.scheduleKey).toMatch(/^end-of-day-/);
  });

  it("runs morning-after sync at 08:00 UK following a fixture day", () => {
    const now = londonLocalToUtc(2026, 8, 22, 8, 0);
    const fixtures: FplFixture[] = [
      fixture({
        id: 1,
        kickoff_time: "2026-08-21T19:00:00Z",
        finished: true,
        minutes: 90,
      }),
    ];

    const decision = resolveScheduleFromFpl({
      now,
      fixtures,
      events: [event({ id: 1 })],
      completedScheduleKeys: new Set(["post-deadline-gw1", "end-of-day-2026-08-21"]),
    });

    expect(decision.run).toBe(true);
    expect(decision.scheduleKey).toMatch(/^morning-after-/);
  });

  it("runs GW final sync when FPL marks data checked", () => {
    const decision = resolveScheduleFromFpl({
      now: new Date(),
      fixtures: [],
      events: [
        event({
          id: 1,
          finished: true,
          data_checked: true,
          is_current: true,
        }),
      ],
      completedScheduleKeys: new Set(),
    });

    expect(decision.run).toBe(true);
    expect(decision.scheduleKey).toBe("gw-final-gw1");
  });
});

describe("hasRecentlyFinishedFixtures", () => {
  it("returns false outside the post-whistle buffer", () => {
    const kickoff = new Date("2026-08-22T14:00:00Z");
    const now = new Date(kickoff.getTime() + 100 * 60_000 + POST_GAME_BUFFER_MS);
    expect(
      hasRecentlyFinishedFixtures(
        [
          fixture({
            id: 1,
            kickoff_time: kickoff.toISOString(),
            finished: true,
            minutes: 90,
          }),
        ],
        now,
      ),
    ).toBe(false);
  });
});

describe("isMatchInterval", () => {
  it("matches quarter hours", () => {
    expect(isMatchInterval(getLondonParts(londonLocalToUtc(2026, 8, 22, 15, 0)))).toBe(true);
    expect(isMatchInterval(getLondonParts(londonLocalToUtc(2026, 8, 22, 15, 7)))).toBe(false);
  });
});

describe("hasLiveFixtures", () => {
  it("detects in-play fixtures within kickoff window", () => {
    const kickoff = new Date("2026-08-22T14:00:00Z");
    const now = new Date(kickoff.getTime() + 55 * 60_000);
    expect(
      hasLiveFixtures(
        [
          fixture({
            id: 1,
            kickoff_time: kickoff.toISOString(),
            started: true,
            finished: false,
            minutes: 55,
          }),
        ],
        now,
      ),
    ).toBe(true);
  });

  it("ignores stale FPL flags after estimated full time", () => {
    const now = new Date("2026-08-24T09:30:00Z");
    expect(
      hasLiveFixtures(
        [
          fixture({
            id: 1,
            kickoff_time: "2026-08-21T19:00:00Z",
            started: true,
            finished: false,
            minutes: 90,
          }),
        ],
        now,
      ),
    ).toBe(false);
  });
});

describe("postDeadlineSchedule", () => {
  it("picks the latest eligible GW", () => {
    const now = new Date("2026-08-22T12:00:00Z");
    const decision = postDeadlineSchedule(
      [
        event({ id: 1, deadline_time: "2026-08-15T17:30:00Z", finished: true, data_checked: true }),
        event({ id: 2, deadline_time: "2026-08-22T10:00:00Z", is_current: true }),
      ],
      now,
      new Set(["post-deadline-gw1"]),
    );
    expect(decision?.scheduleKey).toBe("post-deadline-gw2");
  });
});

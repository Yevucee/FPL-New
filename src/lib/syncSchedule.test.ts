import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  getLondonParts,
  isMatchInterval,
  resolveAutomatedSyncSchedule,
} from "./syncSchedule";

vi.mock("@/providers/fpl/client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/providers/fpl/client")>();
  return {
    ...actual,
    fetchFixtures: vi.fn(),
    fetchBootstrap: vi.fn(),
  };
});

vi.mock("@/lib/syncScheduleState", () => ({
  loadCompletedScheduleKeys: vi.fn().mockResolvedValue(
    new Set(["post-deadline-gw1", "end-of-day-2026-08-21"]),
  ),
  scheduleScopeForKey: (key: string) => `schedule:${key}`,
}));

import { fetchBootstrap, fetchFixtures } from "@/providers/fpl/client";

const mockFetchFixtures = vi.mocked(fetchFixtures);
const mockFetchBootstrap = vi.mocked(fetchBootstrap);

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

describe("resolveAutomatedSyncSchedule", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("skips quiet morning when no fixtures are live", async () => {
    mockFetchFixtures.mockResolvedValue([
      {
        id: 1,
        event: 1,
        kickoff_time: "2026-08-22T11:30:00Z",
        started: false,
        finished: false,
        minutes: 0,
      },
    ]);
    mockFetchBootstrap.mockResolvedValue({
      events: [
        {
          id: 1,
          name: "GW1",
          deadline_time: "2026-08-21T17:30:00Z",
          finished: false,
          data_checked: false,
          is_current: true,
          is_next: false,
        },
      ],
      elements: [],
    });

    const sat0900 = londonLocalToUtc(2026, 8, 22, 9, 0);
    const decision = await resolveAutomatedSyncSchedule(sat0900);
    expect(decision.run).toBe(false);
  });

  it("runs when a PL fixture is live on a quarter hour", async () => {
    mockFetchFixtures.mockResolvedValue([
      {
        id: 1,
        event: 1,
        kickoff_time: "2026-08-22T14:00:00Z",
        started: true,
        finished: false,
        minutes: 40,
      },
    ]);
    mockFetchBootstrap.mockResolvedValue({
      events: [
        {
          id: 1,
          name: "GW1",
          deadline_time: "2026-08-21T17:30:00Z",
          finished: false,
          data_checked: false,
          is_current: true,
          is_next: false,
        },
      ],
      elements: [],
    });

    const sat1500 = londonLocalToUtc(2026, 8, 22, 15, 0);
    const decision = await resolveAutomatedSyncSchedule(sat1500);
    expect(decision.run).toBe(true);
    expect(decision.tier).toBe("match");
  });
});

describe("isMatchInterval", () => {
  it("is true on quarter hours", () => {
    expect(isMatchInterval(getLondonParts(londonLocalToUtc(2026, 8, 22, 15, 0)))).toBe(true);
  });
});

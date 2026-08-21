import { beforeEach, describe, expect, it, vi } from "vitest";

import { hasLiveFixtures } from "@/providers/fpl/client";

import {
  getLondonParts,
  isMatchWindow,
  resolveAutomatedSyncSchedule,
  shouldRunAutomatedSync,
} from "./syncSchedule";

vi.mock("@/providers/fpl/client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/providers/fpl/client")>();
  return {
    ...actual,
    fetchFixtures: vi.fn(),
    fetchBootstrap: vi.fn(),
  };
});

import { fetchBootstrap, fetchFixtures } from "@/providers/fpl/client";

const mockFetchFixtures = vi.mocked(fetchFixtures);
const mockFetchBootstrap = vi.mocked(fetchBootstrap);

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

describe("isMatchWindow", () => {
  it("includes Saturday afternoon kick-offs", () => {
    const parts = getLondonParts(londonLocalToUtc(2026, 8, 15, 15, 0));
    expect(isMatchWindow(parts)).toBe(true);
  });

  it("excludes Wednesday afternoon before evening games", () => {
    const parts = getLondonParts(londonLocalToUtc(2026, 8, 12, 14, 0));
    expect(isMatchWindow(parts)).toBe(false);
  });

  it("includes Wednesday evening fixtures", () => {
    const parts = getLondonParts(londonLocalToUtc(2026, 8, 12, 20, 0));
    expect(isMatchWindow(parts)).toBe(true);
  });

  it("includes Friday deadline window", () => {
    const parts = getLondonParts(londonLocalToUtc(2026, 8, 14, 18, 30));
    expect(isMatchWindow(parts)).toBe(true);
  });

  it("includes Friday evening fixtures through 22:30", () => {
    const parts = getLondonParts(londonLocalToUtc(2026, 8, 21, 21, 0));
    expect(isMatchWindow(parts)).toBe(true);
  });

  it("excludes late Friday after match window", () => {
    const parts = getLondonParts(londonLocalToUtc(2026, 8, 21, 23, 0));
    expect(isMatchWindow(parts)).toBe(false);
  });
});

describe("shouldRunAutomatedSync", () => {
  it("runs every 15 minutes during match windows", () => {
    const sat1500 = londonLocalToUtc(2026, 8, 15, 15, 0);
    expect(shouldRunAutomatedSync(sat1500).run).toBe(true);
    expect(shouldRunAutomatedSync(sat1500).tier).toBe("match");

    const sat1507 = londonLocalToUtc(2026, 8, 15, 15, 7);
    expect(shouldRunAutomatedSync(sat1507).run).toBe(false);
  });

  it("runs on maintenance slots off-peak", () => {
    const tue0600 = londonLocalToUtc(2026, 8, 11, 6, 0);
    expect(shouldRunAutomatedSync(tue0600).run).toBe(true);
    expect(shouldRunAutomatedSync(tue0600).tier).toBe("maintenance");
  });

  it("skips quiet hours outside match windows", () => {
    const tue0300 = londonLocalToUtc(2026, 8, 11, 3, 0);
    expect(shouldRunAutomatedSync(tue0300).run).toBe(false);
    expect(shouldRunAutomatedSync(tue0300).tier).toBe("skip");
  });

  it("runs on Friday evening 15-minute slots", () => {
    const fri2015 = londonLocalToUtc(2026, 8, 21, 20, 15);
    expect(shouldRunAutomatedSync(fri2015).run).toBe(true);
    expect(shouldRunAutomatedSync(fri2015).tier).toBe("match");

    const fri2030 = londonLocalToUtc(2026, 8, 21, 20, 30);
    expect(shouldRunAutomatedSync(fri2030).run).toBe(true);
  });
});

describe("hasLiveFixtures", () => {
  it("detects fixtures in play", () => {
    expect(hasLiveFixtures([{ started: true, finished: false }])).toBe(true);
    expect(hasLiveFixtures([{ started: true, finished: true }])).toBe(false);
    expect(hasLiveFixtures([{ started: false, finished: false }])).toBe(false);
  });
});

describe("resolveAutomatedSyncSchedule", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("runs every 15 minutes when a PL fixture is live outside match windows", async () => {
    mockFetchFixtures.mockResolvedValue([
      { id: 1, event: 1, started: true, finished: false, minutes: 55 },
    ]);
    mockFetchBootstrap.mockResolvedValue({
      events: [{ id: 1, name: "GW1", deadline_time: "", finished: false, data_checked: false, is_current: true, is_next: false }],
      elements: [],
    });

    const tue1400 = londonLocalToUtc(2026, 8, 11, 14, 0);
    const decision = await resolveAutomatedSyncSchedule(tue1400);
    expect(decision.run).toBe(true);
    expect(decision.tier).toBe("match");
    expect(decision.reason).toContain("PL fixture live");
  });

  it("skips between 15-minute slots even when fixtures are live", async () => {
    mockFetchFixtures.mockResolvedValue([
      { id: 1, event: 1, started: true, finished: false, minutes: 22 },
    ]);

    const tue1407 = londonLocalToUtc(2026, 8, 11, 14, 7);
    const decision = await resolveAutomatedSyncSchedule(tue1407);
    expect(decision.run).toBe(false);
    expect(mockFetchFixtures).not.toHaveBeenCalled();
  });
});

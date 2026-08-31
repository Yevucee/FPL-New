import { describe, expect, it, vi } from "vitest";

import { overlayLiveGameweekScores, correctBenchBoostLiveScores } from "@/lib/liveLeagueScores";
import type { ResultInput } from "@/metrics/types";

vi.mock("@/providers/fpl/client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/providers/fpl/client")>();
  return {
    ...actual,
    fetchEntryPicks: vi.fn(),
    sleep: vi.fn().mockResolvedValue(undefined),
  };
});

import { fetchEntryPicks } from "@/providers/fpl/client";

describe("overlayLiveGameweekScores", () => {
  it("patches GW scores from live league standings", () => {
    const results: ResultInput[] = [
      {
        entryId: "internal-1",
        eventNumber: 2,
        phase: 8,
        netPoints: 0,
        grossPoints: 0,
        transferCost: 4,
        benchPoints: 12,
        benchBoostPoints: null,
        chip: null,
      },
    ];

    const patched = overlayLiveGameweekScores(
      results,
      2,
      new Map([["3386632", "internal-1"]]),
      new Map([
        [
          "3386632",
          { entryId: "3386632", eventTotal: 105, total: 155, rank: 3 },
        ],
      ]),
      new Map([[2, 8]]),
    );

    expect(patched).toHaveLength(1);
    expect(patched[0]).toMatchObject({
      entryId: "internal-1",
      eventNumber: 2,
      netPoints: 105,
      grossPoints: 109,
      transferCost: 4,
      benchPoints: 12,
    });
  });

  it("adds a row when the DB has no result for the live GW yet", () => {
    const patched = overlayLiveGameweekScores(
      [],
      2,
      new Map([["3386632", "internal-1"]]),
      new Map([
        [
          "3386632",
          { entryId: "3386632", eventTotal: 82, total: 132, rank: 5 },
        ],
      ]),
      new Map([[2, 8]]),
    );

    expect(patched).toHaveLength(1);
    expect(patched[0]?.netPoints).toBe(82);
  });
});

describe("correctBenchBoostLiveScores", () => {
  it("replaces league total with all 15 players when Bench Boost is active", async () => {
    const results: ResultInput[] = [
      {
        entryId: "internal-1",
        eventNumber: 2,
        phase: 8,
        netPoints: 86,
        grossPoints: 86,
        transferCost: 0,
        benchPoints: 0,
        benchBoostPoints: null,
        chip: "bboost",
      },
    ];

    vi.mocked(fetchEntryPicks).mockResolvedValue({
      active_chip: "bboost",
      picks: [
        { element: 411, position: 10, multiplier: 2, is_captain: true, is_vice_captain: false },
        { element: 426, position: 6, multiplier: 1, is_captain: false, is_vice_captain: false },
        { element: 124, position: 13, multiplier: 1, is_captain: false, is_vice_captain: false },
        { element: 57, position: 12, multiplier: 1, is_captain: false, is_vice_captain: false },
      ],
    });

    const livePoints = new Map([
      [411, 13],
      [426, 23],
      [124, 13],
      [57, 3],
    ]);

    const patched = await correctBenchBoostLiveScores(
      results,
      2,
      [{ entryId: "internal-1", providerEntryId: "3386632" }],
      livePoints,
    );

    expect(patched[0]).toMatchObject({
      netPoints: 65,
      grossPoints: 65,
      benchBoostPoints: 16,
      chip: "bboost",
    });
  });
});

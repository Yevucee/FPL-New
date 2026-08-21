import { describe, expect, it } from "vitest";

import { applyLiveLeagueScores } from "./buildSnapshot";

describe("applyLiveLeagueScores", () => {
  it("replaces stale zero history with live league standings", () => {
    const entries = [
      {
        providerEntryId: "4716578",
        managerName: "Roland Christandl",
        teamName: "Team Roland",
        joinEvent: 1,
        results: [
          {
            eventNumber: 1,
            netPoints: 0,
            grossPoints: 0,
            transferCost: 0,
            totalPoints: 0,
            benchPoints: 0,
          },
        ],
      },
    ];

    const liveScores = new Map([
      [
        "4716578",
        { entryId: "4716578", eventTotal: 19, total: 19, rank: 1 },
      ],
    ]);

    const updated = applyLiveLeagueScores(entries, 1, liveScores);
    expect(updated[0]!.results[0]).toMatchObject({
      eventNumber: 1,
      netPoints: 19,
      totalPoints: 19,
    });
  });

  it("adds a live GW row when history has not populated yet", () => {
    const entries = [
      {
        providerEntryId: "999",
        managerName: "Test Manager",
        teamName: "Test FC",
        joinEvent: 1,
        results: [],
      },
    ];

    const liveScores = new Map([
      ["999", { entryId: "999", eventTotal: 12, total: 12, rank: 2 }],
    ]);

    const updated = applyLiveLeagueScores(entries, 1, liveScores);
    expect(updated[0]!.results).toHaveLength(1);
    expect(updated[0]!.results[0]!.netPoints).toBe(12);
  });
});

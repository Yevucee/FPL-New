import { describe, expect, it } from "vitest";

import { computeLeagueInsights } from "./insights";
import type { EntryInput, ResultInput } from "./types";

const entries: EntryInput[] = [
  { entryId: "a", managerName: "Alex", teamName: "A FC", joinEvent: 1 },
  { entryId: "b", managerName: "Bea", teamName: "B FC", joinEvent: 1 },
  { entryId: "c", managerName: "Cai", teamName: "C FC", joinEvent: 1 },
];

function result(
  entryId: string,
  eventNumber: number,
  netPoints: number,
  opts: Partial<ResultInput> = {},
): ResultInput {
  return {
    entryId,
    eventNumber,
    phase: opts.phase ?? 1,
    netPoints,
    grossPoints: opts.grossPoints ?? netPoints,
    transferCost: opts.transferCost ?? 0,
    benchPoints: opts.benchPoints ?? 0,
    chip: opts.chip ?? null,
  };
}

describe("computeLeagueInsights", () => {
  const results: ResultInput[] = [
    result("a", 1, 60, { benchPoints: 4 }),
    result("b", 1, 72, { transferCost: 4 }),
    result("c", 1, 44),
    result("a", 2, 80),
    result("b", 2, 50),
    result("c", 2, 70, { chip: "3xc" }),
  ];

  it("surfaces wooden spoon and league average for the gameweek", () => {
    const insights = computeLeagueInsights(entries, results, 1);
    expect(insights.woodenSpoon?.entryId).toBe("c");
    expect(insights.woodenSpoon?.value).toBe(44);
    expect(insights.leagueAverageGw).toBeCloseTo(58.67, 1);
  });

  it("finds biggest climber after GW2", () => {
    const insights = computeLeagueInsights(entries, results, 2);
    expect(insights.biggestClimber?.entryId).toBe("a");
    expect(insights.biggestClimber?.movement).toBe(1);
  });

  it("tracks chips and bench/transfer leaders", () => {
    const gw1 = computeLeagueInsights(entries, results, 1);
    expect(gw1.benchPointsLeader?.entryId).toBe("a");
    expect(gw1.transferHitsLeader?.entryId).toBe("b");

    const gw2 = computeLeagueInsights(entries, results, 2);
    expect(gw2.chipsPlayed.some((c) => c.chip === "3xc")).toBe(true);
  });

  it("counts weeks at top and last place across the season", () => {
    const gw1 = computeLeagueInsights(entries, results, 1);
    expect(gw1.mostWeeksAtTop?.entryId).toBe("b");
    expect(gw1.mostWeeksAtTop?.value).toBe(1);
    expect(gw1.mostWeeksLast?.entryId).toBe("c");
    expect(gw1.mostWeeksLast?.value).toBe(1);

    const gw2 = computeLeagueInsights(entries, results, 2);
    expect(gw2.mostWeeksAtTop?.entryId).toBe("a");
    expect(gw2.mostWeeksAtTop?.value).toBe(1);
    expect(gw2.mostWeeksLast?.entryId).toBe("c");
    expect(gw2.mostWeeksLast?.value).toBe(2);
  });

  it("tracks season scoring extremes and award counts", () => {
    const gw2 = computeLeagueInsights(entries, results, 2);
    expect(gw2.seasonBestGw?.entryId).toBe("a");
    expect(gw2.seasonBestGw?.value).toBe(80);
    expect(gw2.seasonWorstGw?.entryId).toBe("c");
    expect(gw2.seasonWorstGw?.value).toBe(44);
    expect(gw2.mostGameweekWins?.entryId).toBe("a");
    expect(gw2.mostGameweekWins?.value).toBe(1);
    expect(gw2.seasonWoodenSpoonCount?.entryId).toBe("b");
    expect(gw2.seasonWoodenSpoonCount?.value).toBe(1);
  });

  it("uses chip-specific points for best chip weeks", () => {
    const chipResults: ResultInput[] = [
      result("a", 3, 95, { chip: "bboost", benchPoints: 18 }),
      result("b", 5, 102, { chip: "bboost", benchPoints: 24 }),
      result("a", 6, 88, { chip: "freehit" }),
      result("b", 7, 91, { chip: "freehit" }),
      result("a", 8, 70, { chip: "3xc" }),
      result("b", 9, 80, { chip: "3xc" }),
    ];
    const captainPointsHistory = [
      { entryId: "a", eventNumber: 8, points: 21 },
      { entryId: "b", eventNumber: 9, points: 36 },
    ];

    const insights = computeLeagueInsights(entries, chipResults, 9, { captainPointsHistory });

    expect(insights.bestBenchBoost?.entryId).toBe("b");
    expect(insights.bestBenchBoost?.value).toBe(24);
    expect(insights.bestFreeHit?.entryId).toBe("b");
    expect(insights.bestFreeHit?.value).toBe(91);
    expect(insights.bestTripleCaptain?.entryId).toBe("b");
    expect(insights.bestTripleCaptain?.value).toBe(36);
  });

  it("tracks captain herd picks and squad template overlap", () => {
    const captainHistory = [
      { entryId: "a", eventNumber: 1, captainName: "Haaland" },
      { entryId: "b", eventNumber: 1, captainName: "Haaland" },
      { entryId: "c", eventNumber: 1, captainName: "Salah" },
      { entryId: "a", eventNumber: 2, captainName: "Salah" },
      { entryId: "b", eventNumber: 2, captainName: "Salah" },
      { entryId: "c", eventNumber: 2, captainName: "Salah" },
    ];
    const squadIntelByEvent = [
      {
        eventNumber: 1,
        mostOwned: [
          { elementId: 1, webName: "Haaland", ownerCount: 2, ownerPct: 66.7 },
          { elementId: 2, webName: "Salah", ownerCount: 1, ownerPct: 33.3 },
        ],
        squads: [
          { entryId: "a", starterIds: [1, 2, 3] },
          { entryId: "b", starterIds: [1, 99, 100] },
          { entryId: "c", starterIds: [99, 100, 101] },
        ],
      },
    ];

    const insights = computeLeagueInsights(entries, results, 2, {
      captainHistory,
      squadIntelByEvent,
    });

    expect(insights.captainCopycat?.entryId).toBe("a");
    expect(insights.captainCopycat?.value).toBe(2);
    expect(insights.captainDifferential?.entryId).toBe("c");
    expect(insights.captainDifferential?.value).toBe(1);
    expect(insights.mostTemplate?.entryId).toBe("a");
    expect(insights.mostContrarian?.entryId).toBe("c");
  });
});

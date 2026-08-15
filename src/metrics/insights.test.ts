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
});

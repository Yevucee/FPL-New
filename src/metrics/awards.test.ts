import { describe, expect, it } from "vitest";

import { gameweekWinner, monthlyWinner, woodenSpoon } from "./awards";
import { computeStandings } from "./standings";
import type { EntryInput, ResultInput } from "./types";

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
  };
}

const entries: EntryInput[] = [
  { entryId: "a", managerName: "Alex", teamName: "A FC", joinEvent: 1 },
  { entryId: "b", managerName: "Bea", teamName: "B FC", joinEvent: 1 },
  { entryId: "c", managerName: "Cai", teamName: "C FC", joinEvent: 1 },
];

describe("gameweekWinner", () => {
  it("picks the highest net score", () => {
    const results = [result("a", 1, 60), result("b", 1, 72), result("c", 1, 55)];
    const w = gameweekWinner(results, 1);
    expect(w).toEqual({ entryIds: ["b"], value: 72, joint: false });
  });

  it("returns joint winners on a tie", () => {
    const results = [result("a", 1, 72), result("b", 1, 72), result("c", 1, 55)];
    const w = gameweekWinner(results, 1);
    expect(w?.joint).toBe(true);
    expect(new Set(w?.entryIds)).toEqual(new Set(["a", "b"]));
    expect(w?.value).toBe(72);
  });

  it("uses net points, not gross (hits count against the winner)", () => {
    // Cai scores more gross but took an -8 hit, so Bea wins on net.
    const results = [
      result("a", 1, 47),
      result("b", 1, 74),
      result("c", 1, 71, { grossPoints: 79, transferCost: 8 }),
    ];
    const w = gameweekWinner(results, 1);
    expect(w).toEqual({ entryIds: ["b"], value: 74, joint: false });
  });
});

describe("monthlyWinner", () => {
  it("sums only the events in the requested phase", () => {
    const results = [
      result("a", 1, 60, { phase: 1 }),
      result("a", 2, 80, { phase: 1 }),
      result("a", 4, 99, { phase: 2 }), // different phase, must be ignored
      result("b", 1, 72, { phase: 1 }),
      result("b", 2, 51, { phase: 1 }),
    ];
    const w = monthlyWinner(results, 1);
    // a: 60+80=140, b: 72+51=123 -> a wins
    expect(w).toEqual({ entryIds: ["a"], value: 140, joint: false });
  });
});

describe("woodenSpoon", () => {
  it("finds the lowest net score", () => {
    const results = [result("a", 1, 60), result("b", 1, 72), result("c", 1, 44)];
    expect(woodenSpoon(results, 1)).toEqual({
      entryIds: ["c"],
      value: 44,
      joint: false,
    });
  });
});

describe("computeStandings", () => {
  const results: ResultInput[] = [
    result("a", 1, 60),
    result("b", 1, 50),
    result("c", 1, 50),
    result("a", 2, 10),
    result("b", 2, 30),
    result("c", 2, 20),
  ];

  it("ranks by cumulative net points through the event", () => {
    const rows = computeStandings(entries, results, 2);
    // totals: a=70, b=80, c=70
    expect(rows.map((r) => r.entryId)).toEqual(["b", "a", "c"]);
    expect(rows[0]).toMatchObject({ entryId: "b", totalNetPoints: 80, rank: 1 });
    expect(rows[0]?.gapToLeader).toBe(0);
  });

  it("produces tie-aware ranks (shared rank, skipped next)", () => {
    // Through event 1: a=60, b=50, c=50 -> ranks 1,2,2
    const rows = computeStandings(entries, results, 1);
    const byId = Object.fromEntries(rows.map((r) => [r.entryId, r.rank]));
    expect(byId["a"]).toBe(1);
    expect(byId["b"]).toBe(2);
    expect(byId["c"]).toBe(2);
  });

  it("computes rank movement vs the previous event", () => {
    const rows = computeStandings(entries, results, 2);
    const b = rows.find((r) => r.entryId === "b");
    // b was rank 2 after GW1, rank 1 after GW2 -> movement +1
    expect(b?.previousRank).toBe(2);
    expect(b?.rankMovement).toBe(1);
  });
});

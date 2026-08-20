import { describe, expect, it } from "vitest";

import { computeRivalryStats } from "./rivalry";
import type { EntryInput, ResultInput } from "./types";

const entries: EntryInput[] = [
  { entryId: "a", managerName: "Alex", teamName: "A FC", joinEvent: 1 },
  { entryId: "b", managerName: "Bea", teamName: "B FC", joinEvent: 1 },
];

function result(entryId: string, eventNumber: number, netPoints: number): ResultInput {
  return {
    entryId,
    eventNumber,
    phase: 1,
    netPoints,
    grossPoints: netPoints,
    transferCost: 0,
    benchPoints: 0,
    chip: null,
  };
}

describe("computeRivalryStats", () => {
  const results = [result("a", 1, 70), result("b", 1, 60), result("a", 2, 50), result("b", 2, 80)];

  it("counts head-to-head gameweek wins", () => {
    const stats = computeRivalryStats("a", "b", entries, results, 2, {
      captainHistory: [
        { entryId: "a", eventNumber: 1, captainName: "Haaland" },
        { entryId: "b", eventNumber: 1, captainName: "Haaland" },
        { entryId: "a", eventNumber: 2, captainName: "Salah" },
        { entryId: "b", eventNumber: 2, captainName: "Palmer" },
      ],
    });
    expect(stats?.gwWinsA).toBe(1);
    expect(stats?.gwWinsB).toBe(1);
    expect(stats?.sameCaptainWeeks).toBe(1);
    expect(stats?.rankTimeline).toHaveLength(2);
  });
});

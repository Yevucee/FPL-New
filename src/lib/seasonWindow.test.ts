import { describe, expect, it } from "vitest";

import {
  buildSeasonWindowOptions,
  filterResultsForWindow,
  resolveSeasonWindow,
} from "./seasonWindow";

describe("seasonWindow", () => {
  const events = [
    { eventNumber: 1, phase: 8, phaseName: "August" },
    { eventNumber: 2, phase: 8, phaseName: "August" },
    { eventNumber: 20, phase: 1, phaseName: "January" },
    { eventNumber: 21, phase: 1, phaseName: "January" },
  ];

  it("builds full, half, and monthly options", () => {
    const options = buildSeasonWindowOptions(events);
    expect(options.map((option) => option.id)).toEqual([
      "full",
      "first-half",
      "second-half",
      "phase-1",
      "phase-8",
    ]);
  });

  it("filters second-half results", () => {
    const window = resolveSeasonWindow("second-half", events);
    const results = [
      { eventNumber: 2, phase: 8, netPoints: 50 },
      { eventNumber: 20, phase: 1, netPoints: 60 },
    ];
    const filtered = filterResultsForWindow(results, 21, window);
    expect(filtered).toHaveLength(1);
    expect(filtered[0]?.eventNumber).toBe(20);
  });

  it("filters phase results", () => {
    const window = resolveSeasonWindow("phase-8", events);
    const results = [
      { eventNumber: 1, phase: 8, netPoints: 50 },
      { eventNumber: 20, phase: 1, netPoints: 60 },
    ];
    const filtered = filterResultsForWindow(results, 21, window);
    expect(filtered).toHaveLength(1);
    expect(filtered[0]?.eventNumber).toBe(1);
  });
});

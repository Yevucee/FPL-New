import { describe, expect, it } from "vitest";

import { benchPointsFromPicks, type FplPickWithStats } from "./client";

function benchPick(position: number, points: number): FplPickWithStats {
  return {
    element: position,
    position,
    multiplier: 1,
    is_captain: false,
    is_vice_captain: false,
    stats: { total_points: points },
  };
}

describe("benchPointsFromPicks", () => {
  it("sums only bench slots", () => {
    const picks: FplPickWithStats[] = [
      benchPick(11, 8),
      benchPick(12, 3),
      benchPick(13, 0),
      benchPick(14, 6),
      benchPick(15, 2),
    ];
    expect(benchPointsFromPicks(picks)).toBe(11);
  });

  it("treats missing stats as zero", () => {
    const picks: FplPickWithStats[] = [
      { element: 12, position: 12, multiplier: 1, is_captain: false, is_vice_captain: false },
      benchPick(13, 4),
    ];
    expect(benchPointsFromPicks(picks)).toBe(4);
  });

  it("uses live element points when pick stats are missing", () => {
    const picks: FplPickWithStats[] = [
      { element: 502, position: 13, multiplier: 1, is_captain: false, is_vice_captain: false },
      { element: 329, position: 15, multiplier: 1, is_captain: false, is_vice_captain: false },
    ];
    const live = new Map([
      [502, 3],
      [329, 6],
    ]);
    expect(benchPointsFromPicks(picks, live)).toBe(9);
  });
});

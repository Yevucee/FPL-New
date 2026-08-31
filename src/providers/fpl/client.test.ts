import { describe, expect, it } from "vitest";

import { scoreFromPicks } from "@/providers/fpl/client";

describe("scoreFromPicks", () => {
  it("sums all pick points with captain multiplier", () => {
    const picks = [
      { element: 1, position: 10, multiplier: 2, is_captain: true, is_vice_captain: false },
      { element: 2, position: 6, multiplier: 1, is_captain: false, is_vice_captain: false },
      { element: 3, position: 12, multiplier: 1, is_captain: false, is_vice_captain: false },
    ];
    const livePoints = new Map([
      [1, 13],
      [2, 23],
      [3, 3],
    ]);

    expect(scoreFromPicks(picks, livePoints)).toBe(52);
  });
});

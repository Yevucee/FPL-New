import { describe, expect, it } from "vitest";

import { computeMostOwned, filterDifferentials } from "./mostOwned";

describe("filterDifferentials", () => {
  it("returns low-ownership players", () => {
    const players = computeMostOwned(
      [
        [1, 2, 3],
        [1, 2, 4],
        [1, 5, 6],
      ],
      new Map([
        [1, "Haaland"],
        [2, "Salah"],
        [3, "Saka"],
        [4, "Palmer"],
        [5, "Gordon"],
        [6, "Murillo"],
      ]),
    );

    const diffs = filterDifferentials(players, 2, 5);
    expect(diffs.every((player) => player.ownerCount <= 2)).toBe(true);
    expect(diffs.some((player) => player.webName === "Gordon")).toBe(true);
  });
});

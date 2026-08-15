import { describe, expect, it } from "vitest";

import { computeMostOwned } from "./mostOwned";

describe("computeMostOwned", () => {
  it("ranks players by squad ownership", () => {
    const names = new Map([
      [1, "Salah"],
      [2, "Haaland"],
      [3, "Saka"],
    ]);
    const squads = [
      [1, 2],
      [1, 3],
      [1, 2],
    ];
    const result = computeMostOwned(squads, names, 2);
    expect(result[0]).toMatchObject({ elementId: 1, ownerCount: 3, ownerPct: 100 });
    expect(result[1]?.elementId).toBe(2);
  });
});

import { describe, expect, it } from "vitest";

import {
  careerBestFromPast,
  managerMetaFromHistory,
  seasonTransfersFromCurrent,
} from "./managerMeta";

describe("managerMeta", () => {
  const past = [
    { season_name: "2023/24", total_points: 2200, rank: 500000 },
    { season_name: "2024/25", total_points: 2345, rank: 100000 },
    { season_name: "2025/26", total_points: 2170, rank: 1200000 },
  ];

  it("finds career best season", () => {
    expect(careerBestFromPast(past)).toEqual({
      seasonName: "2024/25",
      totalPoints: 2345,
    });
  });

  it("sums transfers from current season rows", () => {
    expect(
      seasonTransfersFromCurrent([
        { event: 1, event_transfers: 0 } as never,
        { event: 2, event_transfers: 2 } as never,
      ]),
    ).toBe(2);
  });

  it("extracts overall rank for a named season", () => {
    const meta = managerMetaFromHistory({ past, current: [] }, "2025/26");
    expect(meta.overallFplRank).toBe(1200000);
    expect(meta.careerBestSeason).toBe("2024/25");
  });
});

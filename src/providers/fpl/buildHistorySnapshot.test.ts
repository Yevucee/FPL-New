import { describe, expect, it } from "vitest";

import { pastSeasonRecord } from "./buildHistorySnapshot";

describe("pastSeasonRecord", () => {
  it("returns totals for a matching season", () => {
    const record = pastSeasonRecord(
      {
        current: [],
        past: [{ season_name: "2024/25", total_points: 2345, rank: 100 }],
        chips: [],
      },
      "2024/25",
    );
    expect(record).toEqual({
      seasonName: "2024/25",
      totalPoints: 2345,
      overallRank: 100,
    });
  });

  it("returns null when the manager has no record for that season", () => {
    const record = pastSeasonRecord(
      {
        current: [],
        past: [{ season_name: "2023/24", total_points: 2000, rank: 1 }],
        chips: [],
      },
      "2024/25",
    );
    expect(record).toBeNull();
  });
});

import { describe, expect, it } from "vitest";

import { manualHistoricalEntryForSeason } from "./selHistoricalMembers";

describe("manualHistoricalEntryForSeason", () => {
  it("includes Dominik for 2015/16", () => {
    const rows = manualHistoricalEntryForSeason("2015/16");
    expect(rows).toHaveLength(1);
    expect(rows[0]?.managerName).toBe("Dominik");
    expect(rows[0]?.totalPoints).toBe(2211);
  });

  it("returns empty for seasons without manual rows", () => {
    expect(manualHistoricalEntryForSeason("2024/25")).toEqual([]);
  });
});

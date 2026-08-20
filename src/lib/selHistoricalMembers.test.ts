import { describe, expect, it } from "vitest";

import {
  historicalMemberIds,
  manualHistoricalEntryForSeason,
  selHistoricalMembers,
} from "./selHistoricalMembers";

describe("manualHistoricalEntryForSeason", () => {
  it("returns empty when FPL entryId is configured (data comes from FPL API)", () => {
    expect(manualHistoricalEntryForSeason("2015/16")).toEqual([]);
  });

  it("returns empty for seasons without manual rows", () => {
    expect(manualHistoricalEntryForSeason("2024/25")).toEqual([]);
  });
});

describe("selHistoricalMembers", () => {
  it("links Dominik to his FPL entry ID", () => {
    expect(selHistoricalMembers[0]?.entryId).toBe("6348284");
    expect(historicalMemberIds()).toEqual(["6348284"]);
  });
});

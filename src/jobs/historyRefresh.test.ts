import { describe, expect, it } from "vitest";

import { reconstructedHistoryStale } from "./historyRefresh";

describe("reconstructedHistoryStale", () => {
  it("requires refresh when champions list has unarchived seasons", () => {
    const result = reconstructedHistoryStale(new Set(["1"]), ["2014/15"]);
    expect(result.needed).toBe(true);
    expect(result.reason).toContain("2014/15");
  });

  it("is up to date when archives only include eligible members", () => {
    const eligible = new Set(["1", "2"]);
    const result = reconstructedHistoryStale(new Set(["1", "2"]), [], {
      eligibleMemberIds: eligible,
    });
    expect(result.needed).toBe(false);
  });

  it("does not refresh when a new member joins the current league", () => {
    const result = reconstructedHistoryStale(new Set(["1", "2"]), [], {
      eligibleMemberIds: new Set(["1", "2"]),
    });
    expect(result.needed).toBe(false);
  });

  it("requires refresh when archives include a non-participant", () => {
    const result = reconstructedHistoryStale(new Set(["1", "2", "99"]), [], {
      eligibleMemberIds: new Set(["1", "2"]),
    });
    expect(result.needed).toBe(true);
    expect(result.reason).toContain("non-participant 99");
  });
});

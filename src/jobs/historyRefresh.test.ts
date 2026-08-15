import { describe, expect, it } from "vitest";

import { reconstructedHistoryStale } from "./historyRefresh";

describe("reconstructedHistoryStale", () => {
  it("requires refresh when a current member is missing from archives", () => {
    const result = reconstructedHistoryStale(
      new Set(["1", "2", "3"]),
      new Set(["1", "2"]),
      [],
    );
    expect(result.needed).toBe(true);
    expect(result.reason).toContain("new member");
  });

  it("requires refresh when champions list has unarchived seasons", () => {
    const result = reconstructedHistoryStale(new Set(["1"]), new Set(["1"]), ["2014/15"]);
    expect(result.needed).toBe(true);
    expect(result.reason).toContain("2014/15");
  });

  it("is up to date when membership matches", () => {
    const result = reconstructedHistoryStale(new Set(["1", "2"]), new Set(["1", "2"]), []);
    expect(result.needed).toBe(false);
  });
});

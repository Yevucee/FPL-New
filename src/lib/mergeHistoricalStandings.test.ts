import { describe, expect, it } from "vitest";

import { mergeManualHistoricalEntries } from "./mergeHistoricalStandings";
import type { EntryInput, ResultInput } from "@/metrics/types";

describe("mergeManualHistoricalEntries", () => {
  it("returns unchanged when manual season totals are not configured", () => {
    const entries: EntryInput[] = [
      {
        entryId: "a",
        managerName: "Samuel Polley",
        teamName: "Yevu Athletic",
        joinEvent: 1,
      },
    ];
    const results: ResultInput[] = [
      {
        entryId: "a",
        eventNumber: 38,
        phase: 1,
        netPoints: 2215,
        grossPoints: 2215,
        transferCost: 0,
        benchPoints: 0,
      },
    ];

    const merged = mergeManualHistoricalEntries("2015/16", entries, results, 38);
    expect(merged.added).toBe(0);
    expect(merged.entries).toHaveLength(1);
  });

  it("skips manual Dominik when Dominik Brand is already in the archive", () => {
    const entries: EntryInput[] = [
      {
        entryId: "6348284",
        managerName: "Dominik Brand",
        teamName: "Harmonstown FC",
        joinEvent: 1,
      },
      {
        entryId: "a",
        managerName: "Samuel Polley",
        teamName: "Yevu Athletic",
        joinEvent: 1,
      },
    ];
    const results: ResultInput[] = [
      {
        entryId: "6348284",
        eventNumber: 38,
        phase: 1,
        netPoints: 2211,
        grossPoints: 2211,
        transferCost: 0,
        benchPoints: 0,
      },
      {
        entryId: "a",
        eventNumber: 38,
        phase: 1,
        netPoints: 2215,
        grossPoints: 2215,
        transferCost: 0,
        benchPoints: 0,
      },
    ];

    const merged = mergeManualHistoricalEntries("2015/16", entries, results, 38);
    expect(merged.added).toBe(0);
    expect(merged.entries).toHaveLength(2);
  });
});

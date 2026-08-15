import { describe, expect, it } from "vitest";

import { mergeManualHistoricalEntries } from "./mergeHistoricalStandings";
import type { EntryInput, ResultInput } from "@/metrics/types";
import { computeStandings } from "@/metrics/standings";

describe("mergeManualHistoricalEntries", () => {
  it("adds Dominik as 2nd in 2015/16 when missing from DB rows", () => {
    const entries: EntryInput[] = [
      {
        entryId: "a",
        managerName: "Samuel Polley",
        teamName: "Yevu Athletic",
        joinEvent: 1,
      },
      {
        entryId: "b",
        managerName: "Stephan Ruoss",
        teamName: "FLYING BURRITOS*",
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
      {
        entryId: "b",
        eventNumber: 38,
        phase: 1,
        netPoints: 2139,
        grossPoints: 2139,
        transferCost: 0,
        benchPoints: 0,
      },
    ];

    const merged = mergeManualHistoricalEntries("2015/16", entries, results, 38);
    expect(merged.added).toBe(1);

    const standings = computeStandings(merged.entries, merged.results, 38);
    expect(standings[0]?.managerName).toBe("Samuel Polley");
    expect(standings[1]?.managerName).toBe("Dominik");
    expect(standings[1]?.teamName).toBe("Harmonstown FC");
    expect(standings[1]?.totalNetPoints).toBe(2211);
    expect(standings[2]?.managerName).toBe("Stephan Ruoss");
  });
});

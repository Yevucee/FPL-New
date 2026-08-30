import { describe, expect, it } from "vitest";

import { overlayLiveGameweekScores } from "@/lib/liveLeagueScores";
import type { ResultInput } from "@/metrics/types";

describe("overlayLiveGameweekScores", () => {
  it("patches GW scores from live league standings", () => {
    const results: ResultInput[] = [
      {
        entryId: "internal-1",
        eventNumber: 2,
        phase: 8,
        netPoints: 0,
        grossPoints: 0,
        transferCost: 4,
        benchPoints: 12,
        benchBoostPoints: null,
        chip: null,
      },
    ];

    const patched = overlayLiveGameweekScores(
      results,
      2,
      new Map([["3386632", "internal-1"]]),
      new Map([
        [
          "3386632",
          { entryId: "3386632", eventTotal: 105, total: 155, rank: 3 },
        ],
      ]),
      new Map([[2, 8]]),
    );

    expect(patched).toHaveLength(1);
    expect(patched[0]).toMatchObject({
      entryId: "internal-1",
      eventNumber: 2,
      netPoints: 105,
      grossPoints: 109,
      transferCost: 4,
      benchPoints: 12,
    });
  });

  it("adds a row when the DB has no result for the live GW yet", () => {
    const patched = overlayLiveGameweekScores(
      [],
      2,
      new Map([["3386632", "internal-1"]]),
      new Map([
        [
          "3386632",
          { entryId: "3386632", eventTotal: 82, total: 132, rank: 5 },
        ],
      ]),
      new Map([[2, 8]]),
    );

    expect(patched).toHaveLength(1);
    expect(patched[0]?.netPoints).toBe(82);
  });
});

import { describe, expect, it } from "vitest";

import type { LeagueSnapshot } from "@/contracts/snapshot";

import {
  pastSeasonRecord,
  snapshotMatchesChampion,
  snapshotSeasonLeader,
} from "./buildHistorySnapshot";

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

describe("snapshotSeasonLeader", () => {
  const snapshot: LeagueSnapshot = {
    provider: "test",
    season: { name: "2024/25", startEvent: 1 },
    league: { slug: "x", name: "X", visibility: "unlisted", timezone: "Europe/London" },
    events: [{ eventNumber: 38, finished: true, checked: true, phase: 1 }],
    entries: [
      {
        providerEntryId: "1",
        managerName: "Samuel Polley",
        teamName: "Yevu",
        joinEvent: 1,
        results: [{ eventNumber: 38, netPoints: 2458, grossPoints: 2458, transferCost: 0, totalPoints: 2458, benchPoints: 0 }],
      },
      {
        providerEntryId: "2",
        managerName: "Marco Löffel Diaz",
        teamName: "Real Rapperswil",
        joinEvent: 1,
        results: [{ eventNumber: 38, netPoints: 2156, grossPoints: 2156, transferCost: 0, totalPoints: 2156, benchPoints: 0 }],
      },
    ],
  };

  it("picks the highest scorer", () => {
    expect(snapshotSeasonLeader(snapshot)?.managerName).toBe("Samuel Polley");
  });

  it("validates against chat-record champions", () => {
    expect(snapshotMatchesChampion(snapshot, "Samuel")).toBe(true);
    expect(snapshotMatchesChampion(snapshot, "Marco")).toBe(false);
  });
});

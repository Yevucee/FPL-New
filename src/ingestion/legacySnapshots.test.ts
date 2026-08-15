import { describe, expect, it } from "vitest";

import { buildLegacySnapshot, seasonNameFromSlug, seasonSlugFromName } from "./legacySnapshots";

describe("buildLegacySnapshot", () => {
  const rows = [
    {
      gw: 1,
      entry_id: 101,
      manager_name: "Alex",
      team_name: "A FC",
      total_points: 60,
      gw_points: 60,
      active_chip: null,
    },
    {
      gw: 2,
      entry_id: 101,
      manager_name: "Alex",
      team_name: "A FC",
      total_points: 130,
      gw_points: 70,
      active_chip: "3xc",
    },
    {
      gw: 1,
      entry_id: 102,
      manager_name: "Bea",
      team_name: "B FC",
      total_points: 55,
      gw_points: 55,
      active_chip: null,
    },
    {
      gw: 2,
      entry_id: 102,
      manager_name: "Bea",
      team_name: "B FC",
      total_points: 105,
      gw_points: 50,
      active_chip: null,
    },
  ];

  it("builds a valid snapshot with finished events", () => {
    const snapshot = buildLegacySnapshot({
      seasonName: "2024/25",
      rows,
    });
    expect(snapshot.season.name).toBe("2024/25");
    expect(snapshot.events).toHaveLength(2);
    expect(snapshot.events.every((e) => e.finished && e.checked)).toBe(true);
    expect(snapshot.entries).toHaveLength(2);
    expect(snapshot.entries[0]?.results).toHaveLength(2);
  });

  it("round-trips season slugs", () => {
    expect(seasonSlugFromName("2024/25")).toBe("2024-25");
    expect(seasonNameFromSlug("2024-25")).toBe("2024/25");
  });
});

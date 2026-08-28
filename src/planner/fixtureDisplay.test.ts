import { describe, expect, it } from "vitest";

import { formatFixtureLabel } from "@/components/planner/PlayerFixtureStack";
import { buildGameweekFixtureList } from "@/planner/elementCatalog";
import type { PlannerFixture } from "@/planner/types";

describe("planner fixture display", () => {
  it("formats home and away fixture labels", () => {
    const home: PlannerFixture = {
      eventNumber: 3,
      teamId: 1,
      opponentShortName: "CHE",
      isHome: true,
      difficulty: 4,
      kickoffTime: null,
    };
    const away: PlannerFixture = { ...home, isHome: false, opponentShortName: "EVE" };
    expect(formatFixtureLabel(home)).toBe("CHE (H)");
    expect(formatFixtureLabel(away)).toBe("EVE (A)");
  });

  it("lists fixtures for one gameweek only", () => {
    const rows = buildGameweekFixtureList(
      [
        {
          id: 1,
          event: 3,
          team_h: 1,
          team_a: 2,
          team_h_difficulty: 3,
          team_a_difficulty: 4,
          kickoff_time: "2026-09-13T11:30:00Z",
          started: false,
          finished: false,
          minutes: 0,
        },
        {
          id: 2,
          event: 4,
          team_h: 3,
          team_a: 4,
          team_h_difficulty: 3,
          team_a_difficulty: 3,
          kickoff_time: "2026-09-20T14:00:00Z",
          started: false,
          finished: false,
          minutes: 0,
        },
      ],
      [
        { id: 1, short_name: "ARS" },
        { id: 2, short_name: "CHE" },
        { id: 3, short_name: "LIV" },
        { id: 4, short_name: "MCI" },
      ],
      3,
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]?.homeShortName).toBe("ARS");
    expect(rows[0]?.awayShortName).toBe("CHE");
  });
});

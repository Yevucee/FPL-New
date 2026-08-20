import { describe, expect, it } from "vitest";

import {
  averageTemplateOverlapByEntry,
  templateOverlapPct,
  type EventSquadIntel,
} from "./squadOverlap";

describe("templateOverlapPct", () => {
  const mostOwned = [
    { elementId: 1, webName: "A", ownerCount: 10, ownerPct: 100 },
    { elementId: 2, webName: "B", ownerCount: 9, ownerPct: 90 },
    { elementId: 3, webName: "C", ownerCount: 8, ownerPct: 80 },
  ];

  it("returns overlap percentage for starting XI", () => {
    expect(templateOverlapPct([1, 2, 99, 100], mostOwned, 3)).toBe(50);
    expect(templateOverlapPct([1, 2, 3], mostOwned, 3)).toBe(100);
    expect(templateOverlapPct([99, 100, 101], mostOwned, 3)).toBe(0);
  });
});

describe("averageTemplateOverlapByEntry", () => {
  const intel: EventSquadIntel[] = [
    {
      eventNumber: 1,
      mostOwned: [
        { elementId: 1, webName: "A", ownerCount: 2, ownerPct: 100 },
        { elementId: 2, webName: "B", ownerCount: 1, ownerPct: 50 },
      ],
      squads: [
        { entryId: "a", starterIds: [1, 2] },
        { entryId: "b", starterIds: [1, 99] },
      ],
    },
    {
      eventNumber: 2,
      mostOwned: [
        { elementId: 1, webName: "A", ownerCount: 2, ownerPct: 100 },
        { elementId: 3, webName: "C", ownerCount: 1, ownerPct: 50 },
      ],
      squads: [
        { entryId: "a", starterIds: [1, 3] },
        { entryId: "b", starterIds: [99, 100] },
      ],
    },
  ];

  it("averages overlap through finished gameweeks", () => {
    const averages = averageTemplateOverlapByEntry(intel, 2);
    expect(averages.get("a")).toBe(100);
    expect(averages.get("b")).toBe(25);
  });
});

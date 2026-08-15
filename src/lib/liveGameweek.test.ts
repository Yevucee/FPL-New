import { describe, expect, it } from "vitest";

import { buildSelectableEvents, findLiveGameweek } from "./liveGameweek";

const deadline = (iso: string) => new Date(iso);

describe("findLiveGameweek", () => {
  const events = [
    { eventNumber: 1, deadline: deadline("2026-08-15T17:30:00Z"), finished: true, checked: true },
    { eventNumber: 2, deadline: deadline("2026-08-22T17:30:00Z"), finished: false, checked: false },
    { eventNumber: 3, deadline: deadline("2026-08-29T17:30:00Z"), finished: false, checked: false },
  ];

  it("returns the in-progress GW after its deadline", () => {
    const now = deadline("2026-08-23T14:00:00Z").getTime();
    expect(findLiveGameweek(events, now)).toBe(2);
  });

  it("returns null before any deadline", () => {
    const now = deadline("2026-08-10T12:00:00Z").getTime();
    expect(findLiveGameweek(events, now)).toBeNull();
  });
});

describe("buildSelectableEvents", () => {
  it("includes the live GW alongside finished GWs", () => {
    expect(buildSelectableEvents([], [1], 2)).toEqual([1, 2]);
  });
});

import { describe, expect, it } from "vitest";

import {
  baseHistoricalParticipantIds,
  historicalMemberIds,
  selHistoricalMembers,
} from "./selHistoricalMembers";

describe("baseHistoricalParticipantIds", () => {
  it("includes configured former member entry IDs", () => {
    const ids = baseHistoricalParticipantIds();
    expect(ids.has("6348284")).toBe(true);
  });
});

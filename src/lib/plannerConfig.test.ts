import { describe, expect, it } from "vitest";

import { DEFAULT_PLANNER_ENTRY_ID, plannerEntryId } from "./plannerConfig";

describe("plannerConfig", () => {
  it("defaults to Yevu Athletic entry when env is unset", () => {
    expect(plannerEntryId()).toBe(DEFAULT_PLANNER_ENTRY_ID);
    expect(DEFAULT_PLANNER_ENTRY_ID).toBe("3386632");
  });
});

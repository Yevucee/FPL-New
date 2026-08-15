import { describe, expect, it } from "vitest";

import { managerMatchesChampion } from "./selChampions";

describe("managerMatchesChampion", () => {
  it("matches first-name-only chat records", () => {
    expect(managerMatchesChampion("Samuel Polley", "Samuel")).toBe(true);
    expect(managerMatchesChampion("Marco Löffel Diaz", "Marco")).toBe(true);
    expect(managerMatchesChampion("David Nadig", "David")).toBe(true);
  });

  it("matches full names", () => {
    expect(managerMatchesChampion("Stephan Ruoss", "Stephan Ruoss")).toBe(true);
  });

  it("rejects unrelated managers", () => {
    expect(managerMatchesChampion("Kevin Weber", "Samuel")).toBe(false);
  });
});

import { describe, expect, it } from "vitest";

import { hallOfChampions, managerMatchesChampion } from "./selChampions";

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

describe("hallOfChampions", () => {
  it("uses archive team names when available", () => {
    const rows = hallOfChampions(
      new Map([
        [
          "2024/25",
          { managerName: "Samuel Polley", teamName: "Yevu Athletic" },
        ],
      ]),
    );
    const row = rows.find((r) => r.season === "2024/25");
    expect(row?.winner).toBe("Samuel Polley");
    expect(row?.teamName).toBe("Yevu Athletic");
  });
});

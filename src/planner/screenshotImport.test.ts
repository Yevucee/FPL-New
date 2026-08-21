import { describe, expect, it } from "vitest";

import { SCREENSHOT_MAX_BYTES, validateScreenshotUpload } from "@/lib/plannerScreenshot";
import { buildSquadFromVisionJson, matchPlayerName } from "@/planner/screenshotParse";
import type { PlannerElement } from "@/planner/types";

const catalog: PlannerElement[] = [
  {
    id: 1,
    webName: "Haaland",
    fullName: "Erling Haaland",
    position: "FWD",
    positionId: 4,
    teamId: 1,
    teamShortName: "MCI",
    priceTenths: 148,
    form: 6,
    totalPoints: 100,
    selectedByPercent: 50,
    status: "a",
    chanceOfPlaying: 100,
    minutes: 900,
  },
  {
    id: 2,
    webName: "Salah",
    fullName: "Mohamed Salah",
    position: "MID",
    positionId: 3,
    teamId: 2,
    teamShortName: "LIV",
    priceTenths: 145,
    form: 5,
    totalPoints: 90,
    selectedByPercent: 40,
    status: "a",
    chanceOfPlaying: 100,
    minutes: 880,
  },
];

describe("plannerScreenshot validation", () => {
  it("rejects oversized uploads", () => {
    const buf = Buffer.alloc(SCREENSHOT_MAX_BYTES + 1);
    const result = validateScreenshotUpload(buf, "image/png");
    expect(result.ok).toBe(false);
  });

  it("accepts png under limit", () => {
    const buf = Buffer.from("fake");
    expect(validateScreenshotUpload(buf, "image/png").ok).toBe(true);
  });

  it("rejects unsupported mime", () => {
    const buf = Buffer.from("fake");
    expect(validateScreenshotUpload(buf, "image/gif").ok).toBe(false);
  });
});

describe("screenshotParse", () => {
  it("matches player names to catalog", () => {
    expect(matchPlayerName("Haaland", catalog)?.id).toBe(1);
    expect(matchPlayerName("Unknown FC", catalog)).toBeNull();
  });

  it("builds squad from vision json", () => {
    const suggestion = buildSquadFromVisionJson(
      {
        starters: ["Haaland", "Salah"],
        bench: [],
        captain: "Haaland",
        viceCaptain: "Salah",
        bank: 1.5,
        freeTransfers: 2,
      },
      catalog,
    );
    expect(suggestion.players.length).toBe(2);
    expect(suggestion.players.find((p) => p.isCaptain)?.elementId).toBe(1);
    expect(suggestion.bankTenths).toBe(15);
    expect(suggestion.freeTransfers).toBe(2);
  });
});

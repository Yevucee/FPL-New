import { describe, expect, it } from "vitest";

import { computePlannerScore } from "@/planner/plannerScore";
import { validateSquad, isValidStartingFormation, positionFromId } from "@/planner/squadValidation";
import {
  buildTemplateGaps,
  buildThreatsAndLevers,
  computeUniquenessScore,
} from "@/planner/templateAnalysis";
import { buildTransferComparisons, hitsForTransferCount } from "@/planner/transferPlanning";
import type { PlannerElement, SquadPlayer } from "@/planner/types";

function el(
  id: number,
  pos: PlannerElement["position"],
  teamId = 1,
  price = 80,
): PlannerElement {
  return {
    id,
    webName: `P${id}`,
    fullName: `Player ${id}`,
    position: pos,
    positionId: pos === "GK" ? 1 : pos === "DEF" ? 2 : pos === "MID" ? 3 : 4,
    teamId,
    teamShortName: "TST",
    priceTenths: price,
    form: 5,
    totalPoints: 50,
    selectedByPercent: 10,
    status: "a",
    chanceOfPlaying: 100,
    minutes: 900,
  };
}

function validSquad(): { players: SquadPlayer[]; elements: Map<number, PlannerElement> } {
  const specs: Array<[number, PlannerElement["position"], number]> = [
    [1, "GK", 1],
    [2, "GK", 2],
    [3, "DEF", 1],
    [4, "DEF", 2],
    [5, "DEF", 3],
    [6, "DEF", 4],
    [7, "DEF", 5],
    [8, "MID", 1],
    [9, "MID", 2],
    [10, "MID", 3],
    [11, "MID", 4],
    [12, "MID", 5],
    [13, "FWD", 6],
    [14, "FWD", 7],
    [15, "FWD", 8],
  ];
  const elements = new Map(specs.map(([id, pos, team]) => [id, el(id, pos, team)]));
  const players: SquadPlayer[] = specs.map(([id], i) => ({
    elementId: id,
    slot: i + 1,
    isStarter: [1, 3, 4, 5, 8, 9, 10, 11, 12, 13, 14].includes(id),
    isCaptain: id === 13,
    isViceCaptain: id === 14,
    sellPriceTenths: null,
  }));
  return { players, elements };
}

describe("squadValidation", () => {
  it("accepts a legal 15-player squad", () => {
    const { players, elements } = validSquad();
    const result = validateSquad({ players, elements, bankTenths: 250 });
    expect(result.valid).toBe(true);
  });

  it("rejects wrong squad size", () => {
    const { players, elements } = validSquad();
    const result = validateSquad({ players: players.slice(0, 14), elements, bankTenths: 0 });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.code === "squad_size")).toBe(true);
  });

  it("rejects same captain and vice", () => {
    const { players, elements } = validSquad();
    const bad = players.map((p) =>
      p.elementId === 14 ? { ...p, isViceCaptain: false, isCaptain: true } : { ...p, isCaptain: p.elementId === 13 ? false : p.isCaptain },
    );
    const bothCaptain = bad.map((p) =>
      p.elementId === 13 || p.elementId === 14 ? { ...p, isCaptain: true, isViceCaptain: false } : p,
    );
    const result = validateSquad({ players: bothCaptain, elements, bankTenths: 0 });
    expect(result.valid).toBe(false);
  });

  it("validates starting formation", () => {
    const { players, elements } = validSquad();
    const starters = players
      .filter((p) => p.isStarter)
      .map((p) => ({ element: elements.get(p.elementId)! }));
    expect(isValidStartingFormation(starters)).toBe(true);
  });

  it("maps position ids", () => {
    expect(positionFromId(1)).toBe("GK");
    expect(positionFromId(4)).toBe("FWD");
  });
});

describe("plannerScore", () => {
  it("is deterministic for identical inputs", () => {
    const element = el(1, "MID");
    const fixtures = [{ eventNumber: 1, teamId: 1, opponentShortName: "X", isHome: true, difficulty: 2 }];
    const a = computePlannerScore({
      element,
      fixtures,
      horizon: 3,
      leagueOwnershipPct: 50,
      favourTemplate: true,
    });
    const b = computePlannerScore({
      element,
      fixtures,
      horizon: 3,
      leagueOwnershipPct: 50,
      favourTemplate: true,
    });
    expect(a.total).toBe(b.total);
  });
});

describe("templateAnalysis", () => {
  it("excludes owned players from template gaps", () => {
    const { players, elements } = validSquad();
    const enriched = players.map((p) => ({
      ...p,
      element: elements.get(p.elementId)!,
      sellPriceDisplay: { valueTenths: 80, isEstimated: true },
      leagueOwnership: null,
      latestPoints: null,
      nextFixture: null,
      fixtureDifficulty: null,
    }));
    const gaps = buildTemplateGaps({
      mostOwned: [
        { elementId: 13, webName: "Owned", ownerCount: 5, ownerPct: 80 },
        { elementId: 99, webName: "Missing", ownerCount: 4, ownerPct: 60 },
      ],
      elements: new Map([[99, el(99, "MID", 9, 90)]]),
      samuelSquad: enriched,
      minPct: 30,
      fixturesByTeam: new Map(),
      leagueOwnership: new Map(),
      favourTemplate: true,
      horizon: 3,
    });
    expect(gaps.every((g) => g.elementId !== 13)).toBe(true);
    expect(gaps.some((g) => g.elementId === 99)).toBe(true);
  });

  it("classifies threats and levers", () => {
    const { players, elements } = validSquad();
    const enriched = players.map((p) => ({
      ...p,
      element: elements.get(p.elementId)!,
      sellPriceDisplay: { valueTenths: 80, isEstimated: true },
      leagueOwnership: { count: 1, pct: 10 },
      latestPoints: null,
      nextFixture: null,
      fixtureDifficulty: null,
    }));
    const { threats, levers } = buildThreatsAndLevers({
      mostOwned: [{ elementId: 99, webName: "Template", ownerCount: 5, ownerPct: 70 }],
      samuelSquad: enriched,
      rivalSquads: new Map([["r1", new Set([99])]]),
      rivalNames: new Map([["r1", "Rival"]]),
      elements: new Map([[99, el(99, "MID")]]),
      minRivalOwnPct: 20,
    });
    expect(threats.length).toBe(1);
    expect(levers.length).toBeGreaterThan(0);
  });
});

describe("transferPlanning", () => {
  it("includes do-nothing comparison", () => {
    const { players, elements } = validSquad();
    const comparisons = buildTransferComparisons({
      squad: players,
      elements,
      fixturesByTeam: new Map(),
      leagueOwnership: new Map(),
      mostOwned: [],
      bankTenths: 0,
      freeTransfers: 1,
      maxHit: 4,
      horizon: 3,
      lockedIds: new Set(),
      excludedIds: new Set(),
      favourTemplate: true,
      sellOverrides: new Map(),
    });
    expect(comparisons[0]?.label).toContain("nothing");
  });

  it("calculates hit costs", () => {
    expect(hitsForTransferCount(1, 1)).toBe(0);
    expect(hitsForTransferCount(1, 2)).toBe(4);
    expect(hitsForTransferCount(0, 2)).toBe(8);
  });
});

describe("plannerConfig", () => {
  it("reads entry id from env", async () => {
    const prev = process.env.PLANNER_FPL_ENTRY_ID;
    process.env.PLANNER_FPL_ENTRY_ID = "12345";
    const { plannerEntryId, plannerEntryConfigured } = await import("@/lib/plannerConfig");
    expect(plannerEntryId()).toBe("12345");
    expect(plannerEntryConfigured()).toBe(true);
    process.env.PLANNER_FPL_ENTRY_ID = prev;
  });

  it("rejects invalid entry id", async () => {
    const prev = process.env.PLANNER_FPL_ENTRY_ID;
    process.env.PLANNER_FPL_ENTRY_ID = "not-a-number";
    const { plannerEntryId } = await import("@/lib/plannerConfig");
    expect(plannerEntryId()).toBeNull();
    process.env.PLANNER_FPL_ENTRY_ID = prev;
  });
});

describe("preview workspace", () => {
  it("builds a complete preview workspace", async () => {
    const { buildPreviewPlannerWorkspace } = await import("@/lib/previewPlannerWorkspace");
    const ws = buildPreviewPlannerWorkspace();
    expect(ws.isPreview).toBe(true);
    expect(ws.squad.length).toBe(15);
    expect(ws.templateCoverage.length).toBeGreaterThan(0);
    expect(ws.transfers.comparisons.length).toBeGreaterThan(0);
  });
});

describe("uniqueness score", () => {
  it("increases when ownership is lower", () => {
    const high = computeUniquenessScore([
      {
        elementId: 1,
        slot: 1,
        isStarter: true,
        isCaptain: false,
        isViceCaptain: false,
        sellPriceTenths: null,
        element: el(1, "MID"),
        sellPriceDisplay: { valueTenths: 80, isEstimated: true },
        leagueOwnership: { count: 6, pct: 90 },
        latestPoints: null,
        nextFixture: null,
        fixtureDifficulty: null,
      },
    ]);
    const low = computeUniquenessScore([
      {
        elementId: 1,
        slot: 1,
        isStarter: true,
        isCaptain: false,
        isViceCaptain: false,
        sellPriceTenths: null,
        element: el(1, "MID"),
        sellPriceDisplay: { valueTenths: 80, isEstimated: true },
        leagueOwnership: { count: 1, pct: 10 },
        latestPoints: null,
        nextFixture: null,
        fixtureDifficulty: null,
      },
    ]);
    expect(low).toBeGreaterThan(high);
  });
});

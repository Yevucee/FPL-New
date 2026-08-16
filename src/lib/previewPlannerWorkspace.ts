import { chipExpiryWarning, chipsRemainingCount, buildChipGuidance, chipRetentionLeaguePct } from "@/planner/chipGuidance";
import { PLANNER_SCORE_FORMULA } from "@/planner/plannerScore";
import { buildCaptainMatrix, benchRecommendation, recommendStartingXI } from "@/planner/selection";
import { sellPriceTenths, validateSquad } from "@/planner/squadValidation";
import {
  buildSamuelDifferentials,
  buildTemplateCoverage,
  buildTemplateGaps,
  buildThreatsAndLevers,
  computeSquadRating,
  computeTemplateCoverageScore,
  computeUniquenessScore,
  generateInsights,
  squadSummary,
} from "@/planner/templateAnalysis";
import { buildTransferComparisons, buildTransferSuggestions } from "@/planner/transferPlanning";
import type {
  EnrichedSquadPlayer,
  PlannerElement,
  PlannerFixture,
  PlannerSettings,
  SquadPlayer,
} from "@/planner/types";
import { DEFAULT_PLANNER_SETTINGS } from "@/planner/types";
import { SEASON_CHIP_TYPES, type SeasonChipType } from "@/lib/chipLabels";
import { previewPlannerOverview } from "@/lib/previewPlannerOverview";
import type { PlannerWorkspace } from "@/server/plannerWorkspace";

const SAMUEL_ENTRY = "999001";

function sampleElements(): Map<number, PlannerElement> {
  const teams = ["MCI", "LIV", "ARS", "CHE", "TOT", "NEW", "AVL", "BOU", "BHA", "WHU"];
  const catalog = new Map<number, PlannerElement>();
  const roster: Array<[number, string, PlannerElement["position"], number, number]> = [
    [1, "Haaland", "FWD", 0, 148],
    [2, "Salah", "MID", 1, 145],
    [3, "Gabriel", "DEF", 2, 62],
    [4, "Palmer", "MID", 3, 108],
    [5, "Watkins", "FWD", 4, 92],
    [6, "Saka", "MID", 2, 102],
    [7, "Bruno F.", "MID", 5, 88],
    [8, "Son", "MID", 4, 98],
    [9, "Trippier", "DEF", 6, 58],
    [10, "Ederson", "GK", 0, 55],
    [11, "Gordon", "MID", 6, 72],
    [12, "Murillo", "DEF", 6, 54],
    [13, "Bowen", "MID", 9, 78],
    [14, "Mbeumo", "MID", 7, 82],
    [15, "Wissa", "FWD", 7, 68],
    [16, "Raya", "GK", 2, 58],
    [17, "Tarkowski", "DEF", 9, 55],
    [18, "Semenyo", "MID", 7, 70],
    [19, "Wood", "FWD", 6, 62],
    [20, "Rogers", "MID", 4, 65],
  ];
  for (const [id, name, pos, teamIdx, price] of roster) {
    catalog.set(id, {
      id,
      webName: name,
      fullName: name,
      position: pos,
      positionId: pos === "GK" ? 1 : pos === "DEF" ? 2 : pos === "MID" ? 3 : 4,
      teamId: teamIdx + 1,
      teamShortName: teams[teamIdx] ?? "???",
      priceTenths: price,
      form: 4 + (id % 5),
      totalPoints: 50 + id * 3,
      selectedByPercent: 10 + id,
      status: id === 8 ? "d" : "a",
      chanceOfPlaying: id === 8 ? 75 : 100,
      minutes: 800,
    });
  }
  return catalog;
}

function sampleFixtures(): Map<number, PlannerFixture[]> {
  const byTeam = new Map<number, PlannerFixture[]>();
  for (let teamId = 1; teamId <= 10; teamId++) {
    byTeam.set(teamId, [
      {
        eventNumber: 13,
        teamId,
        opponentShortName: "LEE",
        isHome: teamId % 2 === 0,
        difficulty: 2 + (teamId % 3),
      },
      {
        eventNumber: 14,
        teamId,
        opponentShortName: "SOU",
        isHome: teamId % 2 === 1,
        difficulty: 3,
      },
      {
        eventNumber: 15,
        teamId,
        opponentShortName: "NFO",
        isHome: true,
        difficulty: 2,
      },
    ]);
  }
  return byTeam;
}

function sampleSquad(): SquadPlayer[] {
  const ids = [10, 3, 9, 12, 6, 2, 4, 7, 8, 13, 1, 16, 17, 11, 14];
  return ids.map((elementId, i) => ({
    elementId,
    slot: i + 1,
    isStarter: i < 11,
    isCaptain: elementId === 1,
    isViceCaptain: elementId === 2,
    sellPriceTenths: null,
  }));
}

export function buildPreviewPlannerWorkspace(): PlannerWorkspace {
  const overview = previewPlannerOverview();
  const elements = sampleElements();
  const fixturesByTeam = sampleFixtures();
  const settings: PlannerSettings = { ...DEFAULT_PLANNER_SETTINGS, rivalEntryIds: ["999002", "999003"] };
  const squadPlayers = sampleSquad();

  const ownershipMap = new Map(
    overview.mostOwned.map((p) => [p.elementId, { count: p.ownerCount, pct: p.ownerPct }]),
  );
  const pointsMap = new Map(squadPlayers.map((p) => [p.elementId, 2 + (p.elementId % 12)]));

  const enriched: EnrichedSquadPlayer[] = squadPlayers
    .map((p) => {
      const element = elements.get(p.elementId)!;
      return {
        ...p,
        element,
        sellPriceDisplay: sellPriceTenths(p, element),
        leagueOwnership: ownershipMap.get(p.elementId) ?? null,
        latestPoints: pointsMap.get(p.elementId) ?? null,
        nextFixture: fixturesByTeam.get(element.teamId)?.[0] ?? null,
        fixtureDifficulty: fixturesByTeam.get(element.teamId)?.[0]?.difficulty ?? null,
      };
    });

  const templateCoveragePct = computeTemplateCoverageScore(enriched, overview.mostOwned);
  const uniqueness = computeUniquenessScore(enriched);
  const validation = validateSquad({ players: squadPlayers, elements, bankTenths: 5 });

  const templateCoverage = buildTemplateCoverage({
    mostOwned: overview.mostOwned,
    elements,
    samuelSquad: enriched,
    captainCounts: new Map([[1, 4], [2, 2]]),
    fixturesByTeam,
  });

  const templateGaps = buildTemplateGaps({
    mostOwned: overview.mostOwned,
    elements,
    samuelSquad: enriched,
    minPct: 30,
    fixturesByTeam,
    leagueOwnership: ownershipMap,
    favourTemplate: true,
    horizon: 3,
  });

  const rivalSquads = new Map<string, Set<number>>([
    ["999002", new Set([1, 2, 3, 4, 6])],
    ["999003", new Set([1, 3, 5, 7, 10])],
  ]);
  const rivalNames = new Map([
    ["999002", "Marco Löffel Diaz"],
    ["999003", "Stephan Ruoss"],
  ]);

  const rivalOwnershipByElement = new Map<number, Set<string>>();
  for (const [rid, squad] of rivalSquads) {
    for (const el of squad) {
      const s = rivalOwnershipByElement.get(el) ?? new Set();
      s.add(rid);
      rivalOwnershipByElement.set(el, s);
    }
  }

  const differentials = buildSamuelDifferentials({
    samuelSquad: enriched,
    maxOwners: 2,
    rivalOwnership: rivalOwnershipByElement,
    rivalNames,
    fixturesByTeam,
  });

  const threatsAndLevers = buildThreatsAndLevers({
    mostOwned: overview.mostOwned,
    samuelSquad: enriched,
    rivalSquads,
    rivalNames,
    elements,
    minRivalOwnPct: 20,
  });

  const samuelChipRow = overview.chipStatus.find((r) => r.managerName === "Samuel Polley") ?? null;
  const rating = computeSquadRating({
    squad: enriched,
    fixturesByTeam,
    horizon: 3,
    templateCoverage: templateCoveragePct,
    uniqueness,
  });

  const summary = squadSummary({
    squad: enriched,
    bankTenths: 5,
    bankIsEstimated: false,
    freeTransfers: 1,
    hitsPlanned: 0,
    chipsRemaining: samuelChipRow ? chipsRemainingCount(samuelChipRow.used) : 3,
    horizon: 3,
    fixturesByTeam,
    templateCoverage: templateCoveragePct,
    uniqueness,
  });

  const insights = generateInsights({
    squad: enriched,
    templateGaps,
    differentials,
    fixturesByTeam,
    horizon: 3,
    freeTransfers: 1,
    chipExpiryWarning: chipExpiryWarning(12),
  });

  const locked = new Set<number>();
  const excluded = new Set<number>();
  const sellOverrides = new Map<number, number>();

  const transferSuggestions = buildTransferSuggestions({
    squad: squadPlayers,
    elements,
    fixturesByTeam,
    leagueOwnership: ownershipMap,
    mostOwned: overview.mostOwned,
    bankTenths: 5,
    freeTransfers: 1,
    maxHit: 4,
    horizon: 3,
    lockedIds: locked,
    excludedIds: excluded,
    favourTemplate: true,
    sellOverrides,
    limit: 10,
  });

  const transferComparisons = buildTransferComparisons({
    squad: squadPlayers,
    elements,
    fixturesByTeam,
    leagueOwnership: ownershipMap,
    mostOwned: overview.mostOwned,
    bankTenths: 5,
    freeTransfers: 1,
    maxHit: 4,
    horizon: 3,
    lockedIds: locked,
    excludedIds: excluded,
    favourTemplate: true,
    sellOverrides,
  });

  const recommended = recommendStartingXI(enriched);
  const captainMatrix = buildCaptainMatrix({
    squad: enriched,
    fixturesByTeam,
    leagueCaptainCounts: new Map([[1, 4], [2, 2], [4, 2]]),
    horizon: 3,
    favourTemplate: true,
  });
  const bench = benchRecommendation({ squad: enriched, recommended });

  const samuelOwned = new Set(enriched.map((p) => p.elementId));
  const rivals = [
    { id: "999002", name: "Marco Löffel Diaz", team: "Real Rapperswil" },
    { id: "999003", name: "Stephan Ruoss", team: "FLYING BURRITOS*" },
  ].map((r) => {
    const rivalSet = rivalSquads.get(r.id) ?? new Set<number>();
    return {
      entryId: r.id,
      managerName: r.name,
      teamName: r.team,
      rank: 2,
      pointsGap: -12,
      sharedPlayers: [...rivalSet].filter((id) => samuelOwned.has(id)).map((id) => elements.get(id)!.webName),
      rivalOnly: [...rivalSet].filter((id) => !samuelOwned.has(id)).map((id) => elements.get(id)?.webName ?? "?"),
      samuelOnly: [...samuelOwned].filter((id) => !rivalSet.has(id)).map((id) => elements.get(id)!.webName),
      captain: "Salah",
      chipsRemaining: ["wildcard", "bboost", "freehit"] as SeasonChipType[],
    };
  });

  return {
    isPreview: true,
    setupRequired: false,
    setupMessage: null,
    header: {
      title: "Private Team Planner",
      seasonName: overview.seasonName,
      currentEvent: 12,
      nextDeadline: new Date(Date.now() + 86400000 * 2).toISOString(),
      teamName: "Yevu Athletic",
      sourceEventNumber: 12,
      lastSyncAt: new Date().toISOString(),
      dataState: "preview",
      isDraft: false,
      samuelEntryId: SAMUEL_ENTRY,
    },
    overview,
    settings,
    squad: enriched,
    squadKind: "imported",
    squadValidation: validation,
    summary,
    rating,
    insights,
    templateCoverage,
    templateGaps,
    differentials,
    threatsAndLevers,
    transfers: {
      suggestions: transferSuggestions,
      comparisons: transferComparisons,
      formula: PLANNER_SCORE_FORMULA,
    },
    selection: { recommended, captainMatrix, bench },
    rivals,
    chips: {
      samuelStatus: samuelChipRow,
      guidance: buildChipGuidance({
        squad: enriched,
        fixturesByTeam,
        chipsRemaining: samuelChipRow?.remaining ?? [...SEASON_CHIP_TYPES],
        wildcardUsed: 5,
        currentEvent: 12,
      }),
      retentionPct: Object.fromEntries(
        SEASON_CHIP_TYPES.map((c) => [c, chipRetentionLeaguePct(overview.chipStatus, c)]),
      ) as Partial<Record<SeasonChipType, number>>,
    },
    players: {
      catalog: [...elements.values()],
      watchlist: [20, 19],
    },
    scenarios: [
      {
        id: "preview-scenario-1",
        name: "Roll FT",
        targetEventNumber: 13,
        chip: null,
        transferCount: 0,
        updatedAt: new Date().toISOString(),
      },
    ],
    elements,
  };
}

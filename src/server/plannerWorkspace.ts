import { and, desc, eq } from "drizzle-orm";

import { db } from "@/db/client";
import {
  entryEventResults,
  leagues,
  managers,
  seasonEntries,
  seasons,
  syncRuns,
} from "@/db/schema";
import { chipExpiryWarning, chipsRemainingCount, buildChipGuidance, chipRetentionLeaguePct } from "@/planner/chipGuidance";
import { buildElementCatalog, buildFixturesByTeam } from "@/planner/elementCatalog";
import { PLANNER_SCORE_FORMULA } from "@/planner/plannerScore";
import { buildCaptainMatrix, benchRecommendation, recommendStartingXI } from "@/planner/selection";
import { enrichPicksWithPoints, squadFromPicksResponse } from "@/planner/squadImport";
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
  PlannerDataState,
  PlannerElement,
  PlannerSettings,
  ScenarioSummary,
  SquadPlayer,
} from "@/planner/types";
import { DEFAULT_PLANNER_SETTINGS } from "@/planner/types";
import type { SeasonChipType } from "@/lib/chipLabels";
import { SEASON_CHIP_TYPES, formatChipName } from "@/lib/chipLabels";
import { leagueConfig } from "@/lib/leagueConfig";
import { plannerEntryId } from "@/lib/plannerConfig";
import {
  fetchBootstrap,
  fetchEntryPicks,
  fetchFixtures,
  latestLockedEvent,
} from "@/providers/fpl/client";

import { getPlannerOverview, type PlannerOverview } from "./plannerData";
import {
  getActiveSquad,
  getOrCreateProfile,
  getProfileSettings,
  getReferenceScreenshotMeta,
  getWatchlist,
  listScenarios,
  saveSquad,
  squadPlayersFromRows,
  type ReferenceScreenshotMeta,
} from "./plannerRepository";
import { isVisionParseAvailable } from "@/planner/screenshotParse";

export interface PlannerWorkspace {
  isPreview: boolean;
  setupRequired: boolean;
  setupMessage: string | null;
  header: {
    title: string;
    seasonName: string | null;
    currentEvent: number | null;
    nextDeadline: string | null;
    teamName: string | null;
    sourceEventNumber: number | null;
    lastSyncAt: string | null;
    dataState: PlannerDataState;
    isDraft: boolean;
    samuelEntryId: string | null;
  };
  overview: PlannerOverview | null;
  settings: PlannerSettings;
  squad: EnrichedSquadPlayer[];
  squadKind: "imported" | "draft" | "manual";
  squadValidation: ReturnType<typeof validateSquad>;
  summary: ReturnType<typeof squadSummary>;
  rating: ReturnType<typeof computeSquadRating>;
  insights: ReturnType<typeof generateInsights>;
  templateCoverage: ReturnType<typeof buildTemplateCoverage>;
  templateGaps: ReturnType<typeof buildTemplateGaps>;
  differentials: ReturnType<typeof buildSamuelDifferentials>;
  threatsAndLevers: ReturnType<typeof buildThreatsAndLevers>;
  transfers: {
    suggestions: ReturnType<typeof buildTransferSuggestions>;
    comparisons: ReturnType<typeof buildTransferComparisons>;
    formula: string;
  };
  selection: {
    recommended: ReturnType<typeof recommendStartingXI>;
    captainMatrix: ReturnType<typeof buildCaptainMatrix>;
    bench: ReturnType<typeof benchRecommendation>;
  };
  rivals: Array<{
    entryId: string;
    managerName: string;
    teamName: string;
    rank: number | null;
    pointsGap: number | null;
    sharedPlayers: string[];
    rivalOnly: string[];
    samuelOnly: string[];
    captain: string | null;
    chipsRemaining: SeasonChipType[];
  }>;
  chips: {
    samuelStatus: {
      managerName: string;
      teamName: string;
      used: Partial<Record<SeasonChipType, number>>;
      remaining: SeasonChipType[];
    } | null;
    guidance: ReturnType<typeof buildChipGuidance>;
    retentionPct: Partial<Record<SeasonChipType, number>>;
  };
  players: {
    catalog: PlannerElement[];
    watchlist: number[];
  };
  scenarios: ScenarioSummary[];
  elements: Map<number, PlannerElement>;
  referenceScreenshot: ReferenceScreenshotMeta & {
    imagePath: string | null;
  };
  visionParseAvailable: boolean;
}

function enrichSquadPlayers(args: {
  players: SquadPlayer[];
  elements: Map<number, PlannerElement>;
  ownership: Map<number, { count: number; pct: number }>;
  points: Map<number, number | null>;
  fixturesByTeam: Map<number, import("@/planner/types").PlannerFixture[]>;
}): EnrichedSquadPlayer[] {
  return args.players
    .map((p) => {
      const element = args.elements.get(p.elementId);
      if (!element) return null;
      const sell = sellPriceTenths(p, element);
      const teamFixtures = args.fixturesByTeam.get(element.teamId) ?? [];
      return {
        ...p,
        element,
        sellPriceDisplay: sell,
        leagueOwnership: args.ownership.get(p.elementId) ?? null,
        latestPoints: args.points.get(p.elementId) ?? null,
        nextFixture: teamFixtures[0] ?? null,
        fixtureDifficulty: teamFixtures[0]?.difficulty ?? null,
      };
    })
    .filter(Boolean) as EnrichedSquadPlayer[];
}

async function lastSuccessfulSync(): Promise<string | null> {
  const row = await db.query.syncRuns.findFirst({
    where: eq(syncRuns.status, "success"),
    orderBy: desc(syncRuns.finishedAt),
  });
  return row?.finishedAt?.toISOString() ?? null;
}

async function importSamuelSquad(args: {
  profileId: string;
  entryId: string;
  eventNumber: number;
  elements: Map<number, PlannerElement>;
}): Promise<SquadPlayer[] | null> {
  const picks = await fetchEntryPicks(args.entryId, args.eventNumber);
  if (!picks) return null;
  const players = squadFromPicksResponse(picks);
  await saveSquad({
    profileId: args.profileId,
    kind: "imported",
    sourceEventNumber: args.eventNumber,
    importedAt: new Date(),
    players,
  });
  return players;
}

export async function buildPlannerWorkspace(options?: {
  isPreview?: boolean;
  previewBuilder?: () => Promise<PlannerWorkspace>;
}): Promise<PlannerWorkspace> {
  if (options?.isPreview && options.previewBuilder) {
    return options.previewBuilder();
  }

  const entryId = plannerEntryId();
  const overview = await getPlannerOverview();
  const lastSync = await lastSuccessfulSync();

  if (!entryId) {
    return buildManualOnlyWorkspace({
      overview,
      lastSync,
      setupMessage:
        "No FPL entry ID configured — upload a screenshot and build your private draft squad below.",
    });
  }

  const leagueRow = await db.query.leagues.findFirst({
    where: eq(leagues.slug, leagueConfig.slug),
  });
  const season = await db.query.seasons.findFirst({
    where: eq(seasons.state, "active"),
  });

  if (!leagueRow || !season) {
    return emptyWorkspace({
      setupRequired: false,
      setupMessage: "League or season data not available yet.",
      overview,
      lastSync,
      entryId,
    });
  }

  const samuelEntry = await db.query.seasonEntries.findFirst({
    where: and(
      eq(seasonEntries.seasonId, season.id),
      eq(seasonEntries.leagueId, leagueRow.id),
      eq(seasonEntries.providerEntryId, entryId),
    ),
  });

  if (!samuelEntry) {
    return emptyWorkspace({
      setupRequired: true,
      setupMessage: `Entry ${entryId} was not found in the synced league — check PLANNER_FPL_ENTRY_ID.`,
      overview,
      lastSync,
      entryId,
    });
  }

  const profile = await getOrCreateProfile(season.id, entryId);
  const settings = await getProfileSettings(profile.id);

  let bootstrap;
  let fixturesByTeam = new Map<number, import("@/planner/types").PlannerFixture[]>();
  let elements = new Map<number, PlannerElement>();
  let nextDeadline: string | null = null;
  let currentEvent = overview?.eventNumber ?? null;
  let dataState: PlannerDataState = "partial";

  try {
    bootstrap = await fetchBootstrap();
    elements = buildElementCatalog(bootstrap.elements, bootstrap.teams);
    const fixtures = await fetchFixtures();
    const fromGw = currentEvent ?? latestLockedEvent(bootstrap.events) ?? 1;
    fixturesByTeam = buildFixturesByTeam(fixtures, bootstrap.teams, fromGw);
    const nextEv = bootstrap.events.find((e) => e.is_next);
    nextDeadline = nextEv?.deadline_time ?? null;
    if (currentEvent == null) {
      currentEvent = latestLockedEvent(bootstrap.events);
    }
    dataState = currentEvent ? "live" : "preseason";
  } catch {
    dataState = "stale";
  }

  let draftSquad = await getActiveSquad(profile.id, "draft");
  let importedSquad = await getActiveSquad(profile.id, "imported");
  let squadPlayers: SquadPlayer[] = [];
  let squadKind: "imported" | "draft" | "manual" = "manual";
  let sourceEvent = importedSquad?.sourceEventNumber ?? currentEvent;
  let isDraft = false;

  if (draftSquad && draftSquad.players.length > 0) {
    squadPlayers = squadPlayersFromRows(draftSquad.players);
    squadKind = "draft";
    isDraft = true;
  } else if (importedSquad && importedSquad.players.length > 0) {
    squadPlayers = squadPlayersFromRows(importedSquad.players);
    squadKind = "imported";
  } else if (currentEvent != null) {
    const imported = await importSamuelSquad({
      profileId: profile.id,
      entryId,
      eventNumber: currentEvent,
      elements,
    });
    if (imported) {
      squadPlayers = imported;
      squadKind = "imported";
      sourceEvent = currentEvent;
    }
  }

  const ownershipMap = new Map<number, { count: number; pct: number }>();
  for (const p of overview?.mostOwned ?? []) {
    ownershipMap.set(p.elementId, { count: p.ownerCount, pct: p.ownerPct });
  }

  let pointsMap = new Map<number, number | null>();
  if (currentEvent != null) {
    try {
      const picks = await fetchEntryPicks(entryId, currentEvent);
      if (picks) pointsMap = enrichPicksWithPoints(picks.picks);
    } catch {
      // ignore
    }
  }

  const enriched = enrichSquadPlayers({
    players: squadPlayers,
    elements,
    ownership: ownershipMap,
    points: pointsMap,
    fixturesByTeam,
  });

  const activeSquadRow = draftSquad ?? importedSquad;
  const bankTenths =
    activeSquadRow?.bankOverrideTenths ??
    activeSquadRow?.bankTenths ??
    null;
  const freeTransfers =
    activeSquadRow?.freeTransfersOverride ??
    activeSquadRow?.freeTransfers ??
    null;

  const templateCoveragePct = computeTemplateCoverageScore(
    enriched,
    overview?.mostOwned ?? [],
  );
  const uniqueness = computeUniquenessScore(enriched);
  const validation = validateSquad({
    players: squadPlayers,
    elements,
    bankTenths,
  });

  const templateCoverage = buildTemplateCoverage({
    mostOwned: overview?.mostOwned ?? [],
    elements,
    samuelSquad: enriched,
    captainCounts: new Map(),
    fixturesByTeam,
  });

  const templateGaps = buildTemplateGaps({
    mostOwned: overview?.mostOwned ?? [],
    elements,
    samuelSquad: enriched,
    minPct: settings.templateGapMinPct,
    fixturesByTeam,
    leagueOwnership: ownershipMap,
    favourTemplate: settings.favourTemplate,
    horizon: settings.planningHorizon,
  });

  const rivalEntryIds = settings.rivalEntryIds.slice(0, 5);
  const rivalNames = new Map<string, string>();
  const rivalSquads = new Map<string, Set<number>>();

  const allEntries = await db
    .select({
      entryId: seasonEntries.providerEntryId,
      managerName: managers.displayName,
      teamName: seasonEntries.teamName,
    })
    .from(seasonEntries)
    .innerJoin(managers, eq(managers.id, seasonEntries.managerId))
    .where(
      and(eq(seasonEntries.leagueId, leagueRow.id), eq(seasonEntries.seasonId, season.id)),
    );

  for (const e of allEntries) rivalNames.set(e.entryId, e.managerName);

  const defaultRivals =
    rivalEntryIds.length > 0
      ? rivalEntryIds
      : allEntries
          .filter((e) => e.entryId !== entryId)
          .slice(0, 5)
          .map((e) => e.entryId);

  for (const rid of defaultRivals) {
    if (currentEvent != null) {
      try {
        const rp = await fetchEntryPicks(rid, currentEvent);
        if (rp) rivalSquads.set(rid, new Set(rp.picks.map((p) => p.element)));
      } catch {
        // ignore
      }
    }
  }

  const rivalOwnershipByElement = new Map<number, Set<string>>();
  for (const [rid, squad] of rivalSquads) {
    for (const elId of squad) {
      const set = rivalOwnershipByElement.get(elId) ?? new Set();
      set.add(rid);
      rivalOwnershipByElement.set(elId, set);
    }
  }

  const differentialsFixed = buildSamuelDifferentials({
    samuelSquad: enriched,
    maxOwners: 2,
    rivalOwnership: rivalOwnershipByElement,
    rivalNames,
    fixturesByTeam,
  });

  const threatsAndLevers = buildThreatsAndLevers({
    mostOwned: overview?.mostOwned ?? [],
    samuelSquad: enriched,
    rivalSquads,
    rivalNames,
    elements,
    minRivalOwnPct: 20,
  });

  const samuelChipRow = overview?.chipStatus.find(
    (r) => r.teamName === samuelEntry.teamName,
  ) ?? overview?.chipStatus[0] ?? null;

  const rating = computeSquadRating({
    squad: enriched,
    fixturesByTeam,
    horizon: settings.planningHorizon,
    templateCoverage: templateCoveragePct,
    uniqueness,
  });

  const insights = generateInsights({
    squad: enriched,
    templateGaps,
    differentials: differentialsFixed,
    fixturesByTeam,
    horizon: settings.planningHorizon,
    freeTransfers,
    chipExpiryWarning: chipExpiryWarning(currentEvent),
  });

  const summary = squadSummary({
    squad: enriched,
    bankTenths,
    bankIsEstimated: activeSquadRow?.bankOverrideTenths == null && bankTenths == null,
    freeTransfers,
    hitsPlanned: 0,
    chipsRemaining: samuelChipRow ? chipsRemainingCount(samuelChipRow.used) : 0,
    horizon: settings.planningHorizon,
    fixturesByTeam,
    templateCoverage: templateCoveragePct,
    uniqueness,
  });

  const locked = new Set(settings.lockedElementIds);
  const excluded = new Set(settings.excludedElementIds);
  const sellOverrides = new Map<number, number>();
  for (const p of squadPlayers) {
    if (p.sellPriceTenths != null) sellOverrides.set(p.elementId, p.sellPriceTenths);
  }

  const transferSuggestions =
    squadPlayers.length === 15
      ? buildTransferSuggestions({
          squad: squadPlayers,
          elements,
          fixturesByTeam,
          leagueOwnership: ownershipMap,
          mostOwned: overview?.mostOwned ?? [],
          bankTenths: bankTenths ?? 0,
          freeTransfers: freeTransfers ?? 1,
          maxHit: settings.maxHit,
          horizon: settings.planningHorizon,
          lockedIds: locked,
          excludedIds: excluded,
          favourTemplate: settings.favourTemplate,
          sellOverrides,
        })
      : [];

  const transferComparisons =
    squadPlayers.length === 15
      ? buildTransferComparisons({
          squad: squadPlayers,
          elements,
          fixturesByTeam,
          leagueOwnership: ownershipMap,
          mostOwned: overview?.mostOwned ?? [],
          bankTenths: bankTenths ?? 0,
          freeTransfers: freeTransfers ?? 1,
          maxHit: settings.maxHit,
          horizon: settings.planningHorizon,
          lockedIds: locked,
          excludedIds: excluded,
          favourTemplate: settings.favourTemplate,
          sellOverrides,
        })
      : [];

  const recommended = recommendStartingXI(enriched);
  const captainMatrix = buildCaptainMatrix({
    squad: enriched,
    fixturesByTeam,
    leagueCaptainCounts: new Map(),
    horizon: settings.planningHorizon,
    favourTemplate: settings.favourTemplate,
  });
  const bench = benchRecommendation({ squad: enriched, recommended });

  const samuelOwned = new Set(enriched.map((p) => p.elementId));
  const rivals = defaultRivals.map((rid) => {
    const meta = allEntries.find((e) => e.entryId === rid);
    const rivalSet = rivalSquads.get(rid) ?? new Set<number>();
    const shared = [...rivalSet].filter((id) => samuelOwned.has(id));
    const rivalOnly = [...rivalSet].filter((id) => !samuelOwned.has(id));
    const samuelOnly = [...samuelOwned].filter((id) => !rivalSet.has(id));
    const chipRow = overview?.chipStatus.find((c) => c.teamName === meta?.teamName);
    return {
      entryId: rid,
      managerName: meta?.managerName ?? rid,
      teamName: meta?.teamName ?? "",
      rank: null,
      pointsGap: null,
      sharedPlayers: shared.map((id) => elements.get(id)?.webName ?? String(id)),
      rivalOnly: rivalOnly.map((id) => elements.get(id)?.webName ?? String(id)),
      samuelOnly: samuelOnly.map((id) => elements.get(id)?.webName ?? String(id)),
      captain: null,
      chipsRemaining: chipRow?.remaining ?? [...SEASON_CHIP_TYPES],
    };
  });

  const scenarios = (await listScenarios(profile.id)).map((s) => ({
    id: s.id,
    name: s.name,
    targetEventNumber: s.targetEventNumber,
    chip: s.chip,
    transferCount: 0,
    updatedAt: s.updatedAt.toISOString(),
  }));

  const watchlist = await getWatchlist(profile.id);
  const screenshotMeta = await getReferenceScreenshotMeta(profile.id);

  return {
    isPreview: false,
    setupRequired: squadPlayers.length === 0 && currentEvent == null,
    setupMessage:
      squadPlayers.length === 0
        ? "No squad available yet — use manual squad builder before Gameweek 1 or after sync."
        : null,
    header: {
      title: "Private Team Planner",
      seasonName: season.name,
      currentEvent,
      nextDeadline,
      teamName: samuelEntry.teamName,
      sourceEventNumber: sourceEvent,
      lastSyncAt: lastSync,
      dataState,
      isDraft,
      samuelEntryId: entryId,
    },
    overview,
    settings,
    squad: enriched,
    squadKind,
    squadValidation: validation,
    summary,
    rating,
    insights,
    templateCoverage,
    templateGaps,
    differentials: differentialsFixed,
    threatsAndLevers,
    transfers: {
      suggestions: transferSuggestions,
      comparisons: transferComparisons,
      formula: PLANNER_SCORE_FORMULA,
    },
    selection: {
      recommended,
      captainMatrix,
      bench,
    },
    rivals,
    chips: {
      samuelStatus: samuelChipRow,
      guidance: buildChipGuidance({
        squad: enriched,
        fixturesByTeam,
        chipsRemaining: samuelChipRow?.remaining ?? [...SEASON_CHIP_TYPES],
        wildcardUsed: samuelChipRow?.used.wildcard ?? null,
        currentEvent,
      }),
      retentionPct: Object.fromEntries(
        SEASON_CHIP_TYPES.map((c) => [
          c,
          chipRetentionLeaguePct(overview?.chipStatus ?? [], c),
        ]),
      ) as Partial<Record<SeasonChipType, number>>,
    },
    players: {
      catalog: [...elements.values()],
      watchlist: watchlist.map((w) => w.elementId),
    },
    scenarios,
    elements,
    referenceScreenshot: {
      ...screenshotMeta,
      imagePath: screenshotMeta.hasScreenshot ? "/api/planner/reference-screenshot" : null,
    },
    visionParseAvailable: isVisionParseAvailable(),
  };
}

async function buildManualOnlyWorkspace(args: {
  overview: PlannerOverview | null;
  lastSync: string | null;
  setupMessage: string;
}): Promise<PlannerWorkspace> {
  const season = await db.query.seasons.findFirst({
    where: eq(seasons.state, "active"),
  });

  let elements = new Map<number, PlannerElement>();
  let fixturesByTeam = new Map<number, import("@/planner/types").PlannerFixture[]>();
  let nextDeadline: string | null = null;
  let dataState: PlannerDataState = "preseason";

  try {
    const bootstrap = await fetchBootstrap();
    elements = buildElementCatalog(bootstrap.elements, bootstrap.teams);
    const fixtures = await fetchFixtures();
    fixturesByTeam = buildFixturesByTeam(fixtures, bootstrap.teams, 1);
    nextDeadline = bootstrap.events.find((e) => e.is_next)?.deadline_time ?? null;
  } catch {
    dataState = "partial";
  }

  let profileId: string | null = null;
  let settings = DEFAULT_PLANNER_SETTINGS;
  let squadPlayers: SquadPlayer[] = [];
  let screenshotMeta: ReferenceScreenshotMeta = {
    hasScreenshot: false,
    mime: null,
    uploadedAt: null,
    label: null,
  };
  let scenarios: ScenarioSummary[] = [];
  let watchlistIds: number[] = [];

  if (season) {
    const profile = await getOrCreateProfile(season.id, null);
    profileId = profile.id;
    settings = await getProfileSettings(profile.id);
    screenshotMeta = await getReferenceScreenshotMeta(profile.id);
    const draft = await getActiveSquad(profile.id, "draft");
    if (draft && draft.players.length > 0) {
      squadPlayers = squadPlayersFromRows(draft.players);
    }
    scenarios = (await listScenarios(profile.id)).map((s) => ({
      id: s.id,
      name: s.name,
      targetEventNumber: s.targetEventNumber,
      chip: s.chip,
      transferCount: 0,
      updatedAt: s.updatedAt.toISOString(),
    }));
    watchlistIds = (await getWatchlist(profile.id)).map((w) => w.elementId);
  }

  const ownershipMap = new Map(
    (args.overview?.mostOwned ?? []).map((p) => [p.elementId, { count: p.ownerCount, pct: p.ownerPct }]),
  );

  const enriched = enrichSquadPlayers({
    players: squadPlayers,
    elements,
    ownership: ownershipMap,
    points: new Map(),
    fixturesByTeam,
  });

  const draftRow = season && profileId ? await getActiveSquad(profileId, "draft") : null;
  const bankTenths = draftRow?.bankOverrideTenths ?? draftRow?.bankTenths ?? null;
  const freeTransfers = draftRow?.freeTransfersOverride ?? draftRow?.freeTransfers ?? null;

  const validation = validateSquad({
    players: squadPlayers,
    elements,
    bankTenths,
  });

  const templateCoveragePct = computeTemplateCoverageScore(enriched, args.overview?.mostOwned ?? []);
  const uniqueness = computeUniquenessScore(enriched);

  return {
    isPreview: false,
    setupRequired: squadPlayers.length === 0,
    setupMessage: args.setupMessage,
    header: {
      title: "Private Team Planner",
      seasonName: season?.name ?? args.overview?.seasonName ?? null,
      currentEvent: args.overview?.eventNumber ?? null,
      nextDeadline,
      teamName: null,
      sourceEventNumber: null,
      lastSyncAt: args.lastSync,
      dataState,
      isDraft: squadPlayers.length > 0,
      samuelEntryId: null,
    },
    overview: args.overview,
    settings,
    squad: enriched,
    squadKind: squadPlayers.length > 0 ? "draft" : "manual",
    squadValidation: validation,
    summary: squadSummary({
      squad: enriched,
      bankTenths,
      bankIsEstimated: bankTenths == null,
      freeTransfers,
      hitsPlanned: 0,
      chipsRemaining: 0,
      horizon: settings.planningHorizon,
      fixturesByTeam,
      templateCoverage: templateCoveragePct,
      uniqueness,
    }),
    rating: computeSquadRating({
      squad: enriched,
      fixturesByTeam,
      horizon: settings.planningHorizon,
      templateCoverage: templateCoveragePct,
      uniqueness,
    }),
    insights: [],
    templateCoverage: buildTemplateCoverage({
      mostOwned: args.overview?.mostOwned ?? [],
      elements,
      samuelSquad: enriched,
      captainCounts: new Map(),
      fixturesByTeam,
    }),
    templateGaps: [],
    differentials: [],
    threatsAndLevers: { threats: [], levers: [] },
    transfers: { suggestions: [], comparisons: [], formula: PLANNER_SCORE_FORMULA },
    selection: {
      recommended: recommendStartingXI(enriched),
      captainMatrix: [],
      bench: benchRecommendation({
        squad: enriched,
        recommended: recommendStartingXI(enriched),
      }),
    },
    rivals: [],
    chips: {
      samuelStatus: null,
      guidance: [],
      retentionPct: {},
    },
    players: {
      catalog: [...elements.values()],
      watchlist: watchlistIds,
    },
    scenarios,
    elements,
    referenceScreenshot: {
      ...screenshotMeta,
      imagePath: screenshotMeta.hasScreenshot ? "/api/planner/reference-screenshot" : null,
    },
    visionParseAvailable: isVisionParseAvailable(),
  };
}

function emptyWorkspace(args: {
  setupRequired: boolean;
  setupMessage: string | null;
  overview: PlannerOverview | null;
  lastSync: string | null;
  entryId?: string | null;
}): PlannerWorkspace {
  return {
    isPreview: false,
    setupRequired: args.setupRequired,
    setupMessage: args.setupMessage,
    header: {
      title: "Private Team Planner",
      seasonName: args.overview?.seasonName ?? null,
      currentEvent: args.overview?.eventNumber ?? null,
      nextDeadline: null,
      teamName: null,
      sourceEventNumber: null,
      lastSyncAt: args.lastSync,
      dataState: "partial",
      isDraft: false,
      samuelEntryId: args.entryId ?? null,
    },
    overview: args.overview,
    settings: DEFAULT_PLANNER_SETTINGS,
    squad: [],
    squadKind: "manual",
    squadValidation: { valid: false, errors: [] },
    summary: squadSummary({
      squad: [],
      bankTenths: null,
      bankIsEstimated: true,
      freeTransfers: null,
      hitsPlanned: 0,
      chipsRemaining: 0,
      horizon: 3,
      fixturesByTeam: new Map(),
      templateCoverage: 0,
      uniqueness: 0,
    }),
    rating: { total: 0, partial: true, components: [] },
    insights: [],
    templateCoverage: [],
    templateGaps: [],
    differentials: [],
    threatsAndLevers: { threats: [], levers: [] },
    transfers: { suggestions: [], comparisons: [], formula: PLANNER_SCORE_FORMULA },
    selection: {
      recommended: { starters: [], bench: [] },
      captainMatrix: [],
      bench: {
        recommendedOrder: [],
        minutesRisk: [],
        benchBoostReady: false,
        explanation: "",
      },
    },
    rivals: [],
    chips: {
      samuelStatus: null,
      guidance: [],
      retentionPct: {},
    },
    players: { catalog: [], watchlist: [] },
    scenarios: [],
    elements: new Map(),
    referenceScreenshot: {
      hasScreenshot: false,
      mime: null,
      uploadedAt: null,
      label: null,
      imagePath: null,
    },
    visionParseAvailable: false,
  };
}

export type { PlannerOverview };

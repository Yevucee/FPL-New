import type { LeagueInsights } from "@/metrics/insights";
import type { StandingRow } from "@/metrics/types";
import { leagueConfig } from "@/lib/leagueConfig";
import type { LeagueOverview } from "@/server/leagueData";

const PREVIEW_GW = 12;

const managers = [
  { id: "e-samuel", name: "Samuel Polley", team: "Yevu Athletic" },
  { id: "e-marco", name: "Marco Löffel Diaz", team: "Real Rapperswil" },
  { id: "e-stephan", name: "Stephan Ruoss", team: "FLYING BURRITOS*" },
  { id: "e-david", name: "David Nadig", team: "The Superstorms**" },
  { id: "e-roland", name: "Roland Christandl", team: "Anti Haaland Brigade" },
  { id: "e-pascal", name: "Pascal Kaiser", team: "Kaiser Chiefs FC" },
  { id: "e-chris", name: "Chris Meier", team: "Meier's XI" },
] as const;

/** Realistic in-season overview for design preview (GW12 live). */
export function previewLeagueOverview(selectedGw = PREVIEW_GW): LeagueOverview {
  const totals = [892, 878, 865, 841, 829, 812, 798];
  const gwPoints = [68, 72, 55, 61, 49, 58, 44];
  const movements = [0, 1, -1, 2, -2, 0, -1];
  const vsAvg = [12, 16, -1, 5, -7, 2, -12];

  const standings: StandingRow[] = managers.map((manager, index) => ({
    entryId: manager.id,
    managerName: manager.name,
    teamName: manager.team,
    totalNetPoints: totals[index]!,
    eventNetPoints: gwPoints[index]!,
    rank: index + 1,
    previousRank: index + 1 - (movements[index] ?? 0),
    rankMovement: movements[index] ?? null,
    gapToLeader: index === 0 ? 0 : totals[0]! - totals[index]!,
    gapToAbove: index === 0 ? 0 : totals[index - 1]! - totals[index]!,
    gwVsAverage: vsAvg[index]!,
  }));

  const entryIntel: LeagueOverview["entryIntel"] = {};
  for (const manager of managers) {
    entryIntel[manager.id] = {
      overallFplRank: 42_000 + managers.indexOf(manager) * 11_000,
      careerBestSeason: "2024/25",
      careerBestPoints: 2400 + managers.indexOf(manager) * 12,
      seasonTransfers: 8 + managers.indexOf(manager),
    };
  }

  const insights: LeagueInsights = {
    woodenSpoon: {
      entryId: managers[6]!.id,
      managerName: managers[6]!.name,
      teamName: managers[6]!.team,
      value: 44,
    },
    biggestClimber: {
      entryId: managers[3]!.id,
      managerName: managers[3]!.name,
      teamName: managers[3]!.team,
      movement: 2,
      fromRank: 6,
      toRank: 4,
    },
    biggestFaller: {
      entryId: managers[4]!.id,
      managerName: managers[4]!.name,
      teamName: managers[4]!.team,
      movement: -2,
      fromRank: 3,
      toRank: 5,
    },
    leagueAverageGw: 56,
    seasonBestGw: {
      entryId: managers[1]!.id,
      managerName: managers[1]!.name,
      teamName: managers[1]!.team,
      value: 94,
      eventNumber: 9,
    },
    seasonWorstGw: {
      entryId: managers[6]!.id,
      managerName: managers[6]!.name,
      teamName: managers[6]!.team,
      value: 28,
      eventNumber: 4,
    },
    mostGameweekWins: {
      entryId: managers[0]!.id,
      managerName: managers[0]!.name,
      teamName: managers[0]!.team,
      value: 4,
    },
    mostMonthlyWins: {
      entryId: managers[1]!.id,
      managerName: managers[1]!.name,
      teamName: managers[1]!.team,
      value: 2,
    },
    seasonWoodenSpoonCount: {
      entryId: managers[6]!.id,
      managerName: managers[6]!.name,
      teamName: managers[6]!.team,
      value: 3,
    },
    transferTaxSeason: {
      entryId: managers[2]!.id,
      managerName: managers[2]!.name,
      teamName: managers[2]!.team,
      value: 32,
    },
    benchRegretSeason: {
      entryId: managers[5]!.id,
      managerName: managers[5]!.name,
      teamName: managers[5]!.team,
      value: 148,
    },
    benchPointsLeader: {
      entryId: managers[5]!.id,
      managerName: managers[5]!.name,
      teamName: managers[5]!.team,
      value: 18,
    },
    transferHitsLeader: {
      entryId: managers[2]!.id,
      managerName: managers[2]!.name,
      teamName: managers[2]!.team,
      value: 8,
    },
    seasonTransferLeader: {
      entryId: managers[2]!.id,
      managerName: managers[2]!.name,
      teamName: managers[2]!.team,
      value: 22,
    },
    captaincyLeader: {
      entryId: managers[0]!.id,
      managerName: managers[0]!.name,
      teamName: managers[0]!.team,
      value: 24,
      captainName: "Haaland",
    },
    captainPointsLeader: {
      entryId: managers[0]!.id,
      managerName: managers[0]!.name,
      teamName: managers[0]!.team,
      value: 286,
    },
    captainCopycat: {
      entryId: managers[4]!.id,
      managerName: managers[4]!.name,
      teamName: managers[4]!.team,
      value: 9,
    },
    captainDifferential: {
      entryId: managers[3]!.id,
      managerName: managers[3]!.name,
      teamName: managers[3]!.team,
      value: 2,
    },
    bestFplRank: {
      entryId: managers[0]!.id,
      managerName: managers[0]!.name,
      teamName: managers[0]!.team,
      value: 42_000,
    },
    bestBenchBoost: {
      entryId: managers[4]!.id,
      managerName: managers[4]!.name,
      teamName: managers[4]!.team,
      value: 96,
      eventNumber: 8,
      chip: "bboost",
      chipLabel: "Bench Boost",
    },
    bestFreeHit: {
      entryId: managers[2]!.id,
      managerName: managers[2]!.name,
      teamName: managers[2]!.team,
      value: 88,
      eventNumber: 6,
      chip: "freehit",
      chipLabel: "Free Hit",
    },
    bestTripleCaptain: {
      entryId: managers[1]!.id,
      managerName: managers[1]!.name,
      teamName: managers[1]!.team,
      value: 102,
      eventNumber: 11,
      chip: "3xc",
      chipLabel: "Triple Captain",
    },
    mostTemplate: {
      entryId: managers[0]!.id,
      managerName: managers[0]!.name,
      teamName: managers[0]!.team,
      value: 78.2,
    },
    mostContrarian: {
      entryId: managers[3]!.id,
      managerName: managers[3]!.name,
      teamName: managers[3]!.team,
      value: 41.5,
    },
    mostWeeksAtTop: {
      entryId: managers[0]!.id,
      managerName: managers[0]!.name,
      teamName: managers[0]!.team,
      value: 5,
    },
    mostWeeksLast: {
      entryId: managers[6]!.id,
      managerName: managers[6]!.name,
      teamName: managers[6]!.team,
      value: 4,
    },
    formLeaders: [
      {
        entryId: managers[1]!.id,
        managerName: managers[1]!.name,
        teamName: managers[1]!.team,
        value: 3,
        points: 198,
        events: 3,
      },
      {
        entryId: managers[0]!.id,
        managerName: managers[0]!.name,
        teamName: managers[0]!.team,
        value: 3,
        points: 191,
        events: 3,
      },
      {
        entryId: managers[3]!.id,
        managerName: managers[3]!.name,
        teamName: managers[3]!.team,
        value: 3,
        points: 178,
        events: 3,
      },
    ],
    chipsPlayed: [
      {
        entryId: managers[1]!.id,
        managerName: managers[1]!.name,
        teamName: managers[1]!.team,
        chip: "3xc",
        eventNumber: 11,
      },
      {
        entryId: managers[4]!.id,
        managerName: managers[4]!.name,
        teamName: managers[4]!.team,
        chip: "bboost",
        eventNumber: 8,
      },
    ],
  };

  const finishedEvents = Array.from({ length: selectedGw }, (_, index) => index + 1);

  return {
    league: {
      slug: leagueConfig.slug,
      name: leagueConfig.displayName,
      visibility: leagueConfig.visibility,
    },
    seasonName: "2026/27",
    registeredManagers: managers.length,
    latestFinishedEvent: selectedGw,
    liveEvent: selectedGw,
    isLiveGameweek: true,
    currentEvent: selectedGw,
    nextEvent: selectedGw + 1,
    selectedEvent: selectedGw,
    finishedEvents,
    standings,
    managers: managers.map((manager) => ({
      entryId: manager.id,
      managerName: manager.name,
      teamName: manager.team,
    })),
    entryIntel,
    mostOwned: [
      { webName: "Haaland", ownerCount: 6, ownerPct: 86, elementId: 1 },
      { webName: "Salah", ownerCount: 5, ownerPct: 71, elementId: 2 },
      { webName: "Gabriel", ownerCount: 5, ownerPct: 71, elementId: 3 },
      { webName: "Palmer", ownerCount: 4, ownerPct: 57, elementId: 4 },
      { webName: "Watkins", ownerCount: 4, ownerPct: 57, elementId: 5 },
      { webName: "Saka", ownerCount: 3, ownerPct: 43, elementId: 6 },
      { webName: "Bruno F.", ownerCount: 3, ownerPct: 43, elementId: 7 },
      { webName: "Son", ownerCount: 2, ownerPct: 29, elementId: 8 },
      { webName: "Trippier", ownerCount: 2, ownerPct: 29, elementId: 9 },
      { webName: "Ederson", ownerCount: 2, ownerPct: 29, elementId: 10 },
      { webName: "Gordon", ownerCount: 1, ownerPct: 14, elementId: 11 },
      { webName: "Murillo", ownerCount: 1, ownerPct: 14, elementId: 12 },
      { webName: "Bowen", ownerCount: 1, ownerPct: 14, elementId: 13 },
      { webName: "Mbeumo", ownerCount: 1, ownerPct: 14, elementId: 14 },
    ],
    mostOwnedEvent: selectedGw,
    gameweekWinner: {
      value: 72,
      joint: false,
      winners: [{ entryId: managers[1]!.id, managerName: managers[1]!.name, teamName: managers[1]!.team }],
    },
    monthlyLeader: {
      value: 248,
      joint: false,
      winners: [{ entryId: managers[0]!.id, managerName: managers[0]!.name, teamName: managers[0]!.team }],
    },
    insights,
    seasonWindow: { id: "full", label: "Full season", kind: "full", fromEvent: 1, phase: null },
    seasonWindowOptions: [
      { id: "full", label: "Full season", kind: "full" },
      { id: "first-half", label: "1st half (GW1–19)", kind: "range", fromEvent: 1 },
      { id: "second-half", label: "2nd half (GW20–38)", kind: "range", fromEvent: 20 },
      { id: "phase-8", label: "August", kind: "phase", phase: 8 },
    ],
    lastSync: { status: "succeeded", finishedAt: new Date(Date.now() - 12 * 60 * 1000) },
    dataMode: "live",
    seasonState: "active",
    isSummaryArchive: false,
    isReconstructedArchive: false,
  };
}

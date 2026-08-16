import type { MostOwnedPlayer } from "@/providers/fpl/mostOwned";

import type {
  DifferentialRow,
  PlannerElement,
  PlannerFixture,
  PlannerInsight,
  PlannerPosition,
  SquadRatingComponent,
  TemplateGapRow,
  TemplatePlayerRow,
  ThreatLeverRow,
} from "./types";
import { computePlannerScore } from "./plannerScore";
import { countByPosition, sellPriceTenths } from "./squadValidation";
import type { EnrichedSquadPlayer } from "./types";

export function buildTemplateCoverage(args: {
  mostOwned: MostOwnedPlayer[];
  elements: Map<number, PlannerElement>;
  samuelSquad: EnrichedSquadPlayer[];
  captainCounts: Map<number, number>;
  fixturesByTeam: Map<number, PlannerFixture[]>;
  limit?: number;
}): TemplatePlayerRow[] {
  const limit = args.limit ?? 20;
  const samuelById = new Map(args.samuelSquad.map((p) => [p.elementId, p]));

  return args.mostOwned.slice(0, limit).map((row) => {
    const element = args.elements.get(row.elementId);
    const samuel = samuelById.get(row.elementId);
    const teamFixtures = element ? args.fixturesByTeam.get(element.teamId) ?? [] : [];
    return {
      elementId: row.elementId,
      webName: row.webName,
      position: element?.position ?? "MID",
      priceTenths: element?.priceTenths ?? 0,
      ownerCount: row.ownerCount,
      ownerPct: row.ownerPct,
      samuelOwns: Boolean(samuel),
      samuelStarts: samuel ? samuel.isStarter : null,
      samuelBenches: samuel ? !samuel.isStarter : null,
      captainCount: args.captainCounts.get(row.elementId) ?? 0,
      form: element?.form ?? null,
      nextFixture: teamFixtures[0] ?? null,
    };
  });
}

export function buildTemplateGaps(args: {
  mostOwned: MostOwnedPlayer[];
  elements: Map<number, PlannerElement>;
  samuelSquad: EnrichedSquadPlayer[];
  minPct: number;
  fixturesByTeam: Map<number, PlannerFixture[]>;
  leagueOwnership: Map<number, { count: number; pct: number }>;
  favourTemplate: boolean;
  horizon: number;
}): TemplateGapRow[] {
  const owned = new Set(args.samuelSquad.map((p) => p.elementId));
  const posCounts = countByPosition(args.samuelSquad);

  return args.mostOwned
    .filter((row) => !owned.has(row.elementId) && row.ownerPct >= args.minPct)
    .map((row) => {
      const element = args.elements.get(row.elementId);
      const position = element?.position ?? "MID";
      const teamFixtures = element ? args.fixturesByTeam.get(element.teamId) ?? [] : [];
      const similar = findSimilarSamuelPlayer(position, element?.priceTenths ?? 0, args.samuelSquad);
      const score = element
        ? computePlannerScore({
            element,
            fixtures: teamFixtures,
            horizon: args.horizon,
            leagueOwnershipPct: row.ownerPct,
            favourTemplate: args.favourTemplate,
          }).total
        : 0;

      return {
        elementId: row.elementId,
        webName: row.webName,
        position,
        priceTenths: element?.priceTenths ?? 0,
        ownerCount: row.ownerCount,
        ownerPct: row.ownerPct,
        samuelOwns: false,
        samuelStarts: null,
        samuelBenches: null,
        captainCount: 0,
        form: element?.form ?? null,
        nextFixture: teamFixtures[0] ?? null,
        similarSamuelPlayer: similar,
        plannerScore: score,
      };
    })
    .sort((a, b) => b.ownerPct - a.ownerPct);
}

function findSimilarSamuelPlayer(
  position: PlannerPosition,
  priceTenths: number,
  squad: EnrichedSquadPlayer[],
): string | null {
  const samePos = squad.filter((p) => p.element.position === position);
  if (samePos.length === 0) return null;
  const closest = samePos.reduce((best, p) => {
    const diff = Math.abs(p.element.priceTenths - priceTenths);
    const bestDiff = Math.abs(best.element.priceTenths - priceTenths);
    return diff < bestDiff ? p : best;
  });
  return closest.element.webName;
}

export function buildSamuelDifferentials(args: {
  samuelSquad: EnrichedSquadPlayer[];
  maxOwners: number;
  rivalOwnership: Map<number, Set<string>>;
  rivalNames: Map<string, string>;
  fixturesByTeam: Map<number, PlannerFixture[]>;
}): DifferentialRow[] {
  return args.samuelSquad
    .filter((p) => (p.leagueOwnership?.count ?? 99) <= args.maxOwners)
    .map((p) => {
      const rivalsWith = [...(args.rivalOwnership.get(p.elementId) ?? [])].map(
        (id) => args.rivalNames.get(id) ?? id,
      );
      const allRivals = [...args.rivalNames.values()];
      const rivalsWithout = allRivals.filter((name) => !rivalsWith.includes(name));
      const fixtures = args.fixturesByTeam.get(p.element.teamId) ?? [];
      const minutesRisk =
        p.element.status === "d" ||
        p.element.status === "i" ||
        (p.element.chanceOfPlaying != null && p.element.chanceOfPlaying < 75);

      return {
        elementId: p.elementId,
        webName: p.element.webName,
        position: p.element.position,
        ownerCount: p.leagueOwnership?.count ?? 0,
        ownerPct: p.leagueOwnership?.pct ?? 0,
        latestPoints: p.latestPoints,
        form: p.element.form,
        nextFixtures: fixtures.slice(0, 3),
        rivalsWithout,
        rivalsWith,
        isStarting: p.isStarter,
        minutesRisk,
      };
    })
    .sort((a, b) => a.ownerPct - b.ownerPct);
}

export function buildThreatsAndLevers(args: {
  mostOwned: MostOwnedPlayer[];
  samuelSquad: EnrichedSquadPlayer[];
  rivalSquads: Map<string, Set<number>>;
  rivalNames: Map<string, string>;
  elements: Map<number, PlannerElement>;
  minRivalOwnPct: number;
}): { threats: ThreatLeverRow[]; levers: ThreatLeverRow[] } {
  const samuelOwned = new Set(args.samuelSquad.map((p) => p.elementId));
  const threats: ThreatLeverRow[] = [];
  const levers: ThreatLeverRow[] = [];

  for (const row of args.mostOwned) {
    const rivalOwners: string[] = [];
    for (const [entryId, squad] of args.rivalSquads) {
      if (squad.has(row.elementId)) {
        rivalOwners.push(args.rivalNames.get(entryId) ?? entryId);
      }
    }
    if (rivalOwners.length === 0) continue;

    const element = args.elements.get(row.elementId);
    if (!samuelOwned.has(row.elementId) && row.ownerPct >= args.minRivalOwnPct) {
      threats.push({
        elementId: row.elementId,
        webName: row.webName,
        position: element?.position ?? "MID",
        ownerCount: row.ownerCount,
        ownerPct: row.ownerPct,
        rivalNames: rivalOwners,
        explanation: `Template player you don't own — ${rivalOwners.length} selected rival(s) have him.`,
      });
    }
  }

  for (const p of args.samuelSquad) {
    const pct = p.leagueOwnership?.pct ?? 100;
    if (pct > 40) continue;
    const rivalOwners: string[] = [];
    for (const [entryId, squad] of args.rivalSquads) {
      if (squad.has(p.elementId)) {
        rivalOwners.push(args.rivalNames.get(entryId) ?? entryId);
      }
    }
    const rivalsWithout = [...args.rivalNames.values()].filter((n) => !rivalOwners.includes(n));
    if (rivalsWithout.length === 0) continue;
    levers.push({
      elementId: p.elementId,
      webName: p.element.webName,
      position: p.element.position,
      ownerCount: p.leagueOwnership?.count ?? 0,
      ownerPct: pct,
      rivalNames: rivalsWithout,
      explanation: `Low league ownership differential — ${rivalsWithout.length} rival(s) don't own him.`,
    });
  }

  return {
    threats: threats.sort((a, b) => b.ownerPct - a.ownerPct).slice(0, 15),
    levers: levers.sort((a, b) => a.ownerPct - b.ownerPct).slice(0, 15),
  };
}

export function computeUniquenessScore(squad: EnrichedSquadPlayer[]): number {
  if (squad.length === 0) return 0;
  const avgOwnership =
    squad.reduce((sum, p) => sum + (p.leagueOwnership?.pct ?? 50), 0) / squad.length;
  return Math.round(Math.max(0, Math.min(100, 100 - avgOwnership)));
}

export function computeTemplateCoverageScore(
  squad: EnrichedSquadPlayer[],
  topTemplate: MostOwnedPlayer[],
): number {
  if (topTemplate.length === 0) return 0;
  const owned = new Set(squad.map((p) => p.elementId));
  const covered = topTemplate.filter((t) => owned.has(t.elementId)).length;
  return Math.round((covered / topTemplate.length) * 100);
}

export function computeSquadRating(args: {
  squad: EnrichedSquadPlayer[];
  fixturesByTeam: Map<number, PlannerFixture[]>;
  horizon: number;
  templateCoverage: number;
  uniqueness: number;
}): { total: number; partial: boolean; components: SquadRatingComponent[] } {
  const { squad, fixturesByTeam, horizon, templateCoverage, uniqueness } = args;
  const partial = squad.some((p) => p.fixtureDifficulty == null);

  const fixtureScores = squad
    .filter((p) => p.isStarter)
    .map((p) => {
      const fixtures = fixturesByTeam.get(p.element.teamId) ?? [];
      const avg =
        fixtures.slice(0, horizon).reduce((s, f) => s + (f.difficulty ?? 3), 0) /
        Math.max(1, Math.min(horizon, fixtures.length));
      return (6 - avg) * 20;
    });
  const fixtureScore =
    fixtureScores.length > 0
      ? Math.round(fixtureScores.reduce((a, b) => a + b, 0) / fixtureScores.length)
      : 0;

  const formScores = squad
    .filter((p) => p.isStarter)
    .map((p) => Math.min(100, ((p.element.form ?? 3) / 10) * 100));
  const formScore =
    formScores.length > 0
      ? Math.round(formScores.reduce((a, b) => a + b, 0) / formScores.length)
      : 0;

  const availScores = squad
    .filter((p) => p.isStarter)
    .map((p) => {
      if (p.element.chanceOfPlaying != null) return p.element.chanceOfPlaying;
      if (p.element.status === "a") return 95;
      if (p.element.status === "d") return 55;
      return 40;
    });
  const availScore =
    availScores.length > 0
      ? Math.round(availScores.reduce((a, b) => a + b, 0) / availScores.length)
      : 0;

  const totalPrice = squad.reduce((s, p) => s + p.element.priceTenths, 0);
  const valueScore = Math.round(Math.min(100, (totalPrice / 1500) * 100));

  const captain = squad.find((p) => p.isCaptain);
  const captainScore = captain
    ? Math.min(100, Math.round(((captain.element.form ?? 4) / 10) * 100))
    : 0;

  const bench = squad.filter((p) => !p.isStarter);
  const benchScore =
    bench.length > 0
      ? Math.round(
          bench.reduce((s, p) => s + (p.element.form ?? 2), 0) / bench.length / 10 * 100,
        )
      : 0;

  const components: SquadRatingComponent[] = [
    {
      key: "fixtures",
      label: "Upcoming fixtures",
      score: fixtureScore,
      maxScore: 100,
      partial,
      explanation: `Average fixture ease for starters over ${horizon} GWs (lower FDR = higher score).`,
    },
    {
      key: "form",
      label: "Recent form",
      score: formScore,
      maxScore: 100,
      partial: squad.some((p) => p.element.form == null),
      explanation: "Average FPL form rating for starting XI.",
    },
    {
      key: "availability",
      label: "Minutes security",
      score: availScore,
      maxScore: 100,
      partial: squad.some((p) => p.element.chanceOfPlaying == null && !p.element.status),
      explanation: "Availability / chance of playing for starters.",
    },
    {
      key: "value",
      label: "Team value",
      score: valueScore,
      maxScore: 100,
      partial: false,
      explanation: "Squad spend relative to budget ceiling.",
    },
    {
      key: "captain",
      label: "Captaincy strength",
      score: captainScore,
      maxScore: 100,
      partial: !captain,
      explanation: "Captain form and fixture context.",
    },
    {
      key: "bench",
      label: "Bench strength",
      score: benchScore,
      maxScore: 100,
      partial: bench.length === 0,
      explanation: "Bench players' form as auto-sub cover.",
    },
    {
      key: "template",
      label: "Template coverage",
      score: templateCoverage,
      maxScore: 100,
      partial: templateCoverage === 0,
      explanation: "Share of top league-template players owned.",
    },
    {
      key: "differential",
      label: "Differential potential",
      score: uniqueness,
      maxScore: 100,
      partial: squad.some((p) => !p.leagueOwnership),
      explanation: "Lower average league ownership = higher uniqueness.",
    },
  ];

  const supported = components.filter((c) => !c.partial || c.score > 0);
  const total =
    supported.length > 0
      ? Math.round(supported.reduce((s, c) => s + c.score, 0) / supported.length)
      : 0;

  return { total, partial: components.some((c) => c.partial), components };
}

export function generateInsights(args: {
  squad: EnrichedSquadPlayer[];
  templateGaps: TemplateGapRow[];
  differentials: DifferentialRow[];
  fixturesByTeam: Map<number, PlannerFixture[]>;
  horizon: number;
  freeTransfers: number | null;
  chipExpiryWarning: string | null;
}): PlannerInsight[] {
  const insights: PlannerInsight[] = [];
  const starters = args.squad.filter((p) => p.isStarter);

  const byPos = new Map<string, EnrichedSquadPlayer[]>();
  for (const p of starters) {
    const list = byPos.get(p.element.position) ?? [];
    list.push(p);
    byPos.set(p.element.position, list);
  }
  let weakestPos = "";
  let weakestScore = Infinity;
  for (const [pos, players] of byPos) {
    const avgForm = players.reduce((s, p) => s + (p.element.form ?? 0), 0) / players.length;
    if (avgForm < weakestScore) {
      weakestScore = avgForm;
      weakestPos = pos;
    }
  }
  if (weakestPos) {
    insights.push({
      id: "weakest-position",
      title: "Weakest squad position",
      body: `${weakestPos} starters average form ${weakestScore.toFixed(1)} — review for upgrades.`,
      severity: "warning",
    });
  }

  const flagged = args.squad.filter(
    (p) =>
      p.isStarter &&
      (p.element.status === "d" ||
        p.element.status === "i" ||
        (p.element.chanceOfPlaying != null && p.element.chanceOfPlaying < 75)),
  );
  if (flagged.length > 0) {
    insights.push({
      id: "availability",
      title: "Availability concern",
      body: `${flagged.map((p) => p.element.webName).join(", ")} flagged for minutes risk.`,
      severity: "warning",
    });
  }

  let bestRun = { name: "", score: -1 };
  for (const p of args.squad) {
    const fixtures = args.fixturesByTeam.get(p.element.teamId) ?? [];
    const avg =
      fixtures.slice(0, args.horizon).reduce((s, f) => s + (6 - (f.difficulty ?? 3)), 0) /
      Math.max(1, Math.min(args.horizon, fixtures.length));
    if (avg > bestRun.score) bestRun = { name: p.element.webName, score: avg };
  }
  if (bestRun.name) {
    insights.push({
      id: "fixture-run",
      title: "Best fixture run",
      body: `${bestRun.name} has the easiest upcoming fixtures in your squad.`,
      severity: "positive",
    });
  }

  if (args.templateGaps[0]) {
    insights.push({
      id: "template-gap",
      title: "Template gap",
      body: `Missing ${args.templateGaps[0].webName} (${args.templateGaps[0].ownerPct}% league ownership).`,
      severity: "info",
    });
  }

  if (args.differentials[0]) {
    insights.push({
      id: "differential",
      title: "Strong differential",
      body: `${args.differentials[0].webName} owned by only ${args.differentials[0].ownerPct}% of the league.`,
      severity: "positive",
    });
  }

  if (args.freeTransfers != null && args.freeTransfers >= 1) {
    insights.push({
      id: "roll-ft",
      title: "Free transfer",
      body: `${args.freeTransfers} FT available — rolling is reasonable unless a template gap needs fixing.`,
      severity: "info",
    });
  }

  if (args.chipExpiryWarning) {
    insights.push({
      id: "chip-expiry",
      title: "Chip deadline",
      body: args.chipExpiryWarning,
      severity: "warning",
    });
  }

  return insights;
}

export function squadSummary(args: {
  squad: EnrichedSquadPlayer[];
  bankTenths: number | null;
  bankIsEstimated: boolean;
  freeTransfers: number | null;
  hitsPlanned: number;
  chipsRemaining: number;
  horizon: number;
  fixturesByTeam: Map<number, PlannerFixture[]>;
  templateCoverage: number;
  uniqueness: number;
}) {
  const teamValue = args.squad.reduce((s, p) => s + p.element.priceTenths, 0);
  const flagged = args.squad.filter(
    (p) => p.element.status === "d" || p.element.status === "i" || p.element.status === "s",
  ).length;

  let blanks = 0;
  let doubles = 0;
  for (let gw = 1; gw <= args.horizon; gw++) {
    const teamsPlaying = new Set<number>();
    for (const p of args.squad) {
      const fix = (args.fixturesByTeam.get(p.element.teamId) ?? []).find(
        (f) => f.eventNumber === gw,
      );
      if (fix) teamsPlaying.add(p.element.teamId);
    }
    for (const p of args.squad.filter((x) => x.isStarter)) {
      const fix = (args.fixturesByTeam.get(p.element.teamId) ?? []).find(
        (f) => f.eventNumber === gw,
      );
      if (!fix) blanks += 1;
    }
  }

  return {
    teamValueTenths: teamValue,
    bankTenths: args.bankTenths,
    bankIsEstimated: args.bankIsEstimated,
    freeTransfers: args.freeTransfers,
    hitsPlanned: args.hitsPlanned,
    chipsRemaining: args.chipsRemaining,
    flaggedPlayers: flagged,
    blankFixtures: blanks,
    doubleFixtures: doubles,
    templateCoverage: args.templateCoverage,
    uniqueness: args.uniqueness,
  };
}

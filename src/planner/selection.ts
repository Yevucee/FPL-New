import { computePlannerScore } from "./plannerScore";
import type {
  CaptainMatrixRow,
  EnrichedSquadPlayer,
  PlannerFixture,
} from "./types";

export function recommendStartingXI(
  squad: EnrichedSquadPlayer[],
): { starters: EnrichedSquadPlayer[]; bench: EnrichedSquadPlayer[] } {
  const gks = squad.filter((p) => p.element.position === "GK");
  const defs = squad.filter((p) => p.element.position === "DEF");
  const mids = squad.filter((p) => p.element.position === "MID");
  const fwds = squad.filter((p) => p.element.position === "FWD");

  const sortByScore = (players: EnrichedSquadPlayer[]) =>
    [...players].sort((a, b) => (b.element.form ?? 0) - (a.element.form ?? 0));

  const starterGk = sortByScore(gks)[0]!;
  const starterDefs = sortByScore(defs).slice(0, Math.max(3, Math.min(5, defs.length)));
  const starterMids = sortByScore(mids).slice(0, Math.max(2, Math.min(5, mids.length)));
  const starterFwds = sortByScore(fwds).slice(0, Math.max(1, Math.min(3, fwds.length)));

  let starters = [starterGk, ...starterDefs, ...starterMids, ...starterFwds];
  const starterIds = new Set<number>();

  // Trim or expand to exactly 11 with best remaining outfielders
  const allOutfield = sortByScore([...defs, ...mids, ...fwds]);
  for (const p of allOutfield) {
    if (starters.length >= 11) break;
    if (!starterIds.has(p.elementId) && p.elementId !== starterGk.elementId) {
      starters.push(p);
    }
  }
  starters = starters.slice(0, 11);
  starterIds.clear();
  for (const p of starters) starterIds.add(p.elementId);

  const bench = squad
    .filter((p) => !starterIds.has(p.elementId))
    .sort((a, b) => {
      const posOrder = { GK: 0, DEF: 1, MID: 2, FWD: 3 };
      const pa = posOrder[a.element.position];
      const pb = posOrder[b.element.position];
      if (pa !== pb) return pa - pb;
      return (b.element.form ?? 0) - (a.element.form ?? 0);
    });

  return { starters, bench };
}

export function buildCaptainMatrix(args: {
  squad: EnrichedSquadPlayer[];
  fixturesByTeam: Map<number, PlannerFixture[]>;
  leagueCaptainCounts: Map<number, number>;
  horizon: number;
  favourTemplate: boolean;
}): CaptainMatrixRow[] {
  const starters = args.squad.filter((p) => p.isStarter);
  const scores = starters.map((p) => {
    const fixtures = args.fixturesByTeam.get(p.element.teamId) ?? [];
    return {
      player: p,
      score: computePlannerScore({
        element: p.element,
        fixtures,
        horizon: args.horizon,
        leagueOwnershipPct: p.leagueOwnership?.pct ?? null,
        favourTemplate: args.favourTemplate,
      }).total,
    };
  });
  scores.sort((a, b) => b.score - a.score);
  const captainId = scores[0]?.player.elementId;
  const viceId = scores[1]?.player.elementId;

  return starters.map((p) => {
    const fixtures = args.fixturesByTeam.get(p.element.teamId) ?? [];
    const score = computePlannerScore({
      element: p.element,
      fixtures,
      horizon: args.horizon,
      leagueOwnershipPct: p.leagueOwnership?.pct ?? null,
      favourTemplate: args.favourTemplate,
    }).total;

    let recommended: CaptainMatrixRow["recommended"] = "no";
    if (p.elementId === captainId) recommended = "captain";
    else if (p.elementId === viceId) recommended = "vice";

    let riskExplanation = "Standard captain option.";
    if (p.element.status === "d") riskExplanation = "Doubtful — monitor before deadline.";
    else if (p.element.status === "i") riskExplanation = "Injured — high risk.";
    else if (p.element.chanceOfPlaying != null && p.element.chanceOfPlaying < 75) {
      riskExplanation = `Limited minutes (${p.element.chanceOfPlaying}% chance).`;
    }

    return {
      elementId: p.elementId,
      webName: p.element.webName,
      fixture: fixtures[0] ?? null,
      form: p.element.form,
      chanceOfPlaying: p.element.chanceOfPlaying,
      leagueOwnershipPct: p.leagueOwnership?.pct ?? null,
      globalOwnershipPct: p.element.selectedByPercent,
      leagueCaptainCount: args.leagueCaptainCounts.get(p.elementId) ?? 0,
      recommended,
      riskExplanation,
      plannerScore: score,
    };
  }).sort((a, b) => b.plannerScore - a.plannerScore);
}

export function benchRecommendation(args: {
  squad: EnrichedSquadPlayer[];
  recommended: ReturnType<typeof recommendStartingXI>;
}): {
  recommendedOrder: EnrichedSquadPlayer[];
  minutesRisk: EnrichedSquadPlayer[];
  benchBoostReady: boolean;
  explanation: string;
} {
  const bench = args.recommended.bench;
  const minutesRisk = bench.filter(
    (p) =>
      p.element.status === "d" ||
      p.element.status === "i" ||
      (p.element.chanceOfPlaying != null && p.element.chanceOfPlaying < 75),
  );
  const benchBoostReady =
    bench.length >= 4 &&
    minutesRisk.length === 0 &&
    bench.every((p) => (p.element.form ?? 0) >= 1);

  return {
    recommendedOrder: bench,
    minutesRisk,
    benchBoostReady,
    explanation: benchBoostReady
      ? "Bench looks strong enough for Bench Boost consideration."
      : minutesRisk.length > 0
        ? "Bench has minutes risk — avoid Bench Boost until clearer."
        : "Bench order follows auto-sub priority (GK first, then outfield by form).",
  };
}

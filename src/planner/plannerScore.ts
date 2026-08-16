import type { PlannerElement, PlannerFixture, PlannerPosition, PlannerScoreBreakdown } from "./types";

const POSITION_FORM_BASE: Record<PlannerPosition, number> = {
  GK: 3,
  DEF: 3.5,
  MID: 4,
  FWD: 4.5,
};

/** Transparent planner score — not a projection model. */
export function computePlannerScore(args: {
  element: PlannerElement;
  fixtures: PlannerFixture[];
  horizon: number;
  leagueOwnershipPct: number | null;
  favourTemplate: boolean;
}): PlannerScoreBreakdown {
  const { element, fixtures, horizon, leagueOwnershipPct, favourTemplate } = args;
  const horizonFixtures = fixtures.slice(0, horizon);

  const avgDifficulty =
    horizonFixtures.length > 0
      ? horizonFixtures.reduce((sum, f) => sum + (f.difficulty ?? 3), 0) / horizonFixtures.length
      : 3;
  const fixture = Math.max(0, Math.min(100, Math.round((6 - avgDifficulty) * 20)));

  const formBase = POSITION_FORM_BASE[element.position];
  const formVal = element.form ?? formBase;
  const form = Math.max(0, Math.min(100, Math.round((formVal / 10) * 100)));

  let availability = 70;
  if (element.status === "a") availability = 95;
  else if (element.status === "d") availability = 55;
  else if (element.status === "i" || element.status === "u") availability = 25;
  else if (element.status === "s") availability = 10;
  if (element.chanceOfPlaying != null) {
    availability = Math.round(element.chanceOfPlaying);
  }

  const price = element.priceTenths / 10;
  const value = Math.max(0, Math.min(100, Math.round((15 - price) * 8 + (element.totalPoints ?? 0) / 5)));

  let ownership = 50;
  if (leagueOwnershipPct != null) {
    ownership = favourTemplate
      ? Math.min(100, Math.round(leagueOwnershipPct * 1.2))
      : Math.max(0, Math.round(100 - leagueOwnershipPct));
  }

  const total = Math.round(
    fixture * 0.25 + form * 0.2 + availability * 0.2 + value * 0.15 + ownership * 0.2,
  );

  return { fixture, form, availability, value, ownership, total };
}

export const PLANNER_SCORE_FORMULA =
  "Planner score = 25% fixture ease + 20% form + 20% availability + 15% value + 20% ownership/differential (weighted by template preference). Normalised within position; not expected points.";

export function compareByPlannerScore(
  a: PlannerScoreBreakdown,
  b: PlannerScoreBreakdown,
): number {
  return b.total - a.total;
}

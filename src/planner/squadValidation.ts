import type {
  PlannerElement,
  PlannerPosition,
  SquadPlayer,
  SquadValidationError,
  SquadValidationResult,
} from "./types";

const POSITION_QUOTAS: Record<PlannerPosition, number> = {
  GK: 2,
  DEF: 5,
  MID: 5,
  FWD: 3,
};

const MAX_PER_CLUB = 3;
const SQUAD_BUDGET_TENTHS = 1000;

export function positionFromId(id: number): PlannerPosition {
  switch (id) {
    case 1:
      return "GK";
    case 2:
      return "DEF";
    case 3:
      return "MID";
    case 4:
      return "FWD";
    default:
      return "MID";
  }
}

export function countByPosition(
  players: ReadonlyArray<{ element: Pick<PlannerElement, "position"> }>,
): Record<PlannerPosition, number> {
  const counts: Record<PlannerPosition, number> = { GK: 0, DEF: 0, MID: 0, FWD: 0 };
  for (const p of players) {
    counts[p.element.position] += 1;
  }
  return counts;
}

export function isValidStartingFormation(
  starters: ReadonlyArray<{ element: Pick<PlannerElement, "position"> }>,
): boolean {
  if (starters.length !== 11) return false;
  const counts = countByPosition(starters);
  return (
    counts.GK === 1 &&
    counts.DEF >= 3 &&
    counts.MID >= 2 &&
    counts.FWD >= 1
  );
}

export function validateSquad(args: {
  players: SquadPlayer[];
  elements: Map<number, PlannerElement>;
  bankTenths: number | null;
  sellOverrides?: Map<number, number>;
}): SquadValidationResult {
  const errors: SquadValidationError[] = [];
  const { players, elements } = args;

  if (players.length !== 15) {
    errors.push({
      code: "squad_size",
      message: `Squad must have exactly 15 players (currently ${players.length}).`,
    });
  }

  const ids = players.map((p) => p.elementId);
  const unique = new Set(ids);
  if (unique.size !== ids.length) {
    errors.push({ code: "duplicate", message: "Duplicate players in squad." });
  }

  const enriched = players
    .map((p) => {
      const element = elements.get(p.elementId);
      return element ? { ...p, element } : null;
    })
    .filter(Boolean) as Array<SquadPlayer & { element: PlannerElement }>;

  if (enriched.length !== players.length) {
    errors.push({
      code: "unknown_player",
      message: "One or more players are not in the element catalog.",
    });
  }

  const posCounts = countByPosition(enriched);
  for (const [pos, required] of Object.entries(POSITION_QUOTAS) as Array<
    [PlannerPosition, number]
  >) {
    if (posCounts[pos] !== required) {
      errors.push({
        code: "position_quota",
        message: `Need ${required} ${pos}, have ${posCounts[pos]}.`,
      });
    }
  }

  const clubCounts = new Map<number, number>();
  for (const p of enriched) {
    clubCounts.set(p.element.teamId, (clubCounts.get(p.element.teamId) ?? 0) + 1);
  }
  for (const [teamId, count] of clubCounts) {
    if (count > MAX_PER_CLUB) {
      errors.push({
        code: "club_limit",
        message: `More than ${MAX_PER_CLUB} players from club ${teamId}.`,
      });
    }
  }

  const starters = enriched.filter((p) => p.isStarter);
  if (starters.length !== 11) {
    errors.push({
      code: "starter_count",
      message: `Starting XI must have 11 players (currently ${starters.length}).`,
    });
  } else if (!isValidStartingFormation(starters)) {
    errors.push({
      code: "formation",
      message: "Invalid starting formation (need 1 GK, ≥3 DEF, ≥2 MID, ≥1 FWD).",
    });
  }

  const captains = enriched.filter((p) => p.isCaptain);
  const vices = enriched.filter((p) => p.isViceCaptain);
  if (captains.length !== 1) {
    errors.push({
      code: "captain",
      message: "Exactly one captain required.",
    });
  }
  if (vices.length !== 1) {
    errors.push({
      code: "vice_captain",
      message: "Exactly one vice-captain required.",
    });
  }
  if (captains.length === 1 && vices.length === 1 && captains[0]!.elementId === vices[0]!.elementId) {
    errors.push({
      code: "captain_same",
      message: "Captain and vice-captain must be different players.",
    });
  }
  if (captains.length === 1 && !starters.some((p) => p.elementId === captains[0]!.elementId)) {
    errors.push({ code: "captain_starter", message: "Captain must be in the starting XI." });
  }
  if (vices.length === 1 && !enriched.some((p) => p.elementId === vices[0]!.elementId)) {
    errors.push({ code: "vice_squad", message: "Vice-captain must be in the squad." });
  }

  let spendTenths = 0;
  for (const p of enriched) {
    spendTenths += p.element.priceTenths;
  }
  const bank = args.bankTenths ?? 0;
  if (spendTenths > SQUAD_BUDGET_TENTHS + bank) {
    errors.push({
      code: "budget",
      message: `Squad value exceeds budget (spend ${(spendTenths / 10).toFixed(1)}m, bank ${(bank / 10).toFixed(1)}m).`,
    });
  }

  return { valid: errors.length === 0, errors };
}

export function sellPriceTenths(
  player: SquadPlayer,
  element: PlannerElement,
): { valueTenths: number; isEstimated: boolean } {
  if (player.sellPriceTenths != null) {
    return { valueTenths: player.sellPriceTenths, isEstimated: false };
  }
  // FPL sell price is typically purchase price minus increments; without history, estimate current price.
  return { valueTenths: element.priceTenths, isEstimated: true };
}

export { POSITION_QUOTAS, MAX_PER_CLUB, SQUAD_BUDGET_TENTHS };

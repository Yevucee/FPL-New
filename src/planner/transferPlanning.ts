import type { MostOwnedPlayer } from "@/providers/fpl/mostOwned";

import { computePlannerScore } from "./plannerScore";
import { MAX_PER_CLUB, POSITION_QUOTAS, sellPriceTenths, validateSquad } from "./squadValidation";
import type {
  PlannerElement,
  PlannerFixture,
  PlannerPosition,
  SquadPlayer,
  TransferComparison,
  TransferSuggestion,
} from "./types";

export function applyTransfer(
  squad: SquadPlayer[],
  outId: number,
  inId: number,
  elements: Map<number, PlannerElement>,
): SquadPlayer[] | null {
  const outIdx = squad.findIndex((p) => p.elementId === outId);
  if (outIdx < 0) return null;
  const outPlayer = squad[outIdx]!;
  const inElement = elements.get(inId);
  const outElement = elements.get(outId);
  if (!inElement || !outElement) return null;
  if (inElement.position !== outElement.position) return null;
  if (squad.some((p) => p.elementId === inId)) return null;

  const next = squad.map((p, i) =>
    i === outIdx
      ? {
          ...p,
          elementId: inId,
          isCaptain: p.isCaptain,
          isViceCaptain: p.isViceCaptain,
          sellPriceTenths: null,
        }
      : p,
  );

  const clubCounts = new Map<number, number>();
  for (const p of next) {
    const el = elements.get(p.elementId);
    if (!el) return null;
    clubCounts.set(el.teamId, (clubCounts.get(el.teamId) ?? 0) + 1);
  }
  for (const count of clubCounts.values()) {
    if (count > MAX_PER_CLUB) return null;
  }
  return next;
}

function squadAfterTransfers(
  base: SquadPlayer[],
  transfers: Array<{ outId: number; inId: number }>,
  elements: Map<number, PlannerElement>,
): SquadPlayer[] | null {
  let current = base;
  for (const t of transfers) {
    const next = applyTransfer(current, t.outId, t.inId, elements);
    if (!next) return null;
    current = next;
  }
  return current;
}

function totalTransferCost(
  transfers: Array<{ outId: number; inId: number }>,
  squad: SquadPlayer[],
  elements: Map<number, PlannerElement>,
  sellOverrides: Map<number, number>,
): { spendDelta: number; valid: boolean } {
  let bankDelta = 0;
  let working = [...squad];
  for (const t of transfers) {
    const out = working.find((p) => p.elementId === t.outId);
    const inEl = elements.get(t.inId);
    const outEl = elements.get(t.outId);
    if (!out || !inEl || !outEl) return { spendDelta: 0, valid: false };
    const sell = sellOverrides.has(t.outId)
      ? { valueTenths: sellOverrides.get(t.outId)!, isEstimated: false }
      : sellPriceTenths(out, outEl);
    bankDelta += sell.valueTenths - inEl.priceTenths;
    working = applyTransfer(working, t.outId, t.inId, elements) ?? working;
  }
  return { spendDelta: bankDelta, valid: true };
}

export function buildTransferSuggestions(args: {
  squad: SquadPlayer[];
  elements: Map<number, PlannerElement>;
  fixturesByTeam: Map<number, PlannerFixture[]>;
  leagueOwnership: Map<number, { count: number; pct: number }>;
  mostOwned: MostOwnedPlayer[];
  bankTenths: number;
  freeTransfers: number;
  maxHit: number;
  horizon: number;
  lockedIds: Set<number>;
  excludedIds: Set<number>;
  favourTemplate: boolean;
  sellOverrides: Map<number, number>;
  limit?: number;
}): TransferSuggestion[] {
  const suggestions: TransferSuggestion[] = [];
  const owned = new Set(args.squad.map((p) => p.elementId));

  for (const outPlayer of args.squad) {
    if (args.lockedIds.has(outPlayer.elementId)) continue;
    const outEl = args.elements.get(outPlayer.elementId);
    if (!outEl) continue;

    const candidates = [...args.elements.values()].filter(
      (el) =>
        el.position === outEl.position &&
        !owned.has(el.id) &&
        !args.excludedIds.has(el.id),
    );

    for (const inEl of candidates) {
      const nextSquad = applyTransfer(args.squad, outPlayer.elementId, inEl.id, args.elements);
      if (!nextSquad) continue;

      const validation = validateSquad({
        players: nextSquad,
        elements: args.elements,
        bankTenths: args.bankTenths,
        sellOverrides: args.sellOverrides,
      });
      if (!validation.valid) continue;

      const sell = args.sellOverrides.has(outPlayer.elementId)
        ? { valueTenths: args.sellOverrides.get(outPlayer.elementId)!, isEstimated: false }
        : sellPriceTenths(outPlayer, outEl);

      const cost = sell.valueTenths - inEl.priceTenths;
      const bankAfter = args.bankTenths + cost;
      if (bankAfter < 0) continue;

      const outFix = args.fixturesByTeam.get(outEl.teamId) ?? [];
      const inFix = args.fixturesByTeam.get(inEl.teamId) ?? [];
      const outScore = computePlannerScore({
        element: outEl,
        fixtures: outFix,
        horizon: args.horizon,
        leagueOwnershipPct: args.leagueOwnership.get(outEl.id)?.pct ?? null,
        favourTemplate: args.favourTemplate,
      });
      const inScore = computePlannerScore({
        element: inEl,
        fixtures: inFix,
        horizon: args.horizon,
        leagueOwnershipPct: args.leagueOwnership.get(inEl.id)?.pct ?? null,
        favourTemplate: args.favourTemplate,
      });

      const template = args.mostOwned.find((m) => m.elementId === inEl.id);
      suggestions.push({
        elementOutId: outPlayer.elementId,
        elementInId: inEl.id,
        position: outEl.position,
        sellPriceTenths: sell.valueTenths,
        buyPriceTenths: inEl.priceTenths,
        sellEstimated: sell.isEstimated,
        bankAfterTenths: bankAfter,
        hitCost: 0,
        scoreDelta: inScore.total - outScore.total,
        addresses: template
          ? `Template gap (${template.ownerPct}% owned)`
          : `Upgrade ${outEl.position} slot`,
        risk:
          inEl.status === "d" || inEl.status === "i"
            ? "Incoming player has availability flags."
            : sell.isEstimated
              ? "Selling price is estimated."
              : "Standard transfer risk.",
        explanation: `${inEl.webName} scores ${inScore.total} vs ${outEl.webName} ${outScore.total} on planner score over ${args.horizon} GWs.`,
      });
    }
  }

  return suggestions
    .sort((a, b) => b.scoreDelta - a.scoreDelta)
    .slice(0, args.limit ?? 20);
}

export function buildTransferComparisons(args: {
  squad: SquadPlayer[];
  elements: Map<number, PlannerElement>;
  fixturesByTeam: Map<number, PlannerFixture[]>;
  leagueOwnership: Map<number, { count: number; pct: number }>;
  mostOwned: MostOwnedPlayer[];
  bankTenths: number;
  freeTransfers: number;
  maxHit: number;
  horizon: number;
  lockedIds: Set<number>;
  excludedIds: Set<number>;
  favourTemplate: boolean;
  sellOverrides: Map<number, number>;
}): TransferComparison[] {
  const suggestions = buildTransferSuggestions({ ...args, limit: 50 });
  const comparisons: TransferComparison[] = [
    {
      label: "Do nothing / roll transfer",
      transfers: [],
      totalHit: 0,
      netScoreDelta: 0,
    },
  ];

  const bestOne = suggestions[0];
  if (bestOne) {
    comparisons.push({
      label: "Best one-transfer",
      transfers: [bestOne],
      totalHit: Math.max(0, 1 - args.freeTransfers) * 4,
      netScoreDelta: bestOne.scoreDelta - Math.max(0, 1 - args.freeTransfers) * 4,
    });
  }

  if (args.freeTransfers >= 2 || args.maxHit >= 4) {
    for (let i = 0; i < suggestions.length && comparisons.length < 3; i++) {
      for (let j = i + 1; j < suggestions.length; j++) {
        const t1 = suggestions[i]!;
        const t2 = suggestions[j]!;
        if (t1.elementOutId === t2.elementOutId || t1.elementInId === t2.elementInId) continue;
        if (t1.elementOutId === t2.elementInId) continue;

        const pair = [
          { outId: t1.elementOutId, inId: t1.elementInId },
          { outId: t2.elementOutId, inId: t2.elementInId },
        ];
        const next = squadAfterTransfers(args.squad, pair, args.elements);
        if (!next) continue;
        const validation = validateSquad({
          players: next,
          elements: args.elements,
          bankTenths: args.bankTenths,
        });
        if (!validation.valid) continue;

        const hit = Math.max(0, 2 - args.freeTransfers) * 4;
        if (hit > args.maxHit) continue;

        comparisons.push({
          label: "Best two-transfer",
          transfers: [t1, t2],
          totalHit: hit,
          netScoreDelta: t1.scoreDelta + t2.scoreDelta - hit,
        });
        break;
      }
      if (comparisons.length >= 3) break;
    }
  }

  return comparisons;
}

export function hitsForTransferCount(freeTransfers: number, transferCount: number): number {
  if (transferCount <= freeTransfers) return 0;
  return (transferCount - freeTransfers) * 4;
}

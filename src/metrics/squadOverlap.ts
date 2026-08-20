import type { MostOwnedPlayer } from "@/providers/fpl/mostOwned";

export interface EntrySquadSnapshot {
  entryId: string;
  starterIds: number[];
}

export interface EventSquadIntel {
  eventNumber: number;
  mostOwned: readonly MostOwnedPlayer[];
  squads: readonly EntrySquadSnapshot[];
}

/** Share of starting XI that matches the league's top-owned players. */
export function templateOverlapPct(
  starterIds: readonly number[],
  mostOwned: readonly MostOwnedPlayer[],
  topN = 11,
): number {
  if (starterIds.length === 0 || mostOwned.length === 0) return 0;
  const templateSet = new Set(mostOwned.slice(0, topN).map((p) => p.elementId));
  const matches = starterIds.filter((id) => templateSet.has(id)).length;
  return Math.round((matches / starterIds.length) * 1000) / 10;
}

/** Season-average template overlap per manager across enriched gameweeks. */
export function averageTemplateOverlapByEntry(
  intelByEvent: readonly EventSquadIntel[],
  throughEvent: number,
): Map<string, number> {
  const totals = new Map<string, { sum: number; count: number }>();

  for (const intel of intelByEvent) {
    if (intel.eventNumber > throughEvent || intel.squads.length === 0) continue;
    for (const squad of intel.squads) {
      const pct = templateOverlapPct(squad.starterIds, intel.mostOwned);
      const existing = totals.get(squad.entryId) ?? { sum: 0, count: 0 };
      existing.sum += pct;
      existing.count += 1;
      totals.set(squad.entryId, existing);
    }
  }

  const averages = new Map<string, number>();
  for (const [entryId, { sum, count }] of totals) {
    if (count > 0) {
      averages.set(entryId, Math.round((sum / count) * 10) / 10);
    }
  }
  return averages;
}

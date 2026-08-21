import { SEASON_CHIP_TYPES, type SeasonChipType } from "@/lib/chipLabels";

import type { EnrichedSquadPlayer, PlannerFixture, PlannerInsight } from "./types";

export interface ChipGuidanceCard {
  id: string;
  title: string;
  body: string;
  severity: "info" | "warning" | "positive";
}

export function buildChipGuidance(args: {
  squad: EnrichedSquadPlayer[];
  fixturesByTeam: Map<number, PlannerFixture[]>;
  chipsRemaining: SeasonChipType[];
  wildcardUsed: number | null;
  currentEvent: number | null;
}): ChipGuidanceCard[] {
  const cards: ChipGuidanceCard[] = [];
  const bench = args.squad.filter((p) => !p.isStarter);
  const flagged = args.squad.filter(
    (p) => p.element.status === "i" || p.element.status === "d" || p.element.status === "s",
  );

  if (args.chipsRemaining.includes("bboost")) {
    const ready =
      bench.length >= 4 &&
      bench.every(
        (p) =>
          p.element.status === "a" &&
          (p.element.chanceOfPlaying == null || p.element.chanceOfPlaying >= 75),
      );
    cards.push({
      id: "bboost",
      title: "Bench Boost readiness",
      body: ready
        ? "All bench players look available with decent minutes."
        : "Bench has availability concerns — verify before playing Bench Boost.",
      severity: ready ? "positive" : "warning",
    });
  }

  if (args.chipsRemaining.includes("3xc")) {
    const captain = args.squad.find((p) => p.isCaptain);
    if (captain) {
      const fixtures = args.fixturesByTeam.get(captain.element.teamId) ?? [];
      const diff = fixtures[0]?.difficulty ?? 3;
      cards.push({
        id: "3xc",
        title: "Triple Captain candidate",
        body: `${captain.element.webName} (FDR ${diff ?? "?"}) — consider TC on a double or easy home fixture.`,
        severity: diff <= 2 ? "positive" : "info",
      });
    }
  }

  if (args.chipsRemaining.includes("freehit")) {
    cards.push({
      id: "freehit",
      title: "Free Hit planning",
      body: "Use Free Hit to navigate blank/double gameweeks without lasting squad changes.",
      severity: "info",
    });
  }

  if (args.chipsRemaining.includes("wildcard") && flagged.length >= 3) {
    cards.push({
      id: "wildcard",
      title: "Wildcard pressure",
      body: `${flagged.length} players flagged unavailable — Wildcard may help restructure.`,
      severity: "warning",
    });
  }

  if (args.currentEvent != null && args.currentEvent >= 19 && args.wildcardUsed == null) {
    cards.push({
      id: "chip-expiry",
      title: "Chip expiry",
      body: "Second-half chips expire at season end — plan Wildcard / Free Hit usage.",
      severity: "warning",
    });
  }

  return cards;
}

export function chipExpiryWarning(currentEvent: number | null): string | null {
  if (currentEvent == null) return null;
  if (currentEvent >= 17 && currentEvent <= 19) {
    return "First-half chips expire after GW19 — review remaining Wildcard / Bench Boost / Free Hit.";
  }
  if (currentEvent >= 36) {
    return "Season-end approaching — unused second-half chips will expire.";
  }
  return null;
}

export function chipsRemainingCount(used: Partial<Record<SeasonChipType, number>>): number {
  return SEASON_CHIP_TYPES.filter((c) => used[c] === undefined).length;
}

export function chipRetentionLeaguePct(
  chipStatus: Array<{ remaining: SeasonChipType[] }>,
  chip: SeasonChipType,
): number {
  if (chipStatus.length === 0) return 0;
  const retaining = chipStatus.filter((r) => r.remaining.includes(chip)).length;
  return Math.round((retaining / chipStatus.length) * 1000) / 10;
}

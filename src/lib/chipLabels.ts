const CHIP_LABELS: Record<string, string> = {
  wildcard: "Wildcard",
  bboost: "Bench Boost",
  "3xc": "Triple Captain",
  freehit: "Free Hit",
};

export function formatChipName(chip: string): string {
  const key = chip.trim().toLowerCase();
  return CHIP_LABELS[key] ?? chip;
}

export const SEASON_CHIP_TYPES = ["wildcard", "bboost", "3xc", "freehit"] as const;

export type SeasonChipType = (typeof SEASON_CHIP_TYPES)[number];

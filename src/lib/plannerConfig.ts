/** Yevu Athletic (Samuel Polley) — default personal planner entry. Override with PLANNER_FPL_ENTRY_ID. */
export const DEFAULT_PLANNER_ENTRY_ID = "3386632";

export function plannerEntryId(): string {
  const raw = process.env.PLANNER_FPL_ENTRY_ID?.trim();
  if (raw && /^\d+$/.test(raw)) return raw;
  return DEFAULT_PLANNER_ENTRY_ID;
}

export function plannerEntryConfigured(): boolean {
  return Boolean(plannerEntryId());
}

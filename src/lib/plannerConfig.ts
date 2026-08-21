/** Samuel's FPL entry from environment — never exposed to client bundles via server-only imports. */

export function plannerEntryId(): string | null {
  const raw = process.env.PLANNER_FPL_ENTRY_ID?.trim();
  if (!raw) return null;
  if (!/^\d+$/.test(raw)) return null;
  return raw;
}

export function plannerEntryConfigured(): boolean {
  return plannerEntryId() !== null;
}

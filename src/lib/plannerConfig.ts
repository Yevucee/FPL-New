/** Owner FPL entry ID — server-only via env. Samuel default documented in .env.example. */

export function plannerEntryId(): string | null {
  const raw = process.env.PLANNER_FPL_ENTRY_ID?.trim();
  if (!raw || !/^\d+$/.test(raw)) return null;
  return raw;
}

export function plannerEntryConfigured(): boolean {
  return plannerEntryId() !== null;
}

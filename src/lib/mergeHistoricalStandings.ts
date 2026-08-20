import { managerMatchesChampion } from "@/lib/selChampions";
import { manualHistoricalEntryForSeason } from "@/lib/selHistoricalMembers";
import type { EntryInput, ResultInput } from "@/metrics/types";

/**
 * Overlay former members from sel-historical-members.json onto archived standings.
 * Keeps history pages correct even before sync-cron rebuilds Postgres archives.
 */
export function mergeManualHistoricalEntries(
  seasonName: string,
  entries: EntryInput[],
  results: ResultInput[],
  finalEvent: number,
): { entries: EntryInput[]; results: ResultInput[]; added: number } {
  const manualRows = manualHistoricalEntryForSeason(seasonName);
  if (manualRows.length === 0) {
    return { entries, results, added: 0 };
  }

  const existingNames = new Set(entries.map((entry) => entry.managerName.toLowerCase()));
  const existingIds = new Set(entries.map((entry) => entry.entryId));

  const mergedEntries = [...entries];
  const mergedResults = [...results];
  let added = 0;

  for (const manual of manualRows) {
    if (existingNames.has(manual.managerName.toLowerCase())) continue;
    if (existingIds.has(manual.providerEntryId)) continue;
    if (
      mergedEntries.some((entry) =>
        managerMatchesChampion(entry.managerName, manual.managerName),
      )
    ) {
      continue;
    }

    mergedEntries.push({
      entryId: manual.providerEntryId,
      managerName: manual.managerName,
      teamName: manual.teamName,
      joinEvent: 1,
    });
    mergedResults.push({
      entryId: manual.providerEntryId,
      eventNumber: finalEvent,
      phase: 1,
      netPoints: manual.totalPoints,
      grossPoints: manual.totalPoints,
      transferCost: 0,
      benchPoints: 0,
      chip: null,
    });
    existingNames.add(manual.managerName.toLowerCase());
    existingIds.add(manual.providerEntryId);
    added += 1;
  }

  return { entries: mergedEntries, results: mergedResults, added };
}

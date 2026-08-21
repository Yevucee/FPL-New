import historicalMembers from "../../data/sel-historical-members.json";

export interface HistoricalSeasonTotals {
  totalPoints: number;
  teamName?: string;
}

export interface SelHistoricalMember {
  managerName: string;
  entryId?: string;
  /** Per-season manual totals when the manager is no longer in the league. */
  seasons?: Record<string, HistoricalSeasonTotals>;
}

export const selHistoricalMembers: SelHistoricalMember[] = historicalMembers;

export function historicalMemberIds(): string[] {
  return selHistoricalMembers
    .map((member) => member.entryId?.trim())
    .filter((id): id is string => Boolean(id));
}

export function manualHistoricalEntryForSeason(
  seasonName: string,
): Array<{
  providerEntryId: string;
  managerName: string;
  teamName: string;
  totalPoints: number;
}> {
  const rows: Array<{
    providerEntryId: string;
    managerName: string;
    teamName: string;
    totalPoints: number;
  }> = [];

  for (const member of selHistoricalMembers) {
    const season = member.seasons?.[seasonName];
    if (!season) continue;
    rows.push({
      providerEntryId:
        member.entryId?.trim() ??
        `historical:${member.managerName.toLowerCase().replace(/\s+/g, "-")}`,
      managerName: member.managerName,
      teamName: season.teamName ?? "—",
      totalPoints: season.totalPoints,
    });
  }

  return rows;
}

export function allHistoricalMemberNames(): string[] {
  return selHistoricalMembers.map((member) => member.managerName);
}

/** Former members and manual overlays — always eligible for historical reconstruction. */
export function baseHistoricalParticipantIds(): Set<string> {
  const ids = new Set<string>();
  for (const id of historicalMemberIds()) {
    ids.add(id);
  }
  for (const member of selHistoricalMembers) {
    for (const seasonName of Object.keys(member.seasons ?? {})) {
      for (const row of manualHistoricalEntryForSeason(seasonName)) {
        ids.add(row.providerEntryId);
      }
    }
  }
  return ids;
}

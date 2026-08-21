import firstSeasonMembers from "../../data/sel-first-season-members.json";

export interface SelFirstSeasonMember {
  managerName: string;
  entryId: string;
  joinedSeason: string;
}

export const selFirstSeasonMembers: SelFirstSeasonMember[] = firstSeasonMembers;

export function firstSeasonJoinerIds(): Set<string> {
  return new Set(
    selFirstSeasonMembers
      .map((member) => member.entryId.trim())
      .filter((id) => id.length > 0),
  );
}

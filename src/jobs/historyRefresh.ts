/**
 * Decide whether reconstructed history archives should be rebuilt
 * (e.g. when new managers join the current league).
 */
export function reconstructedHistoryStale(
  currentMemberIds: ReadonlySet<string>,
  archivedMemberIds: ReadonlySet<string>,
  missingArchiveSeasons: readonly string[],
): { needed: boolean; reason: string } {
  if (missingArchiveSeasons.length > 0) {
    return {
      needed: true,
      reason: `missing archive for ${missingArchiveSeasons.join(", ")}`,
    };
  }

  if (archivedMemberIds.size === 0) {
    return { needed: true, reason: "no reconstructed archives" };
  }

  for (const id of currentMemberIds) {
    if (!archivedMemberIds.has(id)) {
      return { needed: true, reason: `new member ${id} not in archives` };
    }
  }

  if (currentMemberIds.size > archivedMemberIds.size) {
    return { needed: true, reason: "member count increased" };
  }

  return { needed: false, reason: "up to date" };
}

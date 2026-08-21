export interface ReconstructedHistoryStaleOptions {
  /** Known SEL participants — archives must not include anyone outside this set. */
  eligibleMemberIds?: ReadonlySet<string>;
}

/**
 * Decide whether reconstructed history archives should be rebuilt.
 * New first-time joiners do not trigger a rebuild; polluted archives do.
 */
export function reconstructedHistoryStale(
  archivedMemberIds: ReadonlySet<string>,
  missingArchiveSeasons: readonly string[],
  options: ReconstructedHistoryStaleOptions = {},
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

  const eligible = options.eligibleMemberIds;
  if (eligible && eligible.size > 0) {
    for (const id of archivedMemberIds) {
      if (!eligible.has(id)) {
        return {
          needed: true,
          reason: `archive includes non-participant ${id}`,
        };
      }
    }
  }

  return { needed: false, reason: "up to date" };
}

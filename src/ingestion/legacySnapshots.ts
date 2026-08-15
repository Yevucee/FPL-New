import type { LeagueSnapshot } from "@/contracts/snapshot";
import { leagueConfig } from "@/lib/leagueConfig";

/** One row from the legacy Swiss-Expert-League `league_snapshots` table. */
export interface LegacySnapshotRow {
  gw: number;
  entry_id: number;
  manager_name: string | null;
  team_name: string | null;
  total_points: number;
  gw_points: number | null;
  active_chip?: string | null;
  transfer_cost?: number | null;
}

export interface LegacyGameweekMeta {
  gw: number;
  deadline_time?: string | null;
  phase?: number | null;
  phase_name?: string | null;
}

export interface BuildLegacySnapshotOptions {
  seasonName: string;
  rows: ReadonlyArray<LegacySnapshotRow>;
  gameweeks?: ReadonlyArray<LegacyGameweekMeta>;
  leagueProviderId?: string;
}

function phaseForGw(gw: number, gameweeks?: ReadonlyArray<LegacyGameweekMeta>) {
  const meta = gameweeks?.find((g) => g.gw === gw);
  if (meta?.phase && meta.phase_name) {
    return { phase: meta.phase, phaseName: meta.phase_name };
  }
  // Fallback: approximate monthly phase from GW number (Aug=1 …).
  const phase = Math.min(12, Math.ceil(gw / 3.5));
  const names = [
    "August",
    "September",
    "October",
    "November",
    "December",
    "January",
    "February",
    "March",
    "April",
    "May",
  ];
  return { phase, phaseName: names[phase - 1] ?? `Phase ${phase}` };
}

/**
 * Convert legacy Supabase `league_snapshots` rows into a LeagueSnapshot suitable
 * for importSnapshot(). All events are marked finished so they appear in history.
 */
export function buildLegacySnapshot(
  options: BuildLegacySnapshotOptions,
): LeagueSnapshot {
  const { seasonName, rows, gameweeks, leagueProviderId } = options;
  const eventNumbers = [...new Set(rows.map((r) => r.gw))].sort((a, b) => a - b);

  const events = eventNumbers.map((eventNumber) => {
    const meta = gameweeks?.find((g) => g.gw === eventNumber);
    const { phase, phaseName } = phaseForGw(eventNumber, gameweeks);
    return {
      eventNumber,
      deadline: meta?.deadline_time ?? null,
      phase,
      phaseName,
      finished: true,
      checked: true,
    };
  });

  const byEntry = new Map<number, LegacySnapshotRow[]>();
  for (const row of rows) {
    const list = byEntry.get(row.entry_id) ?? [];
    list.push(row);
    byEntry.set(row.entry_id, list);
  }

  const entries: LeagueSnapshot["entries"] = [];
  for (const [entryId, entryRows] of byEntry) {
    const latest = entryRows.reduce((a, b) => (a.gw > b.gw ? a : b));
    entries.push({
      providerEntryId: String(entryId),
      managerName: latest.manager_name ?? `Manager ${entryId}`,
      teamName: latest.team_name ?? `Team ${entryId}`,
      joinEvent: 1,
      results: entryRows
        .sort((a, b) => a.gw - b.gw)
        .map((r) => {
          const net = r.gw_points ?? 0;
          const transferCost = r.transfer_cost ?? 0;
          return {
            eventNumber: r.gw,
            netPoints: net,
            grossPoints: net + transferCost,
            transferCost,
            totalPoints: r.total_points,
            benchPoints: 0,
            chip: r.active_chip ?? null,
          };
        }),
    });
  }

  return {
    provider: "legacy-supabase",
    season: {
      name: seasonName,
      providerId: leagueProviderId ?? (leagueConfig.providerId || null),
      startEvent: 1,
    },
    league: {
      slug: leagueConfig.slug,
      name: leagueConfig.displayName,
      providerId: leagueProviderId ?? (leagueConfig.providerId || null),
      visibility: leagueConfig.visibility,
      timezone: leagueConfig.scoringTimezone,
    },
    events,
    entries,
  };
}

export function seasonNameFromSlug(slug: string): string {
  const match = /^(\d{4})-(\d{2})$/.exec(slug);
  if (!match) return slug.replace(/-/g, "/");
  return `${match[1]}/${match[2]}`;
}

export function seasonSlugFromName(name: string): string {
  return name.replace("/", "-");
}

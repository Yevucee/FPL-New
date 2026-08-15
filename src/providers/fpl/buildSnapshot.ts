import type { LeagueSnapshot } from "@/contracts/snapshot";
import { leagueConfig } from "@/lib/leagueConfig";

import {
  fetchAllLeagueMembers,
  fetchBootstrap,
  fetchEntryHistory,
  sleep,
  type FplBootstrapEvent,
  type FplEntryHistoryEvent,
} from "./client";

/** Map FPL calendar month to a monthly phase (spec-style phase numbering). */
function phaseForDeadline(deadlineIso: string): { phase: number; phaseName: string } {
  const month = new Date(deadlineIso).toLocaleString("en-GB", {
    month: "long",
    timeZone: leagueConfig.scoringTimezone,
  });
  const monthIndex = new Date(deadlineIso).toLocaleString("en-GB", {
    month: "numeric",
    timeZone: leagueConfig.scoringTimezone,
  });
  return { phase: Number(monthIndex), phaseName: month };
}

export function seasonNameFromBootstrap(events: FplBootstrapEvent[]): string {
  const first = events[0];
  if (!first) return "2026/27";
  const year = new Date(first.deadline_time).getUTCFullYear();
  const next = String(year + 1).slice(-2);
  return `${year}/${next}`;
}

function mapHistoryEvent(
  row: FplEntryHistoryEvent,
  chipByEvent: Map<number, string>,
): LeagueSnapshot["entries"][number]["results"][number] {
  const transferCost = row.event_transfers_cost ?? 0;
  const net = row.points;
  return {
    eventNumber: row.event,
    netPoints: net,
    grossPoints: net + transferCost,
    transferCost,
    totalPoints: row.total_points ?? 0,
    benchPoints: row.points_on_bench ?? 0,
    teamValue: row.value,
    bank: row.bank,
    chip: chipByEvent.get(row.event) ?? null,
  };
}

/**
 * Build a LeagueSnapshot from public FPL read-only endpoints.
 * Intended to be run manually or on a cron after each gameweek — not from the web app.
 */
export async function buildSnapshotFromFpl(leagueId: string): Promise<LeagueSnapshot> {
  const bootstrap = await fetchBootstrap();
  const { league, members } = await fetchAllLeagueMembers(leagueId);

  const events = bootstrap.events
    .filter((ev) => ev.id >= league.start_event)
    .map((ev) => {
      const { phase, phaseName } = phaseForDeadline(ev.deadline_time);
      return {
        eventNumber: ev.id,
        deadline: ev.deadline_time,
        phase,
        phaseName,
        finished: ev.finished,
        checked: ev.data_checked,
      };
    });

  const entries: LeagueSnapshot["entries"] = [];

  for (const [index, member] of members.entries()) {
    if (index > 0) await sleep(120);
    let results: LeagueSnapshot["entries"][number]["results"] = [];
    try {
      const history = await fetchEntryHistory(member.entryId);
      const chipByEvent = new Map(
        history.chips.map((c) => [c.event, c.name] as const),
      );
      // `current` holds gameweek rows for this season; `past` is prior seasons summary.
      const rows = history.current ?? [];
      results = rows.map((row) => mapHistoryEvent(row, chipByEvent));
    } catch {
      // Pre-season or brand-new entry — keep with empty results.
    }

    entries.push({
      providerEntryId: member.entryId,
      managerName: member.managerName,
      teamName: member.teamName,
      joinEvent: league.start_event,
      results,
    });
  }

  return {
    provider: "fpl-public",
    season: {
      name: seasonNameFromBootstrap(bootstrap.events),
      providerId: String(bootstrap.events[0]?.id ?? "current"),
      startEvent: league.start_event,
    },
    league: {
      slug: leagueConfig.slug,
      name: leagueConfig.displayName || league.name,
      providerId: String(league.id),
      visibility: leagueConfig.visibility,
      timezone: leagueConfig.scoringTimezone,
    },
    events,
    entries,
  };
}

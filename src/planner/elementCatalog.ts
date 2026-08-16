import type { FplBootstrapElement, FplBootstrapTeam, FplFixture } from "@/providers/fpl/client";

import { positionFromId } from "@/planner/squadValidation";
import type { PlannerElement, PlannerFixture } from "@/planner/types";

export function buildElementCatalog(
  elements: ReadonlyArray<FplBootstrapElement>,
  teams: ReadonlyArray<FplBootstrapTeam>,
): Map<number, PlannerElement> {
  const teamNames = new Map(teams.map((t) => [t.id, t.short_name]));
  const catalog = new Map<number, PlannerElement>();

  for (const el of elements) {
    catalog.set(el.id, {
      id: el.id,
      webName: el.web_name,
      fullName: `${el.first_name} ${el.second_name}`.trim(),
      position: positionFromId(el.element_type),
      positionId: el.element_type,
      teamId: el.team,
      teamShortName: teamNames.get(el.team) ?? "?",
      priceTenths: el.now_cost,
      form: el.form ? parseFloat(el.form) : null,
      totalPoints: el.total_points ?? null,
      selectedByPercent: el.selected_by_percent ? parseFloat(el.selected_by_percent) : null,
      status: el.status ?? null,
      chanceOfPlaying: el.chance_of_playing_next_round,
      minutes: el.minutes ?? null,
    });
  }
  return catalog;
}

export function buildFixturesByTeam(
  fixtures: ReadonlyArray<FplFixture>,
  teams: ReadonlyArray<FplBootstrapTeam>,
  fromEvent: number,
): Map<number, PlannerFixture[]> {
  const teamNames = new Map(teams.map((t) => [t.id, t.short_name]));
  const byTeam = new Map<number, PlannerFixture[]>();

  for (const fix of fixtures) {
    if (fix.event < fromEvent) continue;

    const home: PlannerFixture = {
      eventNumber: fix.event,
      teamId: fix.team_h,
      opponentShortName: teamNames.get(fix.team_a) ?? "?",
      isHome: true,
      difficulty: fix.team_h_difficulty,
    };
    const away: PlannerFixture = {
      eventNumber: fix.event,
      teamId: fix.team_a,
      opponentShortName: teamNames.get(fix.team_h) ?? "?",
      isHome: false,
      difficulty: fix.team_a_difficulty,
    };

    const homeList = byTeam.get(fix.team_h) ?? [];
    homeList.push(home);
    byTeam.set(fix.team_h, homeList);

    const awayList = byTeam.get(fix.team_a) ?? [];
    awayList.push(away);
    byTeam.set(fix.team_a, awayList);
  }

  for (const [teamId, list] of byTeam) {
    list.sort((a, b) => a.eventNumber - b.eventNumber);
    byTeam.set(teamId, list);
  }
  return byTeam;
}

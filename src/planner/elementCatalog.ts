import type { FplBootstrapElement, FplBootstrapTeam, FplFixture } from "@/providers/fpl/client";

import { positionFromId } from "./squadValidation";
import type { PlannerElement, PlannerFixture } from "./types";

export function buildElementCatalog(
  elements: ReadonlyArray<FplBootstrapElement>,
  teams: ReadonlyArray<FplBootstrapTeam>,
): Map<number, PlannerElement> {
  const teamNames = new Map(teams.map((team) => [team.id, team.short_name]));
  const catalog = new Map<number, PlannerElement>();

  for (const element of elements) {
    catalog.set(element.id, {
      id: element.id,
      webName: element.web_name,
      fullName: `${element.first_name} ${element.second_name}`.trim(),
      position: positionFromId(element.element_type),
      positionId: element.element_type,
      teamId: element.team,
      teamShortName: teamNames.get(element.team) ?? "?",
      priceTenths: element.now_cost,
      form: element.form ? Number.parseFloat(element.form) : null,
      totalPoints: element.total_points ?? null,
      selectedByPercent: element.selected_by_percent
        ? Number.parseFloat(element.selected_by_percent)
        : null,
      status: element.status ?? null,
      chanceOfPlaying: element.chance_of_playing_next_round,
      minutes: element.minutes ?? null,
    });
  }

  return catalog;
}

export function buildFixturesByTeam(
  fixtures: ReadonlyArray<FplFixture>,
  teams: ReadonlyArray<FplBootstrapTeam>,
  fromEvent: number,
): Map<number, PlannerFixture[]> {
  const teamNames = new Map(teams.map((team) => [team.id, team.short_name]));
  const byTeam = new Map<number, PlannerFixture[]>();

  for (const fixture of fixtures) {
    if (fixture.event < fromEvent) continue;

    const home: PlannerFixture = {
      eventNumber: fixture.event,
      teamId: fixture.team_h,
      opponentShortName: teamNames.get(fixture.team_a) ?? "?",
      isHome: true,
      difficulty: fixture.team_h_difficulty,
    };
    const away: PlannerFixture = {
      eventNumber: fixture.event,
      teamId: fixture.team_a,
      opponentShortName: teamNames.get(fixture.team_h) ?? "?",
      isHome: false,
      difficulty: fixture.team_a_difficulty,
    };

    const homeList = byTeam.get(fixture.team_h) ?? [];
    homeList.push(home);
    byTeam.set(fixture.team_h, homeList);

    const awayList = byTeam.get(fixture.team_a) ?? [];
    awayList.push(away);
    byTeam.set(fixture.team_a, awayList);
  }

  for (const [teamId, list] of byTeam) {
    list.sort((a, b) => a.eventNumber - b.eventNumber);
    byTeam.set(teamId, list);
  }

  return byTeam;
}

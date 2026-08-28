/** Planner domain types for personal squad building. */

export type PlannerPosition = "GK" | "DEF" | "MID" | "FWD";

export interface PlannerElement {
  id: number;
  webName: string;
  fullName: string;
  position: PlannerPosition;
  positionId: number;
  teamId: number;
  teamShortName: string;
  priceTenths: number;
  form: number | null;
  totalPoints: number | null;
  selectedByPercent: number | null;
  status: string | null;
  chanceOfPlaying: number | null;
  minutes: number | null;
}

export interface PlannerFixture {
  eventNumber: number;
  teamId: number;
  opponentShortName: string;
  isHome: boolean;
  difficulty: number | null;
}

export interface SquadPlayer {
  elementId: number;
  slot: number;
  isStarter: boolean;
  isCaptain: boolean;
  isViceCaptain: boolean;
}

export interface EnrichedSquadPlayer extends SquadPlayer {
  element: PlannerElement;
  latestPoints: number | null;
  nextFixtures: PlannerFixture[];
}

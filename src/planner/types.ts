/** Shared planner domain types — pure data, no DB or React. */

export type PlannerPosition = "GK" | "DEF" | "MID" | "FWD";

export type PlannerDataState =
  | "live"
  | "final"
  | "preseason"
  | "stale"
  | "partial"
  | "preview";

export type RiskPosture = "protect" | "balanced" | "chase";

export type SquadKind = "imported" | "draft";

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
  sellPriceTenths: number | null;
}

export interface PlannerSettings {
  planningHorizon: 1 | 3 | 5 | 8;
  availableBankTenths: number | null;
  freeTransfers: number | null;
  maxHit: number;
  riskPosture: RiskPosture;
  lockedElementIds: number[];
  excludedElementIds: number[];
  requiredElementIds: number[];
  favourTemplate: boolean;
  rivalEntryIds: string[];
  templateGapMinPct: number;
}

export const DEFAULT_PLANNER_SETTINGS: PlannerSettings = {
  planningHorizon: 3,
  availableBankTenths: null,
  freeTransfers: null,
  maxHit: 4,
  riskPosture: "balanced",
  lockedElementIds: [],
  excludedElementIds: [],
  requiredElementIds: [],
  favourTemplate: true,
  rivalEntryIds: [],
  templateGapMinPct: 30,
};

export interface SquadValidationError {
  code: string;
  message: string;
}

export interface SquadValidationResult {
  valid: boolean;
  errors: SquadValidationError[];
}

export interface EnrichedSquadPlayer extends SquadPlayer {
  element: PlannerElement;
  sellPriceDisplay: { valueTenths: number; isEstimated: boolean };
  leagueOwnership: { count: number; pct: number } | null;
  latestPoints: number | null;
  nextFixture: PlannerFixture | null;
  fixtureDifficulty: number | null;
}

export interface PlannerScoreBreakdown {
  fixture: number;
  form: number;
  availability: number;
  value: number;
  ownership: number;
  total: number;
}

export interface TransferSuggestion {
  elementOutId: number;
  elementInId: number;
  position: PlannerPosition;
  sellPriceTenths: number;
  buyPriceTenths: number;
  sellEstimated: boolean;
  bankAfterTenths: number;
  hitCost: number;
  scoreDelta: number;
  addresses: string;
  risk: string;
  explanation: string;
}

export interface TransferComparison {
  label: string;
  transfers: TransferSuggestion[];
  totalHit: number;
  netScoreDelta: number;
}

export interface SquadRatingComponent {
  key: string;
  label: string;
  score: number;
  maxScore: number;
  partial: boolean;
  explanation: string;
}

export interface PlannerInsight {
  id: string;
  title: string;
  body: string;
  severity: "info" | "warning" | "positive";
}

export interface TemplatePlayerRow {
  elementId: number;
  webName: string;
  position: PlannerPosition;
  priceTenths: number;
  ownerCount: number;
  ownerPct: number;
  samuelOwns: boolean;
  samuelStarts: boolean | null;
  samuelBenches: boolean | null;
  captainCount: number;
  form: number | null;
  nextFixture: PlannerFixture | null;
}

export interface TemplateGapRow extends TemplatePlayerRow {
  similarSamuelPlayer: string | null;
  plannerScore: number;
}

export interface DifferentialRow {
  elementId: number;
  webName: string;
  position: PlannerPosition;
  ownerCount: number;
  ownerPct: number;
  latestPoints: number | null;
  form: number | null;
  nextFixtures: PlannerFixture[];
  rivalsWithout: string[];
  rivalsWith: string[];
  isStarting: boolean;
  minutesRisk: boolean;
}

export interface ThreatLeverRow {
  elementId: number;
  webName: string;
  position: PlannerPosition;
  ownerCount: number;
  ownerPct: number;
  rivalNames: string[];
  explanation: string;
}

export interface CaptainMatrixRow {
  elementId: number;
  webName: string;
  fixture: PlannerFixture | null;
  form: number | null;
  chanceOfPlaying: number | null;
  leagueOwnershipPct: number | null;
  globalOwnershipPct: number | null;
  leagueCaptainCount: number;
  recommended: "captain" | "vice" | "no";
  riskExplanation: string;
  plannerScore: number;
}

export interface ScenarioSummary {
  id: string;
  name: string;
  targetEventNumber: number | null;
  chip: string | null;
  transferCount: number;
  updatedAt: string;
}

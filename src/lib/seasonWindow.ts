export type SeasonWindowKind = "full" | "range" | "phase";

export interface SeasonEventMeta {
  eventNumber: number;
  phase: number;
  phaseName: string | null;
}

export interface SeasonWindowOption {
  id: string;
  label: string;
  kind: SeasonWindowKind;
  fromEvent?: number;
  phase?: number;
}

export interface ResolvedSeasonWindow {
  id: string;
  label: string;
  kind: SeasonWindowKind;
  fromEvent: number;
  phase: number | null;
}

const FIRST_HALF_END = 19;
const SECOND_HALF_START = 20;

export function buildSeasonWindowOptions(events: SeasonEventMeta[]): SeasonWindowOption[] {
  const options: SeasonWindowOption[] = [
    { id: "full", label: "Full season", kind: "full" },
    { id: "first-half", label: "1st half (GW1–19)", kind: "range", fromEvent: 1 },
    { id: "second-half", label: "2nd half (GW20–38)", kind: "range", fromEvent: SECOND_HALF_START },
  ];

  const phases = new Map<number, string>();
  for (const event of events) {
    if (!phases.has(event.phase)) {
      phases.set(event.phase, event.phaseName ?? `Month ${event.phase}`);
    }
  }

  for (const [phase, label] of [...phases.entries()].sort((a, b) => a[0] - b[0])) {
    options.push({
      id: `phase-${phase}`,
      label,
      kind: "phase",
      phase,
    });
  }

  return options;
}

export function resolveSeasonWindow(
  windowId: string | undefined,
  events: SeasonEventMeta[],
): ResolvedSeasonWindow {
  if (!windowId || windowId === "full") {
    return { id: "full", label: "Full season", kind: "full", fromEvent: 1, phase: null };
  }

  if (windowId === "first-half") {
    return {
      id: "first-half",
      label: "1st half (GW1–19)",
      kind: "range",
      fromEvent: 1,
      phase: null,
    };
  }

  if (windowId === "second-half") {
    return {
      id: "second-half",
      label: "2nd half (GW20–38)",
      kind: "range",
      fromEvent: SECOND_HALF_START,
      phase: null,
    };
  }

  const phaseMatch = /^phase-(\d+)$/.exec(windowId);
  if (phaseMatch) {
    const phase = Number(phaseMatch[1]);
    const sample = events.find((event) => event.phase === phase);
    return {
      id: windowId,
      label: sample?.phaseName ?? `Month ${phase}`,
      kind: "phase",
      fromEvent: 1,
      phase,
    };
  }

  return { id: "full", label: "Full season", kind: "full", fromEvent: 1, phase: null };
}

export function clampThroughEventForWindow(
  throughEvent: number,
  window: ResolvedSeasonWindow,
  events: SeasonEventMeta[],
): number {
  if (window.kind === "range" && window.id === "first-half") {
    return Math.min(throughEvent, FIRST_HALF_END);
  }
  if (window.kind === "phase" && window.phase !== null) {
    const phaseEvents = events
      .filter((event) => event.phase === window.phase && event.eventNumber <= throughEvent)
      .map((event) => event.eventNumber);
    if (phaseEvents.length === 0) return throughEvent;
    return Math.max(...phaseEvents);
  }
  return throughEvent;
}

export function filterResultsForWindow<T extends { eventNumber: number; phase: number }>(
  results: readonly T[],
  throughEvent: number,
  window: ResolvedSeasonWindow,
): T[] {
  return results.filter((result) => {
    if (result.eventNumber > throughEvent) return false;
    if (window.kind === "phase" && window.phase !== null) {
      return result.phase === window.phase;
    }
    if (window.kind === "range" && window.id === "first-half") {
      return result.eventNumber <= FIRST_HALF_END;
    }
    if (window.kind === "range" && window.id === "second-half") {
      return result.eventNumber >= SECOND_HALF_START;
    }
    if (window.kind === "range" && window.fromEvent !== undefined) {
      return result.eventNumber >= window.fromEvent;
    }
    return true;
  });
}

export function standingsLabelForWindow(
  window: ResolvedSeasonWindow,
  throughEvent: number | null,
  isLive: boolean,
): string {
  const suffix =
    throughEvent !== null
      ? isLive
        ? ` · GW${throughEvent} live`
        : ` · through GW${throughEvent}`
      : "";

  if (window.kind === "full") {
    return `Standings${suffix}`;
  }
  return `${window.label} standings${suffix}`;
}

export interface GameweekEventMeta {
  eventNumber: number;
  deadline: Date | null;
  finished: boolean;
  checked: boolean;
}

/** GW whose deadline has passed but FPL has not finalised yet. */
export function findLiveGameweek(
  events: ReadonlyArray<GameweekEventMeta>,
  now = Date.now(),
): number | null {
  const live = events.filter((ev) => {
    if (ev.finished && ev.checked) return false;
    if (!ev.deadline) return false;
    return ev.deadline.getTime() <= now;
  });
  if (live.length === 0) return null;
  return live[live.length - 1]!.eventNumber;
}

export function buildSelectableEvents(
  events: ReadonlyArray<GameweekEventMeta>,
  finishedEvents: number[],
  liveEvent: number | null,
): number[] {
  const set = new Set(finishedEvents);
  if (liveEvent !== null) set.add(liveEvent);
  if (set.size === 0) return [];
  return [...set].sort((a, b) => a - b);
}

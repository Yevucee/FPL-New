import type { PlannerFixture } from "@/planner/types";

export function formatFixtureLabel(fixture: PlannerFixture): string {
  const venue = fixture.isHome ? "(H)" : "(A)";
  return `${fixture.opponentShortName} ${venue}`;
}

export function fdrClass(difficulty: number | null): string {
  switch (difficulty) {
    case 1:
      return "bg-emerald-500 text-white";
    case 2:
      return "bg-emerald-400 text-emerald-950";
    case 3:
      return "bg-slate-300 text-slate-800";
    case 4:
      return "bg-orange-400 text-orange-950";
    case 5:
      return "bg-red-600 text-white";
    default:
      return "bg-slate-200 text-slate-600";
  }
}

interface PlayerFixtureStackProps {
  fixtures: PlannerFixture[];
  focusEvent: number;
}

/** Primary fixture for the viewed GW (large), then upcoming GWs smaller underneath. */
export function PlayerFixtureStack({ fixtures, focusEvent }: PlayerFixtureStackProps) {
  const fromFocus = fixtures.filter((fixture) => fixture.eventNumber >= focusEvent);
  if (fromFocus.length === 0) {
    return <span className="text-[10px] text-white/70">—</span>;
  }

  const [primary, ...rest] = fromFocus;
  if (!primary) {
    return <span className="text-[10px] text-white/70">—</span>;
  }

  return (
    <div className="mt-1 space-y-0.5">
      <p
        className={`rounded px-1 py-0.5 text-[11px] font-bold leading-tight ${fdrClass(primary.difficulty)}`}
        title={`GW${primary.eventNumber} ${primary.isHome ? "vs" : "@"} ${primary.opponentShortName}`}
      >
        {formatFixtureLabel(primary)}
      </p>
      {rest.length > 0 && (
        <div className="flex flex-wrap justify-center gap-0.5">
          {rest.map((fixture) => (
            <span
              key={`${fixture.eventNumber}-${fixture.opponentShortName}`}
              title={`GW${fixture.eventNumber}`}
              className={`rounded px-1 py-px text-[8px] font-semibold leading-none opacity-90 ${fdrClass(fixture.difficulty)}`}
            >
              {fixture.isHome ? fixture.opponentShortName : `@${fixture.opponentShortName}`}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

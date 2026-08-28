import type { PlannerFixture } from "@/planner/types";

function fdrClass(difficulty: number | null): string {
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

interface FixtureStripProps {
  fixtures: PlannerFixture[];
  highlightEvent?: number;
}

export function FixtureStrip({ fixtures, highlightEvent }: FixtureStripProps) {
  if (fixtures.length === 0) {
    return <span className="text-[10px] text-slate-400">—</span>;
  }

  return (
    <div className="flex flex-wrap justify-center gap-0.5">
      {fixtures.map((fixture) => (
        <span
          key={`${fixture.eventNumber}-${fixture.opponentShortName}-${fixture.isHome ? "h" : "a"}`}
          title={`GW${fixture.eventNumber} ${fixture.isHome ? "vs" : "@"} ${fixture.opponentShortName}`}
          className={`rounded px-1 py-0.5 text-[9px] font-semibold leading-none ${
            highlightEvent === fixture.eventNumber
              ? "ring-1 ring-slate-900 ring-offset-1"
              : ""
          } ${fdrClass(fixture.difficulty)}`}
        >
          {fixture.isHome ? fixture.opponentShortName : `@${fixture.opponentShortName}`}
        </span>
      ))}
    </div>
  );
}

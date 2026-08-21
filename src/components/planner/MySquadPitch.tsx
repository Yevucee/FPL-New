import type { EnrichedSquadPlayer } from "@/planner/types";

interface MySquadPitchProps {
  squad: EnrichedSquadPlayer[];
}

const ROWS: Array<{ positions: EnrichedSquadPlayer["element"]["position"][]; count: number }> = [
  { positions: ["GK"], count: 1 },
  { positions: ["DEF"], count: 4 },
  { positions: ["MID"], count: 4 },
  { positions: ["FWD"], count: 2 },
];

function PlayerCard({ player }: { player: EnrichedSquadPlayer }) {
  return (
    <div
      className={`rounded-lg border px-2 py-2 text-center text-xs shadow-sm ${
        player.isCaptain
          ? "border-amber-400 bg-amber-50"
          : player.isViceCaptain
            ? "border-slate-300 bg-white"
            : "border-pitch-200/80 bg-white"
      }`}
    >
      <p className="font-bold text-slate-900">{player.element.webName}</p>
      <p className="text-slate-500">{player.element.teamShortName}</p>
      <p className="tabular-nums text-slate-600">
        £{(player.element.priceTenths / 10).toFixed(1)}m
        {player.leagueOwnership && ` · ${player.leagueOwnership.pct}%`}
      </p>
      {player.isCaptain && <span className="text-[10px] font-bold text-amber-700">C</span>}
      {player.isViceCaptain && <span className="text-[10px] font-bold text-slate-500">V</span>}
    </div>
  );
}

export function MySquadPitch({ squad }: MySquadPitchProps) {
  const starters = squad.filter((p) => p.isStarter);
  const bench = squad.filter((p) => !p.isStarter);

  function pick(pos: EnrichedSquadPlayer["element"]["position"], n: number) {
    return starters.filter((p) => p.element.position === pos).slice(0, n);
  }

  return (
    <div className="rounded-xl border border-pitch-300/60 bg-gradient-to-b from-pitch-100/80 to-pitch-200/40 p-4">
      <div className="mx-auto max-w-md space-y-3">
        {ROWS.map((row) => (
          <div
            key={row.positions.join("-")}
            className="flex justify-center gap-2"
          >
            {pick(row.positions[0]!, row.count).map((p) => (
              <div key={p.elementId} className="w-20">
                <PlayerCard player={p} />
              </div>
            ))}
          </div>
        ))}
      </div>
      {bench.length > 0 && (
        <div className="mt-4 border-t border-pitch-300/40 pt-3">
          <p className="mb-2 text-center text-xs font-semibold uppercase text-pitch-800">Bench</p>
          <div className="flex flex-wrap justify-center gap-2">
            {bench.map((p) => (
              <div key={p.elementId} className="w-20">
                <PlayerCard player={p} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

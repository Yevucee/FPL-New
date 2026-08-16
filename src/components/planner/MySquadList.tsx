import type { EnrichedSquadPlayer } from "@/planner/types";
import { Card } from "@/components/ui/Card";

interface MySquadListProps {
  squad: EnrichedSquadPlayer[];
}

export function MySquadList({ squad }: MySquadListProps) {
  const starters = squad.filter((p) => p.isStarter);
  const bench = squad.filter((p) => !p.isStarter);

  return (
    <Card padding="sm" className="divide-y divide-slate-100 p-0">
      <div className="px-4 py-2 text-xs font-semibold uppercase text-slate-500">Starting XI</div>
      {starters.map((p) => (
        <PlayerRow key={p.elementId} player={p} />
      ))}
      <div className="px-4 py-2 text-xs font-semibold uppercase text-slate-500">Bench</div>
      {bench.map((p) => (
        <PlayerRow key={p.elementId} player={p} />
      ))}
    </Card>
  );
}

function PlayerRow({ player }: { player: EnrichedSquadPlayer }) {
  const sell = player.sellPriceDisplay;
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 text-sm">
      <div>
        <span className="font-semibold text-slate-900">{player.element.webName}</span>
        <span className="ml-2 text-slate-500">
          {player.element.position} · {player.element.teamShortName}
        </span>
        {player.isCaptain && <span className="ml-2 text-xs font-bold text-amber-700">C</span>}
        {player.isViceCaptain && <span className="ml-2 text-xs font-bold text-slate-500">V</span>}
      </div>
      <div className="text-right text-xs text-slate-600">
        <div>
          £{(player.element.priceTenths / 10).toFixed(1)}m
          {sell.isEstimated && " (est. sell)"}
        </div>
        {player.leagueOwnership && <div>{player.leagueOwnership.pct}% league</div>}
        {player.nextFixture && (
          <div>
            {player.nextFixture.isHome ? "H" : "A"} {player.nextFixture.opponentShortName} FDR{" "}
            {player.nextFixture.difficulty ?? "?"}
          </div>
        )}
      </div>
    </div>
  );
}

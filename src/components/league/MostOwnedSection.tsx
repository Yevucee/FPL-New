import { Card, CardLabel } from "@/components/ui/Card";

interface MostOwnedSectionProps {
  players: Array<{ webName: string; ownerCount: number; ownerPct: number }>;
  eventNumber: number | null;
  managerCount: number;
}

export function MostOwnedSection({
  players,
  eventNumber,
  managerCount,
}: MostOwnedSectionProps) {
  const maxPct = Math.max(...players.map((p) => p.ownerPct), 1);

  return (
    <section>
      <h2 className="mb-1 text-lg font-bold tracking-tight text-slate-900">
        Most owned{eventNumber !== null ? ` · GW${eventNumber}` : ""}
      </h2>
      <p className="mb-3 text-xs text-slate-500">
        Squad snapshot after deadline · {managerCount} managers in league
      </p>
      <Card padding="sm" className="divide-y divide-slate-100 p-0">
        {players.map((player, index) => (
          <div
            key={player.webName}
            className="relative px-4 py-3"
          >
            <div
              className="absolute inset-y-0 left-0 bg-swiss-50 transition-all"
              style={{ width: `${(player.ownerPct / maxPct) * 100}%` }}
            />
            <div className="relative flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="w-5 text-xs font-bold text-slate-400">{index + 1}</span>
                <span className="font-semibold text-slate-900">{player.webName}</span>
              </div>
              <div className="text-right text-sm">
                <span className="font-bold tabular-nums text-swiss-800">
                  {player.ownerPct}%
                </span>
                <span className="ml-2 text-slate-500">
                  {player.ownerCount}/{managerCount}
                </span>
              </div>
            </div>
          </div>
        ))}
      </Card>
    </section>
  );
}

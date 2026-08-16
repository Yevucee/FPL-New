import { Card, CardLabel } from "@/components/ui/Card";
import { formatChipName, SEASON_CHIP_TYPES } from "@/lib/chipLabels";
import type { PlannerOverview } from "@/server/plannerData";

interface PlannerDashboardProps {
  overview: PlannerOverview | null;
}

function OwnershipList({
  title,
  subtitle,
  players,
  managerCount,
  accent = "swiss",
}: {
  title: string;
  subtitle: string;
  players: PlannerOverview["mostOwned"];
  managerCount: number;
  accent?: "swiss" | "pitch";
}) {
  if (players.length === 0) return null;

  const maxPct = Math.max(...players.map((p) => p.ownerPct), 1);
  const barClass = accent === "pitch" ? "bg-pitch-100" : "bg-swiss-50";

  return (
    <section>
      <h2 className="mb-1 text-lg font-bold tracking-tight text-slate-900">{title}</h2>
      <p className="mb-3 text-xs text-slate-500">{subtitle}</p>
      <Card padding="sm" className="divide-y divide-slate-100 p-0">
        {players.map((player, index) => (
          <div key={player.elementId} className="relative px-4 py-3">
            <div
              className={`absolute inset-y-0 left-0 ${barClass}`}
              style={{ width: `${(player.ownerPct / maxPct) * 100}%` }}
            />
            <div className="relative flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="w-5 text-xs font-bold text-slate-400">{index + 1}</span>
                <span className="font-semibold text-slate-900">{player.webName}</span>
              </div>
              <div className="text-right text-sm">
                <span className="font-bold tabular-nums text-slate-800">{player.ownerPct}%</span>
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

export function PlannerDashboard({ overview }: PlannerDashboardProps) {
  if (!overview) {
    return (
      <Card>
        <p className="text-sm text-slate-600">League data not available yet.</p>
      </Card>
    );
  }

  if (overview.managerCount === 0) {
    return (
      <Card>
        <p className="text-sm text-slate-600">
          Pre-season — planner fills in after the first gameweek deadline and squad sync.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-8">
      <Card className="bg-gradient-to-br from-swiss-50/50 to-white">
        <p className="text-sm text-slate-600">
          Season <strong className="text-slate-900">{overview.seasonName}</strong>
          {overview.eventNumber !== null && (
            <>
              {" "}
              · latest squad snapshot{" "}
              <strong className="text-slate-900">GW{overview.eventNumber}</strong>
            </>
          )}
          {" "}
          · {overview.managerCount} managers
        </p>
      </Card>

      <section>
        <h2 className="mb-3 text-lg font-bold tracking-tight text-slate-900">Chips remaining</h2>
        <div className="overflow-x-auto rounded-xl border border-slate-200/80 bg-white shadow-card">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="bg-slate-50/90 text-xs font-semibold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-3 py-3">Manager</th>
                {SEASON_CHIP_TYPES.map((chip) => (
                  <th key={chip} className="px-3 py-3 text-center">
                    {formatChipName(chip)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {overview.chipStatus.map((row) => (
                <tr key={row.managerName} className="border-t border-slate-100">
                  <td className="px-3 py-2.5">
                    <div className="font-medium text-slate-900">{row.managerName}</div>
                    <div className="text-xs text-slate-500">{row.teamName}</div>
                  </td>
                  {SEASON_CHIP_TYPES.map((chip) => {
                    const usedGw = row.used[chip];
                    return (
                      <td key={chip} className="px-3 py-2.5 text-center text-sm">
                        {usedGw !== undefined ? (
                          <span className="font-medium text-slate-500">GW{usedGw}</span>
                        ) : (
                          <span className="font-semibold text-pitch-700">Available</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {overview.chipsPlayed.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-bold tracking-tight text-slate-900">Chips played</h2>
          <Card padding="sm" className="divide-y divide-slate-100 p-0">
            {overview.chipsPlayed.map((row) => (
              <div
                key={`${row.managerName}-${row.eventNumber}-${row.chip}`}
                className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm"
              >
                <div>
                  <span className="font-medium text-slate-900">{row.managerName}</span>
                  <span className="text-slate-400"> · </span>
                  <span className="text-slate-600">{row.teamName}</span>
                </div>
                <div className="text-right">
                  <span className="font-semibold text-swiss-800">{row.chipLabel}</span>
                  <span className="ml-2 text-slate-500">GW{row.eventNumber}</span>
                </div>
              </div>
            ))}
          </Card>
        </section>
      )}

      {overview.captainPicks.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-bold tracking-tight text-slate-900">
            Captain picks · GW{overview.eventNumber}
          </h2>
          <div className="overflow-x-auto rounded-xl border border-slate-200/80 bg-white shadow-card">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50/90 text-xs font-semibold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-3 py-3">Manager</th>
                  <th className="px-3 py-3">Captain</th>
                  <th className="px-3 py-3 text-right">Pts</th>
                </tr>
              </thead>
              <tbody>
                {overview.captainPicks.map((row) => (
                  <tr key={row.managerName} className="border-t border-slate-100">
                    <td className="px-3 py-2.5">
                      <div className="font-medium">{row.managerName}</div>
                      <div className="text-xs text-slate-500">{row.teamName}</div>
                    </td>
                    <td className="px-3 py-2.5 font-medium text-slate-800">
                      {row.captainName ?? "—"}
                    </td>
                    <td className="px-3 py-2.5 text-right font-bold tabular-nums">
                      {row.captainPoints ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <OwnershipList
        title="Most owned in the league"
        subtitle="Full ownership picture from the latest post-deadline squad snapshot."
        players={overview.mostOwned}
        managerCount={overview.managerCount}
      />

      <OwnershipList
        title="Differentials"
        subtitle="Owned by at most two managers — potential edge picks."
        players={overview.differentials}
        managerCount={overview.managerCount}
        accent="pitch"
      />
    </div>
  );
}

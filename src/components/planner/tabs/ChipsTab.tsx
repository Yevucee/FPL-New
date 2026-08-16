import { Card } from "@/components/ui/Card";
import { formatChipName, SEASON_CHIP_TYPES } from "@/lib/chipLabels";
import type { PlannerWorkspace } from "@/server/plannerWorkspace";

interface ChipsTabProps {
  workspace: PlannerWorkspace;
}

export function ChipsTab({ workspace }: ChipsTabProps) {
  const { overview, chips } = workspace;
  const samuel = chips.samuelStatus;

  return (
    <div className="space-y-8">
      {samuel && (
        <section>
          <h2 className="mb-3 text-lg font-bold text-slate-900">Samuel&apos;s chips</h2>
          <Card padding="sm" className="border-swiss-200 bg-swiss-50/30">
            <p className="font-semibold">{samuel.managerName} · {samuel.teamName}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {SEASON_CHIP_TYPES.map((chip) => {
                const used = samuel.used[chip];
                return (
                  <span
                    key={chip}
                    className={`rounded-full px-3 py-1 text-sm font-medium ${
                      used != null ? "bg-slate-200 text-slate-600" : "bg-pitch-100 text-pitch-800"
                    }`}
                  >
                    {formatChipName(chip)}
                    {used != null ? ` · GW${used}` : " · Available"}
                  </span>
                );
              })}
            </div>
          </Card>
        </section>
      )}

      {overview && overview.chipStatus.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-bold text-slate-900">Chips remaining · league</h2>
          <div className="overflow-x-auto rounded-xl border border-slate-200/80 bg-white shadow-card">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="bg-slate-50/90 text-xs font-semibold uppercase text-slate-500">
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
                {overview.chipStatus.map((row) => {
                  const isSamuel = samuel && row.managerName === samuel.managerName;
                  return (
                    <tr
                      key={row.managerName}
                      className={`border-t border-slate-100 ${isSamuel ? "bg-swiss-50/50" : ""}`}
                    >
                      <td className="px-3 py-2.5">
                        <div className="font-medium">{row.managerName}</div>
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
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {overview && overview.chipsPlayed.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-bold text-slate-900">Chips played</h2>
          <Card padding="sm" className="divide-y divide-slate-100 p-0">
            {overview.chipsPlayed.map((row) => (
              <div
                key={`${row.managerName}-${row.eventNumber}-${row.chip}`}
                className="flex flex-wrap justify-between gap-2 px-4 py-3 text-sm"
              >
                <span className="font-medium">{row.managerName}</span>
                <span>
                  {row.chipLabel} · GW{row.eventNumber}
                </span>
              </div>
            ))}
          </Card>
        </section>
      )}

      <section>
        <h2 className="mb-3 text-lg font-bold text-slate-900">Chip retention · league</h2>
        <div className="flex flex-wrap gap-3">
          {SEASON_CHIP_TYPES.map((chip) => (
            <Card key={chip} padding="sm">
              <p className="text-xs font-semibold uppercase text-slate-500">{formatChipName(chip)}</p>
              <p className="text-lg font-bold tabular-nums">{chips.retentionPct[chip] ?? 0}%</p>
              <p className="text-xs text-slate-500">managers retaining</p>
            </Card>
          ))}
        </div>
      </section>

      {chips.guidance.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-bold text-slate-900">Chip planning guidance</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {chips.guidance.map((g) => (
              <Card
                key={g.id}
                padding="sm"
                className={g.severity === "warning" ? "border-amber-200 bg-amber-50/40" : ""}
              >
                <p className="font-semibold">{g.title}</p>
                <p className="mt-1 text-sm text-slate-600">{g.body}</p>
              </Card>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

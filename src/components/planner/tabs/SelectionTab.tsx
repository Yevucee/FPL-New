import { Card } from "@/components/ui/Card";
import type { PlannerWorkspace } from "@/server/plannerWorkspace";

interface SelectionTabProps {
  workspace: PlannerWorkspace;
}

export function SelectionTab({ workspace }: SelectionTabProps) {
  const { selection, overview } = workspace;

  return (
    <div className="space-y-8">
      <section>
        <h2 className="mb-3 text-lg font-bold text-slate-900">Recommended starting XI</h2>
        <p className="mb-3 text-xs text-slate-500">
          Based on form and planner score — your saved draft may differ.
        </p>
        <Card padding="sm" className="divide-y divide-slate-100 p-0">
          {selection.recommended.starters.map((p) => (
            <div key={p.elementId} className="px-4 py-2 text-sm font-medium">
              {p.element.webName} ({p.element.position})
            </div>
          ))}
        </Card>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-bold text-slate-900">Captain matrix</h2>
        <div className="overflow-x-auto rounded-xl border border-slate-200/80 bg-white shadow-card">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="bg-slate-50/90 text-xs font-semibold uppercase text-slate-500">
              <tr>
                <th className="px-3 py-2">Player</th>
                <th className="px-3 py-2">Fixture</th>
                <th className="px-3 py-2 text-right">Form</th>
                <th className="px-3 py-2 text-right">Score</th>
                <th className="px-3 py-2">Rec.</th>
                <th className="px-3 py-2">Risk</th>
              </tr>
            </thead>
            <tbody>
              {selection.captainMatrix.map((row) => (
                <tr key={row.elementId} className="border-t border-slate-100">
                  <td className="px-3 py-2 font-medium">{row.webName}</td>
                  <td className="px-3 py-2 text-slate-600">
                    {row.fixture
                      ? `${row.fixture.isHome ? "H" : "A"} ${row.fixture.opponentShortName}`
                      : "—"}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">{row.form ?? "—"}</td>
                  <td className="px-3 py-2 text-right tabular-nums font-semibold">{row.plannerScore}</td>
                  <td className="px-3 py-2 capitalize">{row.recommended}</td>
                  <td className="px-3 py-2 text-xs text-slate-500">{row.riskExplanation}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {overview && overview.captainPicks.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-bold text-slate-900">
            League captain picks · GW{overview.eventNumber}
          </h2>
          <p className="mb-2 text-xs text-slate-500">For context — not your personal recommendation.</p>
          <Card padding="sm" className="divide-y divide-slate-100 p-0">
            {overview.captainPicks.slice(0, 10).map((row) => (
              <div key={row.managerName} className="flex justify-between px-4 py-2 text-sm">
                <span>{row.managerName}</span>
                <span className="font-medium">
                  {row.captainName ?? "—"} ({row.captainPoints ?? "—"} pts)
                </span>
              </div>
            ))}
          </Card>
        </section>
      )}

      <section>
        <h2 className="mb-3 text-lg font-bold text-slate-900">Bench recommendation</h2>
        <Card padding="sm">
          <p className="text-sm text-slate-700">{selection.bench.explanation}</p>
          {selection.bench.minutesRisk.length > 0 && (
            <p className="mt-2 text-sm text-amber-700">
              Minutes risk: {selection.bench.minutesRisk.map((p) => p.element.webName).join(", ")}
            </p>
          )}
          <p className="mt-2 text-sm">
            Bench Boost ready: {selection.bench.benchBoostReady ? "Yes" : "No"}
          </p>
        </Card>
      </section>
    </div>
  );
}

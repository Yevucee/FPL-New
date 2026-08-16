import { Card, CardLabel } from "@/components/ui/Card";
import type { PlannerWorkspace } from "@/server/plannerWorkspace";

interface TransfersTabProps {
  workspace: PlannerWorkspace;
}

export function TransfersTab({ workspace }: TransfersTabProps) {
  const { transfers, settings, scenarios } = workspace;

  return (
    <div className="space-y-8">
      <section>
        <h2 className="mb-3 text-lg font-bold text-slate-900">Planning controls</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Card padding="sm">
            <CardLabel>Horizon</CardLabel>
            <p className="font-bold">{settings.planningHorizon} GWs</p>
          </Card>
          <Card padding="sm">
            <CardLabel>Max hit</CardLabel>
            <p className="font-bold">{settings.maxHit} pts</p>
          </Card>
          <Card padding="sm">
            <CardLabel>Risk posture</CardLabel>
            <p className="font-bold capitalize">{settings.riskPosture}</p>
          </Card>
          <Card padding="sm">
            <CardLabel>Template bias</CardLabel>
            <p className="font-bold">{settings.favourTemplate ? "Template" : "Differentials"}</p>
          </Card>
        </div>
        <p className="mt-2 text-xs text-slate-500" title={transfers.formula}>
          {transfers.formula}
        </p>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-bold text-slate-900">Transfer comparisons</h2>
        <div className="grid gap-3 lg:grid-cols-2">
          {transfers.comparisons.map((cmp) => (
            <Card key={cmp.label} padding="sm">
              <p className="font-semibold text-slate-900">{cmp.label}</p>
              <p className="mt-1 text-sm text-slate-600">
                Hit: {cmp.totalHit} · Net score Δ: {cmp.netScoreDelta}
              </p>
              {cmp.transfers.length > 0 && (
                <ul className="mt-2 space-y-1 text-sm">
                  {cmp.transfers.map((t, i) => (
                    <li key={i}>
                      Out #{t.elementOutId} → In #{t.elementInId} ({t.position}) — {t.explanation}
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-bold text-slate-900">Transfer shortlist</h2>
        {transfers.suggestions.length === 0 ? (
          <Card>
            <p className="text-sm text-slate-600">No legal transfers found with current squad and constraints.</p>
          </Card>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200/80 bg-white shadow-card">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="bg-slate-50/90 text-xs font-semibold uppercase text-slate-500">
                <tr>
                  <th className="px-3 py-2">Out → In</th>
                  <th className="px-3 py-2">Pos</th>
                  <th className="px-3 py-2 text-right">Score Δ</th>
                  <th className="px-3 py-2">Addresses</th>
                  <th className="px-3 py-2">Risk</th>
                </tr>
              </thead>
              <tbody>
                {transfers.suggestions.map((t, i) => (
                  <tr key={i} className="border-t border-slate-100">
                    <td className="px-3 py-2">
                      #{t.elementOutId} → #{t.elementInId}
                      {t.sellEstimated && (
                        <span className="ml-1 text-xs text-amber-700">est.</span>
                      )}
                    </td>
                    <td className="px-3 py-2">{t.position}</td>
                    <td className="px-3 py-2 text-right tabular-nums font-semibold">{t.scoreDelta}</td>
                    <td className="px-3 py-2 text-slate-600">{t.addresses}</td>
                    <td className="px-3 py-2 text-xs text-slate-500">{t.risk}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-lg font-bold text-slate-900">Saved scenarios</h2>
        <p className="mb-3 text-xs text-amber-800">All scenarios are private drafts — never submitted to FPL.</p>
        {scenarios.length === 0 ? (
          <Card>
            <p className="text-sm text-slate-600">No saved scenarios yet.</p>
          </Card>
        ) : (
          <Card padding="sm" className="divide-y divide-slate-100 p-0">
            {scenarios.map((s) => (
              <div key={s.id} className="flex justify-between px-4 py-3 text-sm">
                <span className="font-medium">{s.name}</span>
                <span className="text-slate-500">
                  GW{s.targetEventNumber ?? "?"} · {s.transferCount} moves
                </span>
              </div>
            ))}
          </Card>
        )}
      </section>
    </div>
  );
}

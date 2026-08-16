import { Card, CardLabel } from "@/components/ui/Card";
import type { PlannerWorkspace } from "@/server/plannerWorkspace";

import { MySquadPitch } from "../MySquadPitch";
import { MySquadList } from "../MySquadList";

interface OverviewTabProps {
  workspace: PlannerWorkspace;
}

function formatMoney(tenths: number | null): string {
  if (tenths == null) return "Unknown";
  return `£${(tenths / 10).toFixed(1)}m`;
}

export function OverviewTab({ workspace }: OverviewTabProps) {
  const { squad, summary, rating, insights, templateCoverage, templateGaps, differentials, threatsAndLevers } =
    workspace;

  if (squad.length === 0) {
    return (
      <Card>
        <p className="text-sm text-slate-600">
          No squad loaded — configure PLANNER_FPL_ENTRY_ID or use Edit squad to build manually.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-8">
      <section className="grid gap-6 lg:grid-cols-2">
        <div>
          <h2 className="mb-3 text-lg font-bold text-slate-900">My squad · pitch</h2>
          <MySquadPitch squad={squad} />
        </div>
        <div>
          <h2 className="mb-3 text-lg font-bold text-slate-900">My squad · list</h2>
          <MySquadList squad={squad} />
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-bold text-slate-900">Squad summary</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Card padding="sm">
            <CardLabel>Team value</CardLabel>
            <p className="text-lg font-bold tabular-nums">{formatMoney(summary.teamValueTenths)}</p>
          </Card>
          <Card padding="sm">
            <CardLabel>Bank</CardLabel>
            <p className="text-lg font-bold tabular-nums">
              {formatMoney(summary.bankTenths)}
              {summary.bankIsEstimated && (
                <span className="ml-1 text-xs font-normal text-amber-700">Estimated</span>
              )}
            </p>
          </Card>
          <Card padding="sm">
            <CardLabel>Free transfers</CardLabel>
            <p className="text-lg font-bold tabular-nums">
              {summary.freeTransfers ?? "Unknown"}
            </p>
          </Card>
          <Card padding="sm">
            <CardLabel>Template coverage</CardLabel>
            <p className="text-lg font-bold tabular-nums">{summary.templateCoverage}%</p>
          </Card>
          <Card padding="sm">
            <CardLabel>Uniqueness</CardLabel>
            <p className="text-lg font-bold tabular-nums">{summary.uniqueness}/100</p>
          </Card>
          <Card padding="sm">
            <CardLabel>Flagged players</CardLabel>
            <p className="text-lg font-bold tabular-nums">{summary.flaggedPlayers}</p>
          </Card>
          <Card padding="sm">
            <CardLabel>Chips remaining</CardLabel>
            <p className="text-lg font-bold tabular-nums">{summary.chipsRemaining}</p>
          </Card>
        </div>
      </section>

      <section>
        <h2 className="mb-1 text-lg font-bold text-slate-900">
          Squad rating {rating.partial && <span className="text-sm font-normal text-amber-700">(partial)</span>}
        </h2>
        <p className="mb-3 text-xs text-slate-500">Transparent score out of 100 — not an AI model.</p>
        <Card padding="sm">
          <p className="mb-4 text-3xl font-bold text-swiss-800">{rating.total}/100</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {rating.components.map((c) => (
              <div key={c.key} className="rounded-lg bg-slate-50 px-3 py-2 text-sm">
                <div className="flex justify-between font-medium">
                  <span>{c.label}</span>
                  <span className="tabular-nums">
                    {c.score}/{c.maxScore}
                    {c.partial && " *"}
                  </span>
                </div>
                <p className="text-xs text-slate-500">{c.explanation}</p>
              </div>
            ))}
          </div>
        </Card>
      </section>

      {insights.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-bold text-slate-900">Immediate insights</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {insights.map((insight) => (
              <Card
                key={insight.id}
                padding="sm"
                className={
                  insight.severity === "warning"
                    ? "border-amber-200 bg-amber-50/50"
                    : insight.severity === "positive"
                      ? "border-pitch-200 bg-pitch-50/30"
                      : ""
                }
              >
                <p className="font-semibold text-slate-900">{insight.title}</p>
                <p className="mt-1 text-sm text-slate-600">{insight.body}</p>
              </Card>
            ))}
          </div>
        </section>
      )}

      <TemplateSection title="Template coverage" rows={templateCoverage} />
      <TemplateGapsSection rows={templateGaps} />
      <DifferentialsSection rows={differentials} />
      <ThreatsLeversSection threats={threatsAndLevers.threats} levers={threatsAndLevers.levers} />
    </div>
  );
}

function TemplateSection({
  title,
  rows,
}: {
  title: string;
  rows: PlannerWorkspace["templateCoverage"];
}) {
  if (rows.length === 0) return null;
  return (
    <section>
      <h2 className="mb-3 text-lg font-bold text-slate-900">{title}</h2>
      <div className="overflow-x-auto rounded-xl border border-slate-200/80 bg-white shadow-card">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="bg-slate-50/90 text-xs font-semibold uppercase text-slate-500">
            <tr>
              <th className="px-3 py-2">Player</th>
              <th className="px-3 py-2">Pos</th>
              <th className="px-3 py-2 text-right">Own%</th>
              <th className="px-3 py-2">Samuel</th>
              <th className="px-3 py-2 text-right">Cpts</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.elementId} className="border-t border-slate-100">
                <td className="px-3 py-2 font-medium">{row.webName}</td>
                <td className="px-3 py-2 text-slate-500">{row.position}</td>
                <td className="px-3 py-2 text-right tabular-nums">{row.ownerPct}%</td>
                <td className="px-3 py-2">
                  {row.samuelOwns
                    ? row.samuelStarts
                      ? "Starting"
                      : "Bench"
                    : "Missing"}
                </td>
                <td className="px-3 py-2 text-right tabular-nums">{row.captainCount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function TemplateGapsSection({ rows }: { rows: PlannerWorkspace["templateGaps"] }) {
  if (rows.length === 0) return null;
  return (
    <section>
      <h2 className="mb-3 text-lg font-bold text-slate-900">Template gaps</h2>
      <Card padding="sm" className="divide-y divide-slate-100 p-0">
        {rows.slice(0, 15).map((row) => (
          <div key={row.elementId} className="flex flex-wrap justify-between gap-2 px-4 py-3 text-sm">
            <div>
              <span className="font-semibold">{row.webName}</span>
              <span className="text-slate-400"> · {row.ownerPct}% owned</span>
            </div>
            <span className="text-slate-500">
              Similar: {row.similarSamuelPlayer ?? "—"} · Score {row.plannerScore}
            </span>
          </div>
        ))}
      </Card>
    </section>
  );
}

function DifferentialsSection({ rows }: { rows: PlannerWorkspace["differentials"] }) {
  if (rows.length === 0) return null;
  return (
    <section>
      <h2 className="mb-3 text-lg font-bold text-slate-900">Your differentials</h2>
      <Card padding="sm" className="divide-y divide-slate-100 p-0">
        {rows.map((row) => (
          <div key={row.elementId} className="px-4 py-3 text-sm">
            <div className="flex justify-between">
              <span className="font-semibold">{row.webName}</span>
              <span className="text-slate-500">{row.ownerPct}% league</span>
            </div>
            {row.minutesRisk && (
              <p className="mt-1 text-xs text-amber-700">Minutes risk — verify availability.</p>
            )}
          </div>
        ))}
      </Card>
    </section>
  );
}

function ThreatsLeversSection({
  threats,
  levers,
}: {
  threats: PlannerWorkspace["threatsAndLevers"]["threats"];
  levers: PlannerWorkspace["threatsAndLevers"]["levers"];
}) {
  if (threats.length === 0 && levers.length === 0) return null;
  return (
    <section className="grid gap-6 lg:grid-cols-2">
      <div>
        <h2 className="mb-2 text-lg font-bold text-slate-900">Threats</h2>
        <p className="mb-3 text-xs text-slate-500">Strong template players rivals own that you don&apos;t.</p>
        <Card padding="sm" className="divide-y divide-slate-100 p-0">
          {threats.slice(0, 8).map((t) => (
            <div key={t.elementId} className="px-4 py-3 text-sm">
              <span className="font-semibold">{t.webName}</span>
              <p className="text-slate-600">{t.explanation}</p>
            </div>
          ))}
        </Card>
      </div>
      <div>
        <h2 className="mb-2 text-lg font-bold text-slate-900">Levers</h2>
        <p className="mb-3 text-xs text-slate-500">Useful differentials rivals lack.</p>
        <Card padding="sm" className="divide-y divide-slate-100 p-0">
          {levers.slice(0, 8).map((l) => (
            <div key={l.elementId} className="px-4 py-3 text-sm">
              <span className="font-semibold">{l.webName}</span>
              <p className="text-slate-600">{l.explanation}</p>
            </div>
          ))}
        </Card>
      </div>
    </section>
  );
}

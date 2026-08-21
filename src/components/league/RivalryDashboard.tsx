"use client";

import { useRouter, useSearchParams } from "next/navigation";

import { Card, CardLabel } from "@/components/ui/Card";
import { statHints } from "@/lib/statHints";
import type { RivalryStats } from "@/metrics/rivalry";

interface RivalryDashboardProps {
  managers: Array<{ entryId: string; managerName: string; teamName: string }>;
  rivalry: RivalryStats | null;
  entryA: string | null;
  entryB: string | null;
  throughEvent: number | null;
}

export function RivalryDashboard({
  managers,
  rivalry,
  entryA,
  entryB,
  throughEvent,
}: RivalryDashboardProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const updateManager = (slot: "a" | "b", value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(slot, value);
    else params.delete(slot);
    router.push(`/league/rivalry?${params.toString()}`);
  };

  const sortedManagers = [...managers].sort((a, b) =>
    a.managerName.localeCompare(b.managerName),
  );

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="mb-1 block font-semibold text-slate-700">Manager A</span>
          <select
            value={entryA ?? ""}
            onChange={(event) => updateManager("a", event.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm"
          >
            <option value="">Select manager…</option>
            {sortedManagers.map((manager) => (
              <option key={manager.entryId} value={manager.entryId}>
                {manager.managerName}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-semibold text-slate-700">Manager B</span>
          <select
            value={entryB ?? ""}
            onChange={(event) => updateManager("b", event.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm"
          >
            <option value="">Select manager…</option>
            {sortedManagers.map((manager) => (
              <option key={manager.entryId} value={manager.entryId}>
                {manager.managerName}
              </option>
            ))}
          </select>
        </label>
      </div>

      {!entryA || !entryB ? (
        <Card>
          <p className="text-sm text-slate-600">
            Pick two managers to compare head-to-head gameweek wins, rank trends, and squad
            overlap{throughEvent ? ` through GW${throughEvent}` : ""}.
          </p>
        </Card>
      ) : entryA === entryB ? (
        <Card>
          <p className="text-sm text-slate-600">Choose two different managers.</p>
        </Card>
      ) : rivalry ? (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <Card padding="sm">
              <CardLabel hint={statHints.gwWins}>GW wins</CardLabel>
              <p className="mt-2 text-lg font-bold text-slate-900">
                {rivalry.managerA.managerName}{" "}
                <span className="text-swiss-700">{rivalry.gwWinsA}</span>
                <span className="mx-2 text-slate-400">–</span>
                <span className="text-swiss-700">{rivalry.gwWinsB}</span>{" "}
                {rivalry.managerB.managerName}
              </p>
              {rivalry.gwTies > 0 && (
                <p className="mt-1 text-xs text-slate-500">{rivalry.gwTies} tied gameweeks</p>
              )}
            </Card>
            <Card padding="sm">
              <CardLabel hint={statHints.squadOverlap}>Squad overlap</CardLabel>
              <p className="mt-2 text-lg font-bold text-slate-900">
                {rivalry.templateOverlapPct !== null
                  ? `${rivalry.templateOverlapPct}%`
                  : "—"}
              </p>
              <p className="mt-1 text-xs text-slate-500">Average shared starters</p>
            </Card>
            <Card padding="sm">
              <CardLabel hint={statHints.sameCaptain}>Same captain</CardLabel>
              <p className="mt-2 text-lg font-bold text-slate-900">{rivalry.sameCaptainWeeks} wks</p>
              <p className="mt-1 text-xs text-slate-500">Identical captain picks</p>
            </Card>
          </div>

          <Card>
            <CardLabel hint={statHints.rankComparison}>Rank comparison · season</CardLabel>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[420px] text-left text-sm">
                <thead className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="py-2 pr-4">GW</th>
                    <th className="py-2 pr-4">{rivalry.managerA.managerName}</th>
                    <th className="py-2">{rivalry.managerB.managerName}</th>
                  </tr>
                </thead>
                <tbody>
                  {rivalry.rankTimeline.map((point) => (
                    <tr key={point.eventNumber} className="border-t border-slate-100">
                      <td className="py-2 pr-4 font-medium tabular-nums">{point.eventNumber}</td>
                      <td className="py-2 pr-4 tabular-nums">{point.rankA}</td>
                      <td className="py-2 tabular-nums">{point.rankB}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      ) : (
        <Card>
          <p className="text-sm text-slate-600">Rivalry data not available yet.</p>
        </Card>
      )}
    </div>
  );
}

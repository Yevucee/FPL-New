import { Card } from "@/components/ui/Card";
import type { PlannerWorkspace } from "@/server/plannerWorkspace";

interface RivalsTabProps {
  workspace: PlannerWorkspace;
}

export function RivalsTab({ workspace }: RivalsTabProps) {
  const { rivals, settings } = workspace;

  return (
    <div className="space-y-6">
      <Card padding="sm" className="bg-slate-50/80">
        <p className="text-sm text-slate-700">
          Strategy indicator: <strong className="capitalize">{settings.riskPosture}</strong> —{" "}
          {settings.riskPosture === "protect"
            ? "Leading — avoid unnecessary EV sacrifice."
            : settings.riskPosture === "chase"
              ? "Behind — differential exposure may help but reduces expected points."
              : "Balanced expected-value approach."}
        </p>
      </Card>

      {rivals.length === 0 ? (
        <Card>
          <p className="text-sm text-slate-600">No rivals selected — add rival entry IDs in settings.</p>
        </Card>
      ) : (
        rivals.map((rival) => (
          <Card key={rival.entryId} padding="md">
            <div className="flex flex-wrap justify-between gap-2">
              <div>
                <h3 className="font-bold text-slate-900">{rival.managerName}</h3>
                <p className="text-sm text-slate-500">{rival.teamName}</p>
              </div>
              {rival.pointsGap != null && (
                <p className="text-sm font-semibold tabular-nums">
                  Gap: {rival.pointsGap > 0 ? "+" : ""}
                  {rival.pointsGap} pts
                </p>
              )}
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-3 text-sm">
              <div>
                <p className="font-semibold text-slate-700">Shared ({rival.sharedPlayers.length})</p>
                <p className="text-slate-600">{rival.sharedPlayers.slice(0, 8).join(", ") || "—"}</p>
              </div>
              <div>
                <p className="font-semibold text-slate-700">Rival only</p>
                <p className="text-slate-600">{rival.rivalOnly.slice(0, 8).join(", ") || "—"}</p>
              </div>
              <div>
                <p className="font-semibold text-slate-700">Your edges</p>
                <p className="text-slate-600">{rival.samuelOnly.slice(0, 8).join(", ") || "—"}</p>
              </div>
            </div>
            <p className="mt-3 text-xs text-slate-500">
              Chips remaining: {rival.chipsRemaining.join(", ") || "Unknown"}
            </p>
          </Card>
        ))
      )}
    </div>
  );
}

import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import type { PlannerWorkspace } from "@/server/plannerWorkspace";

function DataStateBadge({ state }: { state: PlannerWorkspace["header"]["dataState"] }) {
  const variants: Record<string, "default" | "swiss" | "live" | "gold"> = {
    live: "live",
    preview: "swiss",
    final: "gold",
    preseason: "default",
    stale: "default",
    partial: "default",
  };
  const labels: Record<string, string> = {
    live: "Live",
    final: "Final",
    preseason: "Preseason",
    stale: "Stale",
    partial: "Partial",
    preview: "Preview",
  };
  return <Badge variant={variants[state] ?? "default"}>{labels[state] ?? state}</Badge>;
}

interface PlannerHeaderProps {
  workspace: PlannerWorkspace;
  onRefresh?: () => void;
  onEdit?: () => void;
  lockForm?: React.ReactNode;
}

export function PlannerHeader({ workspace, lockForm }: PlannerHeaderProps) {
  const { header } = workspace;
  const syncLabel = header.lastSyncAt
    ? new Date(header.lastSyncAt).toLocaleString("en-GB", {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : "Unknown";

  return (
    <header className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">{header.title}</h1>
            <Badge variant="swiss">Private</Badge>
            <DataStateBadge state={header.dataState} />
          </div>
          <p className="mt-1 text-sm text-slate-600">
            {header.seasonName && <>Season {header.seasonName}</>}
            {header.currentEvent != null && <> · GW{header.currentEvent}</>}
            {header.teamName && <> · {header.teamName}</>}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">{lockForm}</div>
      </div>

      <Card padding="sm" className="bg-gradient-to-br from-swiss-50/40 to-white">
        <div className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Next deadline</p>
            <p className="font-medium text-slate-900">
              {header.nextDeadline
                ? new Date(header.nextDeadline).toLocaleString("en-GB", {
                    weekday: "short",
                    day: "numeric",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : "Unknown"}
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Imported squad</p>
            <p className="font-medium text-slate-900">
              {header.sourceEventNumber != null
                ? `Latest available FPL squad · GW${header.sourceEventNumber}`
                : "Not available"}
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Last sync</p>
            <p className="font-medium text-slate-900">{syncLabel}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Draft status</p>
            <p className="font-medium text-amber-800">
              {header.isDraft ? "Private draft active" : "Showing imported squad"}
            </p>
          </div>
        </div>
        <p className="mt-3 rounded-lg border border-amber-200/80 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-900">
          Private draft — nothing is submitted to FPL. Public picks may not reflect unpublished changes.
        </p>
      </Card>

      {workspace.setupRequired && workspace.setupMessage && (
        <Card className="border-swiss-200 bg-swiss-50/50">
          <p className="text-sm font-medium text-slate-900">Setup required</p>
          <p className="mt-1 text-sm text-slate-600">{workspace.setupMessage}</p>
        </Card>
      )}
    </header>
  );
}

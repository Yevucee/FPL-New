import Link from "next/link";

import { PlannerDashboard } from "@/components/planner/PlannerDashboard";
import { Badge } from "@/components/ui/Badge";
import { previewPlannerOverview } from "@/lib/previewPlannerOverview";

export const dynamic = "force-dynamic";

export default function PlannerPreviewPage() {
  const overview = previewPlannerOverview();

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-swiss-200 bg-gradient-to-r from-swiss-50 to-white px-4 py-3 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="swiss">Planner preview</Badge>
              <span className="text-sm font-medium text-slate-600">Sample data · GW12</span>
            </div>
            <p className="mt-1 text-sm text-slate-600">
              Private planner layout with chips, ownership, and captain intel. Set{" "}
              <code className="rounded bg-white px-1 text-xs">PLANNER_SECRET</code> on Railway
              for the live version at <code className="rounded bg-white px-1 text-xs">/planner</code>.
            </p>
          </div>
          <Link
            href="/league/preview"
            className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-swiss-700 shadow-sm ring-1 ring-swiss-200 hover:bg-swiss-50"
          >
            ← Standings preview
          </Link>
        </div>
      </div>

      <PlannerDashboard overview={overview} />
    </div>
  );
}

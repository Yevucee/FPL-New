import { PlannerDashboard } from "@/components/planner/PlannerDashboard";
import { getPlannerOverview } from "@/server/plannerData";

export const dynamic = "force-dynamic";

export default async function PlannerPage() {
  const overview = await getPlannerOverview();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Team planner</h1>
        <p className="mt-1 text-sm text-slate-600">
          Live chips, transfers, ownership edges, and captain picks for the current gameweek.
        </p>
      </div>

      <PlannerDashboard overview={overview} />
    </div>
  );
}

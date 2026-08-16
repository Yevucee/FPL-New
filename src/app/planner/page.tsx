import { redirect } from "next/navigation";

import { logoutPlannerAction } from "@/app/planner/actions";
import { PlannerDashboard } from "@/components/planner/PlannerDashboard";
import { Badge } from "@/components/ui/Badge";
import { isPlannerAuthenticated, plannerConfigured } from "@/lib/plannerAuth";
import { getPlannerOverview } from "@/server/plannerData";

export const dynamic = "force-dynamic";

export default async function PlannerPage() {
  if (!plannerConfigured()) {
    redirect("/planner/login");
  }

  if (!(await isPlannerAuthenticated())) {
    redirect("/planner/login");
  }

  const overview = await getPlannerOverview();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Team planner</h1>
            <Badge variant="swiss">Private</Badge>
          </div>
          <p className="mt-1 text-sm text-slate-600">
            Chips, ownership edges, and captain picks to help you plan transfers.
          </p>
        </div>
        <form action={logoutPlannerAction}>
          <button
            type="submit"
            className="rounded-full bg-white px-4 py-2 text-sm font-medium text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"
          >
            Lock
          </button>
        </form>
      </div>

      <PlannerDashboard overview={overview} />
    </div>
  );
}

import { Suspense } from "react";
import { redirect } from "next/navigation";

import { logoutPlannerAction } from "@/app/planner/actions";
import { PlannerWorkspaceView } from "@/components/planner/PlannerWorkspaceView";
import { parsePlannerTab } from "@/components/planner/PlannerTabs";
import { isPlannerAuthenticated, plannerConfigured } from "@/lib/plannerAuth";
import { buildPlannerWorkspace } from "@/server/plannerWorkspace";

export const dynamic = "force-dynamic";

interface PlannerPageProps {
  searchParams: Promise<{ tab?: string }>;
}

export default async function PlannerPage({ searchParams }: PlannerPageProps) {
  if (!plannerConfigured()) {
    redirect("/planner/login");
  }

  if (!(await isPlannerAuthenticated())) {
    redirect("/planner/login");
  }

  const params = await searchParams;
  const activeTab = parsePlannerTab(params.tab);
  const workspace = await buildPlannerWorkspace();

  return (
    <Suspense fallback={<div className="p-6 text-slate-600">Loading planner…</div>}>
      <PlannerWorkspaceView
        workspace={workspace}
        activeTab={activeTab}
        lockForm={
          <form action={logoutPlannerAction}>
            <button
              type="submit"
              className="rounded-full bg-white px-4 py-2 text-sm font-medium text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"
            >
              Lock
            </button>
          </form>
        }
      />
    </Suspense>
  );
}

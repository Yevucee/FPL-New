import { Suspense } from "react";
import { redirect } from "next/navigation";
import Link from "next/link";

import { logoutPlannerAction } from "@/app/planner/actions";
import { PlannerWorkspaceView } from "@/components/planner/PlannerWorkspaceView";
import { parsePlannerTab } from "@/components/planner/PlannerTabs";
import { Badge } from "@/components/ui/Badge";
import { buildPreviewPlannerWorkspace } from "@/lib/previewPlannerWorkspace";
import { isPlannerAuthenticated, plannerConfigured } from "@/lib/plannerAuth";

export const dynamic = "force-dynamic";

interface PreviewPageProps {
  searchParams: Promise<{ tab?: string }>;
}

export default async function PlannerPreviewPage({ searchParams }: PreviewPageProps) {
  if (plannerConfigured() && !(await isPlannerAuthenticated())) {
    redirect("/planner/login?next=/planner/preview");
  }

  const params = await searchParams;
  const activeTab = parsePlannerTab(params.tab);
  const workspace = buildPreviewPlannerWorkspace();

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
              Full planner layout with sample squad, transfers, and league intel. All figures are
              labelled preview data.
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

      <Suspense fallback={<div className="text-slate-600">Loading…</div>}>
        <PlannerWorkspaceView
          workspace={workspace}
          activeTab={activeTab}
          lockForm={
            plannerConfigured() ? (
              <form action={logoutPlannerAction}>
                <button
                  type="submit"
                  className="rounded-full bg-white px-4 py-2 text-sm font-medium text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"
                >
                  Lock
                </button>
              </form>
            ) : undefined
          }
        />
      </Suspense>
    </div>
  );
}

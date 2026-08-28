import { PlannerDashboard } from "@/components/planner/PlannerDashboard";
import { MyTeamPlanner } from "@/components/planner/MyTeamPlanner";
import { Card } from "@/components/ui/Card";
import { plannerEntryConfigured } from "@/lib/plannerConfig";
import { getPlannerOverview } from "@/server/plannerData";
import { getPlannerTeamPayload } from "@/server/plannerTeamData";

export const dynamic = "force-dynamic";

interface PlannerPageProps {
  searchParams: Promise<{ gw?: string }>;
}

export default async function PlannerPage({ searchParams }: PlannerPageProps) {
  const { gw } = await searchParams;
  const selectedGw = gw ? Number.parseInt(gw, 10) : undefined;

  const [overview, teamPayload] = await Promise.all([
    getPlannerOverview(),
    plannerEntryConfigured() ? getPlannerTeamPayload(selectedGw) : Promise.resolve(null),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Team planner</h1>
        <p className="mt-1 text-sm text-slate-600">
          Plan your squad, review fixtures, and track league-wide chips and transfers.
        </p>
      </div>

      {!plannerEntryConfigured() ? (
        <Card>
          <p className="text-sm text-slate-600">
            Set <code className="rounded bg-slate-100 px-1">PLANNER_FPL_ENTRY_ID</code> on Railway
            to show your squad here (your FPL entry ID from the site URL).
          </p>
        </Card>
      ) : teamPayload && teamPayload.squad.length > 0 ? (
        <MyTeamPlanner
          payload={teamPayload}
          catalogJson={teamPayload.catalogJson}
          fixturesByTeamJson={teamPayload.fixturesByTeamJson}
        />
      ) : (
        <Card>
          <p className="text-sm text-slate-600">Could not load your FPL squad yet.</p>
        </Card>
      )}

      <PlannerDashboard overview={overview} />
    </div>
  );
}

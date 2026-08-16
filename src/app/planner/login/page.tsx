import Link from "next/link";

import { loginPlannerAction } from "@/app/planner/actions";
import { Card } from "@/components/ui/Card";
import { plannerConfigured } from "@/lib/plannerAuth";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ error?: string }>;
}

export default async function PlannerLoginPage({ searchParams }: PageProps) {
  const { error } = await searchParams;
  const configured = plannerConfigured();

  return (
    <div className="mx-auto max-w-md space-y-6 pt-8">
      <div className="text-center">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Team planner</h1>
        <p className="mt-2 text-sm text-slate-600">Private — chips, ownership, and captain intel.</p>
      </div>

      <Card>
        {!configured ? (
          <p className="text-sm text-slate-600">
            Set <code className="rounded bg-slate-100 px-1">PLANNER_SECRET</code> on Railway to
            enable this page.
          </p>
        ) : (
          <form action={loginPlannerAction} className="space-y-4">
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-700">
                Passcode
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-swiss-400 focus:outline-none focus:ring-2 focus:ring-swiss-100"
              />
            </div>
            {error === "invalid" && (
              <p className="text-sm text-red-600">Incorrect passcode.</p>
            )}
            <button
              type="submit"
              className="w-full rounded-full bg-swiss-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-swiss-700"
            >
              Unlock planner
            </button>
          </form>
        )}
      </Card>

      <p className="text-center text-xs text-slate-400">
        <Link href="/league" className="text-swiss-700 hover:underline">
          ← Back to standings
        </Link>
      </p>
    </div>
  );
}

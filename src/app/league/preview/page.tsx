import Link from "next/link";

import { LeagueDashboard } from "@/components/league/LeagueDashboard";
import { Badge } from "@/components/ui/Badge";
import { previewLeagueOverview } from "@/lib/previewLeagueOverview";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ gw?: string }>;
}

export default async function LeaguePreviewPage({ searchParams }: PageProps) {
  const { gw } = await searchParams;
  const throughEvent = gw ? Number.parseInt(gw, 10) : undefined;
  const selectedGw = Number.isFinite(throughEvent) ? throughEvent! : 12;
  const overview = previewLeagueOverview(selectedGw);

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-swiss-200 bg-gradient-to-r from-swiss-50 to-white px-4 py-3 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="swiss">Season preview</Badge>
              <span className="text-sm font-medium text-slate-600">Sample data · GW{selectedGw} live</span>
            </div>
            <p className="mt-1 text-sm text-slate-600">
              This is how standings, awards, and storylines will look once the season starts.
              Real data replaces this automatically after GW1.
            </p>
          </div>
          <Link
            href="/league"
            className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-swiss-700 shadow-sm ring-1 ring-swiss-200 hover:bg-swiss-50"
          >
            ← Back to live page
          </Link>
        </div>
      </div>

      <LeagueDashboard overview={overview} />
    </div>
  );
}

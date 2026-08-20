import { Card, CardLabel } from "@/components/ui/Card";
import type { LeagueInsights } from "@/metrics/insights";

interface InsightItem {
  label: string;
  value: string;
}

function InsightGroup({
  title,
  items,
}: {
  title: string;
  items: InsightItem[];
}) {
  if (items.length === 0) return null;
  return (
    <Card padding="sm">
      <CardLabel>{title}</CardLabel>
      <ul className="mt-2 space-y-2">
        {items.map((item) => (
          <li key={item.label}>
            <p className="text-xs text-slate-500">{item.label}</p>
            <p className="text-sm font-medium text-slate-800">{item.value}</p>
          </li>
        ))}
      </ul>
    </Card>
  );
}

interface InsightsSectionProps {
  insights: LeagueInsights;
  eventNumber: number;
}

export function InsightsSection({ insights, eventNumber }: InsightsSectionProps) {
  const movement: InsightItem[] = [
    insights.biggestClimber && {
      label: "Biggest climber",
      value: `${insights.biggestClimber.managerName} (+${insights.biggestClimber.movement})`,
    },
    insights.biggestFaller && {
      label: "Biggest faller",
      value: `${insights.biggestFaller.managerName} (${insights.biggestFaller.movement})`,
    },
    insights.woodenSpoon && {
      label: `Wooden spoon · GW${eventNumber}`,
      value: `${insights.woodenSpoon.managerName} (${insights.woodenSpoon.value} pts)`,
    },
  ].filter(Boolean) as InsightItem[];

  const scoring: InsightItem[] = [
    insights.leagueAverageGw !== null && {
      label: `League average · GW${eventNumber}`,
      value: `${insights.leagueAverageGw} pts`,
    },
    insights.seasonBestGw && {
      label: "Best single GW (season)",
      value: `${insights.seasonBestGw.managerName} — ${insights.seasonBestGw.value} pts (GW${insights.seasonBestGw.eventNumber})`,
    },
    insights.seasonWorstGw && {
      label: "Worst single GW (season)",
      value: `${insights.seasonWorstGw.managerName} — ${insights.seasonWorstGw.value} pts (GW${insights.seasonWorstGw.eventNumber})`,
    },
    insights.mostGameweekWins && {
      label: "Most GW wins (season)",
      value: `${insights.mostGameweekWins.managerName} (${insights.mostGameweekWins.value} win${insights.mostGameweekWins.value === 1 ? "" : "s"})`,
    },
    insights.mostMonthlyWins && {
      label: "Most monthly wins (season)",
      value: `${insights.mostMonthlyWins.managerName} (${insights.mostMonthlyWins.value} win${insights.mostMonthlyWins.value === 1 ? "" : "s"})`,
    },
  ].filter(Boolean) as InsightItem[];

  const seasonTotals: InsightItem[] = [
    insights.transferTaxSeason && {
      label: "Transfer tax (season)",
      value: `${insights.transferTaxSeason.managerName} (−${insights.transferTaxSeason.value} pts)`,
    },
    insights.benchRegretSeason && {
      label: "Bench regret (season)",
      value: `${insights.benchRegretSeason.managerName} (${insights.benchRegretSeason.value} pts on bench)`,
    },
    insights.captainPointsLeader && {
      label: "Captain points (season)",
      value: `${insights.captainPointsLeader.managerName} (${insights.captainPointsLeader.value} pts)`,
    },
    insights.bestFplRank && {
      label: "Best global FPL rank",
      value: `${insights.bestFplRank.managerName} (#${insights.bestFplRank.value.toLocaleString()})`,
    },
  ].filter(Boolean) as InsightItem[];

  const chips: InsightItem[] = [
    insights.bestBenchBoost && {
      label: "Best Bench Boost",
      value: `${insights.bestBenchBoost.managerName} — ${insights.bestBenchBoost.value} pts (GW${insights.bestBenchBoost.eventNumber})`,
    },
    insights.bestFreeHit && {
      label: "Best Free Hit",
      value: `${insights.bestFreeHit.managerName} — ${insights.bestFreeHit.value} pts (GW${insights.bestFreeHit.eventNumber})`,
    },
    insights.bestTripleCaptain && {
      label: "Best Triple Captain",
      value: `${insights.bestTripleCaptain.managerName} — ${insights.bestTripleCaptain.value} pts (GW${insights.bestTripleCaptain.eventNumber})`,
    },
  ].filter(Boolean) as InsightItem[];

  const transfers: InsightItem[] = [
    insights.transferHitsLeader && {
      label: "Transfer gambler",
      value: `${insights.transferHitsLeader.managerName} (−${insights.transferHitsLeader.value} hits)`,
    },
    insights.seasonTransferLeader && {
      label: "Transfer addict (season)",
      value: `${insights.seasonTransferLeader.managerName} (${insights.seasonTransferLeader.value} moves)`,
    },
    insights.benchPointsLeader && {
      label: "Bench hoarder",
      value: `${insights.benchPointsLeader.managerName} (${insights.benchPointsLeader.value} on bench)`,
    },
  ].filter(Boolean) as InsightItem[];

  const captaincy: InsightItem[] = [
    insights.captaincyLeader && {
      label: "Captaincy king",
      value: `${insights.captaincyLeader.managerName} — ${insights.captaincyLeader.captainName} (${insights.captaincyLeader.value} pts)`,
    },
    insights.captainCopycat && {
      label: "Captain copycat",
      value: `${insights.captainCopycat.managerName} (${insights.captainCopycat.value} herd pick${insights.captainCopycat.value === 1 ? "" : "s"})`,
    },
    insights.captainDifferential && {
      label: "Captain differential",
      value: `${insights.captainDifferential.managerName} (${insights.captainDifferential.value} herd pick${insights.captainDifferential.value === 1 ? "" : "s"})`,
    },
  ].filter(Boolean) as InsightItem[];

  const consistency: InsightItem[] = [
    insights.mostWeeksAtTop && {
      label: "Most weeks at #1",
      value: `${insights.mostWeeksAtTop.managerName} (${insights.mostWeeksAtTop.value} wk${insights.mostWeeksAtTop.value === 1 ? "" : "s"})`,
    },
    insights.mostWeeksLast && {
      label: "Most weeks in last place",
      value: `${insights.mostWeeksLast.managerName} (${insights.mostWeeksLast.value} wk${insights.mostWeeksLast.value === 1 ? "" : "s"})`,
    },
    insights.seasonWoodenSpoonCount && {
      label: "Most GW wooden spoons (season)",
      value: `${insights.seasonWoodenSpoonCount.managerName} (${insights.seasonWoodenSpoonCount.value} spoon${insights.seasonWoodenSpoonCount.value === 1 ? "" : "s"})`,
    },
  ].filter(Boolean) as InsightItem[];

  const squadStyle: InsightItem[] = [
    insights.mostTemplate && {
      label: "Most template squad",
      value: `${insights.mostTemplate.managerName} (${insights.mostTemplate.value}% overlap)`,
    },
    insights.mostContrarian && {
      label: "Most contrarian squad",
      value: `${insights.mostContrarian.managerName} (${insights.mostContrarian.value}% overlap)`,
    },
  ].filter(Boolean) as InsightItem[];

  const hasGroups =
    movement.length +
      scoring.length +
      seasonTotals.length +
      chips.length +
      transfers.length +
      captaincy.length +
      consistency.length +
      squadStyle.length >
    0;
  const hasForm = insights.formLeaders.length > 0;

  if (!hasGroups && !hasForm) return null;

  return (
    <section>
      <h2 className="mb-3 text-lg font-bold tracking-tight text-slate-900">
        League storylines
      </h2>
      {hasGroups && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {movement.length > 0 && <InsightGroup title="Movement" items={movement} />}
          {scoring.length > 0 && <InsightGroup title="Scoring" items={scoring} />}
          {seasonTotals.length > 0 && <InsightGroup title="Season totals" items={seasonTotals} />}
          {chips.length > 0 && <InsightGroup title="Chips" items={chips} />}
          {consistency.length > 0 && <InsightGroup title="Consistency" items={consistency} />}
          {squadStyle.length > 0 && <InsightGroup title="Squad style" items={squadStyle} />}
          {transfers.length > 0 && <InsightGroup title="Transfers" items={transfers} />}
          {captaincy.length > 0 && <InsightGroup title="Captaincy" items={captaincy} />}
        </div>
      )}
      {hasForm && (
        <Card className="mt-3">
          <CardLabel>Form · last 3 gameweeks</CardLabel>
          <ol className="mt-2 space-y-1.5 text-sm">
            {insights.formLeaders.map((leader, index) => (
              <li key={leader.entryId} className="flex justify-between gap-4">
                <span>
                  <span className="font-bold text-swiss-700">{index + 1}.</span>{" "}
                  {leader.managerName}
                </span>
                <span className="font-semibold tabular-nums text-slate-700">
                  {leader.points} pts
                </span>
              </li>
            ))}
          </ol>
        </Card>
      )}
    </section>
  );
}

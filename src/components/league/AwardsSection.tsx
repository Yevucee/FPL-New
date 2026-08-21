import { Card, CardLabel } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { statHints } from "@/lib/statHints";

interface AwardCardProps {
  title: string;
  hint: string;
  card: {
    value: number;
    joint: boolean;
    winners: { managerName: string; teamName: string }[];
  } | null;
  suffix: string;
  emoji: string;
}

function AwardCard({ title, hint, card, suffix, emoji }: AwardCardProps) {
  return (
    <Card className="relative overflow-hidden">
      <div className="absolute right-3 top-3 text-2xl opacity-20">{emoji}</div>
      <CardLabel hint={hint}>{title}</CardLabel>
      {card ? (
        <div className="mt-2">
          <p className="text-xl font-bold tracking-tight text-slate-900">
            {card.winners.map((w) => w.managerName).join(" & ")}
            {card.joint && (
              <Badge variant="swiss" className="ml-2 align-middle">
                joint
              </Badge>
            )}
          </p>
          <p className="mt-1 text-sm text-slate-600">
            {card.winners.map((w) => w.teamName).join(", ")}
          </p>
          <p className="mt-2 text-2xl font-bold tabular-nums text-swiss-700">
            {card.value}
            <span className="ml-1 text-sm font-medium text-slate-500">{suffix}</span>
          </p>
        </div>
      ) : (
        <p className="mt-2 text-sm text-slate-400">Not available yet</p>
      )}
    </Card>
  );
}

interface AwardsSectionProps {
  gameweekTitle: string;
  monthlyTitle: string;
  gameweekWinner: AwardCardProps["card"];
  monthlyLeader: AwardCardProps["card"];
}

export function AwardsSection({
  gameweekTitle,
  monthlyTitle,
  gameweekWinner,
  monthlyLeader,
}: AwardsSectionProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <AwardCard
        title={gameweekTitle}
        hint={statHints.gameweekLeader}
        card={gameweekWinner}
        suffix="pts"
        emoji="⚽"
      />
      <AwardCard
        title={monthlyTitle}
        hint={statHints.monthlyLeader}
        card={monthlyLeader}
        suffix="pts"
        emoji="📅"
      />
    </div>
  );
}

import type { GameweekFixtureRow } from "@/planner/types";

function formatKickoff(iso: string | null): string {
  if (!iso) return "TBC";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "TBC";
  return date.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Europe/London",
  });
}

function formatDayHeading(iso: string | null): string {
  if (!iso) return "Date TBC";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "Date TBC";
  return date.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "Europe/London",
  });
}

interface GameweekFixturesPanelProps {
  eventNumber: number;
  deadlineLabel: string | null;
  fixtures: GameweekFixtureRow[];
}

export function GameweekFixturesPanel({
  eventNumber,
  deadlineLabel,
  fixtures,
}: GameweekFixturesPanelProps) {
  const byDay = new Map<string, GameweekFixtureRow[]>();
  for (const fixture of fixtures) {
    const key = fixture.kickoffTime?.slice(0, 10) ?? "tbc";
    const list = byDay.get(key) ?? [];
    list.push(fixture);
    byDay.set(key, list);
  }

  const dayGroups = [...byDay.entries()].sort(([a], [b]) => a.localeCompare(b));

  return (
    <section className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-card">
      <div className="border-b border-slate-100 bg-slate-50/90 px-4 py-3 text-center">
        <h3 className="text-base font-bold text-slate-900">Gameweek {eventNumber}</h3>
        {deadlineLabel && (
          <p className="mt-0.5 text-xs text-slate-500">Deadline {deadlineLabel}</p>
        )}
      </div>

      {fixtures.length === 0 ? (
        <p className="px-4 py-6 text-center text-sm text-slate-500">Fixtures not published yet.</p>
      ) : (
        <div className="divide-y divide-slate-100">
          {dayGroups.map(([dayKey, dayFixtures]) => (
            <div key={dayKey}>
              <p className="bg-slate-50/60 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                {formatDayHeading(dayFixtures[0]?.kickoffTime ?? null)}
              </p>
              <ul>
                {dayFixtures.map((fixture) => (
                  <li
                    key={fixture.id}
                    className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 border-t border-slate-100 px-4 py-2.5 text-sm first:border-t-0"
                  >
                    <span className="truncate text-right font-medium text-slate-900">
                      {fixture.homeShortName}
                    </span>
                    <span className="min-w-[3rem] text-center text-xs font-semibold tabular-nums text-slate-500">
                      {formatKickoff(fixture.kickoffTime)}
                    </span>
                    <span className="truncate font-medium text-slate-900">
                      {fixture.awayShortName}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

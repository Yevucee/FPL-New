import { leagueConfig } from "@/lib/leagueConfig";

const TIMEZONE = leagueConfig.scoringTimezone;

/** Format an instant in the league timezone (e.g. Europe/Zurich). */
export function formatLeagueDateTime(
  date: Date,
  options: Intl.DateTimeFormatOptions = {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: TIMEZONE,
  },
): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: TIMEZONE,
    ...options,
  }).format(date);
}

/** Human-readable relative time for sync stamps ("12 min ago"). */
export function formatRelativeTime(date: Date, now = new Date()): string {
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.round(diffMs / 1000);

  if (diffSec < 45) return "just now";
  if (diffSec < 90) return "1 min ago";

  const diffMin = Math.round(diffSec / 60);
  if (diffMin < 60) return `${diffMin} min ago`;

  const diffHours = Math.round(diffMin / 60);
  if (diffHours < 24) return `${diffHours} hr ago`;

  const diffDays = Math.round(diffHours / 24);
  if (diffDays < 7) return `${diffDays} day${diffDays === 1 ? "" : "s"} ago`;

  return formatLeagueDateTime(date, {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatSyncLabel(finishedAt: Date): string {
  return `${formatLeagueDateTime(finishedAt)} · ${formatRelativeTime(finishedAt)}`;
}

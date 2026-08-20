"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

interface GameweekPickerProps {
  events: number[];
  selected: number;
  liveEvent: number | null;
  basePath: string;
}

export function GameweekPicker({
  events,
  selected,
  liveEvent,
  basePath,
}: GameweekPickerProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const latest = events[events.length - 1]!;
  const index = events.indexOf(selected);
  const prev = index > 0 ? events[index - 1]! : null;
  const next = index >= 0 && index < events.length - 1 ? events[index + 1]! : null;

  const hrefFor = (gw: number) => {
    const params = new URLSearchParams(searchParams.toString());
    if (gw === latest && liveEvent === null) params.delete("gw");
    else params.set("gw", String(gw));
    const query = params.toString();
    if (gw === latest && liveEvent === null && !query.includes("window=")) {
      return basePath;
    }
    return query ? `${basePath}?${query}` : basePath;
  };

  return (
    <div className="flex flex-wrap items-center gap-3">
      <span className="text-sm font-semibold text-slate-500">Gameweek</span>
      <div className="inline-flex items-center rounded-xl border border-slate-200 bg-white shadow-sm">
        {prev !== null ? (
          <Link
            href={hrefFor(prev)}
            className="rounded-l-xl px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
            aria-label={`Previous gameweek, GW${prev}`}
          >
            ◀
          </Link>
        ) : (
          <span className="rounded-l-xl px-3 py-2 text-sm text-slate-300">◀</span>
        )}
        <div className="border-x border-slate-200 px-4 py-2 text-center">
          <span className="text-lg font-bold tabular-nums text-slate-900">
            GW{selected}
          </span>
          {selected === liveEvent && (
            <span className="ml-2 inline-flex items-center gap-1 text-xs font-semibold text-red-600">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-500" />
              live
            </span>
          )}
        </div>
        {next !== null ? (
          <Link
            href={hrefFor(next)}
            className="rounded-r-xl px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
            aria-label={`Next gameweek, GW${next}`}
          >
            ▶
          </Link>
        ) : (
          <span className="rounded-r-xl px-3 py-2 text-sm text-slate-300">▶</span>
        )}
      </div>
      <label className="flex items-center gap-2 text-sm text-slate-600">
        <span className="sr-only">Jump to gameweek</span>
        <select
          value={selected}
          onChange={(event) => {
            const gw = Number(event.target.value);
            router.push(hrefFor(gw));
          }}
          className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm font-medium text-slate-800 shadow-sm"
        >
          {events.map((ev) => (
            <option key={ev} value={ev}>
              GW{ev}
              {ev === liveEvent ? " (live)" : ""}
            </option>
          ))}
        </select>
      </label>
      {selected !== latest && (
        <Link
          href={hrefFor(latest)}
          className="text-sm font-semibold text-swiss-700 hover:underline"
        >
          Latest (GW{latest})
        </Link>
      )}
    </div>
  );
}

"use client";

import { useRouter, useSearchParams } from "next/navigation";

import type { SeasonWindowOption } from "@/lib/seasonWindow";

interface SeasonWindowPickerProps {
  options: SeasonWindowOption[];
  selectedId: string;
  selectedGw: number;
  liveEvent: number | null;
  latestGw: number;
  basePath?: string;
}

export function SeasonWindowPicker({
  options,
  selectedId,
  selectedGw,
  liveEvent,
  latestGw,
  basePath = "/league",
}: SeasonWindowPickerProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const hrefFor = (windowId: string, gw = selectedGw) => {
    const params = new URLSearchParams(searchParams.toString());
    if (windowId === "full") params.delete("window");
    else params.set("window", windowId);
    if (gw === latestGw && liveEvent === null) params.delete("gw");
    else params.set("gw", String(gw));
    const query = params.toString();
    return query ? `${basePath}?${query}` : basePath;
  };

  return (
    <label className="flex items-center gap-2 text-sm text-slate-600">
      <span className="font-semibold text-slate-500">Period</span>
      <select
        value={selectedId}
        onChange={(event) => router.push(hrefFor(event.target.value))}
        className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm font-medium text-slate-800 shadow-sm"
      >
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

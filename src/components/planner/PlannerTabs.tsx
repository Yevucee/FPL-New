"use client";

import { useRouter, useSearchParams } from "next/navigation";

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "transfers", label: "Transfers" },
  { id: "selection", label: "Selection" },
  { id: "rivals", label: "Rivals" },
  { id: "chips", label: "Chips" },
  { id: "players", label: "Players" },
] as const;

export type PlannerTabId = (typeof TABS)[number]["id"];

interface PlannerTabsProps {
  active: PlannerTabId;
}

export function PlannerTabs({ active }: PlannerTabsProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function selectTab(id: PlannerTabId) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", id);
    router.push(`?${params.toString()}`, { scroll: false });
  }

  return (
    <nav
      className="flex gap-1 overflow-x-auto rounded-xl border border-slate-200/80 bg-white p-1 shadow-sm"
      aria-label="Planner sections"
    >
      {TABS.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => selectTab(tab.id)}
          className={`whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
            active === tab.id
              ? "bg-swiss-700 text-white shadow-sm"
              : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
          }`}
          aria-current={active === tab.id ? "page" : undefined}
        >
          {tab.label}
        </button>
      ))}
    </nav>
  );
}

export function parsePlannerTab(value: string | null | undefined): PlannerTabId {
  if (value && TABS.some((t) => t.id === value)) return value as PlannerTabId;
  return "overview";
}

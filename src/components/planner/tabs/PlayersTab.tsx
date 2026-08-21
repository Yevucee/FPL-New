"use client";

import { useMemo, useState } from "react";

import { Card } from "@/components/ui/Card";
import type { PlannerWorkspace } from "@/server/plannerWorkspace";

interface PlayersTabProps {
  workspace: PlannerWorkspace;
}

export function PlayersTab({ workspace }: PlayersTabProps) {
  const [search, setSearch] = useState("");
  const [position, setPosition] = useState<string>("all");
  const [compare, setCompare] = useState<number[]>([]);

  const filtered = useMemo(() => {
    return workspace.players.catalog.filter((p) => {
      if (position !== "all" && p.position !== position) return false;
      if (search && !p.webName.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [workspace.players.catalog, search, position]);

  const owned = new Set(workspace.squad.map((p) => p.elementId));

  function toggleCompare(id: number) {
    setCompare((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 3) return prev;
      return [...prev, id];
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-3">
        <input
          type="search"
          placeholder="Search players…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
        />
        <select
          value={position}
          onChange={(e) => setPosition(e.target.value)}
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
        >
          <option value="all">All positions</option>
          <option value="GK">GK</option>
          <option value="DEF">DEF</option>
          <option value="MID">MID</option>
          <option value="FWD">FWD</option>
        </select>
      </div>

      {compare.length > 0 && (
        <Card padding="sm">
          <p className="mb-2 text-sm font-semibold">Compare ({compare.length}/3)</p>
          <div className="grid gap-2 sm:grid-cols-3">
            {compare.map((id) => {
              const p = workspace.players.catalog.find((x) => x.id === id);
              if (!p) return null;
              return (
                <div key={id} className="rounded-lg bg-slate-50 p-2 text-sm">
                  <p className="font-bold">{p.webName}</p>
                  <p>£{(p.priceTenths / 10).toFixed(1)}m · Form {p.form ?? "—"}</p>
                  <p>Own {owned.has(id) ? "Yes" : "No"}</p>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      <div className="overflow-x-auto rounded-xl border border-slate-200/80 bg-white shadow-card">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50/90 text-xs font-semibold uppercase text-slate-500">
            <tr>
              <th className="px-3 py-2">Player</th>
              <th className="px-3 py-2">Pos</th>
              <th className="px-3 py-2 text-right">Price</th>
              <th className="px-3 py-2 text-right">Form</th>
              <th className="px-3 py-2">Owned</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.slice(0, 50).map((p) => (
              <tr key={p.id} className="border-t border-slate-100">
                <td className="px-3 py-2 font-medium">
                  {p.webName}
                  {workspace.players.watchlist.includes(p.id) && (
                    <span className="ml-1 text-xs text-swiss-700">★</span>
                  )}
                </td>
                <td className="px-3 py-2">{p.position}</td>
                <td className="px-3 py-2 text-right tabular-nums">£{(p.priceTenths / 10).toFixed(1)}m</td>
                <td className="px-3 py-2 text-right tabular-nums">{p.form ?? "—"}</td>
                <td className="px-3 py-2">{owned.has(p.id) ? "Yes" : "No"}</td>
                <td className="px-3 py-2">
                  <button
                    type="button"
                    onClick={() => toggleCompare(p.id)}
                    className="text-xs font-medium text-swiss-700 hover:underline"
                  >
                    Compare
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

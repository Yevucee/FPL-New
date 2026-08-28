"use client";

import { useDroppable } from "@dnd-kit/core";

import { PlayerCard } from "@/components/planner/PlayerCard";
import type { EnrichedSquadPlayer, PlannerPosition } from "@/planner/types";
import { formationLabel } from "@/planner/squadValidation";

interface PlannerPitchDnDProps {
  squad: EnrichedSquadPlayer[];
  highlightEvent?: number;
  formationError?: string | null;
}

const ROWS: PlannerPosition[] = ["GK", "DEF", "MID", "FWD"];

function PitchSlot({
  slot,
  player,
  highlightEvent,
  compact,
}: {
  slot: number;
  player: EnrichedSquadPlayer | null;
  highlightEvent?: number;
  compact?: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `slot-${slot}` });

  return (
    <div
      ref={setNodeRef}
      className={`${compact ? "w-[4.5rem]" : "w-24"} min-h-[5.5rem] rounded-lg border border-dashed transition-colors ${
        isOver ? "border-swiss-500 bg-swiss-50/80" : "border-transparent"
      }`}
    >
      {player ? <PlayerCard player={player} highlightEvent={highlightEvent} compact={compact} /> : null}
    </div>
  );
}

function startersByPosition(starters: EnrichedSquadPlayer[], position: PlannerPosition) {
  return starters
    .filter((player) => player.element.position === position)
    .sort((a, b) => a.slot - b.slot);
}

export function PlannerPitchDnD({ squad, highlightEvent, formationError }: PlannerPitchDnDProps) {
  const starters = squad.filter((player) => player.isStarter);
  const bench = squad.filter((player) => !player.isStarter).sort((a, b) => a.slot - b.slot);
  const starterBySlot = new Map(starters.map((player) => [player.slot, player]));
  const benchBySlot = new Map(bench.map((player) => [player.slot, player]));

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2 text-xs text-slate-600">
        <span>
          Formation: <strong className="text-slate-900">{formationLabel(starters)}</strong>
        </span>
        <span className="text-slate-400">Drag players to swap positions or move to bench</span>
      </div>

      {formationError && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {formationError}
        </p>
      )}

      <div className="rounded-xl border border-pitch-300/60 bg-gradient-to-b from-pitch-100/80 to-pitch-200/40 p-4">
        <div className="mx-auto max-w-2xl space-y-3">
          {ROWS.map((position) => {
            const rowPlayers = startersByPosition(starters, position);
            if (rowPlayers.length === 0) return null;
            return (
              <div key={position} className="flex flex-wrap justify-center gap-2">
                {rowPlayers.map((player) => (
                  <PitchSlot
                    key={player.elementId}
                    slot={player.slot}
                    player={starterBySlot.get(player.slot) ?? player}
                    highlightEvent={highlightEvent}
                  />
                ))}
              </div>
            );
          })}
        </div>

        <div className="mt-4 border-t border-pitch-300/40 pt-3">
          <p className="mb-2 text-center text-xs font-semibold uppercase tracking-wide text-pitch-800">
            Bench
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            {[12, 13, 14, 15].map((slot) => (
              <PitchSlot
                key={slot}
                slot={slot}
                player={benchBySlot.get(slot) ?? null}
                highlightEvent={highlightEvent}
                compact
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

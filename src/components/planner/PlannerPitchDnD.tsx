"use client";

import { useDroppable } from "@dnd-kit/core";

import { PlayerCard } from "@/components/planner/PlayerCard";
import type { EnrichedSquadPlayer, PlannerPosition } from "@/planner/types";
import { formationLabel } from "@/planner/squadValidation";

interface PlannerPitchDnDProps {
  squad: EnrichedSquadPlayer[];
  focusEvent: number;
  formationError?: string | null;
}

const ROWS: PlannerPosition[] = ["GK", "DEF", "MID", "FWD"];

function PitchSlot({
  slot,
  player,
  focusEvent,
  compact,
}: {
  slot: number;
  player: EnrichedSquadPlayer | null;
  focusEvent: number;
  compact?: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `slot-${slot}` });

  return (
    <div
      ref={setNodeRef}
      className={`${compact ? "w-[4.75rem]" : "w-[5.5rem]"} min-h-[7rem] rounded-lg transition-colors ${
        isOver ? "bg-white/20 ring-2 ring-white/80" : ""
      }`}
    >
      {player ? <PlayerCard player={player} focusEvent={focusEvent} compact={compact} /> : null}
    </div>
  );
}

function startersByPosition(starters: EnrichedSquadPlayer[], position: PlannerPosition) {
  return starters
    .filter((player) => player.element.position === position)
    .sort((a, b) => a.slot - b.slot);
}

export function PlannerPitchDnD({ squad, focusEvent, formationError }: PlannerPitchDnDProps) {
  const starters = squad.filter((player) => player.isStarter);
  const bench = squad.filter((player) => !player.isStarter).sort((a, b) => a.slot - b.slot);
  const starterBySlot = new Map(starters.map((player) => [player.slot, player]));
  const benchBySlot = new Map(bench.map((player) => [player.slot, player]));

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
        <span>
          Formation <strong className="text-slate-900">{formationLabel(starters)}</strong>
        </span>
        <span className="text-slate-400">Drag to swap or bench</span>
      </div>

      {formationError && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {formationError}
        </p>
      )}

      <div className="overflow-hidden rounded-xl border border-pitch-400/40 bg-gradient-to-b from-pitch-500 to-pitch-600 p-4 shadow-inner">
        <div className="mx-auto max-w-3xl space-y-4">
          {ROWS.map((position) => {
            const rowPlayers = startersByPosition(starters, position);
            if (rowPlayers.length === 0) return null;
            return (
              <div key={position} className="flex flex-wrap justify-center gap-2.5">
                {rowPlayers.map((player) => (
                  <PitchSlot
                    key={player.elementId}
                    slot={player.slot}
                    player={starterBySlot.get(player.slot) ?? player}
                    focusEvent={focusEvent}
                  />
                ))}
              </div>
            );
          })}
        </div>

        <div className="mt-5 border-t border-white/20 pt-4">
          <p className="mb-2 text-center text-[10px] font-bold uppercase tracking-widest text-white/80">
            Substitutes
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            {[12, 13, 14, 15].map((slot) => (
              <PitchSlot
                key={slot}
                slot={slot}
                player={benchBySlot.get(slot) ?? null}
                focusEvent={focusEvent}
                compact
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

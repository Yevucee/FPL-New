"use client";

import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";

import { FixtureStrip } from "@/components/planner/FixtureStrip";
import type { EnrichedSquadPlayer } from "@/planner/types";

interface PlayerCardProps {
  player: EnrichedSquadPlayer;
  highlightEvent?: number;
  compact?: boolean;
}

export function PlayerCard({ player, highlightEvent, compact = false }: PlayerCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `player-${player.elementId}`,
    data: { elementId: player.elementId, slot: player.slot },
  });

  const style = transform
    ? { transform: CSS.Translate.toString(transform), zIndex: isDragging ? 50 : undefined }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`cursor-grab touch-none rounded-lg border text-center shadow-sm active:cursor-grabbing ${
        compact ? "px-1.5 py-1.5 text-[10px]" : "px-2 py-2 text-xs"
      } ${
        isDragging
          ? "opacity-60 ring-2 ring-swiss-400"
          : player.isCaptain
            ? "border-amber-400 bg-amber-50"
            : player.isViceCaptain
              ? "border-slate-300 bg-white"
              : player.isStarter
                ? "border-pitch-200/80 bg-white"
                : "border-slate-200 bg-slate-50"
      }`}
    >
      <p className={`font-bold text-slate-900 ${compact ? "truncate" : ""}`}>
        {player.element.webName}
      </p>
      <p className="text-slate-500">{player.element.teamShortName}</p>
      {!compact && (
        <p className="tabular-nums text-slate-600">
          £{(player.element.priceTenths / 10).toFixed(1)}m
          {player.latestPoints != null && ` · ${player.latestPoints}pts`}
        </p>
      )}
      <div className="mt-1">
        <FixtureStrip fixtures={player.nextFixtures} highlightEvent={highlightEvent} />
      </div>
      <div className="mt-0.5 flex justify-center gap-1">
        {player.isCaptain && <span className="text-[10px] font-bold text-amber-700">C</span>}
        {player.isViceCaptain && <span className="text-[10px] font-bold text-slate-500">V</span>}
      </div>
    </div>
  );
}

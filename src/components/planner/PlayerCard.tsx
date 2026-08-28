"use client";

import Image from "next/image";
import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";

import { PlayerFixtureStack } from "@/components/planner/PlayerFixtureStack";
import { playerPhotoUrl } from "@/planner/playerAssets";
import type { EnrichedSquadPlayer } from "@/planner/types";

interface PlayerCardProps {
  player: EnrichedSquadPlayer;
  focusEvent: number;
  compact?: boolean;
}

export function PlayerCard({ player, focusEvent, compact = false }: PlayerCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `player-${player.elementId}`,
    data: { elementId: player.elementId, slot: player.slot },
  });

  const style = transform
    ? { transform: CSS.Translate.toString(transform), zIndex: isDragging ? 50 : undefined }
    : undefined;

  const widthClass = compact ? "w-[4.75rem]" : "w-[5.5rem]";

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`${widthClass} cursor-grab touch-none active:cursor-grabbing`}
    >
      <div
        className={`relative overflow-hidden rounded-md shadow-md ring-1 ring-black/10 ${
          isDragging ? "opacity-70 ring-2 ring-swiss-400" : ""
        } ${player.isCaptain ? "ring-2 ring-amber-400" : ""}`}
      >
        <div className="absolute right-1 top-1 z-10 rounded bg-black/55 px-1 py-0.5 text-[9px] font-semibold tabular-nums text-white">
          £{(player.element.priceTenths / 10).toFixed(1)}m
        </div>

        <div
          className={`relative flex items-end justify-center bg-gradient-to-b from-pitch-200/70 to-pitch-300/90 ${
            compact ? "h-16" : "h-[4.5rem]"
          }`}
        >
          {player.element.photoCode ? (
            <Image
              src={playerPhotoUrl(player.element.photoCode)}
              alt=""
              width={compact ? 48 : 56}
              height={compact ? 60 : 70}
              className="object-contain object-bottom"
              unoptimized
            />
          ) : (
            <span className="pb-2 text-lg font-bold text-pitch-900/40">
              {player.element.teamShortName}
            </span>
          )}
          {(player.isCaptain || player.isViceCaptain) && (
            <span className="absolute bottom-1 left-1 rounded bg-black/60 px-1 text-[9px] font-bold text-white">
              {player.isCaptain ? "C" : "V"}
            </span>
          )}
        </div>

        <div className="bg-white px-1 py-1 text-center">
          <p className={`truncate font-bold text-slate-900 ${compact ? "text-[10px]" : "text-[11px]"}`}>
            {player.element.webName}
          </p>
          <PlayerFixtureStack fixtures={player.nextFixtures} focusEvent={focusEvent} />
        </div>
      </div>
    </div>
  );
}

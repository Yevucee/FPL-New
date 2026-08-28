"use client";

import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import { GameweekFixturesPanel } from "@/components/planner/GameweekFixturesPanel";
import { PlannerPitchDnD } from "@/components/planner/PlannerPitchDnD";
import { PlayerCard } from "@/components/planner/PlayerCard";
import { draftStorageKey, enrichSquadPlayers, swapSquadSlots } from "@/planner/enrichSquad";
import { isValidStartingFormation } from "@/planner/squadValidation";
import type { EnrichedSquadPlayer, PlannerElement, PlannerFixture, SquadPlayer } from "@/planner/types";
import type { PlannerTeamPayload } from "@/server/plannerTeamData";

interface MyTeamPlannerProps {
  payload: PlannerTeamPayload;
  catalogJson: Record<number, PlannerElement>;
  fixturesByTeamJson: Record<number, PlannerFixture[]>;
}

function toBasePlayers(squad: EnrichedSquadPlayer[]): SquadPlayer[] {
  return squad.map(({ elementId, slot, isStarter, isCaptain, isViceCaptain }) => ({
    elementId,
    slot,
    isStarter,
    isCaptain,
    isViceCaptain,
  }));
}

function loadDraft(eventNumber: number): SquadPlayer[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(draftStorageKey(eventNumber));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SquadPlayer[];
    return Array.isArray(parsed) && parsed.length === 15 ? parsed : null;
  } catch {
    return null;
  }
}

function saveDraft(eventNumber: number, players: SquadPlayer[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(draftStorageKey(eventNumber), JSON.stringify(players));
}

export function MyTeamPlanner({ payload, catalogJson, fixturesByTeamJson }: MyTeamPlannerProps) {
  const router = useRouter();
  const catalog = useMemo(
    () => new Map(Object.entries(catalogJson).map(([id, element]) => [Number(id), element])),
    [catalogJson],
  );
  const fixturesByTeam = useMemo(
    () => new Map(Object.entries(fixturesByTeamJson).map(([id, fixtures]) => [Number(id), fixtures])),
    [fixturesByTeamJson],
  );

  const [squad, setSquad] = useState<EnrichedSquadPlayer[]>(payload.squad);
  const [activePlayer, setActivePlayer] = useState<EnrichedSquadPlayer | null>(null);
  const [formationError, setFormationError] = useState<string | null>(null);

  const isFutureGameweek =
    payload.lockedEvent !== null && payload.selectedEvent > payload.lockedEvent;

  useEffect(() => {
    let basePlayers = toBasePlayers(payload.squad);

    if (isFutureGameweek) {
      const draft = loadDraft(payload.selectedEvent);
      if (draft) basePlayers = draft;
    }

    setSquad(
      enrichSquadPlayers({
        players: basePlayers,
        catalog,
        fixturesByTeam,
        fromEvent: payload.selectedEvent,
        fixtureCount: 5,
      }),
    );
    setFormationError(null);
  }, [payload.squad, payload.selectedEvent, isFutureGameweek, catalog, fixturesByTeam]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const applySwap = useCallback(
    (draggedElementId: number, targetSlot: number) => {
      const basePlayers = toBasePlayers(squad);
      const swapped = swapSquadSlots(basePlayers, draggedElementId, targetSlot);
      if (!swapped) return;

      const starters = swapped
        .filter((player) => player.isStarter)
        .map((player) => {
          const element = catalog.get(player.elementId);
          return element ? { element, ...player } : null;
        })
        .filter((player): player is NonNullable<typeof player> => player !== null);

      if (!isValidStartingFormation(starters)) {
        setFormationError("Invalid formation — need 1 GK, at least 3 DEF, 2 MID, and 1 FWD in the XI.");
        return;
      }

      setFormationError(null);
      const enriched = enrichSquadPlayers({
        players: swapped,
        catalog,
        fixturesByTeam,
        fromEvent: payload.selectedEvent,
        fixtureCount: 5,
      });
      setSquad(enriched);

      if (isFutureGameweek) {
        saveDraft(payload.selectedEvent, swapped);
      }
    },
    [squad, catalog, fixturesByTeam, payload.selectedEvent, isFutureGameweek],
  );

  function handleDragStart(event: DragStartEvent) {
    const elementId = Number(String(event.active.id).replace("player-", ""));
    setActivePlayer(squad.find((player) => player.elementId === elementId) ?? null);
  }

  function handleDragEnd(event: DragEndEvent) {
    setActivePlayer(null);
    const { active, over } = event;
    if (!over) return;

    const draggedElementId = Number(String(active.id).replace("player-", ""));
    const targetSlot = Number(String(over.id).replace("slot-", ""));
    if (!Number.isFinite(draggedElementId) || !Number.isFinite(targetSlot)) return;

    const dragged = squad.find((player) => player.elementId === draggedElementId);
    if (!dragged || dragged.slot === targetSlot) return;

    applySwap(draggedElementId, targetSlot);
  }

  const prevGw =
    payload.availableEvents[
      payload.availableEvents.indexOf(payload.selectedEvent) - 1
    ] ?? null;
  const nextGw =
    payload.availableEvents[
      payload.availableEvents.indexOf(payload.selectedEvent) + 1
    ] ?? null;

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold tracking-tight text-slate-900">My team</h2>
          <p className="text-sm text-slate-600">
            {payload.managerName} · {payload.teamName}
            {isFutureGameweek && (
              <span className="ml-2 rounded-full bg-swiss-100 px-2 py-0.5 text-xs font-medium text-swiss-800">
                Planning ahead
              </span>
            )}
          </p>
        </div>

        <div className="flex items-center gap-1 rounded-full bg-slate-100 p-1">
          {prevGw ? (
            <Link
              href={`/planner?gw=${prevGw}`}
              className="rounded-full px-3 py-1.5 text-sm font-semibold text-slate-600 hover:bg-white hover:text-slate-900"
              aria-label={`Previous gameweek GW${prevGw}`}
            >
              ←
            </Link>
          ) : (
            <span className="px-3 py-1.5 text-sm text-slate-300">←</span>
          )}
          <span className="min-w-[5rem] px-2 text-center text-sm font-bold text-slate-900">
            GW{payload.selectedEvent}
          </span>
          {nextGw ? (
            <Link
              href={`/planner?gw=${nextGw}`}
              className="rounded-full px-3 py-1.5 text-sm font-semibold text-slate-600 hover:bg-white hover:text-slate-900"
              aria-label={`Next gameweek GW${nextGw}`}
            >
              →
            </Link>
          ) : (
            <span className="px-3 py-1.5 text-sm text-slate-300">→</span>
          )}
        </div>
      </div>

      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <PlannerPitchDnD
          squad={squad}
          focusEvent={payload.selectedEvent}
          formationError={formationError}
        />
        <DragOverlay>
          {activePlayer ? (
            <div className="w-[5.5rem] opacity-95">
              <PlayerCard player={activePlayer} focusEvent={payload.selectedEvent} />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      <GameweekFixturesPanel
        eventNumber={payload.selectedEvent}
        deadlineLabel={payload.deadlineLabel}
        fixtures={payload.gameweekFixtures}
      />

      {isFutureGameweek && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => {
              window.localStorage.removeItem(draftStorageKey(payload.selectedEvent));
              router.refresh();
            }}
            className="text-sm font-medium text-slate-500 hover:text-slate-800"
          >
            Reset GW{payload.selectedEvent} plan
          </button>
        </div>
      )}
    </section>
  );
}

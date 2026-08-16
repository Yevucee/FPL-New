"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { db } from "@/db/client";
import { isPlannerAuthenticated } from "@/lib/plannerAuth";
import { plannerEntryId } from "@/lib/plannerConfig";
import { buildElementCatalog } from "@/planner/elementCatalog";
import type { PlannerSettings, SquadPlayer } from "@/planner/types";
import { validateSquad } from "@/planner/squadValidation";
import { fetchBootstrap } from "@/providers/fpl/client";
import {
  getOrCreateProfile,
  saveSquad,
  createScenario,
  deleteScenario,
  saveProfileSettings,
  activeSeasonId,
} from "@/server/plannerRepository";

async function requirePlannerAuth() {
  if (!(await isPlannerAuthenticated())) {
    throw new Error("Unauthorized");
  }
}

export async function saveDraftSquadAction(args: {
  players: SquadPlayer[];
  bankOverrideTenths?: number | null;
  freeTransfersOverride?: number | null;
}): Promise<{ ok: boolean; error?: string; errors?: Array<{ code: string; message: string }> }> {
  try {
    await requirePlannerAuth();
  } catch {
    return { ok: false, error: "Unauthorized" };
  }

  const seasonId = await activeSeasonId();
  if (!seasonId) return { ok: false, error: "No active season" };

  let elements = new Map<number, import("@/planner/types").PlannerElement>();
  try {
    const bootstrap = await fetchBootstrap();
    elements = buildElementCatalog(bootstrap.elements, bootstrap.teams);
  } catch {
    return { ok: false, error: "Element catalog unavailable" };
  }

  const validation = validateSquad({
    players: args.players,
    elements,
    bankTenths: args.bankOverrideTenths ?? null,
  });
  if (!validation.valid) {
    return { ok: false, errors: validation.errors };
  }

  const profile = await getOrCreateProfile(seasonId, plannerEntryId());
  await saveSquad({
    profileId: profile.id,
    kind: "draft",
    bankOverrideTenths: args.bankOverrideTenths ?? null,
    freeTransfersOverride: args.freeTransfersOverride ?? null,
    players: args.players,
  });

  revalidatePath("/planner");
  return { ok: true };
}

export async function resetToImportedSquadAction(): Promise<{ ok: boolean; error?: string }> {
  try {
    await requirePlannerAuth();
  } catch {
    return { ok: false, error: "Unauthorized" };
  }

  const seasonId = await activeSeasonId();
  if (!seasonId) return { ok: false, error: "No active season" };

  const profile = await getOrCreateProfile(seasonId, plannerEntryId());
  const { plannerSquads } = await import("@/db/schema");
  await db
    .update(plannerSquads)
    .set({ isActive: false })
    .where(and(eq(plannerSquads.profileId, profile.id), eq(plannerSquads.kind, "draft")));

  revalidatePath("/planner");
  return { ok: true };
}

export async function savePlannerSettingsAction(
  settings: Partial<PlannerSettings>,
): Promise<{ ok: boolean; error?: string }> {
  try {
    await requirePlannerAuth();
  } catch {
    return { ok: false, error: "Unauthorized" };
  }

  const seasonId = await activeSeasonId();
  if (!seasonId) return { ok: false, error: "No active season" };

  const profile = await getOrCreateProfile(seasonId, plannerEntryId());
  const { getProfileSettings } = await import("@/server/plannerRepository");
  const current = await getProfileSettings(profile.id);
  await saveProfileSettings(profile.id, { ...current, ...settings });

  revalidatePath("/planner");
  return { ok: true };
}

export async function createScenarioAction(args: {
  name: string;
  targetEventNumber?: number | null;
}): Promise<{ ok: boolean; id?: string; error?: string }> {
  try {
    await requirePlannerAuth();
  } catch {
    return { ok: false, error: "Unauthorized" };
  }

  const seasonId = await activeSeasonId();
  if (!seasonId) return { ok: false, error: "No active season" };

  const profile = await getOrCreateProfile(seasonId, plannerEntryId());
  const scenario = await createScenario({
    profileId: profile.id,
    name: args.name,
    targetEventNumber: args.targetEventNumber,
  });

  revalidatePath("/planner");
  return { ok: true, id: scenario.id };
}

export async function deleteScenarioAction(
  scenarioId: string,
): Promise<{ ok: boolean; error?: string }> {
  try {
    await requirePlannerAuth();
  } catch {
    return { ok: false, error: "Unauthorized" };
  }

  const seasonId = await activeSeasonId();
  if (!seasonId) return { ok: false, error: "No active season" };

  const profile = await getOrCreateProfile(seasonId, plannerEntryId());
  await deleteScenario(scenarioId, profile.id);

  revalidatePath("/planner");
  return { ok: true };
}

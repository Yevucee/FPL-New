import { and, desc, eq } from "drizzle-orm";

import { db } from "@/db/client";
import {
  plannerProfiles,
  plannerScenarioTransfers,
  plannerScenarios,
  plannerSquadPlayers,
  plannerSquads,
  plannerWatchlist,
  seasons,
} from "@/db/schema";
import type { PlannerSettings, SquadPlayer } from "@/planner/types";
import { DEFAULT_PLANNER_SETTINGS } from "@/planner/types";

export async function getOrCreateProfile(seasonId: string, providerEntryId: string | null) {
  const existing = await db.query.plannerProfiles.findFirst({
    where: eq(plannerProfiles.seasonId, seasonId),
  });
  if (existing) {
    if (providerEntryId && existing.providerEntryId !== providerEntryId) {
      await db
        .update(plannerProfiles)
        .set({ providerEntryId, updatedAt: new Date() })
        .where(eq(plannerProfiles.id, existing.id));
    }
    return existing;
  }
  const [created] = await db
    .insert(plannerProfiles)
    .values({
      seasonId,
      providerEntryId,
      settings: DEFAULT_PLANNER_SETTINGS as unknown as Record<string, unknown>,
    })
    .returning();
  return created!;
}

export async function getProfileSettings(profileId: string): Promise<PlannerSettings> {
  const profile = await db.query.plannerProfiles.findFirst({
    where: eq(plannerProfiles.id, profileId),
  });
  if (!profile?.settings) return DEFAULT_PLANNER_SETTINGS;
  return { ...DEFAULT_PLANNER_SETTINGS, ...(profile.settings as Partial<PlannerSettings>) };
}

export async function saveProfileSettings(profileId: string, settings: PlannerSettings) {
  await db
    .update(plannerProfiles)
    .set({
      settings: settings as unknown as Record<string, unknown>,
      updatedAt: new Date(),
    })
    .where(eq(plannerProfiles.id, profileId));
}

export async function getActiveSquad(profileId: string, kind: "imported" | "draft") {
  const squad = await db.query.plannerSquads.findFirst({
    where: and(
      eq(plannerSquads.profileId, profileId),
      eq(plannerSquads.kind, kind),
      eq(plannerSquads.isActive, true),
    ),
  });
  if (!squad) return null;
  const players = await db
    .select()
    .from(plannerSquadPlayers)
    .where(eq(plannerSquadPlayers.squadId, squad.id))
    .orderBy(plannerSquadPlayers.slot);
  return { ...squad, players };
}

// Drizzle relations not defined — fetch players separately
export async function getSquadWithPlayers(squadId: string) {
  const squad = await db.query.plannerSquads.findFirst({
    where: eq(plannerSquads.id, squadId),
  });
  if (!squad) return null;
  const players = await db
    .select()
    .from(plannerSquadPlayers)
    .where(eq(plannerSquadPlayers.squadId, squadId))
    .orderBy(plannerSquadPlayers.slot);
  return { ...squad, players };
}

export async function saveSquad(args: {
  profileId: string;
  kind: "imported" | "draft";
  sourceEventNumber?: number | null;
  importedAt?: Date | null;
  bankTenths?: number | null;
  bankOverrideTenths?: number | null;
  freeTransfers?: number | null;
  freeTransfersOverride?: number | null;
  teamValueTenths?: number | null;
  players: SquadPlayer[];
}) {
  await db
    .update(plannerSquads)
    .set({ isActive: false })
    .where(and(eq(plannerSquads.profileId, args.profileId), eq(plannerSquads.kind, args.kind)));

  const [squad] = await db
    .insert(plannerSquads)
    .values({
      profileId: args.profileId,
      kind: args.kind,
      sourceEventNumber: args.sourceEventNumber ?? null,
      importedAt: args.importedAt ?? null,
      bankTenths: args.bankTenths ?? null,
      bankOverrideTenths: args.bankOverrideTenths ?? null,
      freeTransfers: args.freeTransfers ?? null,
      freeTransfersOverride: args.freeTransfersOverride ?? null,
      teamValueTenths: args.teamValueTenths ?? null,
      isActive: true,
    })
    .returning();

  if (args.players.length > 0) {
    await db.insert(plannerSquadPlayers).values(
      args.players.map((p) => ({
        squadId: squad!.id,
        elementId: p.elementId,
        slot: p.slot,
        isStarter: p.isStarter,
        isCaptain: p.isCaptain,
        isViceCaptain: p.isViceCaptain,
        sellPriceTenths: p.sellPriceTenths,
      })),
    );
  }
  return squad!;
}

export function squadPlayersFromRows(
  rows: Array<{
    elementId: number;
    slot: number;
    isStarter: boolean;
    isCaptain: boolean;
    isViceCaptain: boolean;
    sellPriceTenths: number | null;
  }>,
): SquadPlayer[] {
  return rows.map((r) => ({
    elementId: r.elementId,
    slot: r.slot,
    isStarter: r.isStarter,
    isCaptain: r.isCaptain,
    isViceCaptain: r.isViceCaptain,
    sellPriceTenths: r.sellPriceTenths,
  }));
}

export async function listScenarios(profileId: string) {
  return db
    .select()
    .from(plannerScenarios)
    .where(eq(plannerScenarios.profileId, profileId))
    .orderBy(desc(plannerScenarios.updatedAt));
}

export async function getScenarioWithTransfers(scenarioId: string) {
  const scenario = await db.query.plannerScenarios.findFirst({
    where: eq(plannerScenarios.id, scenarioId),
  });
  if (!scenario) return null;
  const transfers = await db
    .select()
    .from(plannerScenarioTransfers)
    .where(eq(plannerScenarioTransfers.scenarioId, scenarioId));
  return { ...scenario, transfers };
}

export async function createScenario(args: {
  profileId: string;
  name: string;
  targetEventNumber?: number | null;
  chip?: string | null;
}) {
  const [row] = await db
    .insert(plannerScenarios)
    .values({
      profileId: args.profileId,
      name: args.name,
      targetEventNumber: args.targetEventNumber ?? null,
      chip: args.chip ?? null,
    })
    .returning();
  return row!;
}

export async function deleteScenario(scenarioId: string, profileId: string) {
  await db
    .delete(plannerScenarios)
    .where(and(eq(plannerScenarios.id, scenarioId), eq(plannerScenarios.profileId, profileId)));
}

export async function getWatchlist(profileId: string) {
  return db.select().from(plannerWatchlist).where(eq(plannerWatchlist.profileId, profileId));
}

export async function toggleWatchlist(profileId: string, elementId: number, notes?: string) {
  const existing = await db.query.plannerWatchlist.findFirst({
    where: and(
      eq(plannerWatchlist.profileId, profileId),
      eq(plannerWatchlist.elementId, elementId),
    ),
  });
  if (existing) {
    await db.delete(plannerWatchlist).where(eq(plannerWatchlist.id, existing.id));
    return false;
  }
  await db.insert(plannerWatchlist).values({ profileId, elementId, notes: notes ?? null });
  return true;
}

export async function activeSeasonId(): Promise<string | null> {
  const season = await db.query.seasons.findFirst({ where: eq(seasons.state, "active") });
  return season?.id ?? null;
}

export interface ReferenceScreenshotMeta {
  hasScreenshot: boolean;
  mime: string | null;
  uploadedAt: string | null;
  label: string | null;
}

export async function getReferenceScreenshotMeta(
  profileId: string,
): Promise<ReferenceScreenshotMeta> {
  const profile = await db.query.plannerProfiles.findFirst({
    where: eq(plannerProfiles.id, profileId),
    columns: {
      referenceScreenshotBase64: true,
      referenceScreenshotMime: true,
      referenceScreenshotAt: true,
      referenceScreenshotLabel: true,
    },
  });
  return {
    hasScreenshot: Boolean(profile?.referenceScreenshotBase64),
    mime: profile?.referenceScreenshotMime ?? null,
    uploadedAt: profile?.referenceScreenshotAt?.toISOString() ?? null,
    label: profile?.referenceScreenshotLabel ?? null,
  };
}

export async function getReferenceScreenshotData(profileId: string): Promise<{
  base64: string;
  mime: string;
} | null> {
  const profile = await db.query.plannerProfiles.findFirst({
    where: eq(plannerProfiles.id, profileId),
    columns: {
      referenceScreenshotBase64: true,
      referenceScreenshotMime: true,
    },
  });
  if (!profile?.referenceScreenshotBase64 || !profile.referenceScreenshotMime) return null;
  return {
    base64: profile.referenceScreenshotBase64,
    mime: profile.referenceScreenshotMime,
  };
}

export async function saveReferenceScreenshot(args: {
  profileId: string;
  base64: string;
  mime: string;
  label?: string | null;
}) {
  await db
    .update(plannerProfiles)
    .set({
      referenceScreenshotBase64: args.base64,
      referenceScreenshotMime: args.mime,
      referenceScreenshotAt: new Date(),
      referenceScreenshotLabel: args.label ?? "FPL squad screenshot",
      updatedAt: new Date(),
    })
    .where(eq(plannerProfiles.id, args.profileId));
}

export async function clearReferenceScreenshot(profileId: string) {
  await db
    .update(plannerProfiles)
    .set({
      referenceScreenshotBase64: null,
      referenceScreenshotMime: null,
      referenceScreenshotAt: null,
      referenceScreenshotLabel: null,
      updatedAt: new Date(),
    })
    .where(eq(plannerProfiles.id, profileId));
}

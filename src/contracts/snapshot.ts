import { z } from "zod";

/**
 * Zod schemas validated at the provider boundary (specification section 18).
 *
 * Policy: required known fields must be present; unknown additional fields are
 * tolerated (providers evolve). `.passthrough()` keeps unknown fields instead of
 * failing, so a new provider field never breaks ingestion.
 */

export const eventPayloadSchema = z
  .object({
    eventNumber: z.number().int().positive(),
    deadline: z.string().datetime().nullable().optional(),
    phase: z.number().int().positive().default(1),
    phaseName: z.string().nullable().optional(),
    finished: z.boolean().default(false),
    checked: z.boolean().default(false),
  })
  .passthrough();

export const resultPayloadSchema = z
  .object({
    eventNumber: z.number().int().positive(),
    netPoints: z.number().int(),
    grossPoints: z.number().int(),
    transferCost: z.number().int().nonnegative().default(0),
    totalPoints: z.number().int().default(0),
    benchPoints: z.number().int().nonnegative().default(0),
    chip: z.string().nullable().optional(),
    captainName: z.string().nullable().optional(),
    captainPoints: z.number().int().nullable().optional(),
    teamValue: z.number().int().nullable().optional(),
    bank: z.number().int().nullable().optional(),
  })
  .passthrough();

export const entryPayloadSchema = z
  .object({
    providerEntryId: z.string().min(1),
    managerName: z.string().min(1),
    teamName: z.string().min(1),
    joinEvent: z.number().int().positive().default(1),
    overallFplRank: z.number().int().nullable().optional(),
    careerBestSeason: z.string().nullable().optional(),
    careerBestPoints: z.number().int().nullable().optional(),
    seasonTransfers: z.number().int().nonnegative().optional(),
    results: z.array(resultPayloadSchema),
  })
  .passthrough();

export const leagueSnapshotSchema = z
  .object({
    provider: z.string().min(1),
    season: z
      .object({
        name: z.string().min(1),
        providerId: z.string().nullable().optional(),
        startEvent: z.number().int().positive().default(1),
      })
      .passthrough(),
    league: z
      .object({
        slug: z.string().min(1),
        name: z.string().min(1),
        providerId: z.string().nullable().optional(),
        visibility: z.string().default("unlisted"),
        timezone: z.string().default("Europe/London"),
      })
      .passthrough(),
    events: z.array(eventPayloadSchema).min(1),
    entries: z.array(entryPayloadSchema).min(1),
  })
  .passthrough();

export type EventPayload = z.infer<typeof eventPayloadSchema>;
export type ResultPayload = z.infer<typeof resultPayloadSchema>;
export type EntryPayload = z.infer<typeof entryPayloadSchema>;
export type LeagueSnapshot = z.infer<typeof leagueSnapshotSchema>;

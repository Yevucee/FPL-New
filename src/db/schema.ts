import { relations } from "drizzle-orm";
import {
  boolean,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

/**
 * Phase 1 core schema (subset of specification section 10).
 *
 * Design rules honoured here:
 * - UUIDs for internal identity; provider IDs are scoped external keys.
 * - A seasonal FPL entry ID is never the permanent manager primary key.
 * - Unique constraints make every ingest upsert safe (idempotent sync).
 */

export const seasons = pgTable("seasons", {
  id: uuid("id").defaultRandom().primaryKey(),
  // e.g. "2026/27"
  name: text("name").notNull().unique(),
  providerId: text("provider_id"),
  startEvent: integer("start_event").notNull().default(1),
  state: text("state").notNull().default("active"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const leagues = pgTable("leagues", {
  id: uuid("id").defaultRandom().primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  visibility: text("visibility").notNull().default("unlisted"),
  timezone: text("timezone").notNull().default("Europe/London"),
  providerId: text("provider_id"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const managers = pgTable("managers", {
  id: uuid("id").defaultRandom().primaryKey(),
  displayName: text("display_name").notNull(),
  pseudonym: text("pseudonym"),
  isPrivate: boolean("is_private").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const seasonEntries = pgTable(
  "season_entries",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    seasonId: uuid("season_id")
      .notNull()
      .references(() => seasons.id, { onDelete: "cascade" }),
    leagueId: uuid("league_id")
      .notNull()
      .references(() => leagues.id, { onDelete: "cascade" }),
    managerId: uuid("manager_id")
      .notNull()
      .references(() => managers.id, { onDelete: "cascade" }),
    provider: text("provider").notNull(),
    providerEntryId: text("provider_entry_id").notNull(),
    teamName: text("team_name").notNull(),
    joinEvent: integer("join_event").notNull().default(1),
    leaveEvent: integer("leave_event"),
    overallFplRank: integer("overall_fpl_rank"),
    careerBestSeason: text("career_best_season"),
    careerBestPoints: integer("career_best_points"),
    seasonTransfers: integer("season_transfers"),
  },
  (t) => ({
    uqEntry: unique("uq_season_entry_provider").on(
      t.seasonId,
      t.provider,
      t.providerEntryId,
    ),
  }),
);

export const events = pgTable(
  "events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    seasonId: uuid("season_id")
      .notNull()
      .references(() => seasons.id, { onDelete: "cascade" }),
    eventNumber: integer("event_number").notNull(),
    deadline: timestamp("deadline", { withTimezone: true }),
    phase: integer("phase").notNull().default(1),
    phaseName: text("phase_name"),
    finished: boolean("finished").notNull().default(false),
    checked: boolean("checked").notNull().default(false),
    sealed: boolean("sealed").notNull().default(false),
  },
  (t) => ({
    uqEvent: unique("uq_event_season_number").on(t.seasonId, t.eventNumber),
  }),
);

export const entryEventResults = pgTable(
  "entry_event_results",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    seasonEntryId: uuid("season_entry_id")
      .notNull()
      .references(() => seasonEntries.id, { onDelete: "cascade" }),
    eventId: uuid("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    // Net = points that count for league ranking (after transfer hits).
    netPoints: integer("net_points").notNull(),
    // Gross = net + points spent on extra transfers.
    grossPoints: integer("gross_points").notNull(),
    transferCost: integer("transfer_cost").notNull().default(0),
    totalPoints: integer("total_points").notNull().default(0),
    benchPoints: integer("bench_points").notNull().default(0),
    chip: text("chip"),
    captainName: text("captain_name"),
    captainPoints: integer("captain_points"),
    // Money stored as integer tenths (matching the source), formatted at the edge.
    teamValue: integer("team_value"),
    bank: integer("bank"),
  },
  (t) => ({
    uqResult: unique("uq_result_entry_event").on(t.seasonEntryId, t.eventId),
  }),
);

export const eventIntel = pgTable(
  "event_intel",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    seasonId: uuid("season_id")
      .notNull()
      .references(() => seasons.id, { onDelete: "cascade" }),
    eventNumber: integer("event_number").notNull(),
    mostOwned: jsonb("most_owned").$type<
      Array<{
        elementId: number;
        webName: string;
        ownerCount: number;
        ownerPct: number;
      }>
    >(),
    fetchedAt: timestamp("fetched_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    uqIntel: unique("uq_event_intel_season_event").on(t.seasonId, t.eventNumber),
  }),
);

export const syncRuns = pgTable("sync_runs", {
  id: uuid("id").defaultRandom().primaryKey(),
  provider: text("provider").notNull(),
  scope: text("scope").notNull(),
  status: text("status").notNull().default("running"),
  startedAt: timestamp("started_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  finishedAt: timestamp("finished_at", { withTimezone: true }),
  inserted: integer("inserted").notNull().default(0),
  updated: integer("updated").notNull().default(0),
  skipped: integer("skipped").notNull().default(0),
  failed: integer("failed").notNull().default(0),
  codeVersion: text("code_version"),
  correlationId: text("correlation_id"),
  errorSummary: text("error_summary"),
});

export const seasonsRelations = relations(seasons, ({ many }) => ({
  events: many(events),
  entries: many(seasonEntries),
}));

export const seasonEntriesRelations = relations(
  seasonEntries,
  ({ one, many }) => ({
    season: one(seasons, {
      fields: [seasonEntries.seasonId],
      references: [seasons.id],
    }),
    league: one(leagues, {
      fields: [seasonEntries.leagueId],
      references: [leagues.id],
    }),
    manager: one(managers, {
      fields: [seasonEntries.managerId],
      references: [managers.id],
    }),
    results: many(entryEventResults),
  }),
);

export const entryEventResultsRelations = relations(
  entryEventResults,
  ({ one }) => ({
    entry: one(seasonEntries, {
      fields: [entryEventResults.seasonEntryId],
      references: [seasonEntries.id],
    }),
    event: one(events, {
      fields: [entryEventResults.eventId],
      references: [events.id],
    }),
  }),
);

export type Season = typeof seasons.$inferSelect;
export type League = typeof leagues.$inferSelect;
export type Manager = typeof managers.$inferSelect;
export type SeasonEntry = typeof seasonEntries.$inferSelect;
export type EventRow = typeof events.$inferSelect;
export type EntryEventResult = typeof entryEventResults.$inferSelect;
export type EventIntel = typeof eventIntel.$inferSelect;
export type SyncRun = typeof syncRuns.$inferSelect;

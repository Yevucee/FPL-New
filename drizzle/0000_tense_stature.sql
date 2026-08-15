CREATE TABLE "entry_event_results" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"season_entry_id" uuid NOT NULL,
	"event_id" uuid NOT NULL,
	"net_points" integer NOT NULL,
	"gross_points" integer NOT NULL,
	"transfer_cost" integer DEFAULT 0 NOT NULL,
	"total_points" integer DEFAULT 0 NOT NULL,
	"bench_points" integer DEFAULT 0 NOT NULL,
	"chip" text,
	"team_value" integer,
	"bank" integer,
	CONSTRAINT "uq_result_entry_event" UNIQUE("season_entry_id","event_id")
);
--> statement-breakpoint
CREATE TABLE "events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"season_id" uuid NOT NULL,
	"event_number" integer NOT NULL,
	"deadline" timestamp with time zone,
	"phase" integer DEFAULT 1 NOT NULL,
	"phase_name" text,
	"finished" boolean DEFAULT false NOT NULL,
	"checked" boolean DEFAULT false NOT NULL,
	"sealed" boolean DEFAULT false NOT NULL,
	CONSTRAINT "uq_event_season_number" UNIQUE("season_id","event_number")
);
--> statement-breakpoint
CREATE TABLE "leagues" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"visibility" text DEFAULT 'unlisted' NOT NULL,
	"timezone" text DEFAULT 'Europe/London' NOT NULL,
	"provider_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "leagues_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "managers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"display_name" text NOT NULL,
	"pseudonym" text,
	"is_private" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "season_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"season_id" uuid NOT NULL,
	"league_id" uuid NOT NULL,
	"manager_id" uuid NOT NULL,
	"provider" text NOT NULL,
	"provider_entry_id" text NOT NULL,
	"team_name" text NOT NULL,
	"join_event" integer DEFAULT 1 NOT NULL,
	"leave_event" integer,
	CONSTRAINT "uq_season_entry_provider" UNIQUE("season_id","provider","provider_entry_id")
);
--> statement-breakpoint
CREATE TABLE "seasons" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"provider_id" text,
	"start_event" integer DEFAULT 1 NOT NULL,
	"state" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "seasons_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "sync_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider" text NOT NULL,
	"scope" text NOT NULL,
	"status" text DEFAULT 'running' NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"finished_at" timestamp with time zone,
	"inserted" integer DEFAULT 0 NOT NULL,
	"updated" integer DEFAULT 0 NOT NULL,
	"skipped" integer DEFAULT 0 NOT NULL,
	"failed" integer DEFAULT 0 NOT NULL,
	"code_version" text,
	"correlation_id" text,
	"error_summary" text
);
--> statement-breakpoint
ALTER TABLE "entry_event_results" ADD CONSTRAINT "entry_event_results_season_entry_id_season_entries_id_fk" FOREIGN KEY ("season_entry_id") REFERENCES "public"."season_entries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entry_event_results" ADD CONSTRAINT "entry_event_results_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_season_id_seasons_id_fk" FOREIGN KEY ("season_id") REFERENCES "public"."seasons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "season_entries" ADD CONSTRAINT "season_entries_season_id_seasons_id_fk" FOREIGN KEY ("season_id") REFERENCES "public"."seasons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "season_entries" ADD CONSTRAINT "season_entries_league_id_leagues_id_fk" FOREIGN KEY ("league_id") REFERENCES "public"."leagues"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "season_entries" ADD CONSTRAINT "season_entries_manager_id_managers_id_fk" FOREIGN KEY ("manager_id") REFERENCES "public"."managers"("id") ON DELETE cascade ON UPDATE no action;
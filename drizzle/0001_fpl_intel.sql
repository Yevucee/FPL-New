ALTER TABLE "season_entries" ADD COLUMN "overall_fpl_rank" integer;--> statement-breakpoint
ALTER TABLE "season_entries" ADD COLUMN "career_best_season" text;--> statement-breakpoint
ALTER TABLE "season_entries" ADD COLUMN "career_best_points" integer;--> statement-breakpoint
ALTER TABLE "season_entries" ADD COLUMN "season_transfers" integer;--> statement-breakpoint
ALTER TABLE "entry_event_results" ADD COLUMN "captain_name" text;--> statement-breakpoint
ALTER TABLE "entry_event_results" ADD COLUMN "captain_points" integer;--> statement-breakpoint
CREATE TABLE "event_intel" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"season_id" uuid NOT NULL,
	"event_number" integer NOT NULL,
	"most_owned" jsonb,
	"fetched_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uq_event_intel_season_event" UNIQUE("season_id","event_number")
);--> statement-breakpoint
ALTER TABLE "event_intel" ADD CONSTRAINT "event_intel_season_id_seasons_id_fk" FOREIGN KEY ("season_id") REFERENCES "public"."seasons"("id") ON DELETE cascade ON UPDATE no action;

CREATE TABLE IF NOT EXISTS "planner_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"season_id" uuid NOT NULL REFERENCES "seasons"("id") ON DELETE cascade,
	"provider_entry_id" text,
	"settings" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uq_planner_profile_season" UNIQUE("season_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "planner_squads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"profile_id" uuid NOT NULL REFERENCES "planner_profiles"("id") ON DELETE cascade,
	"kind" text NOT NULL,
	"source_event_number" integer,
	"imported_at" timestamp with time zone,
	"bank_tenths" integer,
	"bank_override_tenths" integer,
	"free_transfers" integer,
	"free_transfers_override" integer,
	"team_value_tenths" integer,
	"is_active" boolean DEFAULT true NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "planner_squad_players" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"squad_id" uuid NOT NULL REFERENCES "planner_squads"("id") ON DELETE cascade,
	"element_id" integer NOT NULL,
	"slot" integer NOT NULL,
	"is_starter" boolean DEFAULT false NOT NULL,
	"is_captain" boolean DEFAULT false NOT NULL,
	"is_vice_captain" boolean DEFAULT false NOT NULL,
	"sell_price_tenths" integer,
	CONSTRAINT "uq_planner_squad_player" UNIQUE("squad_id","element_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "planner_scenarios" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"profile_id" uuid NOT NULL REFERENCES "planner_profiles"("id") ON DELETE cascade,
	"name" text NOT NULL,
	"target_event_number" integer,
	"chip" text,
	"captain_element_id" integer,
	"vice_element_id" integer,
	"bench_order" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "planner_scenario_transfers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"scenario_id" uuid NOT NULL REFERENCES "planner_scenarios"("id") ON DELETE cascade,
	"event_number" integer NOT NULL,
	"element_out_id" integer NOT NULL,
	"element_in_id" integer NOT NULL,
	"hit_cost" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "planner_watchlist" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"profile_id" uuid NOT NULL REFERENCES "planner_profiles"("id") ON DELETE cascade,
	"element_id" integer NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uq_planner_watchlist_player" UNIQUE("profile_id","element_id")
);

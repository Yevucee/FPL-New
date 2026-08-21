ALTER TABLE "planner_profiles" ADD COLUMN IF NOT EXISTS "reference_screenshot_base64" text;
--> statement-breakpoint
ALTER TABLE "planner_profiles" ADD COLUMN IF NOT EXISTS "reference_screenshot_mime" text;
--> statement-breakpoint
ALTER TABLE "planner_profiles" ADD COLUMN IF NOT EXISTS "reference_screenshot_at" timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "planner_profiles" ADD COLUMN IF NOT EXISTS "reference_screenshot_label" text;

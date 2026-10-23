CREATE TABLE "quran_reading_plans" (
	"id" text PRIMARY KEY DEFAULT uuidv7(),
	"user_id" text NOT NULL,
	"plan_id" uuid NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"read" text NOT NULL,
	"today" jsonb,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "quran_reading_plans_user_idx" ON "quran_reading_plans" ("user_id");--> statement-breakpoint
ALTER TABLE "quran_reading_plans" ADD CONSTRAINT "quran_reading_plans_user_id_auth_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth_users"("id") ON DELETE CASCADE;
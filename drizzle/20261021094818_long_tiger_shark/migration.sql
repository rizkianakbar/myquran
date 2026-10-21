CREATE TABLE "bookmarks" (
	"id" text PRIMARY KEY DEFAULT uuidv7(),
	"user_id" text NOT NULL,
	"surah" integer NOT NULL,
	"verse" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notes" (
	"id" text PRIMARY KEY DEFAULT uuidv7(),
	"user_id" text NOT NULL,
	"surah" integer NOT NULL,
	"verse" integer NOT NULL,
	"body" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "bookmarks_user_verse_idx" ON "bookmarks" ("user_id","surah","verse");--> statement-breakpoint
CREATE UNIQUE INDEX "notes_user_verse_idx" ON "notes" ("user_id","surah","verse");--> statement-breakpoint
ALTER TABLE "bookmarks" ADD CONSTRAINT "bookmarks_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "notes" ADD CONSTRAINT "notes_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;
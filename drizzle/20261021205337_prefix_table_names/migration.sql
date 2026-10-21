ALTER TABLE "accounts" RENAME TO "auth_accounts";--> statement-breakpoint
ALTER TABLE "bookmarks" RENAME TO "quran_bookmarks";--> statement-breakpoint
ALTER TABLE "notes" RENAME TO "quran_notes";--> statement-breakpoint
ALTER TABLE "sessions" RENAME TO "auth_sessions";--> statement-breakpoint
ALTER TABLE "users" RENAME TO "auth_users";--> statement-breakpoint
ALTER TABLE "verifications" RENAME TO "auth_verifications";--> statement-breakpoint
ALTER INDEX "bookmarks_user_verse_idx" RENAME TO "quran_bookmarks_user_verse_idx";--> statement-breakpoint
ALTER INDEX "notes_user_verse_idx" RENAME TO "quran_notes_user_verse_idx";
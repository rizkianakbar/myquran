import { and, desc, eq } from 'drizzle-orm';
import { bookmarks } from '#/db/schema.ts';
import type { VerseRef } from '#/server/schemas.ts';
import type { Database } from './db.server.ts';

/**
 * List a user's bookmarks, newest first.
 */
export async function listBookmarks(db: Database, userId: string) {
  return db.select().from(bookmarks).where(eq(bookmarks.userId, userId)).orderBy(desc(bookmarks.createdAt));
}

/**
 * Bookmark a verse, or remove the bookmark if it already exists.
 * Returns whether the verse is bookmarked afterwards.
 */
export async function toggleBookmark(db: Database, userId: string, ref: VerseRef) {
  const [removed] = await db
    .delete(bookmarks)
    .where(and(eq(bookmarks.userId, userId), eq(bookmarks.surah, ref.surah), eq(bookmarks.verse, ref.verse)))
    .returning();

  if (removed) return { bookmarked: false };

  await db.insert(bookmarks).values({ userId, surah: ref.surah, verse: ref.verse }).onConflictDoNothing();

  return { bookmarked: true };
}

import { and, desc, eq } from 'drizzle-orm';
import { bookmarks } from '#api/databases/schema.ts';
import type { AppContext } from '#api/primitives/app-context.ts';
import type { VerseRef } from './notes.ts';

/**
 * List a user's bookmarks, newest first.
 */
export async function listBookmarks(ctx: AppContext, userId: string) {
  return ctx.container.db
    .select()
    .from(bookmarks)
    .where(eq(bookmarks.userId, userId))
    .orderBy(desc(bookmarks.createdAt));
}

/**
 * Bookmark a verse, or remove the bookmark if it already exists.
 * Returns whether the verse is bookmarked afterwards.
 */
export async function toggleBookmark(ctx: AppContext, userId: string, ref: VerseRef) {
  const [removed] = await ctx.container.db
    .delete(bookmarks)
    .where(and(eq(bookmarks.userId, userId), eq(bookmarks.surah, ref.surah), eq(bookmarks.verse, ref.verse)))
    .returning();

  if (removed) return { bookmarked: false };

  await ctx.container.db.insert(bookmarks).values({ userId, surah: ref.surah, verse: ref.verse }).onConflictDoNothing();

  return { bookmarked: true };
}

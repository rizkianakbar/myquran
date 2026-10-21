import { listBookmarks, toggleBookmark } from '#api/services/bookmarks.ts';
import { protectedProcedure, router } from './init.ts';
import { verseRefSchema } from './notes.ts';

/**
 * Bookmarked verses, owned by the authenticated user.
 */
export const bookmarksRouter = router({
  /**
   * List the user's bookmarks, newest first.
   */
  list: protectedProcedure.query(({ ctx }) => listBookmarks(ctx, ctx.user.id)),

  /**
   * Bookmark a verse, or remove an existing bookmark.
   */
  toggle: protectedProcedure
    .input(verseRefSchema)
    .mutation(({ ctx, input }) => toggleBookmark(ctx, ctx.user.id, input)),
});

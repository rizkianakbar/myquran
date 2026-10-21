import { queryOptions } from '@tanstack/react-query';
import { createServerFn } from '@tanstack/react-start';
import { listBookmarks, toggleBookmark } from './bookmarks.server.ts';
import { db } from './db.server.ts';
import { authMiddleware } from './middleware.ts';
import { verseRefSchema } from './schemas.ts';

/**
 * List the user's bookmarks, newest first.
 */
export const listBookmarksFn = createServerFn({ method: 'GET' })
  .middleware([authMiddleware])
  .handler(({ context }) => listBookmarks(db, context.user.id));

/**
 * Bookmark a verse, or remove an existing bookmark.
 */
export const toggleBookmarkFn = createServerFn({ method: 'POST' })
  .middleware([authMiddleware])
  .validator(verseRefSchema)
  .handler(({ context, data }) => toggleBookmark(db, context.user.id, data));

export const bookmarksQueries = {
  all: ['bookmarks'] as const,
  list: () => queryOptions({ queryKey: [...bookmarksQueries.all, 'list'], queryFn: () => listBookmarksFn() }),
};

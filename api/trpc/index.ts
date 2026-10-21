import { bookmarksRouter } from './bookmarks.ts';
import { router } from './init.ts';
import { notesRouter } from './notes.ts';
import { postsRouter } from './posts.ts';

/**
 * The main application router.
 */
export const appRouter = router({
  bookmarks: bookmarksRouter,
  notes: notesRouter,
  posts: postsRouter,
});

/**
 * Export type definition for use in the client.
 */
export type AppRouter = typeof appRouter;

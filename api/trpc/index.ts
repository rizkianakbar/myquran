import { router } from './init.ts';
import { postsRouter } from './posts.ts';

/**
 * The main application router.
 */
export const appRouter = router({
  posts: postsRouter,
});

/**
 * Export type definition for use in the client.
 */
export type AppRouter = typeof appRouter;

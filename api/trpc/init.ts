import { initTRPC, TRPCError } from '@trpc/server';
import superjson from 'superjson';
import type { AppContext } from '#api/primitives/app-context.ts';

/**
 * Initialize tRPC with typed context.
 */
const t = initTRPC.context<AppContext>().create({
  transformer: superjson,
  errorFormatter({ shape }) {
    return shape;
  },
});

/**
 * Export reusable router and procedure helpers.
 */
export const router = t.router;
export const middleware = t.middleware;

/**
 * Public (unauthenticated) procedure.
 *
 * This is the base piece you use to build new queries and mutations on your tRPC API.
 */
export const publicProcedure = t.procedure;

/**
 * Protected (authenticated) procedure.
 *
 * If you want a query or mutation to ONLY be accessible to logged in users, use this.
 * It verifies that the user's session is valid and makes the session data available in ctx.
 *
 * @example
 * ```typescript
 * list: protectedProcedure.query(async ({ ctx }) => {
 *   // ctx.user is guaranteed to be non-null
 *   return listPosts(ctx.container.db, ctx.user.id);
 * }),
 * ```
 */
export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.session || !ctx.user) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'Not authenticated',
    });
  }

  return next({
    ctx: {
      ...ctx,
      session: ctx.session,
      user: ctx.user,
    },
  });
});

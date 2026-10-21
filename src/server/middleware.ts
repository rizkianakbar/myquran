import { createMiddleware } from '@tanstack/react-start';
import { getRequestHeaders, setResponseStatus } from '@tanstack/react-start/server';
import { auth } from './auth.server.ts';

/**
 * Server-function middleware that resolves the Better Auth session from the
 * request cookies and exposes `context.user`. Rejects anonymous callers.
 */
export const authMiddleware = createMiddleware({ type: 'function' }).server(async ({ next }) => {
  const session = await auth.api.getSession({ headers: getRequestHeaders() });

  if (!session) {
    setResponseStatus(401);
    throw new Error('Unauthorized');
  }

  return next({ context: { user: session.user } });
});

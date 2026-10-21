import { createFileRoute } from '@tanstack/react-router';
import { auth } from '#/server/auth.server.ts';

/**
 * Better Auth's catch-all handler (sign-in, sign-out, session, …).
 */
export const Route = createFileRoute('/api/auth/$')({
  server: {
    handlers: {
      GET: ({ request }) => auth.handler(request),
      POST: ({ request }) => auth.handler(request),
    },
  },
});

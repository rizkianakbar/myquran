import { createAuthClient } from 'better-auth/react';

/**
 * Better Auth client. Same origin as the server, so no `baseURL` needed.
 */
export const authClient = createAuthClient();

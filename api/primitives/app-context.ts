import { fromNodeHeaders } from 'better-auth/node';
import type { Request } from 'ultimate-express';
import type { ApiKeyData } from '#api/middleware/api-key-auth.ts';
import type { Auth } from './auth.ts';
import type { Container } from './container.ts';

/**
 * Session data from Better Auth's getSession().
 */
export type SessionData = NonNullable<Awaited<ReturnType<Auth['api']['getSession']>>>;

/**
 * Options for creating an AppContext.
 */
export interface DefineAppContextOpts {
  /**
   * The API key data, or null if not authenticated via API key.
   */
  apiKey: ApiKeyData | null;

  /**
   * Application container with services and dependencies.
   */
  container: Container;

  /**
   * The incoming request object.
   */
  request: Request;

  /**
   * Set to true to fetch session (tRPC). False for API key auth (OpenAPI).
   */
  fetchSession?: boolean;
}

/**
 * Creates a unified AppContext for tRPC and OpenAPI handlers.
 *
 * For tRPC (session auth): Pass fetchSession=true to fetch session from Better Auth.
 * For OpenAPI (API key auth): Pass fetchSession=false (default), session will be null.
 */
export async function defineAppContext(opts: DefineAppContextOpts): Promise<AppContext> {
  const { apiKey, container, request, fetchSession = false } = opts;
  const headers = fromNodeHeaders(request.headers);
  const sessionData = fetchSession ? await container.auth.api.getSession({ headers }) : null;

  return {
    apiKey,
    container,
    request,
    session: sessionData?.session ?? null,
    user: sessionData?.user ?? null,
  };
}

/**
 * Unified context for tRPC, OpenAPI handlers, and services.
 */
export interface AppContext {
  /**
   * The API key data, or null if not authenticated via API key.
   */
  apiKey: ApiKeyData | null;

  /**
   * Application container with services and dependencies.
   */
  container: Container;

  /**
   * The incoming request object.
   */
  request: Request;

  /**
   * The current session, or null if not authenticated.
   */
  session: SessionData['session'] | null;

  /**
   * The current user, or null if not authenticated.
   */
  user: SessionData['user'] | null;
}

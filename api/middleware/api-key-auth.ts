import { createHash } from 'node:crypto';
import { eq } from 'drizzle-orm';
import type { NextFunction, Request, RequestHandler, Response } from 'ultimate-express';
import { apiKeys } from '#api/databases/schema.ts';
import type { Container } from '#api/primitives/container.ts';

/**
 * Header name for API key.
 */
const API_KEY_HEADER = 'x-api-key';

/**
 * API key data attached to request.
 */
export interface ApiKeyData {
  id: string;
  name: string;
  userId: string;
}

declare global {
  namespace Express {
    interface Request {
      /**
       * The API key data, or null if not authenticated via API key.
       */
      apiKey: ApiKeyData | null;
    }
  }
}

/**
 * Options for API key authentication middleware.
 */
interface DefineApiKeyAuthMiddlewareOpts {
  /**
   * Container with database access.
   */
  container: Container;

  /**
   * Paths to skip API key authentication for.
   */
  skipPaths?: (string | RegExp)[];
}

/**
 * Check if request path should skip API key processing.
 */
function shouldSkipPath(path: string, skipPaths: (string | RegExp)[]): boolean {
  return skipPaths.some((pattern) => (typeof pattern === 'string' ? path === pattern : pattern.test(path)));
}

/**
 * Hash an API key using SHA-256.
 */
function hashApiKey(key: string): string {
  return createHash('sha256').update(key).digest('hex');
}

/**
 * Defines API key authentication middleware.
 *
 * Validates API keys against the database and attaches verified key data
 * to the request for downstream handlers.
 *
 * Behavior:
 * - No X-Api-Key header: sets req.apiKey = null, continues
 * - Valid key: attaches ApiKeyData to req.apiKey
 * - Invalid key: returns 401
 */
export function defineApiKeyAuthMiddleware(config: DefineApiKeyAuthMiddlewareOpts): RequestHandler {
  const { container, skipPaths = [] } = config;

  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (shouldSkipPath(req.path, skipPaths)) {
        req.apiKey = null;
        return next();
      }

      const apiKeyHeader = req.headers[API_KEY_HEADER];
      const apiKeyValue = Array.isArray(apiKeyHeader) ? apiKeyHeader[0] : apiKeyHeader;

      // No API key provided - let handler decide if auth is required.
      if (!apiKeyValue) {
        req.apiKey = null;
        return next();
      }

      // Extract prefix and hash the key.
      const prefix = apiKeyValue.slice(0, 7);
      const keyHash = hashApiKey(apiKeyValue);

      // Look up API key in database.
      const apiKeyRecord = await container.db
        .select()
        .from(apiKeys)
        .where(eq(apiKeys.keyHash, keyHash))
        .limit(1)
        .then((rows) => rows[0]);

      // Invalid key.
      if (!apiKeyRecord) {
        container.logger.warn({ prefix, path: req.path, method: req.method }, 'API key verification failed');
        return res.status(401).json({
          error: 'unauthorized',
          detail: 'Invalid or expired API key',
        });
      }

      // Check expiration.
      if (apiKeyRecord.expiresAt && new Date(apiKeyRecord.expiresAt) < new Date()) {
        container.logger.warn({ prefix, path: req.path, method: req.method }, 'API key expired');
        return res.status(401).json({
          error: 'unauthorized',
          detail: 'API key has expired',
        });
      }

      req.apiKey = {
        id: apiKeyRecord.id,
        name: apiKeyRecord.name,
        userId: apiKeyRecord.userId,
      };

      next();
    } catch (error) {
      next(error);
    }
  };
}

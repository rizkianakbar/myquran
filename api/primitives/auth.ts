import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import type { relations } from '#api/databases/relations.ts';
import type * as schema from '#api/databases/schema.ts';
import type { Config } from './config.ts';
import type { Database } from './database.ts';
import type { Logger } from './logger.ts';

/**
 * Options for defining authentication.
 */
interface DefineAuthOptions {
  /**
   * The configuration instance.
   */
  config: Config;

  /**
   * The database instance.
   */
  db: Database<typeof schema, typeof relations>;

  /**
   * The logger instance.
   */
  logger: Logger;
}

/**
 * The authentication type.
 */
export type Auth = ReturnType<typeof defineAuth>;

/**
 * Defines simplified authentication for the repo.
 * Only email/password authentication is enabled.
 *
 * @param opts - Auth options
 * @returns Better Auth instance
 */
export function defineAuth({ config, db, logger }: DefineAuthOptions) {
  return betterAuth({
    appName: 'fullstack-starter',
    baseURL: config.API_URL,
    basePath: '/auth',
    database: drizzleAdapter(db, {
      provider: 'pg',
      usePlural: true,
    }),
    emailAndPassword: {
      enabled: true,
      autoSignIn: true,
      requireEmailVerification: false,
      minPasswordLength: 8,
    },
    logger: {
      log(level, message, err) {
        logger[level]({ err: err instanceof Error ? err.stack || err.message : err }, message);
      },
    },
    secret: config.SECRET_KEY,
    trustedOrigins: [config.DASHBOARD_URL],
  });
}

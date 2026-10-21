import { z } from 'zod';

/**
 *  repo configuration schema with sensible defaults.
 */
export const schema = z.object({
  DATABASE_URL: z.string().default('postgresql://postgres:postgres@localhost:5432/fullstack-starter'),
  HOST: z.string().default('0.0.0.0'),
  PORT: z.coerce.number().default(3001),
  SECRET_KEY: z.string().default('dev-secret-key-change-in-production'),
  DASHBOARD_URL: z.string().default('http://localhost:3000'),
  API_URL: z.string().default('http://localhost:3001'),
  WEBHOOK_SECRET: z.string().default('whsec_test_secret_for_development'),
});

/**
 * Creates a configuration object by parsing environment variables.
 *
 * @returns Parsed and validated configuration object.
 */
export function defineConfig() {
  return schema.parse(process.env);
}

export type Config = ReturnType<typeof defineConfig>;

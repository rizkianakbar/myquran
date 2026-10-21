import { z } from 'zod';

const isProduction = process.env.NODE_ENV === 'production';

/**
 * Server environment. Locally, `bun run` loads `.env.local` (see
 * `.env.example`); on Vercel, set these under Project → Settings →
 * Environment Variables.
 */
const schema = z.object({
  DATABASE_URL: z.url(),
  BETTER_AUTH_SECRET: isProduction ? z.string().min(32) : z.string().default('dev-secret-change-me-in-production-0000'),
  /**
   * Public origin of the app. Optional in production: when unset Better Auth
   * infers it from the request, which keeps Vercel preview deployments working.
   */
  BETTER_AUTH_URL: isProduction ? z.url().optional() : z.url().default('http://localhost:3000'),
});

export const env = schema.parse(process.env);

import { attachDatabasePool } from '@vercel/functions';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { relations } from '#/db/relations.ts';
import { env } from './env.server.ts';

const pool = new Pool({ connectionString: env.DATABASE_URL, application_name: 'myquran' });

// On Vercel Fluid compute, release idle clients before the instance suspends
// so connections aren't leaked; a no-op everywhere else.
attachDatabasePool(pool);

/**
 * The app's database. One pool per server instance, reused across requests.
 */
export const db = drizzle({ client: pool, relations });

/**
 * The database or a transaction on it. Data-access functions accept either,
 * so callers (and tests) can run them inside a transaction.
 */
export type Database = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

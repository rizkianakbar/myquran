import { existsSync } from 'node:fs';
import { defineConfig } from 'drizzle-kit';

// Doesn't override variables already set, so `DATABASE_URL=… bun db:migrate` wins.
if (existsSync('.env.local')) process.loadEnvFile('.env.local');

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/db/schema.ts',
  out: './drizzle',
  dbCredentials: { url: process.env.DATABASE_URL! },
  migrations: { table: 'schema_migrations', schema: 'public' },
});

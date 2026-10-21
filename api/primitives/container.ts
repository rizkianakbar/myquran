import { relations } from '#api/databases/relations.ts';
import * as schema from '#api/databases/schema.ts';
import { defineAuth } from './auth.ts';
import { defineConfig } from './config.ts';
import { defineDatabase } from './database.ts';
import { defineLogger } from './logger.ts';

/**
 * The IoC container type.
 */
export type Container = Awaited<ReturnType<typeof defineContainer>>;

/**
 * Defines the IoC container with all dependencies.
 */
export async function defineContainer() {
  const config = defineConfig();
  const logger = await defineLogger({
    level: 'info',
    redact: [],
  });
  const db = await defineDatabase({
    logger,
    poolConfig: {
      connectionString: config.DATABASE_URL,
    },
    relations,
    schema,
  });
  const auth = defineAuth({
    config,
    db,
    logger,
  });

  return {
    auth,
    config,
    db,
    logger,
  };
}

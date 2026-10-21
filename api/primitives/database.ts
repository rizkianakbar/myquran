import type { AnyRelations, Logger as DrizzleLogger, EmptyRelations } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Client, Pool, type PoolConfig } from 'pg';
import type { Logger } from './logger.ts';

/**
 * The database logger.
 */
class DatabaseLogger implements DrizzleLogger {
  #logger: Logger;

  constructor(logger: Logger) {
    this.#logger = logger;
  }

  logQuery(query: string, params: unknown[]): void {
    this.#logger.info(params, query);
  }
}

/**
 * Options for defining the database.
 */
export interface DefineDatabaseOptions<
  TSchema extends Record<string, unknown> = Record<string, never>,
  TRelations extends AnyRelations = EmptyRelations,
> {
  logger: Logger;
  poolConfig: PoolConfig;
  relations?: TRelations;
  schema?: TSchema;
}

/**
 * The database type.
 */
export type Database<
  TSchema extends Record<string, unknown> = Record<string, never>,
  TRelations extends AnyRelations = EmptyRelations,
> = Awaited<ReturnType<typeof defineDatabase<TSchema, TRelations>>>;

/**
 * Define the database with the provided options.
 *
 * @param opts The options for defining the database.
 * @returns The database instance.
 */
export async function defineDatabase<
  TSchema extends Record<string, unknown> = Record<string, never>,
  TRelations extends AnyRelations = EmptyRelations,
>(opts: DefineDatabaseOptions<TSchema, TRelations>) {
  return drizzle({
    client: new Pool({
      application_name: 'fullstack-starter',
      max: 16,
      ...opts.poolConfig,
    }),
    logger: new DatabaseLogger(opts.logger),
    relations: opts.relations,
    schema: opts.schema,
  });
}

/**
 * Options for defining a test database.
 */
interface DefineTestDatabaseOptions<
  TSchema extends Record<string, unknown> = Record<string, never>,
  TRelations extends AnyRelations = EmptyRelations,
> {
  connectionString: string;
  logger: Logger;
  name: string;
  schema: TSchema;
  relations: TRelations;
}

/**
 * Parsed PostgreSQL connection URL components.
 */
interface PostgresUrlComponents {
  database: string;
  host: string;
  password: string;
  port: number;
  user: string;
}

/**
 * Parse PostgreSQL connection URL into components.
 */
function parsePostgresUrl(connectionString: string): PostgresUrlComponents {
  const url = new URL(connectionString);
  return {
    database: url.pathname.slice(1) || 'postgres',
    host: url.hostname,
    password: decodeURIComponent(url.password),
    port: Number.parseInt(url.port || '5432', 10),
    user: decodeURIComponent(url.username),
  };
}

/**
 * Build PostgreSQL connection URL from components.
 */
function buildPostgresUrl(components: PostgresUrlComponents): string {
  const { user, password, host, port, database } = components;
  const encodedUser = encodeURIComponent(user);
  const encodedPassword = encodeURIComponent(password);
  return `postgresql://${encodedUser}:${encodedPassword}@${host}:${port}/${database}`;
}

/**
 * Get connection URL for maintenance database operations.
 */
function getMaintenanceDbUrl(connectionString: string): string {
  const components = parsePostgresUrl(connectionString);
  components.database = 'postgres';
  return buildPostgresUrl(components);
}

/**
 * Generate deterministic advisory lock ID from template database name.
 */
function getAdvisoryLockId(templateDbName: string): number {
  let hash = 0;
  for (let i = 0; i < templateDbName.length; i++) {
    const char = templateDbName.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}

/**
 * Ensure template database exists with migrations applied.
 */
async function ensureTemplateDatabase(connectionString: string, name: string, logger?: Logger): Promise<void> {
  const templateDbName = `${name}_test_template`;
  const maintenanceUrl = getMaintenanceDbUrl(connectionString);
  const maintenanceClient = new Client({ connectionString: maintenanceUrl });
  await maintenanceClient.connect();
  const lockId = getAdvisoryLockId(templateDbName);

  try {
    await maintenanceClient.query('SELECT pg_advisory_lock($1)', [lockId]);

    const result = await maintenanceClient.query('SELECT 1 FROM pg_database WHERE datname = $1', [templateDbName]);

    if (result.rowCount === 0) {
      await maintenanceClient.query(`CREATE DATABASE "${templateDbName}" WITH IS_TEMPLATE = true`);

      const components = parsePostgresUrl(connectionString);
      components.database = templateDbName;

      const templateUrl = buildPostgresUrl(components);
      const templatePool = new Pool({ connectionString: templateUrl });

      try {
        const db = drizzle({
          client: templatePool,
          logger: logger ? new DatabaseLogger(logger) : undefined,
        });

        await migrate(db, {
          migrationsFolder: './api/databases/schema_migrations',
          migrationsSchema: 'public',
          migrationsTable: 'schema_migrations',
        });
      } finally {
        await templatePool.end();
      }
    }
  } finally {
    await maintenanceClient.query('SELECT pg_advisory_unlock($1)', [lockId]);
    await maintenanceClient.end();
  }
}

/**
 * Create a test database with isolated schema.
 *
 * @param opts - Test database options
 * @returns Test database instance and cleanup function
 */
export async function defineTestDatabase<
  TSchema extends Record<string, unknown> = Record<string, never>,
  TRelations extends AnyRelations = EmptyRelations,
>(opts: DefineTestDatabaseOptions<TSchema, TRelations>) {
  const workerId = process.env.VITEST_POOL_ID || '0';
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  const dbName = `test_w${workerId}_${timestamp}_${random}`;

  await ensureTemplateDatabase(opts.connectionString, opts.name, opts.logger);

  const templateDbName = `${opts.name}_test_template`;
  const maintenanceUrl = getMaintenanceDbUrl(opts.connectionString);
  const maintenanceClient = new Client({ connectionString: maintenanceUrl });
  await maintenanceClient.connect();

  try {
    await maintenanceClient.query(`CREATE DATABASE "${dbName}" WITH TEMPLATE "${templateDbName}"`);
  } finally {
    await maintenanceClient.end();
  }

  const testComponents = parsePostgresUrl(opts.connectionString);
  testComponents.database = dbName;

  const testConnectionString = buildPostgresUrl(testComponents);
  const testPool = new Pool({ connectionString: testConnectionString });
  const db = drizzle({
    client: testPool,
    logger: opts.logger ? new DatabaseLogger(opts.logger) : undefined,
    relations: opts.relations,
    schema: opts.schema,
  });

  const cleanUp = async () => {
    await testPool.end();

    const cleanupClient = new Client({ connectionString: maintenanceUrl });
    await cleanupClient.connect();

    try {
      await cleanupClient.query(`SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = $1`, [dbName]);
      await cleanupClient.query(`DROP DATABASE IF EXISTS "${dbName}"`);
    } catch (error) {
      console.error('Could not drop test database:', error);
    } finally {
      await cleanupClient.end();
    }
  };

  return {
    cleanUp,
    db,
    dbName,
  };
}

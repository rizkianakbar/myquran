import { exec } from 'node:child_process';
import { existsSync } from 'node:fs';
import { promisify } from 'node:util';
import { spinner } from '@clack/prompts';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import colors from 'picocolors';
import type { Container } from '#api/primitives/container.ts';

const execAsync = promisify(exec);

const SCHEMA_PATH = './databases/schema.ts';
const MIGRATIONS_PATH = './databases/schema_migrations';

/**
 * Detect package manager from lockfile.
 */
function detectPackageManager(): string {
  if (existsSync('bun.lock') || existsSync('bun.lockb')) return 'bun';
  if (existsSync('pnpm-lock.yaml')) return 'pnpm';
  if (existsSync('yarn.lock')) return 'yarn';
  return 'npm';
}

/**
 * Execute a drizzle-kit command with proper output handling.
 */
export async function executeDrizzleKitCommand(opts: {
  command: 'generate' | 'push' | 'migrate';
  description: string;
}): Promise<void> {
  const pm = detectPackageManager();
  const pmx = pm === 'npm' ? 'npx' : pm;

  const args = [
    `${pmx} drizzle-kit ${opts.command}`,
    '--dialect=postgresql',
    `--schema=${SCHEMA_PATH}`,
    `--out=${MIGRATIONS_PATH}`,
  ];

  if (opts.command === 'generate') {
    args.push('--prefix=timestamp');
  }

  const cmd = args.join(' ');
  const s = spinner();
  const startTime = Date.now();

  s.start(opts.description);

  try {
    const { stderr } = await execAsync(cmd, { cwd: process.cwd() });
    const hasErrors = stderr?.includes('Error') || stderr?.includes('error');

    if (hasErrors) {
      throw new Error(stderr || 'Command failed');
    }

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
    s.stop(`${colors.green('✓')} ${opts.description} (${elapsed}s)`);
  } catch (error: unknown) {
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
    s.stop(`${colors.red('✗')} ${opts.description} failed (${elapsed}s)`);

    const err = error as { stderr?: string; stdout?: string; message?: string };
    const errorMsg = err.stderr?.trim() || err.stdout?.trim() || err.message || 'Unknown error';
    throw new Error(`Command: ${cmd}\n\n${errorMsg}`);
  }
}

/**
 * Run schema migrations using drizzle-orm migrate.
 */
export async function runSchemaMigrate(container: Container): Promise<void> {
  const s = spinner();
  const startTime = Date.now();

  s.start('Applying schema migrations');

  try {
    await migrate(container.db as unknown as NodePgDatabase<Record<string, never>>, {
      migrationsFolder: MIGRATIONS_PATH,
      migrationsSchema: 'public',
      migrationsTable: 'schema_migrations',
    });

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
    s.stop(`${colors.green('✓')} Schema migrations applied (${elapsed}s)`);
  } catch (error) {
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
    s.stop(`${colors.red('✗')} Schema migrations failed (${elapsed}s)`);

    const err = error as { message?: string };
    throw new Error(err.message || 'Migration failed');
  }
}

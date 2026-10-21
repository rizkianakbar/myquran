import { cancel, intro, outro } from '@clack/prompts';
import { runSchemaMigrate } from '#api/lib/database/cli.ts';
import { defineCommand } from '#api/primitives/cli.ts';

export const dbMigrate = defineCommand({
  name: 'db:migrate',
  description: 'Apply pending database migrations',
  async run(_args, container) {
    intro('Apply Schema Migrations');

    try {
      await runSchemaMigrate(container);
      outro('Schema migrations applied!');
    } catch (error) {
      cancel(error instanceof Error ? error.message : 'Unknown error');
      process.exit(1);
    } finally {
      await container.db.$client.end();
    }
  },
});

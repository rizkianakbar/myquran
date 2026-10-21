import { cancel, intro, outro } from '@clack/prompts';
import { executeDrizzleKitCommand } from '#api/lib/database/cli.ts';
import { defineCommand } from '#api/primitives/cli.ts';

export const dbGen = defineCommand({
  name: 'db:gen',
  description: 'Generate SQL migration from schema changes',
  async run() {
    intro('Generate Schema Migration');

    try {
      await executeDrizzleKitCommand({
        command: 'generate',
        description: 'Generating schema migration',
      });
      outro('Schema migration generated!');
    } catch (error) {
      cancel(error instanceof Error ? error.message : 'Unknown error');
      process.exit(1);
    }
  },
});

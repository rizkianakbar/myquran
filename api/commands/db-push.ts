import { cancel, intro, outro } from '@clack/prompts';
import { executeDrizzleKitCommand } from '#api/lib/database/cli.ts';
import { defineCommand } from '#api/primitives/cli.ts';

export const dbPush = defineCommand({
  name: 'db:push',
  description: 'Push schema changes directly to database',
  async run() {
    intro('Push Schema Changes');

    try {
      await executeDrizzleKitCommand({
        command: 'push',
        description: 'Pushing schema changes',
      });
      outro('Schema changes pushed!');
    } catch (error) {
      cancel(error instanceof Error ? error.message : 'Unknown error');
      process.exit(1);
    }
  },
});

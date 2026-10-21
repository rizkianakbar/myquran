import { defineCommand } from '#api/primitives/cli.ts';
import { createServer } from '#api/primitives/server.ts';

export const start = defineCommand({
  name: 'start',
  description: 'Start the API server',
  async run(_args, container) {
    await createServer(container);
  },
});

import * as commands from '#api/commands/index.ts';
import { CLI } from '#api/primitives/cli.ts';
import { defineContainer } from '#api/primitives/container.ts';

async function main() {
  const container = await defineContainer();
  const cli = new CLI(container);
  for (const cmd of Object.values(commands)) {
    if (cmd) cli.command(cmd);
  }

  await cli.run();
}

main().catch(console.error);

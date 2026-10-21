import type { Container } from './container.ts';

/**
 * Simple CLI command interface for the project.
 */
export interface Command<C = Container> {
  name: string;
  description: string;
  run: (args: string[], container: C) => Promise<void>;
}

/**
 * Define a command with type safety.
 */
export function defineCommand<C extends Container>(cmd: Command<C>): Command<C> {
  return cmd;
}

/**
 * Simple CLI class that manages commands and their execution.
 */
export class CLI<C extends Container = Container> {
  private commands = new Map<string, Command<C>>();
  private container: C;

  constructor(container: C) {
    this.container = container;
  }

  /**
   * Register a command with the CLI.
   */
  command(cmd: Command<C>): this {
    this.commands.set(cmd.name, cmd);
    return this;
  }

  /**
   * Run the CLI with the provided arguments.
   */
  async run(args: string[] = process.argv.slice(2)): Promise<void> {
    const [cmdName, ...cmdArgs] = args;

    if (!cmdName || cmdName === '--help' || cmdName === '-h') {
      this.showHelp();
      return;
    }

    const command = this.commands.get(cmdName);
    if (!command) {
      console.error(`Unknown command: ${cmdName}\n`);
      this.showHelp();
      process.exit(1);
    }

    await command.run(cmdArgs, this.container);
  }

  private showHelp(): void {
    console.log('fullstack-starter API CLI\n');
    console.log('Commands:');

    for (const [name, cmd] of this.commands) {
      console.log(`  ${name.padEnd(20)} ${cmd.description}`);
    }
  }
}

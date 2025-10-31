export interface Command {
  name: string;
  description?: string;
  alias?: string;
  action: (
    args: string[],
    options: Record<string, string | boolean>
  ) => Promise<void> | void;
}

export class CommandRegistry {
  private commands: Map<string, Command> = new Map();

  register(command: Command): void {
    this.commands.set(command.name, command);
    if (command.alias) {
      this.commands.set(command.alias, command);
    }
  }

  getCommand(name: string): Command | undefined {
    return this.commands.get(name);
  }

  getAllCommands(): Command[] {
    const seen = new Set<string>();
    const result: Command[] = [];
    for (const cmd of this.commands.values()) {
      if (!seen.has(cmd.name)) {
        seen.add(cmd.name);
        result.push(cmd);
      }
    }
    return result;
  }

  parseArgs(argv: string[]): {
    command?: string;
    args: string[];
    options: Record<string, string | boolean>;
  } {
    const args: string[] = [];
    const options: Record<string, string | boolean> = {};

    for (let i = 2; i < argv.length; i++) {
      const arg = argv[i];

      if (arg.startsWith("--") || arg.startsWith("-")) {
        const key = arg.replace(/^-+/, "");
        const nextArg = argv[i + 1];
        if (nextArg && !nextArg.startsWith("-")) {
          options[key] = nextArg;
          i++;
        } else {
          options[key] = true;
        }
      } else {
        args.push(arg);
      }
    }

    return {
      command: args[0],
      args: args.slice(1),
      options,
    };
  }
}

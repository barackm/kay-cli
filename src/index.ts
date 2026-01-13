#!/usr/bin/env node
import * as p from "@clack/prompts";
import pc from "picocolors";
import { loadModules } from "./core/moduleLoader.js";
import { Logger } from "./core/logger.js";
import { CommandRegistry } from "./core/commandRegistry.js";

const registry = new CommandRegistry();

function showHelp(registry: CommandRegistry, commandName?: string) {
  if (commandName) {
    const command = registry.getCommand(commandName);
    if (!command) {
      Logger.error(`Command "${commandName}" not found`);
      return;
    }

    console.log("");
    console.log(`  ${pc.bold(pc.cyan(command.name))}`);
    if (command.description) {
      console.log(`  ${pc.dim(command.description)}`);
    }
    console.log("");
    console.log(`  ${pc.dim("Usage")}`);
    console.log(
      `    ${pc.cyan("$")} kay ${pc.white(command.name)} ${pc.dim("[options]")}`
    );
    console.log("");

    if (command.options && command.options.length > 0) {
      console.log(`  ${pc.dim("Options")}`);
      command.options.forEach((opt) => {
        const flag =
          opt.type === "boolean"
            ? `--${opt.name}`
            : `--${opt.name} ${pc.dim("<value>")}`;
        console.log(`    ${pc.cyan(flag.padEnd(20))} ${pc.dim(opt.description)}`);
      });
      console.log("");
    }
  } else {
    console.log("");
    console.log(`  ${pc.bold(pc.cyan("Kay"))}`);
    console.log(`  ${pc.dim("AI assistant for Jira & Atlassian")}`);
    console.log("");

    const commands = registry.getAllCommands();

    if (commands.length > 0) {
      console.log(`  ${pc.dim("Commands")}`);
      console.log("");
      commands.forEach((cmd) => {
        const cmdName = cmd.alias
          ? `${cmd.name}${pc.dim(", " + cmd.alias)}`
          : cmd.name;
        console.log(
          `    ${pc.cyan(cmdName.padEnd(18))} ${pc.dim(cmd.description || "")}`
        );
      });
      console.log("");
    }

    console.log(`  ${pc.dim("Usage")}`);
    console.log(`    ${pc.cyan("$")} kay ${pc.white("<command>")} ${pc.dim("[options]")}`);
    console.log(`    ${pc.cyan("$")} kay help ${pc.white("<command>")}`);
    console.log("");
    console.log(`  ${pc.dim("v1.0.0")}`);
    console.log("");
  }
}

async function main() {
  const spinner = p.spinner();
  spinner.start("Loading modules...");
  await loadModules(registry);
  spinner.stop();

  const parsed = registry.parseArgs(process.argv);

  if (parsed.command === "help") {
    showHelp(registry, parsed.args[0]);
    return;
  }

  if (parsed.options.help || parsed.options.h) {
    showHelp(registry, parsed.command);
    return;
  }

  if (!parsed.command) {
    console.log("");
    console.log(`  ${pc.bold(pc.cyan("Kay"))}`);
    console.log(`  ${pc.dim("AI assistant for Jira & Atlassian")}`);
    console.log("");

    const commands = registry.getAllCommands();

    if (commands.length > 0) {
      console.log(`  ${pc.dim("Commands")}`);
      console.log("");
      commands.forEach((cmd) => {
        const cmdName = cmd.alias
          ? `${cmd.name}${pc.dim(", " + cmd.alias)}`
          : cmd.name;
        console.log(
          `    ${pc.cyan(cmdName.padEnd(18))} ${pc.dim(cmd.description || "")}`
        );
      });
      console.log("");
    }

    console.log(`  ${pc.dim("Usage")}`);
    console.log(`    ${pc.cyan("$")} kay ${pc.white("<command>")} ${pc.dim("[options]")}`);
    console.log(`    ${pc.cyan("$")} kay help ${pc.white("<command>")}`);
    console.log("");
    console.log(`  ${pc.dim("v1.0.0")}`);
    console.log("");

    return;
  }

  const command = registry.getCommand(parsed.command);
  if (!command) {
    Logger.error(`Command "${parsed.command}" not found`);
    process.exit(1);
  }

  try {
    await command.action(parsed.args, parsed.options);
  } catch (error) {
    Logger.error((error as Error).message);
    process.exit(1);
  }
}

void main();

#!/usr/bin/env node
import * as p from "@clack/prompts";
import pc from "picocolors";
import boxen from "boxen";
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
    console.log(pc.bold(pc.cyan(`${command.name}`)));
    if (command.description) {
      console.log(pc.gray(command.description));
    }
    console.log("");

    console.log(pc.bold("Usage:"));
    console.log(
      `  ${pc.white(`kay ${command.name}`)} ${pc.gray("[options] [args]")}`
    );
    console.log("");

    if (command.options && command.options.length > 0) {
      console.log(pc.bold("Options:"));
      command.options.forEach((opt) => {
        const flag =
          opt.type === "boolean" ? `--${opt.name}` : `--${opt.name} <value>`;
        console.log(
          `  ${pc.cyan(flag.padEnd(25))} ${pc.gray(opt.description)}`
        );
      });
      console.log("");
    }
  } else {
    console.clear();
    console.log(
      boxen(
        pc.bold(pc.white("Welcome to Kay CLI — your intelligent assistant")),
        {
          padding: 1,
          borderColor: "cyan",
          borderStyle: "double",
        }
      )
    );

    console.log(pc.gray("Version:"), pc.white("1.0.0"));
    console.log(pc.gray("Author:"), pc.white("KYG Trade AIS Team"));

    const commands = registry.getAllCommands();

    if (commands.length > 0) {
      console.log("");
      console.log(pc.bold(pc.cyan("✨ Available Commands:")));
      console.log("");
      commands.forEach((cmd) => {
        console.log(
          `  ${pc.bold(pc.white(cmd.name.padEnd(15)))} ${pc.gray(
            cmd.description || "No description"
          )}`
        );
      });
    }

    console.log("");
    console.log(pc.bold(pc.cyan("💡 Usage:")));
    console.log(
      `  ${pc.white("kay <command>")}          ${pc.gray("Run a command")}`
    );
    console.log(
      `  ${pc.white("kay help <command>")}     ${pc.gray(
        "Show help for a command"
      )}`
    );
    console.log(
      `  ${pc.white("kay <command> --help")}   ${pc.gray(
        "Show help for a command"
      )}`
    );
    console.log("");
  }
}

async function main() {
  p.intro(pc.bgCyan(pc.black("  Kay CLI  ")));

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
    console.clear();
    console.log(
      boxen(
        pc.bold(pc.white("Welcome to Kay CLI — your intelligent assistant")),
        {
          padding: 1,
          borderColor: "cyan",
          borderStyle: "double",
        }
      )
    );

    console.log(pc.gray("Version:"), pc.white("1.0.0"));
    console.log(pc.gray("Author:"), pc.white("KYG Trade AIS Team"));

    const commands = registry.getAllCommands();

    if (commands.length > 0) {
      console.log(pc.bold(pc.cyan("✨ Available Commands:")));
      console.log("");
      commands.forEach((cmd) => {
        console.log(
          `${pc.green("•")} ${pc.bold(pc.white(cmd.name))}${
            cmd.alias ? pc.gray(` (${cmd.alias})`) : ""
          }  ${pc.dim("— " + (cmd.description || "No description"))}`
        );
      });
    } else {
      console.log(pc.yellow("⚠️  No commands loaded yet."));
    }

    console.log("\n" + pc.cyan("💡 Tips:"));
    console.log(
      pc.gray("  • Type ") +
        pc.white("kay <command>") +
        pc.gray(" to run a command.")
    );
    console.log(
      pc.gray("  • Type ") +
        pc.white("kay help") +
        pc.gray(" to view more usage info.")
    );

    p.outro(pc.green("Kay is ready to assist you 🚀"));
    return;
  }

  const command = registry.getCommand(parsed.command);
  if (!command) {
    Logger.error(`Command "${parsed.command}" not found`);
    p.cancel(`Command "${parsed.command}" not found`);
    process.exit(1);
  }

  try {
    await command.action(parsed.args, parsed.options);
    p.outro(pc.green("Done! 🚀"));
  } catch (error) {
    Logger.error((error as Error).message);
    p.cancel((error as Error).message);
    process.exit(1);
  }
}

void main();

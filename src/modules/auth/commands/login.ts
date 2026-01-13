import * as p from "@clack/prompts";
import pc from "picocolors";
import { Logger } from "../../../core/logger.js";
import { authClient } from "../authClient.js";
import { promptEmail, promptPassword } from "../utils/prompts.js";

export async function loginCommand(
  args: string[],
  options: Record<string, string | boolean>
): Promise<void> {
  try {
    if (authClient.isAuthenticated()) {
      Logger.warn("You are already logged in.");
      console.log("");
      console.log(
        pc.gray("Run ") +
          pc.cyan("kay whoami") +
          pc.gray(" to see your current user information.")
      );
      console.log("");
      return;
    }

    Logger.info("Please login to continue.");
    console.log("");

    const email = await promptEmail();
    const password = await promptPassword();

    const spinner = p.spinner();
    spinner.start("Logging in...");

    try {
      const loginResponse = await authClient.login(email, password);
      spinner.stop();

      Logger.success("Logged in successfully!");
      console.log("");
      console.log(pc.bold(pc.cyan("User Information:")));
      console.log(`  ${pc.bold("Email:")}    ${loginResponse.user.email}`);
      console.log(
        `  ${pc.bold("Name:")}     ${loginResponse.user.firstName} ${loginResponse.user.lastName}`
      );
      console.log(`  ${pc.bold("User ID:")}  ${loginResponse.user.userid}`);
      console.log("");
    } catch (error) {
      spinner.stop();
      throw error;
    }
  } catch (error) {
    p.cancel((error as Error).message);
    process.exit(1);
  }
}

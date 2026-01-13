import * as p from "@clack/prompts";
import pc from "picocolors";
import { Logger } from "../../../core/logger.js";
import { authClient } from "../authClient.js";
import { promptEmail, promptPassword } from "../utils/prompts.js";

export async function loginCommand(
  _args: string[],
  _options: Record<string, string | boolean>
): Promise<void> {
  try {
    if (authClient.isAuthenticated()) {
      Logger.warn("Already logged in");
      console.log(`  ${pc.dim("Run")} ${pc.cyan("kay whoami")} ${pc.dim("to see your info")}`);
      console.log("");
      return;
    }

    Logger.info("Please login to continue");
    console.log("");

    const email = await promptEmail();
    const password = await promptPassword();

    const spinner = p.spinner();
    spinner.start("Logging in...");

    try {
      const loginResponse = await authClient.login(email, password);
      spinner.stop();

      Logger.success("Logged in successfully");
      console.log("");
      console.log(`  ${pc.dim("Email")}     ${pc.white(loginResponse.user.email)}`);
      console.log(`  ${pc.dim("Name")}      ${pc.white(loginResponse.user.firstName + " " + loginResponse.user.lastName)}`);
      console.log(`  ${pc.dim("User ID")}   ${pc.white(String(loginResponse.user.userid))}`);
      console.log("");
    } catch (error) {
      spinner.stop();
      throw error;
    }
  } catch (error) {
    Logger.error((error as Error).message);
    process.exit(1);
  }
}

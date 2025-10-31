import * as p from "@clack/prompts";
import { Logger } from "../../../core/logger.js";
import { JiraClient } from "../jiraClient.js";
import { loginCommand } from "./login.js";

export async function reauthCommand(
  args: string[],
  options: Record<string, string | boolean>
): Promise<void> {
  try {
    const client = new JiraClient();

    if (!client.isAuthenticated()) {
      Logger.info("Not currently authenticated. Running login flow...");
      await loginCommand(args, options);
      return;
    }

    const existingConfig = client.getBaseUrl();
    const credentials = client.getCredentials();

    Logger.info("Re-authenticating with existing credentials...");
    Logger.info(`Base URL: ${existingConfig || "unknown"}`);
    if (credentials?.email) {
      Logger.info(`Email: ${credentials.email}`);
    }

    await loginCommand(args, options);
  } catch (error) {
    Logger.error((error as Error).message);
    process.exit(1);
  }
}

import * as p from "@clack/prompts";
import pc from "picocolors";
import { Logger } from "../../../core/logger.js";
import { JiraClient } from "../jiraClient.js";

export async function statusCommand(
  args: string[],
  options: Record<string, string | boolean>
): Promise<void> {
  const outputJson = options.json === true || options.json === "true";
  const verbose = options.verbose === true || options.verbose === "true";

  try {
    const client = new JiraClient();

    if (!client.isAuthenticated()) {
      if (outputJson) {
        console.log(
          JSON.stringify({
            authenticated: false,
            valid: false,
            message: "Not authenticated",
          })
        );
      } else {
        Logger.error("Not authenticated. Run 'kay login' first.");
      }
      process.exit(1);
    }

    const s = p.spinner();
    s.start("Checking authentication status...");

    try {
      const user = await client.getMyself();
      const baseUrl = client.getBaseUrl();

      s.stop();

      if (outputJson) {
        console.log(
          JSON.stringify({
            authenticated: true,
            valid: true,
            email: user.emailAddress,
            accountId: user.accountId,
            displayName: user.displayName,
            baseUrl,
          })
        );
      } else {
        Logger.success("Authentication status: Valid");
        if (verbose) {
          console.log("");
          Logger.info("Connection details:");
          console.log(
            `  ${pc.bold(pc.cyan("User:"))}      ${user.displayName}`
          );
          console.log(
            `  ${pc.bold(pc.cyan("Email:"))}     ${user.emailAddress}`
          );
          console.log(`  ${pc.bold(pc.cyan("Account ID:"))} ${user.accountId}`);
          if (baseUrl) {
            console.log(`  ${pc.bold(pc.cyan("Base URL:"))}  ${baseUrl}`);
          }
          console.log("");
        }
      }
    } catch (error) {
      s.stop();
      if (outputJson) {
        console.log(
          JSON.stringify({
            authenticated: true,
            valid: false,
            error: (error as Error).message,
          })
        );
      } else {
        Logger.error("Authentication status: Invalid");
        Logger.error((error as Error).message);
        if (!verbose) {
          Logger.info("Run 'kay auth:status --verbose' for more details");
        }
      }
      process.exit(1);
    }
  } catch (error) {
    p.cancel((error as Error).message);
    process.exit(1);
  }
}

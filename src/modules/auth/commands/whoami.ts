import * as p from "@clack/prompts";
import pc from "picocolors";
import { Logger } from "../../../core/logger.js";
import { JiraClient } from "../jiraClient.js";

export async function whoamiCommand(
  args: string[],
  options: Record<string, string | boolean>
): Promise<void> {
  const outputJson = options.json === true || options.json === "true";

  try {
    const client = new JiraClient();

    if (!client.isAuthenticated()) {
      Logger.error("Not authenticated. Run 'kay login' first.");
      process.exit(1);
    }

    const s = p.spinner();
    s.start("Fetching user information...");

    const user = await client.getMyself();
    const baseUrl = client.getBaseUrl();

    s.stop();

    if (outputJson) {
      console.log(
        JSON.stringify({
          email: user.emailAddress,
          accountId: user.accountId,
          displayName: user.displayName,
          baseUrl,
        })
      );
    } else {
      console.log("");
      Logger.info("Currently authenticated as:");
      console.log(`  ${pc.bold(pc.cyan("Name:"))}      ${user.displayName}`);
      console.log(`  ${pc.bold(pc.cyan("Email:"))}     ${user.emailAddress}`);
      console.log(`  ${pc.bold(pc.cyan("Account ID:"))} ${user.accountId}`);
      if (baseUrl) {
        console.log(`  ${pc.bold(pc.cyan("Site URL:"))}  ${baseUrl}`);
      }
      console.log("");
    }
  } catch (error) {
    p.cancel((error as Error).message);
    process.exit(1);
  }
}

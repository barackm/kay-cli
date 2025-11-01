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

    const meResponse = await client.getMyself();
    const user = meResponse.data;

    s.stop();

    if (outputJson) {
      console.log(JSON.stringify(meResponse, null, 2));
    } else {
      console.log("");
      Logger.info("Currently authenticated as:");
      console.log(`  ${pc.bold(pc.cyan("Name:"))}         ${user.name}`);
      console.log(`  ${pc.bold(pc.cyan("Email:"))}        ${user.email}`);
      console.log(
        `  ${pc.bold(pc.cyan("Account Type:"))} ${user.account_type}`
      );
      console.log(
        `  ${pc.bold(pc.cyan("Status:"))}       ${user.account_status}`
      );

      if (user.resources && user.resources.length > 0) {
        console.log("");
        Logger.info("Accessible Jira sites:");
        user.resources.forEach((resource, index) => {
          console.log(
            `  ${pc.green(`${index + 1}.`)} ${pc.bold(resource.name)}`
          );
          console.log(`     ${pc.gray("URL:")} ${resource.url}`);
        });
      }
      console.log("");
    }
  } catch (error) {
    p.cancel((error as Error).message);
    process.exit(1);
  }
}

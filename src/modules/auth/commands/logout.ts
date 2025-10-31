import { Logger } from "../../../core/logger.js";
import { JiraClient } from "../jiraClient.js";

export async function logoutCommand(
  args: string[],
  options: Record<string, string | boolean>
): Promise<void> {
  try {
    const client = new JiraClient();

    if (!client.isAuthenticated()) {
      Logger.warn("Not authenticated. Nothing to logout.");
      return;
    }

    client.clearCredentials();
    Logger.success("Successfully logged out");
  } catch (error) {
    Logger.error((error as Error).message);
    process.exit(1);
  }
}

import { Logger } from "../../../core/logger.js";
import { authClient } from "../authClient.js";
import { clearSession } from "../../../core/sessionManager.js";

export async function logoutCommand(
  _args: string[],
  _options: Record<string, string | boolean>
): Promise<void> {
  try {
    if (!authClient.isAuthenticated()) {
      Logger.warn("You are not logged in.");
      console.log("");
      return;
    }

    clearSession();
    Logger.success("Logged out successfully.");
    console.log("");
  } catch (error) {
    Logger.error((error as Error).message);
    process.exit(1);
  }
}

import * as p from "@clack/prompts";
import pc from "picocolors";
import { Logger } from "../../../core/logger.js";
import { authClient } from "../authClient.js";
import { clearSession } from "../../../core/sessionManager.js";

export async function logoutCommand(
  args: string[],
  options: Record<string, string | boolean>
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
    p.cancel((error as Error).message);
    process.exit(1);
  }
}

import * as p from "@clack/prompts";
import { Logger } from "../../../core/logger.js";
import { JiraClient } from "../jiraClient.js";
import { ErrorResponse } from "../types.js";

const BACKEND_URL = "http://localhost:4000";

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

    const s = p.spinner();
    s.start("Logging out...");

    try {
      const credentials = client.getCredentials();
      if (!credentials) {
        throw new Error("No credentials found");
      }

      const response = await fetch(`${BACKEND_URL}/auth/logout`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${credentials.token}`,
          Accept: "application/json",
        },
      });

      s.stop();

      if (!response.ok) {
        if (response.status === 401) {
          Logger.warn("Session already expired or invalid.");
        } else {
          const errorData = (await response
            .json()
            .catch(() => ({}))) as ErrorResponse;
          throw new Error(
            errorData.error || `Logout failed: ${response.statusText}`
          );
        }
      }
    } catch (error) {
      s.stop();
      if (
        error instanceof Error &&
        (error.message.includes("fetch failed") ||
          error.message.includes("ECONNREFUSED"))
      ) {
        Logger.warn(
          "Cannot reach backend, but clearing local credentials anyway."
        );
      } else {
        throw error;
      }
    }

    client.clearCredentials();
    Logger.success("Successfully logged out");
  } catch (error) {
    Logger.error((error as Error).message);
    process.exit(1);
  }
}

import * as p from "@clack/prompts";
import pc from "picocolors";
import { Logger } from "../../../core/logger.js";
import { UserResponse } from "../types.js";
import { apiFetch } from "../../../core/apiClient.js";
import { authClient } from "../authClient.js";

export async function whoamiCommand(
  args: string[],
  options: Record<string, string | boolean>
): Promise<void> {
  const outputJson = options.json === true || options.json === "true";

  try {
    if (!authClient.isAuthenticated()) {
      Logger.error("Not authenticated. Please run 'kay connect' to login.");
      process.exit(1);
    }

    const s = p.spinner();
    s.start("Fetching user information...");

    const response = await apiFetch(`/auth/me`);

    s.stop();

    if (!response.ok) {
      throw new Error(
        `Failed to fetch user information: ${response.status} ${response.statusText}`
      );
    }

    const data = (await response.json()) as UserResponse;

    if (outputJson) {
      console.log(JSON.stringify(data, null, 2));
      return;
    }

    console.log("");
    console.log(pc.bold(pc.cyan("User Information")));
    console.log("");

    if (!data.user) {
      console.log(pc.gray("No user information available."));
      console.log("");
      return;
    }

    const user = data.user;

    if (user.email) {
      console.log(`  ${pc.bold("Email:")}    ${user.email}`);
    }
    if (user.id) {
      console.log(`  ${pc.bold("ID:")}       ${user.id}`);
    }
    if (user.externalUserId) {
      console.log(`  ${pc.bold("External User ID:")} ${user.externalUserId}`);
    }
    if (user.createdAt) {
      console.log(
        `  ${pc.bold("Created:")}  ${new Date(user.createdAt).toLocaleString()}`
      );
    }

    console.log("");
  } catch (error) {
    p.cancel((error as Error).message);
    process.exit(1);
  }
}

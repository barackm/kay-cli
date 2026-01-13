import * as p from "@clack/prompts";
import pc from "picocolors";
import boxen from "boxen";
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

    if (!data.user) {
      console.log(
        boxen(pc.gray("No user information available."), {
          padding: 1,
          margin: 1,
          borderStyle: "round",
          borderColor: "gray",
          title: pc.bold(pc.cyan("User Information")),
        })
      );
      console.log("");
      return;
    }

    const user = data.user;
    const lines: string[] = [];

    if (user.email) {
      lines.push(`${pc.dim("Email:")}    ${pc.white(user.email)}`);
    }
    if (user.id) {
      lines.push(`${pc.dim("ID:")}       ${pc.white(user.id)}`);
    }
    if (user.externalUserId) {
      lines.push(
        `${pc.dim("External User ID:")} ${pc.white(
          String(user.externalUserId)
        )}`
      );
    }
    if (user.createdAt) {
      lines.push(
        `${pc.dim("Created:")}  ${pc.white(
          new Date(user.createdAt).toLocaleString()
        )}`
      );
    }

    if (lines.length > 0) {
      console.log(
        boxen(lines.join("\n"), {
          padding: 1,
          margin: 1,
          borderStyle: "round",
          borderColor: "cyan",
          title: pc.bold(pc.cyan("User Information")),
        })
      );
    }
    console.log("");
  } catch (error) {
    p.cancel((error as Error).message);
    process.exit(1);
  }
}

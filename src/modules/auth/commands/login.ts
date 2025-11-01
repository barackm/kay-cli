import * as p from "@clack/prompts";
import open from "open";
import { Logger } from "../../../core/logger.js";
import { JiraClient } from "../jiraClient.js";
import { LoginInitResponse, StatusResponse } from "../types.js";

const BACKEND_URL = "http://localhost:4000";
const POLL_INTERVAL = 2000;
const MAX_POLL_ATTEMPTS = 150;

export async function loginCommand(
  args: string[],
  options: Record<string, string | boolean>
): Promise<void> {
  const outputJson = options.json === true || options.json === "true";

  try {
    const client = new JiraClient();

    if (client.isAuthenticated() && !outputJson) {
      const meResponse = await client.getMyself().catch(() => null);

      if (meResponse) {
        const user = meResponse.data;
        Logger.warn("You are already logged in.");
        Logger.info(`Currently authenticated as: ${user.name} (${user.email})`);

        const shouldLogout = await p.confirm({
          message:
            "Would you like to logout and login with different credentials?",
          initialValue: false,
        });

        if (p.isCancel(shouldLogout)) {
          p.cancel("Login cancelled");
          process.exit(0);
        }

        if (shouldLogout === true) {
          client.clearCredentials();
          Logger.info("Logged out. Proceeding with login...");
          console.log("");
        } else {
          Logger.info("Login cancelled. Using existing credentials.");
          return;
        }
      }
    }

    if (!outputJson) {
      Logger.info("Initiating authentication...");
    }

    const initResponse = await fetch(`${BACKEND_URL}/auth/login`);

    if (!initResponse.ok) {
      throw new Error(
        `Failed to initiate login: ${initResponse.status} ${initResponse.statusText}`
      );
    }

    const initData = (await initResponse.json()) as LoginInitResponse;

    if (!outputJson) {
      Logger.info("Please authorize in your browser.");
      Logger.info("If the browser doesn't open, visit:");
      Logger.info(initData.authorization_url);
      console.log("");
    }

    await open(initData.authorization_url);

    const s = p.spinner();
    s.start("Waiting for authorization...");

    let attempts = 0;

    while (attempts < MAX_POLL_ATTEMPTS) {
      try {
        const statusResponse = await fetch(
          `${BACKEND_URL}/auth/status/${initData.state}`
        );

        if (!statusResponse.ok) {
          if (statusResponse.status === 400) {
            s.stop();
            throw new Error("Invalid or expired state parameter");
          }
          throw new Error(
            `Status check failed: ${statusResponse.status} ${statusResponse.statusText}`
          );
        }

        const statusData = (await statusResponse.json()) as StatusResponse;

        if (statusData.status === "completed") {
          s.stop();

          const newClient = new JiraClient();
          newClient.saveSession(
            statusData.token,
            statusData.refresh_token,
            statusData.account_id
          );

          const meResponse = await newClient.getMyself();
          const user = meResponse.data;

          if (outputJson) {
            console.log(
              JSON.stringify({
                success: true,
                email: user.email,
                accountId: user.account_id,
                displayName: user.name,
                resources: user.resources,
              })
            );
          } else {
            Logger.success(`Successfully authenticated as ${user.name}`);
            Logger.info(`Email: ${user.email}`);
            Logger.info(`Account ID: ${user.account_id}`);
            if (user.resources && user.resources.length > 0) {
              Logger.info(
                `Resources: ${user.resources.length} site(s) accessible`
              );
            }
          }

          return;
        }

        if (statusData.status === "pending") {
          await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL));
          attempts++;
          continue;
        }

        s.stop();
        const data = statusData as { status: string; message: string };
        throw new Error(`Unexpected status: ${data.status} - ${data.message}`);
      } catch (error) {
        if (
          error instanceof Error &&
          (error.message.includes("fetch failed") ||
            error.message.includes("ECONNREFUSED"))
        ) {
          s.stop();
          throw new Error(
            `Cannot connect to Kay backend at ${BACKEND_URL}. Make sure the backend is running.`
          );
        }
        throw error;
      }
    }

    s.stop();
    throw new Error(
      "Authentication timeout (5 minutes). Please try again or check if you completed the login flow."
    );
  } catch (error) {
    p.cancel((error as Error).message);
    process.exit(1);
  }
}

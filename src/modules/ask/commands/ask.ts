import * as p from "@clack/prompts";
import pc from "picocolors";
import { Logger } from "../../../core/logger.js";
import { JiraClient } from "../../auth/jiraClient.js";
import { AskRequest, AskResponse, ErrorResponse } from "../types.js";

const BACKEND_URL = "http://localhost:4000";

export async function askCommand(
  args: string[],
  options: Record<string, string | boolean>
): Promise<void> {
  const interactive = options.interactive === true || options.interactive === "true";
  const confirm = options.confirm === true || options.confirm === "true";
  const outputJson = options.json === true || options.json === "true";

  try {
    const client = new JiraClient();

    if (!client.isAuthenticated()) {
      Logger.error("Not authenticated. Run 'kay login' first.");
      process.exit(1);
    }

    const prompt = args.join(" ");

    if (!prompt) {
      Logger.error("Please provide a prompt. Usage: kay ask \"your question here\"");
      process.exit(1);
    }

    const s = p.spinner();
    s.start("Thinking...");

    const requestBody: AskRequest = {
      prompt,
      interactive,
      confirm,
    };

    const response = await client.makeAuthenticatedRequest(`${BACKEND_URL}/ask`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    s.stop();

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error(
          "Session expired. Run 'kay login' to re-authenticate."
        );
      }

      const errorData = (await response.json().catch(() => ({}))) as ErrorResponse;
      throw new Error(
        errorData.error || `Request failed: ${response.status} ${response.statusText}`
      );
    }

    const data = (await response.json()) as AskResponse;

    if (outputJson) {
      console.log(JSON.stringify(data, null, 2));
    } else {
      console.log("");
      console.log(pc.bold(pc.cyan("Kay:")));
      console.log(data.data.response);

      if (data.data.actions && data.data.actions.length > 0) {
        console.log("");
        console.log(pc.bold(pc.yellow("Suggested Actions:")));
        data.data.actions.forEach((action, index) => {
          console.log(
            `  ${pc.green(`${index + 1}.`)} ${pc.bold(action.type)} - ${action.description}`
          );
        });
      }
      console.log("");
    }
  } catch (error) {
    if (
      error instanceof Error &&
      (error.message.includes("fetch failed") ||
        error.message.includes("ECONNREFUSED"))
    ) {
      Logger.error(
        `Cannot connect to Kay backend at ${BACKEND_URL}. Make sure the backend is running.`
      );
    } else {
      Logger.error((error as Error).message);
    }
    process.exit(1);
  }
}

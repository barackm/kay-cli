import * as p from "@clack/prompts";
import pc from "picocolors";
import boxen from "boxen";
import { Logger } from "../../../core/logger.js";
import { JiraClient } from "../../auth/jiraClient.js";
import { AskRequest, AskResponse, ErrorResponse } from "../types.js";

const BACKEND_URL = "http://localhost:4000";

async function sendMessage(
  client: JiraClient,
  prompt: string,
  interactive?: boolean,
  confirm?: boolean,
  sessionId?: string
): Promise<AskResponse> {
  const requestBody: AskRequest = {
    prompt,
    interactive,
    confirm,
    session_id: sessionId,
  };

  const response = await client.makeAuthenticatedRequest(`${BACKEND_URL}/ask`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error("Session expired. Run 'kay login' to re-authenticate.");
    }

    const errorData = (await response
      .json()
      .catch(() => ({}))) as ErrorResponse;
    throw new Error(
      errorData.error ||
        `Request failed: ${response.status} ${response.statusText}`
    );
  }

  const data = (await response.json()) as AskResponse;

  if (!data.message) {
    console.log(pc.yellow("\n⚠️  Debug: Received response structure:"));
    console.log(JSON.stringify(data, null, 2));
    throw new Error("Invalid response structure from backend");
  }

  return data;
}

async function sendConfirmation(
  client: JiraClient,
  confirmationToken: string,
  approved: boolean
): Promise<AskResponse> {
  const response = await client.makeAuthenticatedRequest(
    `${BACKEND_URL}/ask/confirm`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        confirmation_token: confirmationToken,
        approved,
      }),
    }
  );

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error("Session expired. Run 'kay login' to re-authenticate.");
    }

    const errorData = (await response
      .json()
      .catch(() => ({}))) as ErrorResponse;
    throw new Error(
      errorData.error ||
        `Request failed: ${response.status} ${response.statusText}`
    );
  }

  return (await response.json()) as AskResponse;
}

function renderConversation(
  messages: Array<{ role: "user" | "assistant"; content: string }>
): void {
  console.clear();

  console.log("");
  console.log(
    pc.cyan("  Kay") +
      pc.gray(" by ") +
      pc.white("KYG Trade") +
      pc.gray(" • ") +
      pc.dim("AI assistant for Jira & Atlassian workflows")
  );
  console.log("");

  const conversationLines: string[] = [];

  messages.forEach((msg) => {
    if (msg.role === "user") {
      conversationLines.push(
        pc.bold(pc.green("You: ")) + pc.white(msg.content)
      );
    } else {
      conversationLines.push(pc.bold(pc.cyan("Kay: ")) + pc.white(msg.content));
    }
    conversationLines.push("");
  });

  const conversationContent = conversationLines.join("\n");

  console.log(
    boxen(conversationContent, {
      padding: 1,
      margin: 1,
      borderColor: "cyan",
      borderStyle: "round",
      title: pc.bold(pc.cyan("Interactive Chat Mode")),
      titleAlignment: "center",
    })
  );

  console.log(pc.gray("Type 'exit' or 'quit' to end the conversation"));
  console.log("");
}

async function interactiveChatMode(
  client: JiraClient,
  initialPrompt: string | null,
  confirm: boolean
): Promise<void> {
  let sessionId: string | undefined;
  const messages: Array<{ role: "user" | "assistant"; content: string }> = [];

  if (initialPrompt) {
    messages.push({ role: "user", content: initialPrompt });
    renderConversation(messages);

    const s = p.spinner();
    s.start("Kay is thinking...");

    try {
      const data = await sendMessage(
        client,
        initialPrompt,
        true,
        confirm,
        sessionId
      );
      s.stop();

      sessionId = data.session_id;

      const responseText = data.message || "(No response)";
      messages.push({ role: "assistant", content: responseText });
      renderConversation(messages);

      if (data.requires_confirmation && data.confirmation_token) {
        await handleConfirmation(client, data);
      }
    } catch (error) {
      s.stop();
      throw error;
    }
  } else {
    renderConversation(messages);
  }

  while (true) {
    const userInput = (await p.text({
      message: "You",
      placeholder: "Type your message...",
    })) as string;

    if (p.isCancel(userInput)) {
      console.clear();
      console.log(
        boxen(pc.cyan("Chat ended. Goodbye! 👋"), {
          padding: 1,
          margin: 1,
          borderColor: "cyan",
          borderStyle: "round",
        })
      );
      return;
    }

    const trimmedInput = userInput.trim();

    if (!trimmedInput) {
      continue;
    }

    if (
      trimmedInput.toLowerCase() === "exit" ||
      trimmedInput.toLowerCase() === "quit"
    ) {
      console.clear();
      console.log(
        boxen(pc.cyan("Chat ended. Goodbye! 👋"), {
          padding: 1,
          margin: 1,
          borderColor: "cyan",
          borderStyle: "round",
        })
      );
      return;
    }

    messages.push({ role: "user", content: trimmedInput });
    renderConversation(messages);

    const s = p.spinner();
    s.start("Kay is thinking...");

    try {
      const data = await sendMessage(
        client,
        trimmedInput,
        true,
        confirm,
        sessionId
      );
      s.stop();

      sessionId = data.session_id;

      const responseText = data.message || "(No response)";
      messages.push({ role: "assistant", content: responseText });
      renderConversation(messages);

      if (data.requires_confirmation && data.confirmation_token) {
        await handleConfirmation(client, data);
      }
    } catch (error) {
      s.stop();
      Logger.error((error as Error).message);
      renderConversation(messages);
    }
  }
}

async function handleConfirmation(
  client: JiraClient,
  response: AskResponse
): Promise<void> {
  if (!response.confirmation_token) {
    return;
  }

  console.log(pc.yellow("⚠️  This action requires confirmation:"));
  console.log("");

  const shouldConfirm = await p.confirm({
    message: "Do you want to proceed?",
    initialValue: false,
  });

  if (p.isCancel(shouldConfirm)) {
    Logger.info("Action cancelled by user");
    return;
  }

  const s = p.spinner();
  s.start(shouldConfirm ? "Confirming action..." : "Cancelling action...");

  try {
    const confirmationResult = await sendConfirmation(
      client,
      response.confirmation_token,
      shouldConfirm === true
    );
    s.stop();

    console.log("");
    console.log(
      boxen(pc.white(confirmationResult.message), {
        padding: { left: 2, right: 2, top: 0, bottom: 0 },
        margin: { left: 2 },
        borderColor: "cyan",
        borderStyle: "round",
        title: pc.bold(pc.cyan("Kay")),
        titleAlignment: "left",
      })
    );
  } catch (error) {
    s.stop();
    Logger.error((error as Error).message);
  }
}

export async function askCommand(
  args: string[],
  options: Record<string, string | boolean>
): Promise<void> {
  const interactive =
    options.interactive === true || options.interactive === "true";
  const confirm = options.confirm === true || options.confirm === "true";
  const outputJson = options.json === true || options.json === "true";

  try {
    const client = new JiraClient();

    if (!client.isAuthenticated()) {
      Logger.error("Not authenticated. Run 'kay login' first.");
      process.exit(1);
    }

    const prompt = args.join(" ") || null;

    if (interactive) {
      await interactiveChatMode(client, prompt, confirm);
      return;
    }

    if (!prompt) {
      Logger.error(
        'Please provide a prompt. Usage: kay ask "your question here"'
      );
      process.exit(1);
    }

    const s = p.spinner();
    s.start("Thinking...");

    const data = await sendMessage(client, prompt, false, confirm);

    s.stop();

    if (outputJson) {
      console.log(JSON.stringify(data, null, 2));
    } else {
      console.log("");
      console.log(
        boxen(pc.white(data.message), {
          padding: { left: 2, right: 2, top: 0, bottom: 0 },
          margin: { left: 2 },
          borderColor: "cyan",
          borderStyle: "round",
          title: pc.bold(pc.cyan("Kay")),
          titleAlignment: "left",
        })
      );

      if (data.requires_confirmation && data.confirmation_token) {
        console.log("");
        await handleConfirmation(client, data);
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

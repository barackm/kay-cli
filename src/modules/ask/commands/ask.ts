import * as p from "@clack/prompts";
import pc from "picocolors";
import boxen from "boxen";
import { Logger } from "../../../core/logger.js";
import { apiFetch } from "../../../core/apiClient.js";
import { AskRequest, AskResponse, ErrorResponse } from "../types.js";
import { renderMarkdown } from "../../../core/markdown.js";

async function sendMessage(
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

  const response = await apiFetch(`/ask`, {
    method: "POST",
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorData = (await response
      .json()
      .catch(() => ({}))) as ErrorResponse;
    throw new Error(
      errorData.error ||
        errorData.message ||
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
  confirmationToken: string,
  approved: boolean
): Promise<AskResponse> {
  const response = await apiFetch(`/ask/confirm`, {
    method: "POST",
    body: JSON.stringify({
      confirmation_token: confirmationToken,
      approved,
    }),
  });

  if (!response.ok) {
    const errorData = (await response
      .json()
      .catch(() => ({}))) as ErrorResponse;
    throw new Error(
      errorData.error ||
        errorData.message ||
        `Request failed: ${response.status} ${response.statusText}`
    );
  }

  return (await response.json()) as AskResponse;
}

async function renderConversation(
  messages: Array<{ role: "user" | "assistant"; content: string }>
): Promise<void> {
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

  for (const msg of messages) {
    if (msg.role === "user") {
      conversationLines.push(
        pc.bold(pc.green("You: ")) + pc.white(msg.content)
      );
    } else {
      const renderedMarkdown = await renderMarkdown(msg.content);
      const lines = renderedMarkdown.split("\n");
      conversationLines.push(pc.bold(pc.cyan("Kay:")));
      lines.forEach((line) => {
        conversationLines.push(line);
      });
    }
    conversationLines.push("");
  }

  const conversationContent = conversationLines.join("\n");

  console.log(
    boxen(conversationContent, {
      padding: 1,
      margin: 0,
      borderColor: "cyan",
      borderStyle: "round",
      title: pc.bold(pc.cyan("Interactive Chat Mode")),
      titleAlignment: "center",
      fullscreen: (width) => [width, 0],
    })
  );

  console.log(pc.gray("Type 'exit' or 'quit' to end the conversation"));
  console.log("");
}

async function interactiveChatMode(
  initialPrompt: string | null,
  confirm: boolean
): Promise<void> {
  let sessionId: string | undefined;
  const messages: Array<{ role: "user" | "assistant"; content: string }> = [];

  if (initialPrompt) {
    messages.push({ role: "user", content: initialPrompt });
    await renderConversation(messages);

    const s = p.spinner();
    s.start("Kay is thinking...");

    try {
      const data = await sendMessage(initialPrompt, true, confirm, sessionId);
      s.stop();

      sessionId = data.session_id;

      const responseText = data.message || "(No response)";
      messages.push({ role: "assistant", content: responseText });
      await renderConversation(messages);

      if (data.requires_confirmation && data.confirmation_token) {
        await handleConfirmation(data);
      }
    } catch (error) {
      s.stop();
      throw error;
    }
  } else {
    await renderConversation(messages);
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
    await renderConversation(messages);

    const s = p.spinner();
    s.start("Kay is thinking...");

    try {
      const data = await sendMessage(trimmedInput, true, confirm, sessionId);
      s.stop();

      sessionId = data.session_id;

      const responseText = data.message || "(No response)";
      messages.push({ role: "assistant", content: responseText });
      await renderConversation(messages);

      if (data.requires_confirmation && data.confirmation_token) {
        await handleConfirmation(data);
      }
    } catch (error) {
      s.stop();
      Logger.error((error as Error).message);
      await renderConversation(messages);
    }
  }
}

async function handleConfirmation(response: AskResponse): Promise<void> {
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
      response.confirmation_token,
      shouldConfirm === true
    );
    s.stop();

    console.log("");

    const renderedMarkdown = await renderMarkdown(confirmationResult.message);

    console.log(
      boxen(renderedMarkdown, {
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
    const prompt = args.join(" ") || null;

    if (interactive) {
      await interactiveChatMode(prompt, confirm);
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

    const data = await sendMessage(prompt, false, confirm);

    s.stop();

    if (outputJson) {
      console.log(JSON.stringify(data, null, 2));
    } else {
      console.log("");

      const renderedMarkdown = await renderMarkdown(data.message);

      console.log(
        boxen(renderedMarkdown, {
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
        await handleConfirmation(data);
      }

      console.log("");
    }
  } catch (error) {
    // Error handling is done by apiFetch
    Logger.error((error as Error).message);
    process.exit(1);
  }
}

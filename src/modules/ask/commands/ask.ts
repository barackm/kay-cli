import * as p from "@clack/prompts";
import pc from "picocolors";
import boxen from "boxen";
import { Logger } from "../../../core/logger.js";
import { apiFetch } from "../../../core/apiClient.js";
import { ChatRequest, ChatResponse, ErrorResponse } from "../types.js";
import { renderMarkdown } from "../../../core/markdown.js";
import { authClient } from "../../auth/authClient.js";

async function sendMessage(
  message: string,
  messages?: Array<{ role: "user" | "assistant"; content: string }>,
  interactive = false
): Promise<ChatResponse> {
  const requestBody: ChatRequest = messages ? { messages } : { message };

  const queryParam = interactive ? "?interactive=true" : "";
  const response = await apiFetch(`/ask${queryParam}`, {
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

  const contentType = response.headers.get("content-type") || "";

  if (interactive && contentType.includes("text/event-stream")) {
    const reader = response.body?.getReader();
    const decoder = new TextDecoder();
    let fullResponse = "";

    if (!reader) {
      throw new Error("Failed to read streaming response");
    }

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split("\n");

      for (const line of lines) {
        if (line.startsWith("data: ")) {
          const data = line.slice(6).trim();
          if (data === "[DONE]") {
            return { response: fullResponse };
          }
          if (data) {
            try {
              const parsed = JSON.parse(data) as ChatResponse;
              if (parsed.response) {
                process.stdout.write(parsed.response);
                fullResponse += parsed.response;
              }
            } catch {
              if (data) {
                process.stdout.write(data);
                fullResponse += data;
              }
            }
          }
        }
      }
    }

    return { response: fullResponse };
  }

  const data = (await response.json()) as ChatResponse;
  return data;
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
  initialPrompt: string | null
): Promise<void> {
  const messages: Array<{ role: "user" | "assistant"; content: string }> = [];

  if (initialPrompt) {
    messages.push({ role: "user", content: initialPrompt });
    await renderConversation(messages);

    const s = p.spinner();
    s.start("Kay is thinking...");

    try {
      const data = await sendMessage(initialPrompt, messages, true);
      s.stop();

      const responseText = data.response || "(No response)";
      messages.push({ role: "assistant", content: responseText });
      await renderConversation(messages);
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
      const data = await sendMessage("", messages, true);
      s.stop();

      const responseText = data.response || "(No response)";
      messages.push({ role: "assistant", content: responseText });
      await renderConversation(messages);
    } catch (error) {
      s.stop();
      Logger.error((error as Error).message);
      await renderConversation(messages);
    }
  }
}

export async function askCommand(
  args: string[],
  options: Record<string, string | boolean>
): Promise<void> {
  const interactive =
    options.interactive === true || options.interactive === "true";
  const outputJson = options.json === true || options.json === "true";

  try {
    if (!authClient.isAuthenticated()) {
      Logger.error("Not authenticated. Please run 'kay connect' to login.");
      process.exit(1);
    }

    const prompt = args.join(" ") || null;

    if (interactive) {
      await interactiveChatMode(prompt);
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

    const data = await sendMessage(prompt, undefined, false);

    s.stop();

    if (outputJson) {
      console.log(JSON.stringify(data, null, 2));
    } else {
      console.log("");

      const renderedMarkdown = await renderMarkdown(data.response);

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

      console.log("");
    }
  } catch (error) {
    Logger.error((error as Error).message);
    process.exit(1);
  }
}

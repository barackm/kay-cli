import * as p from "@clack/prompts";
import pc from "picocolors";
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
    const errorText = await response.text().catch(() => "");
    let errorData: ErrorResponse = {};
    try {
      errorData = JSON.parse(errorText) as ErrorResponse;
    } catch {
      errorData = { message: errorText || response.statusText };
    }
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
    let buffer = "";

    if (!reader) {
      throw new Error("Failed to read streaming response");
    }

    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        if (buffer) {
          const lines = buffer.split("\n");
          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const data = line.slice(6).trim();
              if (data && data !== "[DONE]") {
                try {
                  const parsed = JSON.parse(data) as ChatResponse;
                  if (parsed.response) {
                    fullResponse += parsed.response;
                  }
                } catch {
                  if (data && data !== "[DONE]") {
                    fullResponse += data;
                  }
                }
              }
            } else if (line.trim() && !line.startsWith(":")) {
              try {
                const parsed = JSON.parse(line) as ChatResponse;
                if (parsed.response) {
                  fullResponse += parsed.response;
                }
              } catch {
                if (line.trim()) {
                  fullResponse += line;
                }
              }
            }
          }
        }
        break;
      }

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

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
                fullResponse += parsed.response;
              }
            } catch {
              if (data) {
                fullResponse += data;
              }
            }
          }
        } else if (line.trim() && !line.startsWith(":")) {
          try {
            const parsed = JSON.parse(line) as ChatResponse;
            if (parsed.response) {
              fullResponse += parsed.response;
            }
          } catch {
            if (line.trim() && line !== "[DONE]") {
              fullResponse += line;
            }
          }
        }
      }
    }

    return { response: fullResponse };
  }

  const text = await response.text();

  if (!text || !text.trim()) {
    throw new Error("Empty response from server");
  }

  if (contentType.includes("application/json")) {
    try {
      const data = JSON.parse(text) as ChatResponse;
      if (data.response) {
        return data;
      }
      if (text.trim()) {
        return { response: text };
      }
      throw new Error("Invalid JSON response: missing response field");
    } catch (parseError) {
      if (
        parseError instanceof Error &&
        parseError.message.includes("Invalid JSON")
      ) {
        throw parseError;
      }
      return { response: text };
    }
  } else {
    return { response: text };
  }
}

async function renderConversation(
  messages: Array<{ role: "user" | "assistant"; content: string }>
): Promise<void> {
  console.clear();
  console.log("");
  console.log(`  ${pc.bold(pc.cyan("Kay"))} ${pc.dim("• Chat")}`);
  console.log("");

  for (const msg of messages) {
    if (msg.role === "user") {
      console.log(`  ${pc.dim("You")}`);
      const lines = msg.content.split("\n");
      lines.forEach((line) => {
        console.log(`  ${pc.green("│")} ${pc.white(line)}`);
      });
      console.log("");
    } else {
      console.log(`  ${pc.dim("Kay")}`);
      const renderedMarkdown = await renderMarkdown(msg.content);
      const lines = renderedMarkdown.split("\n");
      lines.forEach((line) => {
        console.log(`  ${pc.cyan("│")} ${line}`);
      });
      console.log("");
    }
  }

  console.log(`  ${pc.dim("Type your message or 'exit' to end")}`);
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

      if (!data || !data.response || data.response.trim() === "") {
        throw new Error("No response received from server");
      }

      messages.push({ role: "assistant", content: data.response });
      await renderConversation(messages);
    } catch (error) {
      s.stop();
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";
      Logger.error(errorMessage);
      messages.push({ role: "assistant", content: `Error: ${errorMessage}` });
      await renderConversation(messages);
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
      console.log("");
      console.log(`  ${pc.cyan("Goodbye!")}`);
      console.log("");
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
      console.log("");
      console.log(`  ${pc.cyan("Goodbye!")}`);
      console.log("");
      return;
    }

    messages.push({ role: "user", content: trimmedInput });
    await renderConversation(messages);

    const s = p.spinner();
    s.start("Kay is thinking...");

    try {
      const data = await sendMessage("", messages, true);
      s.stop();

      if (!data || !data.response || data.response.trim() === "") {
        throw new Error("No response received from server");
      }

      messages.push({ role: "assistant", content: data.response });
      await renderConversation(messages);
    } catch (error) {
      s.stop();
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";
      Logger.error(errorMessage);
      messages.push({ role: "assistant", content: `Error: ${errorMessage}` });
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
      console.log(`  ${pc.dim("Kay")}`);
      const renderedMarkdown = await renderMarkdown(data.response);
      const lines = renderedMarkdown.split("\n");
      lines.forEach((line) => {
        console.log(`  ${pc.cyan("│")} ${line}`);
      });
      console.log("");
    }
  } catch (error) {
    Logger.error((error as Error).message);
    process.exit(1);
  }
}

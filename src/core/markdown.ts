import { marked } from "marked";
import { markedTerminal } from "marked-terminal";
import chalk from "chalk";
import stripAnsi from "strip-ansi";

let initialized = false;

function initialize() {
  if (initialized) return;

  try {
    marked.use(
      markedTerminal({
        reflowText: true,
        width: Math.max((process.stdout.columns || 100) - 8, 60),
        showSectionPrefix: false,
        tab: 2,
        strong: chalk.bold,
        em: chalk.italic,
        link: chalk.cyan.underline,
        href: chalk.cyan.underline,
        code: chalk.dim,
        codespan: chalk.dim,
        heading: chalk.bold,
        firstHeading: chalk.bold,
        paragraph: chalk.reset,
        listitem: chalk.reset,
        blockquote: chalk.dim.italic,
      }) as any
    );
    initialized = true;
  } catch (err) {
    console.error(chalk.yellow("[Markdown Init Warning]"), err);
  }
}

export async function renderMarkdown(content: string): Promise<string> {
  try {
    // Always initialize
    initialize();

    // Clean the content
    let clean = content.replace(/\r\n/g, "\n");
    clean = stripAnsi(clean);

    // If initialization failed, return formatted plain text
    if (!initialized) {
      return formatPlainText(clean);
    }

    // Parse with marked
    const rendered = await marked.parse(clean, { async: true });

    // Clean up excessive newlines
    return rendered.replace(/\n{3,}/g, "\n\n").trim();
  } catch (err) {
    console.error(chalk.red("[Markdown Renderer Error]"), err);
    // Fallback to plain text formatting
    return formatPlainText(content);
  }
}

// Fallback plain text formatter
function formatPlainText(content: string): string {
  let formatted = content;

  // Format headers
  formatted = formatted.replace(/^### (.+)$/gm, chalk.bold("$1"));
  formatted = formatted.replace(/^## (.+)$/gm, chalk.bold("$1"));
  formatted = formatted.replace(/^# (.+)$/gm, chalk.bold("$1"));

  // Format bold
  formatted = formatted.replace(/\*\*(.+?)\*\*/g, chalk.bold("$1"));

  // Format italic
  formatted = formatted.replace(/\*(.+?)\*/g, chalk.italic("$1"));

  // Format inline code
  formatted = formatted.replace(/`([^`]+)`/g, chalk.dim("$1"));

  // Format lists
  formatted = formatted.replace(/^[*-] (.+)$/gm, "  • $1");
  formatted = formatted.replace(/^\d+\. (.+)$/gm, "  $1");

  return formatted;
}

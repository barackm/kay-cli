import { marked } from "marked";
import { markedTerminal } from "marked-terminal";
import chalk from "chalk";
import stripAnsi from "strip-ansi";

let initialized = false;

function initialize() {
  if (initialized) return;

  marked.use(
    markedTerminal({
      reflowText: true,
      width: (process.stdout.columns || 100) - 8,
      showSectionPrefix: false,
      tab: 2,
      strong: (text: string) => chalk.bold(text),
      em: (text: string) => chalk.italic(text),
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
}

export async function renderMarkdown(content: string): Promise<string> {
  try {
    initialize();

    let clean = content.replace(/\r\n/g, "\n");
    clean = stripAnsi(clean);

    const rendered = marked.parse(clean) as string;

    return rendered.replace(/\n{3,}/g, "\n\n").trim();
  } catch (err) {
    console.error(chalk.red("[Markdown Renderer Error]"), err);
    return content;
  }
}

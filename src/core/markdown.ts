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
      width: process.stdout.columns || 100,
      showSectionPrefix: false,
      tab: 2,
      strong: (text: string) => chalk.bold(text),
      em: (text: string) => chalk.italic(text),
      link: chalk.blue,
      href: chalk.blue.underline,
      code: chalk.yellow,
      codespan: chalk.yellow,
      heading: chalk.green.bold,
      firstHeading: chalk.magenta.underline.bold,
      paragraph: chalk.reset,
      listitem: chalk.reset,
      blockquote: chalk.gray.italic,
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

import Table from "cli-table3";
import pc from "picocolors";

export interface TableOptions {
  head?: string[];
  colWidths?: number[];
  colAligns?: ("left" | "center" | "right")[];
  style?: {
    head?: string[];
    border?: string[];
    compact?: boolean;
  };
}

export function createTable(
  headers: string[],
  rows: string[][],
  options?: TableOptions
): string {
  const table = new Table({
    head: headers.map((h) => pc.bold(pc.cyan(h))),
    colWidths: options?.colWidths,
    colAligns: options?.colAligns || headers.map(() => "left" as const),
    style: {
      head: [],
      border: [],
      compact: false,
      ...options?.style,
    },
    ...options,
  });

  rows.forEach((row) => {
    table.push(row);
  });

  return table.toString();
}

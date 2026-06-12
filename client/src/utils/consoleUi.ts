import chalk from 'chalk';
import Table from 'cli-table3';

const BOX_WIDTH = 48;

/**
 * Renders the top header box matching the BRD console screen style.
 * Example:
 * ╔══════════════════════════════════════════════╗
 * ║    ADMIN PANEL                               ║
 * ╚══════════════════════════════════════════════╝
 */
export function printHeader(title: string, subtitle?: string): void {
  const border = '═'.repeat(BOX_WIDTH);
  console.log(chalk.cyan(`╔${border}╗`));
  console.log(chalk.cyan('║') + chalk.bold.white(`    ${title.padEnd(BOX_WIDTH - 4)}`) + chalk.cyan('║'));
  if (subtitle) {
    console.log(chalk.cyan('║') + chalk.gray(`    ${subtitle.padEnd(BOX_WIDTH - 4)}`) + chalk.cyan('║'));
  }
  console.log(chalk.cyan(`╚${border}╝`));
}

/** Prints a horizontal divider line. */
export function printDivider(): void {
  console.log(chalk.gray('─'.repeat(BOX_WIDTH + 2)));
}

/** Prints a success message with a green checkmark. */
export function printSuccess(message: string): void {
  console.log(chalk.green(`\n  ✓  ${message}\n`));
}

/** Prints an error message in red. */
export function printError(message: string): void {
  console.log(chalk.red(`\n  ✗  ${message}\n`));
}

/** Prints a warning in yellow. */
export function printWarning(message: string): void {
  console.log(chalk.yellow(`\n  ⚠  ${message}\n`));
}

/** Prints an info message in dim text. */
export function printInfo(message: string): void {
  console.log(chalk.dim(`     ${message}`));
}

/** Prints a numbered menu list. */
export function printMenu(items: string[]): void {
  items.forEach((item, index) => {
    console.log(`  ${chalk.cyan(String(index + 1))}.  ${item}`);
  });
  console.log();
}

/** Renders a CLI table with headers and rows. */
export function printTable(headers: string[], rows: (string | number)[][]): void {
  const table = new Table({
    head: headers.map((h) => chalk.bold.cyan(h)),
    style: { border: ['gray'], head: [] },
  });
  rows.forEach((row) => table.push(row.map(String)));
  console.log(table.toString());
}

function parseMarkdownTableRow(line: string): string[] {
  return line
    .split('|')
    .map((cell) => cell.trim())
    .filter((_, index, cells) => index > 0 && index < cells.length - 1);
}

function isMarkdownTableSeparator(line: string): boolean {
  return /^\|?[\s\-:|]+\|?$/.test(line.trim());
}

/** Parses a markdown pipe table from LLM output. */
export function parseMarkdownTable(text: string): { headers: string[]; rows: string[][] } | null {
  const tableLines = text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.startsWith('|'));

  if (tableLines.length < 2) return null;

  const headers = parseMarkdownTableRow(tableLines[0]);
  if (headers.length === 0) return null;

  const rows = tableLines
    .slice(1)
    .filter((line) => !isMarkdownTableSeparator(line))
    .map(parseMarkdownTableRow)
    .filter((row) => row.length > 0);

  return rows.length > 0 ? { headers, rows } : null;
}

/** Renders a markdown table from LLM text, or falls back to plain text. */
export function printMarkdownTable(text: string): void {
  const parsed = parseMarkdownTable(text);
  if (parsed) {
    printTable(parsed.headers, parsed.rows);
    return;
  }
  console.log(`\n  ${text.trim()}\n`);
}

/** Maps a health status enum to a coloured emoji label. */
export function formatHealthStatus(status: string): string {
  switch (status) {
    case 'ON_TRACK':  return chalk.green('🟢 ON TRACK');
    case 'ATTENTION': return chalk.yellow('🟡 ATTENTION');
    case 'AT_RISK':   return chalk.red('🔴 AT RISK');
    default:          return status;
  }
}

/** Clears the terminal. */
export function clearScreen(): void {
  process.stdout.write('\x1Bc');
}

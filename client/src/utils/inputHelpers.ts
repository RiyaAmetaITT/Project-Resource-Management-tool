import * as readline from 'readline';
import chalk from 'chalk';

let stdinListener: ((buf: Buffer) => void) | null = null;

function drainPendingNewlines(): void {
  if (!process.stdin.isTTY) return;

  let chunk: Buffer | string | null;
  while ((chunk = process.stdin.read()) !== null) {
    const text = chunk.toString('utf8');
    if (/[^\r\n]/.test(text)) break;
  }
}

function cleanupStdin(): void {
  if (stdinListener) {
    process.stdin.removeListener('data', stdinListener);
    stdinListener = null;
  }
  if (process.stdin.isTTY) {
    process.stdin.setRawMode(false);
    drainPendingNewlines();
  }
}

async function readLine(prompt: string, masked = false): Promise<string> {
  cleanupStdin();
  drainPendingNewlines();

  if (!process.stdin.isTTY) {
    return new Promise((resolve) => {
      const readlineInterface = readline.createInterface({ input: process.stdin, output: process.stdout });
      readlineInterface.question(prompt, (answer) => {
        readlineInterface.close();
        resolve(answer.trim());
      });
    });
  }

  return new Promise((resolve) => {
    process.stdout.write(prompt);
    let value = '';

    process.stdin.setRawMode(true);
    process.stdin.resume();

    stdinListener = (buf: Buffer) => {
      const str = buf.toString('utf8');

      for (const char of str) {
        if (char === '\u0003') {
          cleanupStdin();
          process.exit(0);
        }

        if (char === '\r' || char === '\n') {
          cleanupStdin();
          process.stdout.write('\n');
          resolve(value.trim());
          return;
        }

        if (char === '\u007f' || char === '\b') {
          if (value.length > 0) {
            value = value.slice(0, -1);
            process.stdout.write('\b \b');
          }
          continue;
        }

        if (char < ' ') continue;

        value += char;
        process.stdout.write(masked ? '*' : char);
      }
    };

    process.stdin.on('data', stdinListener);
  });
}

export async function promptText(message: string, defaultValue?: string): Promise<string> {
  const suffix = defaultValue !== undefined ? ` [${defaultValue}]` : '';
  const answer = await readLine(`${message}${suffix}: `, false);
  if (!answer && defaultValue !== undefined) return defaultValue;
  return answer;
}

export async function promptPassword(message: string): Promise<string> {
  return readLine(`${message} `, true);
}

export async function promptNumber(message: string, min = 1, max = 100): Promise<number> {
  while (true) {
    const input = await promptText(message);
    const num = Number(input);
    if (!Number.isNaN(num) && num >= min && num <= max) return num;
    console.log(chalk.red(`  Enter a number between ${min} and ${max}.`));
  }
}

export async function confirm(message: string): Promise<boolean> {
  while (true) {
    const input = (await promptText(`${message} [Y/N]`)).toUpperCase();
    if (input === 'Y' || input === 'YES') return true;
    if (input === 'N' || input === 'NO') return false;
    console.log(chalk.red('  Enter Y for Yes or N for No.'));
  }
}

interface SelectOptions {
  showList?: boolean;
  prompt?: string;
}

export async function selectFromMenu(
  messageOrChoices: string | string[],
  choicesOrOptions?: string[] | SelectOptions,
  maybeOptions?: SelectOptions,
): Promise<string> {
  let choices: string[];
  let options: SelectOptions;

  if (Array.isArray(messageOrChoices)) {
    choices = messageOrChoices;
    options = (choicesOrOptions as SelectOptions) ?? {};
  } else {
    choices = choicesOrOptions as string[];
    options = maybeOptions ?? {};
  }

  const showList = options.showList ?? !Array.isArray(messageOrChoices);
  const prompt = options.prompt ?? 'Enter option:';

  if (showList) {
    choices.forEach((item, index) => {
      console.log(`  ${chalk.cyan(String(index + 1))}.  ${item}`);
    });
    console.log();
  }

  while (true) {
    const input = await promptText(prompt);
    const num = Number(input);
    if (!Number.isNaN(num) && num >= 1 && num <= choices.length) {
      return choices[num - 1];
    }
    console.log(chalk.red(`  Invalid option. Enter a number between 1 and ${choices.length}.`));
  }
}

export async function multiSelect(message: string, choices: string[]): Promise<string[]> {
  choices.forEach((item, index) => {
    console.log(`  ${chalk.cyan(String(index + 1))}.  ${item}`);
  });
  console.log(`  ${chalk.cyan(String(choices.length + 1))}.  Other (type manually)`);
  console.log();

  while (true) {
    const input = await promptText(`${message} (comma-separated numbers)`);
    if (!input) {
      console.log(chalk.red('  Select at least one option.'));
      continue;
    }

    const selected: string[] = [];
    let valid = true;

    for (const part of input.split(',').map((p) => p.trim()).filter(Boolean)) {
      const num = Number(part);
      if (Number.isNaN(num)) {
        valid = false;
        break;
      }
      if (num === choices.length + 1) {
        const custom = await promptText('Enter custom tag:');
        if (custom) selected.push(custom);
      } else if (num >= 1 && num <= choices.length) {
        selected.push(choices[num - 1]);
      } else {
        valid = false;
        break;
      }
    }

    if (!valid || selected.length === 0) {
      console.log(chalk.red(`  Invalid selection. Use numbers 1–${choices.length + 1}, comma-separated.`));
      continue;
    }

    return selected;
  }
}

export function validateDateFormat(input: string): boolean | string {
  if (!input) return true;
  const regex = /^\d{2}-\d{2}-\d{4}$/;
  if (!regex.test(input)) return 'Enter date in DD-MM-YYYY format.';

  const [dd, mm, yyyy] = input.split('-').map(Number);
  const date = new Date(yyyy, mm - 1, dd);
  const isValid =
    date.getDate() === dd && date.getMonth() === mm - 1 && date.getFullYear() === yyyy;

  return isValid || 'Invalid date value.';
}

export async function promptDate(message: string, allowEmpty = false): Promise<string> {
  const today = new Date();
  const defaultDate = `${String(today.getDate()).padStart(2, '0')}-${String(today.getMonth() + 1).padStart(2, '0')}-${today.getFullYear()}`;

  while (true) {
    const hint = allowEmpty ? ' (press Enter for current week)' : '';
    const input = await promptText(`${message}${hint}`, allowEmpty ? defaultDate : undefined);
    const value = input || (allowEmpty ? defaultDate : '');

    if (!value) {
      console.log(chalk.red('  Date is required.'));
      continue;
    }

    const validation = validateDateFormat(value);
    if (validation === true) return value;
    console.log(chalk.red(`  ${validation}`));
  }
}

export async function promptUtilisationPercent(): Promise<number> {
  return promptNumber('Utilisation % (1–100):', 1, 100);
}

export function getLastCompletedWeekMonday(): string {
  const today = new Date();
  const day = today.getDay();
  const daysToCurrentMonday = day === 0 ? 6 : day - 1;
  const lastCompletedMonday = new Date(today);
  lastCompletedMonday.setDate(today.getDate() - daysToCurrentMonday - 7);
  const dd = String(lastCompletedMonday.getDate()).padStart(2, '0');
  const mm = String(lastCompletedMonday.getMonth() + 1).padStart(2, '0');
  const yyyy = lastCompletedMonday.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
}

export async function promptWeekStartDate(message: string): Promise<string> {
  const defaultDate = getLastCompletedWeekMonday();

  while (true) {
    const input = await promptText(`${message} (press Enter for last Monday)`, defaultDate);
    const value = input || defaultDate;
    const validation = validateDateFormat(value);
    if (validation === true) return value;
    console.log(chalk.red(`  ${validation}`));
  }
}

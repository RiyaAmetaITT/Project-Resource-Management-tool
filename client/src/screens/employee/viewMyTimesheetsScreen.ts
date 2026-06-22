import { employeeApi } from '../../apiClient/employeeApi';
import { printHeader, printTable, printError, printDivider, returnToMenuPrompt } from '../../utils/consoleUi';
import { promptText } from '../../utils/inputHelpers';
import { formatDisplayDate } from '../../utils/dateFormat';
import chalk from 'chalk';

export async function viewMyTimesheetsScreen(): Promise<void> {
  printHeader('MY TIMESHEETS');
  console.log();

  try {
    const timesheets = await employeeApi.getMyTimesheets();

    if (timesheets.length === 0) {
      console.log('  No timesheet history found for your account.\n');
      return;
    }

    printTable(
      ['Week Start', 'Total Hrs', 'Status'],
      timesheets.map((t) => [
        formatDisplayDate(t.weekStartDate),
        `${t.totalHours} hrs`,
        t.status === 'MISSED' ? chalk.red('MISSED ⚠') : chalk.green('SUBMITTED'),
      ]),
    );
    printDivider();

    console.log('\n  [V] View week details     [B] Back\n');
    const action = (await promptText('Action')).toUpperCase();
    if (action !== 'V') {
      console.log(chalk.dim('\n  Returning to main menu.\n'));
      return;
    }

    const submittedWeeks = timesheets.filter((t) => t.status === 'SUBMITTED');
    if (submittedWeeks.length === 0) {
      console.log(chalk.yellow('\n  No submitted timesheets to view. Only MISSED weeks are on record.\n'));
      return;
    }

    console.log();
    submittedWeeks.forEach((t, i) => {
      console.log(`  ${i + 1}.  ${formatDisplayDate(t.weekStartDate)}  (${t.totalHours} hrs)`);
    });
    console.log();

    const pick = Number(await promptText('Enter week number to view'));
    const selected = submittedWeeks[pick - 1];
    if (!selected) {
      printError('Invalid week selection.');
      return;
    }

    const detail = await employeeApi.getTimesheetWeekDetail(formatDisplayDate(selected.weekStartDate));

    printDivider();
    console.log(chalk.bold(`\n  ── Week: ${detail.weekStartDate} — Status: ${detail.status} `));
    if (detail.entries.length > 0) {
      printTable(
        ['Project', 'Hrs', 'Activity Tags'],
        detail.entries.map((e) => [
          e.projectName,
          String(e.hours),
          e.activityTags.join(', ') || '—',
        ]),
      );
      console.log(`\n  Total: ${detail.totalHours} hrs\n`);
    } else {
      console.log(chalk.dim('\n  No entries recorded for this week.\n'));
    }
  } catch (err) {
    printError(err instanceof Error ? err.message : 'Failed to load timesheets.');
  } finally {
    await returnToMenuPrompt();
  }
}

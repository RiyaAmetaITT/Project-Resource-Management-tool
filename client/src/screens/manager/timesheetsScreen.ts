import { managerApi } from '../../apiClient/managerApi';
import { printHeader, printTable, printError, printDivider } from '../../utils/consoleUi';
import { promptDate, promptNumber, promptText } from '../../utils/inputHelpers';
import chalk from 'chalk';

export async function timesheetsScreen(): Promise<void> {
  printHeader('TIMESHEETS — MY TEAM');
  console.log();

  try {
    const weekInput = await promptDate('Filter by week (DD-MM-YYYY) or press Enter for current week:', true);
    const timesheets = await managerApi.getTeamTimesheets(weekInput);

    printDivider();
    if (timesheets.length === 0) {
      console.log(chalk.dim('  No timesheet data for this week.\n'));
      return;
    }

    printTable(
      ['Employee', 'Project', 'Hrs', 'Status'],
      timesheets.map((t) => [
        t.employeeName,
        t.projectName,
        String(t.hours),
        t.status === 'MISSED' ? chalk.red('MISSED ⚠') : chalk.green('SUBMITTED'),
      ]),
    );
    printDivider();

    console.log('\n  [V] View employee timesheet detail     [B] Back\n');
    const action = (await promptText('Action')).toUpperCase();
    if (action === 'V') {
      const employeeIds = [...new Set(timesheets.map((t) => t.employeeId))];
      const employeeId = employeeIds.length === 1
        ? employeeIds[0]
        : await promptNumber('Enter Employee ID:', 1, 99999);

      const detail = await managerApi.getEmployeeTimesheetDetail(employeeId, weekInput);

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
    }
  } catch (err) {
    printError(err instanceof Error ? err.message : 'Failed to load timesheets.');
  }
}

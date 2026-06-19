import { employeeApi } from '../../apiClient/employeeApi';
import { printHeader, printTable, printError, printDivider } from '../../utils/consoleUi';
import chalk from 'chalk';

/** Screen 5.2 — View My Timesheets */
export async function viewMyTimesheetsScreen(): Promise<void> {
  printHeader('MY TIMESHEETS');
  console.log();

  try {
    const timesheets = await employeeApi.getMyTimesheets() as Array<{
      weekStartDate: string; totalHours: number; status: string;
    }>;

    if (timesheets.length === 0) {
      console.log('  No timesheets found.\n');
      return;
    }

    printTable(
      ['Week Start', 'Total Hours', 'Status'],
      timesheets.map((t) => [
        new Date(t.weekStartDate).toLocaleDateString('en-GB'),
        String(t.totalHours),
        t.status === 'MISSED' ? chalk.red('MISSED ⚠') : chalk.green('SUBMITTED'),
      ]),
    );
    printDivider();
  } catch (err) {
    printError(err instanceof Error ? err.message : 'Failed to load timesheets.');
  }
}

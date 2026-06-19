import { managerApi } from '../../apiClient/managerApi';
import { printHeader, printTable, printError, printDivider } from '../../utils/consoleUi';
import { promptDate } from '../../utils/inputHelpers';
import chalk from 'chalk';

/** Screen 4.4 — Timesheets (Manager View — read-only) */
export async function timesheetsScreen(): Promise<void> {
  printHeader('TIMESHEETS — MY TEAM');
  console.log();

  try {
    const weekInput = await promptDate('Filter by week (DD-MM-YYYY) or press Enter for current week:', true);
    const timesheets = await managerApi.getTeamTimesheets(weekInput) as Array<{
      employeeName: string; projectName: string; hours: number; status: string;
    }>;

    printDivider();
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
  } catch (err) {
    printError(err instanceof Error ? err.message : 'Failed to load timesheets.');
  }
}

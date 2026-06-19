import { printHeader, printTable, printSuccess, printError, printInfo } from '../../utils/consoleUi';
import { selectFromMenu } from '../../utils/inputHelpers';
import { managerApi } from '../../apiClient/managerApi';

/** Screen 4.6 — Restore Timesheet Access */
export async function restoreAccessScreen(): Promise<void> {
  printHeader('RESTORE TIMESHEET ACCESS');
  console.log();

  try {
    const frozenEmployees = await managerApi.getFrozenEmployees();

    if (frozenEmployees.length === 0) {
      printInfo('No team members currently have frozen timesheet access.');
      return;
    }

    console.log('  Team members with frozen timesheet submission access:\n');
    printTable(
      ['#', 'Employee', 'Email', 'Frozen For Week'],
      frozenEmployees.map((employee, index) => [
        String(index + 1),
        employee.employeeName,
        employee.email,
        employee.frozenWeekStartDate,
      ]),
    );

    const options = [
      ...frozenEmployees.map((e) => `Restore — ${e.employeeName}`),
      'Back',
    ];
    const choice = await selectFromMenu(options);

    if (choice === 'Back') return;

    const selected = frozenEmployees.find((e) => choice === `Restore — ${e.employeeName}`);
    if (!selected) return;

    await managerApi.restoreTimesheetAccess(selected.employeeId);
    printSuccess(`Timesheet access restored for ${selected.employeeName}.`);
  } catch (err) {
    printError(err instanceof Error ? err.message : 'Failed to restore timesheet access.');
  }
}

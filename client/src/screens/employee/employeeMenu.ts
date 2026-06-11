import { printHeader, printMenu, printDivider, clearScreen } from '../../utils/consoleUi';
import { selectFromMenu } from '../../utils/inputHelpers';
import { getSession, clearSession } from '../../utils/session';
import { submitTimesheetScreen } from './submitTimesheetScreen';
import { viewMyTimesheetsScreen } from './viewMyTimesheetsScreen';
import { myAllocationsScreen } from './myAllocationsScreen';
import { employeeApi } from '../../apiClient/employeeApi';

const MENU_OPTIONS = ['Submit Timesheet', 'View My Timesheets', 'View My Allocations', 'Logout'];

/** Screen 5 — Employee Menu */
export async function employeeMenu(): Promise<void> {
  clearScreen();
  const session = getSession();
  const now = new Date();
  printHeader(`Welcome, ${session.fullName}!`, `${now.toLocaleDateString('en-GB')}  ${now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`);

  try {
    const { hasMissedLastWeek, missedWeekStartDate } = await employeeApi.checkMissedTimesheet() as {
      hasMissedLastWeek: boolean;
      missedWeekStartDate: string | null;
    };
    if (hasMissedLastWeek && missedWeekStartDate) {
      console.log(`\n  ⚠  Reminder: Timesheet for week ${missedWeekStartDate} has not been submitted.`);
    }
  } catch {
    // silently fail check
  }

  console.log();
  printMenu(MENU_OPTIONS);
  printDivider();

  const choice = await selectFromMenu(MENU_OPTIONS, { showList: false });

  switch (choice) {
    case 'Submit Timesheet':        await submitTimesheetScreen(); break;
    case 'View My Timesheets':      await viewMyTimesheetsScreen(); break;
    case 'View My Allocations':     await myAllocationsScreen(); break;
    case 'Logout':
      clearSession();
      const { loginScreen } = await import('../loginScreen');
      return loginScreen();
  }

  return employeeMenu();
}

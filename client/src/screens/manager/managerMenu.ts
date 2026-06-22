import { printHeader, printMenu, printDivider, clearScreen } from '../../utils/consoleUi';
import { selectFromMenu } from '../../utils/inputHelpers';
import { getSession, clearSession } from '../../utils/session';
import { resourceDashboardScreen } from './resourceDashboardScreen';
import { allocateResourceScreen } from './allocateResourceScreen';
import { myProjectsScreen } from './myProjectsScreen';
import { timesheetsScreen } from './timesheetsScreen';
import { aiAssistantScreen } from './aiAssistantScreen';
import { restoreAccessScreen } from './restoreAccessScreen';

const MENU_OPTIONS = [
  'Resource Dashboard',
  'Allocate Resource',
  'My Projects',
  'Timesheets',
  'Restore Timesheet Access',
  'AI Assistant',
  'Logout',
];

export async function managerMenu(): Promise<void> {
  clearScreen();
  const session = getSession();
  const now = new Date();
  printHeader(`Welcome, ${session.fullName}!`, `${now.toLocaleDateString('en-GB')}  ${now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`);
  console.log();
  printMenu(MENU_OPTIONS);
  printDivider();

  const choice = await selectFromMenu(MENU_OPTIONS, { showList: false });

  switch (choice) {
    case 'Resource Dashboard': await resourceDashboardScreen(); break;
    case 'Allocate Resource':  await allocateResourceScreen(); break;
    case 'My Projects':        await myProjectsScreen(); break;
    case 'Timesheets':         await timesheetsScreen(); break;
    case 'Restore Timesheet Access': await restoreAccessScreen(); break;
    case 'AI Assistant':       await aiAssistantScreen(); break;
    case 'Logout':
      clearSession();
      const { loginScreen } = await import('../loginScreen');
      return loginScreen();
  }

  return managerMenu();
}

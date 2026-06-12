import { printHeader, printMenu, printDivider, clearScreen } from '../../utils/consoleUi';
import { selectFromMenu } from '../../utils/inputHelpers';
import { getSession, clearSession } from '../../utils/session';
import { manageEmployeesMenu } from './employee/manageEmployeesMenu';
import { manageProjectsMenu } from './project/manageProjectsMenu';
import { viewAllAllocationsScreen } from './viewAllAllocationsScreen';
import { manageUsersMenu } from './user/manageUsersMenu';
import { systemConfigScreen } from './systemConfigScreen';

const MENU_OPTIONS = [
  'Manage Employees',
  'Manage Projects',
  'View All Allocations',
  'Manage Users',
  'System Configuration',
  'Logout',
];

export async function adminMenu(): Promise<void> {
  clearScreen();
  const session = getSession();
  const now = new Date();
  const timestamp = `${now.toLocaleDateString('en-GB')}  ${now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`;

  printHeader('ADMIN PANEL', `Welcome, ${session.fullName}  |  ${timestamp}`);
  console.log();
  printMenu(MENU_OPTIONS);
  printDivider();

  const choice = await selectFromMenu(MENU_OPTIONS, { showList: false });

  switch (choice) {
    case 'Manage Employees':       await manageEmployeesMenu(); break;
    case 'Manage Projects':        await manageProjectsMenu(); break;
    case 'View All Allocations':   await viewAllAllocationsScreen(); break;
    case 'Manage Users':           await manageUsersMenu(); break;
    case 'System Configuration':   await systemConfigScreen(); break;
    case 'Logout':
      clearSession();
      const { loginScreen } = await import('../loginScreen');
      return loginScreen();
  }

  return adminMenu();
}

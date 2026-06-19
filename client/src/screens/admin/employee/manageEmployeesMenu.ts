import { printHeader, printMenu, printDivider } from '../../../utils/consoleUi';
import { selectFromMenu } from '../../../utils/inputHelpers';
import { viewEmployeesScreen } from './viewEmployeesScreen';
import { updateEmployeeScreen } from './updateEmployeeScreen';
import { deactivateEmployeeScreen } from './deactivateEmployeeScreen';
import { manageSkillsScreen } from './manageSkillsScreen';
import { assignManagerScreen } from './assignManagerScreen';

const MENU_OPTIONS = [
  'View All Employees',
  'Update Employee',
  'Deactivate Employee',
  'Manage Employee Skills',
  'Assign Manager',
  'Back',
];

/** Screen 3.1 — Manage Employees */
export async function manageEmployeesMenu(): Promise<void> {
  printHeader('MANAGE EMPLOYEES');
  console.log();
  printMenu(MENU_OPTIONS);
  printDivider();

  const choice = await selectFromMenu(MENU_OPTIONS, { showList: false });

  switch (choice) {
    case 'View All Employees':     await viewEmployeesScreen(); break;
    case 'Update Employee':        await updateEmployeeScreen(); break;
    case 'Deactivate Employee':    await deactivateEmployeeScreen(); break;
    case 'Manage Employee Skills': await manageSkillsScreen(); break;
    case 'Assign Manager':         await assignManagerScreen(); break;
    case 'Back':                   return;
  }

  return manageEmployeesMenu();
}

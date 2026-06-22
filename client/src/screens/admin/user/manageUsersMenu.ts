import { printHeader, printMenu, printDivider } from '../../../utils/consoleUi';
import { selectFromMenu } from '../../../utils/inputHelpers';
import { createUserScreen } from './createUserScreen';
import { viewUsersScreen } from './viewUsersScreen';
import { resetPasswordScreen } from './resetPasswordScreen';
import { deactivateUserScreen } from './deactivateUserScreen';

const MENU_OPTIONS = [
  'Create User Account',
  'View All Users',
  'Reset User Password',
  'Deactivate User',
  'Back',
];

export async function manageUsersMenu(): Promise<void> {
  printHeader('MANAGE USERS');
  console.log();
  printMenu(MENU_OPTIONS);
  printDivider();

  const choice = await selectFromMenu(MENU_OPTIONS, { showList: false });

  switch (choice) {
    case 'Create User Account':  await createUserScreen(); break;
    case 'View All Users':       await viewUsersScreen(); break;
    case 'Reset User Password':  await resetPasswordScreen(); break;
    case 'Deactivate User':      await deactivateUserScreen(); break;
    case 'Back':                 return;
  }
  return manageUsersMenu();
}

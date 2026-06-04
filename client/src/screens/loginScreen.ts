import { login } from '../apiClient/authApi';
import { setSession } from '../utils/session';
import { printHeader, printError } from '../utils/consoleUi';
import { promptText, promptPassword } from '../utils/inputHelpers';
import { changePasswordScreen } from './changePasswordScreen';
import { adminMenu } from './admin/adminMenu';
import { managerMenu } from './manager/managerMenu';
import { employeeMenu } from './employee/employeeMenu';
import { Role } from '../types/enums';

export async function loginScreen(): Promise<void> {
  printHeader('PROJECT & RESOURCE MANAGEMENT TOOL', 'Learn & Code — Final Project');
  console.log('\n  1.  Login');
  console.log('  2.  Exit\n');

  const choice = await promptText('Enter option:');

  if (choice === '2') {
    console.log('\nGoodbye.\n');
    process.exit(0);
  }

  if (choice !== '1') {
    printError('Invalid option. Please enter 1 or 2.');
    return loginScreen();
  }

  await handleLogin();
}

async function handleLogin(): Promise<void> {
  const username = await promptText('Username:');
  const password = await promptPassword('Password:');

  try {
    const authData = await login(username, password);

    setSession({
      token: authData.token,
      userId: authData.userId,
      role: authData.role,
      fullName: authData.fullName,
    });

    if (authData.forcePasswordChange) {
      await changePasswordScreen();
    }

    await routeToRoleMenu(authData.role);
  } catch (err) {
    printError(err instanceof Error ? err.message : 'Login failed.');
    return loginScreen();
  }
}

async function routeToRoleMenu(role: Role): Promise<void> {
  switch (role) {
    case Role.ADMIN:    return adminMenu();
    case Role.MANAGER:  return managerMenu();
    case Role.EMPLOYEE: return employeeMenu();
    default:
      printError(`Unsupported role: ${role}`);
      return loginScreen();
  }
}

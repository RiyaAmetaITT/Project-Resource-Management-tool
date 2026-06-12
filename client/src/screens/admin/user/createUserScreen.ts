import { adminApi } from '../../../apiClient/adminApi';
import { printHeader, printSuccess, printError, printDivider } from '../../../utils/consoleUi';
import { promptText, promptPassword, selectFromMenu } from '../../../utils/inputHelpers';
import { Role } from '../../../types/enums';

const ROLE_OPTIONS = ['Admin', 'Manager', 'Employee'];
const ROLE_MAP: Record<string, Role> = {
  Admin: Role.ADMIN,
  Manager: Role.MANAGER,
  Employee: Role.EMPLOYEE,
};

export async function createUserScreen(): Promise<void> {
  printHeader('CREATE USER ACCOUNT');
  console.log();
  try {
    const fullName = await promptText('Full Name:');
    const email = await promptText('Email:');
    const username = await promptText('Username:');
    const temporaryPassword = await promptPassword('Temporary Password:');

    if (!fullName || !email || !username || !temporaryPassword) {
      printError('All fields are mandatory.');
      return;
    }
    const roleLabel = await selectFromMenu('Role:', ROLE_OPTIONS);
    const role = ROLE_MAP[roleLabel];

    printDivider();
    await adminApi.createUser({ fullName, email, username, temporaryPassword, role });
    printSuccess('Account created. User must change password on first login.');
  } catch (err) {
    printError(err instanceof Error ? err.message : 'Failed to create user.');
  }
}

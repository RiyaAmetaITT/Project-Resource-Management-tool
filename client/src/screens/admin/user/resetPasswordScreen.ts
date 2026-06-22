import { adminApi } from '../../../apiClient/adminApi';
import { printHeader, printSuccess, printError, printDivider } from '../../../utils/consoleUi';
import { promptPassword } from '../../../utils/inputHelpers';
import { promptUserLookup } from '../../../utils/userLookup';

export async function resetPasswordScreen(): Promise<void> {
  printHeader('RESET USER PASSWORD');
  console.log();

  try {
    const user = await promptUserLookup('Enter Username or User ID:');
    if (!user) {
      printError('User not found.');
      return;
    }

    console.log(`\n  User found: ${user.fullName} (${user.role})\n`);
    const newPassword = await promptPassword('New Temporary Password:');
    printDivider();
    await adminApi.resetPassword(user.id, newPassword);
    printSuccess('Password reset. User will be prompted to change it on next login.');
  } catch (err) {
    printError(err instanceof Error ? err.message : 'Failed to reset password.');
  }
}

import { adminApi } from '../../../apiClient/adminApi';
import { printHeader, printSuccess, printError, printDivider } from '../../../utils/consoleUi';
import { promptNumber, promptPassword } from '../../../utils/inputHelpers';

/** Screen 3.4.3 — Reset User Password */
export async function resetPasswordScreen(): Promise<void> {
  printHeader('RESET USER PASSWORD');
  console.log();
  try {
    const userId = await promptNumber('Enter User ID:', 1, 99999);
    const newPassword = await promptPassword('New Temporary Password:');
    printDivider();
    await adminApi.resetPassword(userId, newPassword);
    printSuccess('Password reset. User will be prompted to change it on next login.');
  } catch (err) {
    printError(err instanceof Error ? err.message : 'Failed to reset password.');
  }
}

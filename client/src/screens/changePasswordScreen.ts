import { changePassword } from '../apiClient/authApi';
import { printHeader, printSuccess, printError } from '../utils/consoleUi';
import { promptPassword } from '../utils/inputHelpers';

export async function changePasswordScreen(): Promise<void> {
  printHeader('CHANGE PASSWORD', 'You must set a new password to continue.');
  console.log();

  const newPassword = await promptPassword('New Password:');
  const confirmPassword = await promptPassword('Confirm Password:');

  try {
    await changePassword(newPassword, confirmPassword);
    printSuccess('Password updated. Welcome!');
  } catch (err) {
    printError(err instanceof Error ? err.message : 'Password change failed.');
    return changePasswordScreen();
  }
}

import { adminApi } from '../../../apiClient/adminApi';
import { printHeader, printSuccess, printError } from '../../../utils/consoleUi';
import { confirm } from '../../../utils/inputHelpers';
import { promptUserLookup } from '../../../utils/userLookup';

export async function deactivateUserScreen(): Promise<void> {
  printHeader('DEACTIVATE USER');
  console.log();

  try {
    const user = await promptUserLookup('Enter Username or User ID:');
    if (!user) {
      printError('User not found.');
      return;
    }

    if (!user.isActive) {
      printError('This account is already inactive.');
      return;
    }

    console.log(`\n  User found: ${user.fullName} (${user.role})`);
    console.log(`  Status     : Active\n`);

    const confirmed = await confirm(
      'Are you sure you want to deactivate this account? Deactivated users cannot log in. Their data is preserved.',
    );
    if (!confirmed) {
      console.log('  Cancelled.\n');
      return;
    }

    await adminApi.deactivateUser(user.id);
    printSuccess('User deactivated.');
  } catch (err) {
    printError(err instanceof Error ? err.message : 'Failed to deactivate user.');
  }
}

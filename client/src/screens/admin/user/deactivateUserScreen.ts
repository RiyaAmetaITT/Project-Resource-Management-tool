import { adminApi } from '../../../apiClient/adminApi';
import { printHeader, printSuccess, printError } from '../../../utils/consoleUi';
import { promptNumber, confirm } from '../../../utils/inputHelpers';

/** Screen 3.4.4 — Deactivate User */
export async function deactivateUserScreen(): Promise<void> {
  printHeader('DEACTIVATE USER');
  console.log();
  try {
    const userId = await promptNumber('Enter User ID:', 1, 99999);
    const ok = await confirm(`Deactivate User ${userId}? (Their data is preserved, login is blocked.)`);
    if (!ok) { console.log('  Cancelled.\n'); return; }
    await adminApi.deactivateUser(userId);
    printSuccess('User deactivated.');
  } catch (err) {
    printError(err instanceof Error ? err.message : 'Failed to deactivate user.');
  }
}

import { adminApi } from '../../../apiClient/adminApi';
import { printHeader, printDivider, printSuccess, printError } from '../../../utils/consoleUi';
import { promptNumber } from '../../../utils/inputHelpers';

/**
 * Screen 3.1.4 — Assign Manager
 * Links an employee record to a manager user account.
 */
export async function assignManagerScreen(): Promise<void> {
  printHeader('ASSIGN MANAGER');
  console.log();

  const employeeUserId = await promptNumber('Employee User ID: ', 1, 99999);
  const managerId = await promptNumber('Manager User ID: ', 1, 99999);

  printDivider();

  try {
    await adminApi.assignManager(employeeUserId, managerId);
    printSuccess('Manager assigned successfully. ✓');
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    printError(`Failed to assign manager: ${message}`);
  }
}

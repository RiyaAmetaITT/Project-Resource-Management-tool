import { adminApi } from '../../../apiClient/adminApi';
import { printHeader, printTable, printSuccess, printError, printDivider } from '../../../utils/consoleUi';
import { promptNumber, promptText, confirm } from '../../../utils/inputHelpers';

interface UserRow { id: number; username: string; fullName: string; role: string; isActive: boolean; }

/** Screen 3.4.2 — View All Users */
export async function viewUsersScreen(): Promise<void> {
  printHeader('ALL USERS');
  console.log();
  try {
    const users = await adminApi.getAllUsers() as UserRow[];
    printTable(
      ['ID', 'Username', 'Role', 'Status'],
      users.map((u) => [u.id, u.username, u.role, u.isActive ? 'Active' : 'Inactive']),
    );
    printDivider();
    const active = users.filter((u) => u.isActive).length;
    console.log(`  Total: ${users.length}  |  Active: ${active}  |  Inactive: ${users.length - active}\n`);

    const action = await promptText('[R] Reactivate a user     [B] Back');
    if (action.toUpperCase() !== 'R') return;

    const userId = await promptNumber('Enter User ID to reactivate:', 1, 99999);
    const user = users.find((u) => u.id === userId);
    if (!user) {
      printError(`User ${userId} not found.`);
      return;
    }
    if (user.isActive) {
      printError('This account is already active.');
      return;
    }

    console.log(`\n  User: ${user.fullName} (${user.role}) — currently Inactive\n`);
    const confirmed = await confirm('Reactivate this account?');
    if (!confirmed) {
      console.log('  Cancelled.\n');
      return;
    }

    await adminApi.reactivateUser(userId);
    printSuccess(`Account reactivated. ${user.fullName} can now log in. ✓`);
    console.log('  Note: Previous allocations are NOT restored. Admin must re-allocate manually if needed.\n');
  } catch (err) {
    printError(err instanceof Error ? err.message : 'Failed to load users.');
  }
}

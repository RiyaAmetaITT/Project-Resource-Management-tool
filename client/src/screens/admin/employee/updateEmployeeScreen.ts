import { adminApi } from '../../../apiClient/adminApi';
import { printHeader, printSuccess, printError } from '../../../utils/consoleUi';
import { promptNumber, promptText } from '../../../utils/inputHelpers';

/** Screen 3.1.3 — Update Employee */
export async function updateEmployeeScreen(): Promise<void> {
  printHeader('UPDATE EMPLOYEE');
  console.log();

  try {
    const id = await promptNumber('Enter Employee ID:', 1, 99999);
    console.log('  (Leave blank to keep current value)\n');

    const name = await promptText('Full Name:');
    const email = await promptText('Email:');
    const department = await promptText('Department:');
    const designation = await promptText('Designation:');

    const updates: Record<string, string> = {};
    if (name) updates.name = name;
    if (email) updates.email = email;
    if (department) updates.department = department;
    if (designation) updates.designation = designation;

    if (Object.keys(updates).length === 0) {
      console.log('  No changes made.\n');
      return;
    }

    await adminApi.updateEmployee(id, updates);
    printSuccess(`Employee ${id} updated.`);
  } catch (err) {
    printError(err instanceof Error ? err.message : 'Failed to update employee.');
  }
}

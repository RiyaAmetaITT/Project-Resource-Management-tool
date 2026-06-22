import { adminApi } from '../../../apiClient/adminApi';
import { printHeader, printSuccess, printError } from '../../../utils/consoleUi';
import { promptNumber, promptText, selectFromMenu } from '../../../utils/inputHelpers';
import { ProjectStatus } from '../../../types/enums';

export async function updateProjectScreen(): Promise<void> {
  printHeader('UPDATE PROJECT DETAILS');
  console.log();

  try {
    const id = await promptNumber('Enter Project ID:', 1, 99999);
    console.log('  (Leave blank to keep current value)\n');

    const name = await promptText('Project Name:');
    const description = await promptText('Description:');
    const startDate = await promptText('Start Date (DD-MM-YYYY):');
    const endDate = await promptText('End Date (DD-MM-YYYY):');
    const statusChoice = await selectFromMenu(
      'Status (select current to keep):',
      Object.values(ProjectStatus),
    );
    const managerIdRaw = await promptText('Assign Manager (Enter Manager ID):');
    const storyPtsRaw = await promptText('Total Story Points:');

    const updates: Record<string, string | number> = {};
    if (name) updates.name = name;
    if (description) updates.description = description;
    if (startDate) updates.startDate = startDate;
    if (endDate) updates.endDate = endDate;
    if (managerIdRaw) updates.managerId = Number(managerIdRaw);
    if (storyPtsRaw) updates.totalStoryPoints = Number(storyPtsRaw);
    if (statusChoice) updates.status = statusChoice;

    if (Object.keys(updates).length === 0) {
      console.log('  No changes made.\n');
      return;
    }

    await adminApi.updateProject(id, updates);
    printSuccess(`Project ${id} updated.`);
  } catch (err) {
    printError(err instanceof Error ? err.message : 'Failed to update project.');
  }
}

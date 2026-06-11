import { adminApi } from '../../../apiClient/adminApi';
import { printHeader, printSuccess, printError } from '../../../utils/consoleUi';
import { promptNumber, promptText, selectFromMenu } from '../../../utils/inputHelpers';
import { ProjectStatus } from '../../../types/enums';

/** Screen 3.2.3 — Update Project */
export async function updateProjectScreen(): Promise<void> {
  printHeader('UPDATE PROJECT');
  console.log();
  try {
    const id = await promptNumber('Enter Project ID:', 1, 99999);
    console.log('  (Leave blank to keep current value)\n');

    const name = await promptText('Project Name:');
    const description = await promptText('Description:');
    const endDate = await promptText('End Date (DD-MM-YYYY):');
    const storyPtsRaw = await promptText('Total Story Points:');
    const statusChoice = await selectFromMenu('Status (select current to keep):', Object.values(ProjectStatus));

    const updates: Record<string, string | number> = {};
    if (name) updates.name = name;
    if (description) updates.description = description;
    if (endDate) updates.endDate = endDate;
    if (storyPtsRaw) updates.totalStoryPoints = Number(storyPtsRaw);
    if (statusChoice) updates.status = statusChoice;

    await adminApi.updateProject(id, updates);
    printSuccess(`Project ${id} updated.`);
  } catch (err) {
    printError(err instanceof Error ? err.message : 'Failed to update project.');
  }
}

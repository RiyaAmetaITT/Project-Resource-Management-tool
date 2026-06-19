import { adminApi } from '../../../apiClient/adminApi';
import { printHeader, printSuccess, printError, printDivider } from '../../../utils/consoleUi';
import { promptText, promptDate, promptNumber, selectFromMenu } from '../../../utils/inputHelpers';
import { ProjectStatus } from '../../../types/enums';

/** Screen 3.2.1 — Create Project */
export async function createProjectScreen(): Promise<void> {
  printHeader('CREATE PROJECT');
  console.log();

  try {
    const name = await promptText('Project Name:');
    const description = await promptText('Description:');
    const startDate = await promptDate('Start Date (DD-MM-YYYY):');
    const endDate = await promptDate('End Date (DD-MM-YYYY):');
    const status = await selectFromMenu('Status:', Object.values(ProjectStatus)) as ProjectStatus;
    const managerId = await promptNumber('Manager ID:', 1, 99999);
    const totalStoryPoints = await promptNumber('Total Story Points:', 0, 99999);

    printDivider();
    await adminApi.createProject({ name, description, startDate, endDate, status, managerId, totalStoryPoints });
    printSuccess(`Project '${name}' created.`);
  } catch (err) {
    printError(err instanceof Error ? err.message : 'Failed to create project.');
  }
}

import { adminApi } from '../../../apiClient/adminApi';
import { printHeader, printTable, printError, printDivider } from '../../../utils/consoleUi';
import { promptText } from '../../../utils/inputHelpers';

export async function viewProjectsScreen(): Promise<void> {
  printHeader('ALL PROJECTS');
  console.log();

  try {
    const projects = await adminApi.getAllProjects();
    printTable(
      ['ID', 'Name', 'Manager', 'End Date', 'Status', 'SP Done/Total'],
      projects.map((p) => [
        p.id,
        p.name,
        p.managerName,
        formatDisplayDate(p.endDate),
        p.status,
        `${p.completedStoryPoints ?? 0} / ${p.totalStoryPoints ?? 0}`,
      ]),
    );
    printDivider();
    await promptText('[B] Back');
  } catch (err) {
    printError(err instanceof Error ? err.message : 'Failed to load projects.');
  }
}

function formatDisplayDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-GB');
}

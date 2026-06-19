import { adminApi } from '../../../apiClient/adminApi';
import { printHeader, printTable, printError, printDivider } from '../../../utils/consoleUi';

interface ProjectRow {
  id: number; name: string; managerId: number;
  endDate: string; status: string; healthStatus: string; totalStoryPoints: number;
}

/** Screen 3.2.2 — View All Projects */
export async function viewProjectsScreen(): Promise<void> {
  printHeader('ALL PROJECTS');
  console.log();
  try {
    const projects = await adminApi.getAllProjects() as ProjectRow[];
    printTable(
      ['ID', 'Name', 'Status', 'End Date', 'Health', 'SP Total'],
      projects.map((p) => [p.id, p.name, p.status, p.endDate ?? '-', p.healthStatus, p.totalStoryPoints ?? 0]),
    );
    printDivider();
  } catch (err) {
    printError(err instanceof Error ? err.message : 'Failed to load projects.');
  }
}

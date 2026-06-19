import { employeeApi } from '../../apiClient/employeeApi';
import { printHeader, printTable, printError, printDivider } from '../../utils/consoleUi';

/** Screen 5.3 — My Allocations */
export async function myAllocationsScreen(): Promise<void> {
  printHeader('MY ALLOCATIONS');
  console.log();

  try {
    const allocations = await employeeApi.getMyAllocations() as Array<{
      projectName: string; utilisationPercent: number; fromDate: string; toDate: string;
    }>;

    if (allocations.length === 0) {
      console.log('  You have no active project allocations. You are on the Bench.\n');
      return;
    }

    const today = new Date();

    printTable(
      ['Project', '%', 'From', 'To', 'Status'],
      allocations.map((a) => {
        const toDate = new Date(a.toDate);
        const status = toDate >= today ? 'ACTIVE' : 'ENDED';
        return [
          a.projectName,
          `${a.utilisationPercent}%`,
          new Date(a.fromDate).toLocaleDateString('en-GB'),
          toDate.toLocaleDateString('en-GB'),
          status,
        ];
      }),
    );

    const totalUtil = allocations
      .filter((a) => new Date(a.toDate) >= today)
      .reduce((sum, a) => sum + a.utilisationPercent, 0);
    console.log(`  Total Utilisation: ${totalUtil}%\n`);
    printDivider();
  } catch (err) {
    printError(err instanceof Error ? err.message : 'Failed to load allocations.');
  }
}

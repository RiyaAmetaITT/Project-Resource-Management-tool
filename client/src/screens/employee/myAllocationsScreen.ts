import { employeeApi } from '../../apiClient/employeeApi';
import { printHeader, printTable, printError, printDivider, returnToMenuPrompt } from '../../utils/consoleUi';
import { formatDisplayDate } from '../../utils/dateFormat';

export async function myAllocationsScreen(): Promise<void> {
  printHeader('MY ALLOCATIONS');
  console.log();

  try {
    const allocations = await employeeApi.getMyAllocations();

    if (allocations.length === 0) {
      console.log('  You have no active project allocations. You are currently on the Bench.\n');
      return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    printTable(
      ['Project', '%', 'From', 'To', 'Status'],
      allocations.map((a) => {
        const toDate = new Date(a.toDate);
        toDate.setHours(0, 0, 0, 0);
        const status = toDate >= today ? 'ACTIVE' : 'ENDED';
        return [
          a.projectName,
          `${a.utilisationPercent}%`,
          formatDisplayDate(a.fromDate),
          formatDisplayDate(a.toDate),
          status,
        ];
      }),
    );

    const totalUtilisation = allocations
      .filter((a) => new Date(a.toDate) >= today)
      .reduce((sum, a) => sum + a.utilisationPercent, 0);

    printDivider();
    console.log(`  Total Utilisation: ${totalUtilisation}%\n`);
  } catch (err) {
    printError(err instanceof Error ? err.message : 'Failed to load allocations.');
  } finally {
    await returnToMenuPrompt();
  }
}

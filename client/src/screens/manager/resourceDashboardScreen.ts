import { managerApi } from '../../apiClient/managerApi';
import { printHeader, printTable, printError, printDivider, printInfo } from '../../utils/consoleUi';
import { confirm, promptNumber } from '../../utils/inputHelpers';
import chalk from 'chalk';

/** Screen 4.1 — Resource Dashboard */
export async function resourceDashboardScreen(): Promise<void> {
  printHeader(`RESOURCE DASHBOARD — ${new Date().toLocaleString('en-GB', { month: 'long', year: 'numeric' })}`);
  console.log();

  try {
    const { bench, allocated } = await managerApi.getDashboard() as {
      bench: Array<{ id: number; name: string; department: string; totalUtilisation: number }>;
      allocated: Array<{ id: number; name: string; department: string; totalUtilisation: number }>;
    };

    console.log(chalk.green.bold(`  ON BENCH  (${bench.length} employees available)`));
    printDivider();
    if (bench.length > 0) {
      printTable(['ID', 'Name', 'Department'], bench.map((e) => [e.id, e.name, e.department]));
    } else {
      printInfo('No employees currently on bench.');
    }

    console.log(chalk.yellow.bold(`\n  ACTIVE EMPLOYEES`));
    printDivider();
    if (allocated.length > 0) {
      printTable(
        ['ID', 'Name', 'Alloc %', 'Availability'],
        allocated.map((e) => [e.id, e.name, `${e.totalUtilisation}%`, `${100 - e.totalUtilisation}% free`]),
      );
    } else {
      printInfo('No allocated employees.');
    }

    printDivider();
    console.log(`  Bench: ${bench.length}  |  Allocated: ${allocated.length}\n`);

    const drill = await confirm('Drill into employee details?');
    if (drill) {
      const id = await promptNumber('Enter Employee ID:', 1, 99999);
      const detail = await managerApi.getEmployeeDetail(id) as {
        employee: { name: string; department: string; status: string; totalUtilisation: number };
        skills: Array<{ skillName: string }>;
        activeAllocations: Array<{ projectName: string; utilisationPercent: number; fromDate: string; toDate: string }>;
        recentTags: string[];
      };

      printDivider();
      console.log(chalk.bold(`\n  ── ${detail.employee.name} `));
      printInfo(`Department: ${detail.employee.department}`);
      printInfo(`Status: ${detail.employee.status} (${detail.employee.totalUtilisation}%)`);
      printInfo(`Skills: ${detail.skills.map((s) => s.skillName).join(', ')}`);

      if (detail.activeAllocations.length > 0) {
        console.log('\n  Active Allocations:');
        printTable(
          ['Project', '%', 'From', 'To'],
          detail.activeAllocations.map((a) => [a.projectName, `${a.utilisationPercent}%`, a.fromDate, a.toDate]),
        );
      }

      if (detail.recentTags.length > 0) {
        printInfo(`Recent Activity Tags: ${detail.recentTags.join(', ')}`);
      }
      console.log();
    }
  } catch (err) {
    printError(err instanceof Error ? err.message : 'Failed to load dashboard.');
  }
}

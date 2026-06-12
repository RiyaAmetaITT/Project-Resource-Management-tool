import { managerApi } from '../../apiClient/managerApi';
import { printHeader, printTable, printError, printDivider, printInfo } from '../../utils/consoleUi';
import { promptNumber, promptText } from '../../utils/inputHelpers';
import { formatDisplayDate } from '../../utils/dateFormat';
import chalk from 'chalk';

const MAX_UTILISATION_PERCENT = 100;

export async function resourceDashboardScreen(): Promise<void> {
  while (true) {
    printHeader(`RESOURCE DASHBOARD — ${new Date().toLocaleString('en-GB', { month: 'long', year: 'numeric' })}`);
    console.log();

    try {
      const { bench, allocated, partialCount } = await managerApi.getDashboard();

      console.log(chalk.green.bold(`  ON BENCH  (${bench.length} employees available)`));
      printDivider();
      if (bench.length > 0) {
        printTable(
          ['ID', 'Name', 'Department', 'Skills'],
          bench.map((e) => [e.id, e.name, e.department, e.skills ?? '—']),
        );
      } else {
        printInfo('No employees currently on bench.');
      }

      console.log(chalk.yellow.bold('\n  ACTIVE EMPLOYEES'));
      printDivider();
      if (allocated.length > 0) {
        printTable(
          ['ID', 'Name', 'Alloc %', 'Availability'],
          allocated.map((e) => {
            const freePercent = MAX_UTILISATION_PERCENT - e.totalUtilisation;
            const availability = freePercent === 0 ? 'FULL' : `${freePercent}% free`;
            return [e.id, e.name, `${e.totalUtilisation}%`, availability];
          }),
        );
      } else {
        printInfo('No allocated employees.');
      }

      printDivider();
      console.log(`  Bench: ${bench.length}  |  Partial: ${partialCount}\n`);

      console.log('  [D] Drill into employee details     [B] Back\n');
      const action = (await promptText('Action')).toUpperCase();

      if (action === 'B') return;

      if (action === 'D') {
        await showEmployeeDetail();
        continue;
      }

      console.log(chalk.red('  Invalid action. Enter D or B.\n'));
    } catch (err) {
      printError(err instanceof Error ? err.message : 'Failed to load dashboard.');
      return;
    }
  }
}

async function showEmployeeDetail(): Promise<void> {
  const id = await promptNumber('Enter Employee ID:', 1, 99999);

  try {
    const detail = await managerApi.getEmployeeDetail(id);

    printDivider();
    console.log(chalk.bold(`\n  ── ${detail.employee.name} `));
    printInfo(`Department: ${detail.employee.department}`);
    printInfo(`Current Status: ${detail.employee.status} (${detail.employee.totalUtilisation}%)`);
    printInfo(`Profile Skills: ${detail.skills.map((s) => s.skillName).join(', ') || '—'}`);

    if (detail.activeAllocations.length > 0) {
      console.log('\n  Active Allocations:');
      printTable(
        ['Project', '%', 'From', 'To'],
        detail.activeAllocations.map((a) => [
          a.projectName,
          `${a.utilisationPercent}%`,
          formatDisplayDate(a.fromDate),
          formatDisplayDate(a.toDate),
        ]),
      );
    }

    if (detail.recentTags.length > 0) {
      printInfo(`Recent Activity Tags (last 4 weeks): ${detail.recentTags.join(', ')}`);
    }
    console.log();
  } catch (err) {
    printError(err instanceof Error ? err.message : 'Failed to load employee details.');
    return;
  }

  console.log('  [B] Back\n');
  while (true) {
    const backAction = (await promptText('Action')).toUpperCase();
    if (backAction === 'B') return;
    console.log(chalk.red('  Enter B to go back to the dashboard.'));
  }
}

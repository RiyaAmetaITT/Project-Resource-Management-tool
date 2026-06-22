import { isForbiddenError } from '../../apiClient/apiError';
import { managerApi } from '../../apiClient/managerApi';
import { AllocatePayload, DashboardEmployee } from '../../types/manager';
import {
  printHeader,
  printTable,
  printSuccess,
  printError,
  printDivider,
  printWarning,
  printMenu,
  printInfo,
} from '../../utils/consoleUi';
import {
  selectFromMenu,
  promptNumber,
  promptDate,
  promptUtilisationPercent,
  confirm,
} from '../../utils/inputHelpers';
import { formatDisplayDate } from '../../utils/dateFormat';
import chalk from 'chalk';

const MENU_OPTIONS = [
  'Allocate directly (I already know who I want)',
  'End an existing allocation',
  'Back',
];

const BACK_OPTION = ['Back'];

async function promptBackToMenu(): Promise<void> {
  printDivider();
  await selectFromMenu(BACK_OPTION, { prompt: 'Enter option:' });
}

async function loadTeam(): Promise<DashboardEmployee[]> {
  const { bench, allocated } = await managerApi.getDashboard();
  return [...bench, ...allocated];
}

async function showNoTeamMessage(): Promise<void> {
  printWarning('No employee is under you.');
  await promptBackToMenu();
}

export async function allocateResourceScreen(): Promise<void> {
  while (true) {
    printHeader('ALLOCATE RESOURCE');
    console.log();

    try {
      const team = await loadTeam();
      if (team.length === 0) {
        await showNoTeamMessage();
        return;
      }
    } catch (err) {
      printError(err instanceof Error ? err.message : 'Failed to load team.');
      await promptBackToMenu();
      return;
    }

    printMenu(MENU_OPTIONS);
    printDivider();

    const choice = await selectFromMenu(MENU_OPTIONS, { showList: false });

    switch (choice) {
      case 'Allocate directly (I already know who I want)': await directAllocation(); break;
      case 'End an existing allocation': await endExistingAllocation(); break;
      case 'Back': return;
    }
  }
}

async function directAllocation(): Promise<void> {
  try {
    const team = await loadTeam();
    if (team.length === 0) {
      printHeader('DIRECT ALLOCATION');
      console.log();
      await showNoTeamMessage();
      return;
    }

    printHeader('DIRECT ALLOCATION');
    console.log();
    console.log(chalk.cyan.bold('  YOUR TEAM'));
    printDivider();
    printTable(
      ['ID', 'Name', 'Department', 'Utilisation'],
      team.map((e) => [e.id, e.name, e.department, `${e.totalUtilisation}%`]),
    );
    printDivider();

    const projectId = await promptNumber('Select Project ID:', 1, 99999);
    const employeeId = await promptNumber('Enter Employee ID:', 1, 99999);
    await confirmAndSaveAllocation(employeeId, projectId);
  } catch (err) {
    if (isForbiddenError(err)) {
      printWarning('No employee is under you.');
    } else {
      const message = err instanceof Error ? err.message : 'Allocation failed.';
      printError(message);
    }
    await promptBackToMenu();
  }
}

async function confirmAndSaveAllocation(
  employeeId: number,
  projectId: number,
  suggestedPercent?: number,
): Promise<void> {
  const detail = await managerApi.getEmployeeDetail(employeeId);

  printDivider();
  console.log(chalk.bold(`\n  ── ${detail.employee.name} `));
  const benchLabel = detail.employee.totalUtilisation === 0 ? ' (fully on bench)' : '';
  printInfo(`Current Utilisation: ${detail.employee.totalUtilisation}%${benchLabel}`);
  console.log('\n  Set Allocation:');

  const utilisationPercent = suggestedPercent ?? await promptUtilisationPercent();
  const fromDate = await promptDate('From Date (DD-MM-YYYY):');
  const toDate = await promptDate('To Date (DD-MM-YYYY):');

  const payload: AllocatePayload = { employeeId, projectId, utilisationPercent, fromDate, toDate };

  console.log(chalk.dim('\n  Validating...'));
  const validation = await managerApi.validateAllocation(payload);
  const statusLabel = validation.isValid ? chalk.green('✓ Valid') : chalk.red('✗ Invalid');
  console.log(
    `  ${validation.employeeName} total in this period: ${validation.currentTotal}% + ${utilisationPercent}% = ${validation.newTotal}%   ${statusLabel}`,
  );

  if (!validation.isValid) {
    printError('Allocation would exceed 100% utilisation. Adjust the percentage or date range.');
    await promptBackToMenu();
    return;
  }

  const ok = await confirm('Confirm allocation?');
  if (!ok) {
    console.log('  Cancelled.\n');
    return;
  }

  const saved = await managerApi.allocate(payload);
  printSuccess(
    `Allocation saved. ${saved.employeeName} → ${saved.projectName} (${utilisationPercent}%, ${fromDate} – ${toDate})`,
  );
}

async function endExistingAllocation(): Promise<void> {
  try {
    printHeader('END ALLOCATION');
    console.log();
    const projectId = await promptNumber('Select Project ID:', 1, 99999);
    const allocations = await managerApi.getProjectAllocations(projectId);

    if (allocations.length === 0) {
      printWarning('No active allocations on this project.');
      await promptBackToMenu();
      return;
    }

    console.log('\n  Active Allocations on this project:');
    printTable(
      ['#', 'Employee', '%', 'From', 'To'],
      allocations.map((a, i) => [
        i + 1,
        a.employeeName,
        `${a.utilisationPercent}%`,
        formatDisplayDate(a.fromDate),
        formatDisplayDate(a.toDate),
      ]),
    );

    const pick = await promptNumber('Select allocation to end:', 1, allocations.length);
    const allocation = allocations[pick - 1];
    const today = formatDisplayDate(new Date().toISOString());

    const ok = await confirm(`End ${allocation.employeeName}'s allocation? Set end date to today (${today})?`);
    if (!ok) {
      console.log('  Cancelled.\n');
      return;
    }

    await managerApi.endAllocation(allocation.id);
    printSuccess(`Allocation ended. ${allocation.employeeName} freed as of ${today}.`);
  } catch (err) {
    printError(err instanceof Error ? err.message : 'Failed to end allocation.');
    await promptBackToMenu();
  }
}

import { managerApi } from '../../apiClient/managerApi';
import { printHeader, printTable, printSuccess, printError, printDivider, printWarning, printMenu } from '../../utils/consoleUi';
import { selectFromMenu, promptNumber, promptDate, promptText, promptUtilisationPercent, confirm } from '../../utils/inputHelpers';
import chalk from 'chalk';

const MENU_OPTIONS = ['Find resource using AI (recommended)', 'Allocate directly (I already know who I want)', 'End an existing allocation', 'Back'];

/** Screen 4.2 — Allocate Resource */
export async function allocateResourceScreen(): Promise<void> {
  printHeader('ALLOCATE RESOURCE');
  console.log();
  printMenu(MENU_OPTIONS);
  printDivider();

  const choice = await selectFromMenu(MENU_OPTIONS, { showList: false });

  switch (choice) {
    case 'Find resource using AI (recommended)': await aiAssistedAllocation(); break;
    case 'Allocate directly (I already know who I want)': await directAllocation(); break;
    case 'End an existing allocation': await endExistingAllocation(); break;
    case 'Back': return;
  }
}

async function aiAssistedAllocation(): Promise<void> {
  try {
    const projectId = await promptNumber('Enter Project ID:', 1, 99999);
    const requirement = await promptText('Describe your requirement in plain English:');

    console.log(chalk.dim('\n  Searching... (AI matching in progress)\n'));
    const result = await managerApi.aiSkillMatch(projectId, requirement) as {
      results: Array<{ employeeId: number; name: string; reason: string; suggestedUtilisationPercent?: number }>;
    };

    if (result.results.length === 0) {
      printWarning('No suitable candidates found.');
      return;
    }

    console.log(chalk.cyan.bold('\n  AI-MATCHED RESULTS'));
    printDivider();
    result.results.forEach((r, i) => {
      console.log(`  ${i + 1}.  ${chalk.bold(r.name)}`);
      console.log(`       ${chalk.dim(r.reason)}`);
      if (r.suggestedUtilisationPercent) {
        console.log(`       Suggested allocation: ${r.suggestedUtilisationPercent}%`);
      }
    });
    console.log(chalk.yellow('\n  Note: AI-generated. Verify before confirming.\n'));

    const selected = await selectFromMenu('Select employee to allocate (or Back):', [
      ...result.results.map((r) => r.name),
      'Back',
    ]);
    if (selected === 'Back') return;

    const employee = result.results.find((r) => r.name === selected)!;
    await confirmAndSaveAllocation(employee.employeeId, projectId);
  } catch (err) {
    printError(err instanceof Error ? err.message : 'AI matching failed.');
  }
}

async function directAllocation(): Promise<void> {
  try {
    const projectId = await promptNumber('Select Project ID:', 1, 99999);
    const employeeId = await promptNumber('Enter Employee ID:', 1, 99999);
    await confirmAndSaveAllocation(employeeId, projectId);
  } catch (err) {
    printError(err instanceof Error ? err.message : 'Allocation failed.');
  }
}

async function confirmAndSaveAllocation(employeeId: number, projectId: number): Promise<void> {
  const utilisationPercent = await promptUtilisationPercent();
  const fromDate = await promptDate('From Date (DD-MM-YYYY):');
  const toDate = await promptDate('To Date (DD-MM-YYYY):');

  const ok = await confirm(`Confirm allocation (${utilisationPercent}%, ${fromDate} → ${toDate})?`);
  if (!ok) { console.log('  Cancelled.\n'); return; }

  await managerApi.allocate({ employeeId, projectId, utilisationPercent, fromDate, toDate });
  printSuccess(`Allocation saved. (${utilisationPercent}%, ${fromDate} – ${toDate})`);
}

async function endExistingAllocation(): Promise<void> {
  try {
    const projectId = await promptNumber('Select Project ID:', 1, 99999);
    const allocations = await managerApi.getProjectAllocations(projectId) as Array<{
      id: number; employeeName: string; utilisationPercent: number;
    }>;

    if (allocations.length === 0) { printWarning('No active allocations on this project.'); return; }

    printTable(['#', 'Employee', '%'], allocations.map((a, i) => [i + 1, a.employeeName, `${a.utilisationPercent}%`]));

    const selected = await selectFromMenu('Select allocation to end:', allocations.map((a) => a.employeeName));
    const allocation = allocations.find((a) => a.employeeName === selected)!;

    const ok = await confirm(`End ${selected}'s allocation today?`);
    if (!ok) { console.log('  Cancelled.\n'); return; }

    await managerApi.endAllocation(allocation.id);
    printSuccess(`Allocation ended. ${selected} freed as of today.`);
  } catch (err) {
    printError(err instanceof Error ? err.message : 'Failed to end allocation.');
  }
}

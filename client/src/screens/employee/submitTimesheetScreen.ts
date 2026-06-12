import { getSession } from '../../utils/session';
import { employeeApi } from '../../apiClient/employeeApi';
import { ACTIVITY_TAG_OPTIONS } from '../../constants';
import { TimesheetEntry } from '../../types/employee';
import {
  printHeader,
  printSuccess,
  printError,
  printDivider,
  printInfo,
} from '../../utils/consoleUi';
import { promptWeekStartDate, promptNumber, multiSelect, promptText } from '../../utils/inputHelpers';
import chalk from 'chalk';

export async function submitTimesheetScreen(): Promise<void> {
  printHeader('SUBMIT TIMESHEET');
  console.log();

  try {
    const session = getSession();
    printInfo(`Employee: ${session.fullName}`);

    const weekStartDate = await promptWeekStartDate('Week Start');
    const context = await employeeApi.getSubmitContext(weekStartDate);

    if (context.allocations.length === 0) {
      printError('You have no active project allocations for this week.');
      return;
    }

    printInfo(`Week Start: ${context.weekStartDate}`);
    console.log(chalk.dim('\n  Checking your active allocations for this week...\n'));

    const entries: TimesheetEntry[] = [];
    const totalProjects = context.allocations.length;

    for (let i = 0; i < totalProjects; i++) {
      const allocation = context.allocations[i];
      printDivider();
      console.log(chalk.cyan.bold(`  PROJECT ${i + 1} OF ${totalProjects} — ${allocation.projectName}`));
      printInfo(`Allocation: ${allocation.utilisationPercent}%  |  Expected: ${allocation.maxHours} hrs max`);
      printDivider();

      const hours = await promptNumber('Hours worked this week:', 0, allocation.maxHours);
      if (hours === 0) continue;

      const activityTags = await multiSelect('What did you work on? Select activity tags:', [...ACTIVITY_TAG_OPTIONS]);
      entries.push({ projectId: allocation.projectId, hours, activityTags });
    }

    if (entries.length === 0) {
      printError('No hours logged. Timesheet not submitted.');
      return;
    }

    const totalHours = entries.reduce((sum, e) => sum + e.hours, 0);
    const withinLimit = totalHours <= context.maxWeeklyHours;

    console.log(chalk.bold('\n  SUMMARY'));
    for (const entry of entries) {
      const project = context.allocations.find((a) => a.projectId === entry.projectId)!;
      console.log(`  ${project.projectName.padEnd(16)} ${String(entry.hours).padStart(2)} hrs    [${entry.activityTags.join(', ')}]`);
    }
    console.log(`  ${'─'.repeat(44)}`);
    const statusLabel = withinLimit
      ? chalk.green(`✓`)
      : chalk.red(`✗ over limit`);
    console.log(`  Total           ${totalHours} hrs / ${context.maxWeeklyHours} hrs max   ${statusLabel}\n`);

    if (!withinLimit) {
      printError(`Total hours exceed the maximum of ${context.maxWeeklyHours} hrs/week.`);
      return;
    }

    printDivider();
    console.log('\n  [S] Submit Timesheet     [B] Back\n');
    const action = (await promptText('Action')).toUpperCase();
    if (action !== 'S') {
      console.log('  Cancelled.\n');
      return;
    }

    await employeeApi.submitTimesheet({ weekStartDate, entries });
    printSuccess('Timesheet submitted successfully. Status: SUBMITTED');
  } catch (err) {
    printError(err instanceof Error ? err.message : 'Failed to submit timesheet.');
  }
}

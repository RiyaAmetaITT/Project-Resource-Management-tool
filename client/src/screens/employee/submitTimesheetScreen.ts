import { employeeApi } from '../../apiClient/employeeApi';
import { printHeader, printSuccess, printError, printDivider } from '../../utils/consoleUi';
import { promptDate, promptNumber, multiSelect, confirm } from '../../utils/inputHelpers';

const ACTIVITY_TAGS = [
  'Backend API Development',
  'Microservices / Architecture',
  'Database Design & Queries',
  'WebSocket / Real-time Features',
  'Frontend Development',
  'Code Review / Mentoring',
  'Bug Fixing',
  'DevOps / Deployment',
  'Testing & QA',
  'Documentation',
];

/** Screen 5.1 — Submit Timesheet */
export async function submitTimesheetScreen(): Promise<void> {
  printHeader('SUBMIT TIMESHEET');
  console.log();

  try {
    const allocations = await employeeApi.getMyAllocations() as Array<{
      projectId: number; projectName: string; utilisationPercent: number;
    }>;

    if (allocations.length === 0) {
      printError('You have no active project allocations. You cannot submit a timesheet.');
      return;
    }

    const weekStartDate = await promptDate('Week Start Date (Monday, DD-MM-YYYY):');
    
    const entries: Array<{ projectId: number; hours: number; activityTags: string[] }> = [];

    console.log('\n  Enter hours for your allocated projects:\n');
    for (const alloc of allocations) {
      const hours = await promptNumber(`Hours for '${alloc.projectName}' (max 40):`, 0, 40);
      if (hours > 0) {
        const activityTags = await multiSelect(`Select activities for '${alloc.projectName}':`, ACTIVITY_TAGS);
        entries.push({ projectId: alloc.projectId, hours, activityTags });
      }
    }

    if (entries.length === 0) {
      console.log('  No hours logged. Timesheet not submitted.\n');
      return;
    }

    const totalHours = entries.reduce((sum, e) => sum + e.hours, 0);
    printDivider();
    const ok = await confirm(`Submit timesheet for ${totalHours} total hours?`);
    if (!ok) {
      console.log('  Cancelled.\n');
      return;
    }

    await employeeApi.submitTimesheet({ weekStartDate, entries });
    printSuccess('Timesheet submitted successfully.');
  } catch (err) {
    printError(err instanceof Error ? err.message : 'Failed to submit timesheet.');
  }
}

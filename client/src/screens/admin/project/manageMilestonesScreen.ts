import { adminApi } from '../../../apiClient/adminApi';
import { printHeader, printTable, printSuccess, printError, printDivider } from '../../../utils/consoleUi';
import { selectFromMenu, promptNumber, promptText, promptDate } from '../../../utils/inputHelpers';
import { formatDisplayDate } from '../../../utils/dateFormat';
import { MilestoneStatus } from '../../../types/enums';

export async function manageMilestonesScreen(): Promise<void> {
  printHeader('MILESTONES');
  console.log();

  try {
    const projectId = await promptNumber('Enter Project ID:', 1, 99999);
    const milestones = await adminApi.getMilestones(projectId) as Array<{
      id: number; title: string; dueDate: string; storyPoints: number; status: string; healthFlag: string;
    }>;

    if (milestones.length > 0) {
      const totalSP = milestones.reduce((sum, m) => sum + (m.storyPoints ?? 0), 0);
      const doneSP  = milestones.filter((m) => m.status === 'DONE').reduce((sum, m) => sum + (m.storyPoints ?? 0), 0);

      printTable(
        ['#', 'Title', 'Due Date', 'Story Pts', 'Status', 'Flag'],
        milestones.map((m, i) => [
          i + 1, m.title, formatDisplayDate(m.dueDate), m.storyPoints ?? 0, m.status,
          m.healthFlag === 'OVERDUE' ? '⚠ OVERDUE' : '',
        ]),
      );
      console.log(`  Total: ${totalSP} SP  |  Completed: ${doneSP} SP  |  Remaining: ${totalSP - doneSP} SP\n`);
    } else {
      console.log('  No milestones yet.\n');
    }

    printDivider();
    const action = await selectFromMenu('Select action:', ['Add Milestone', 'Update Milestone Status', 'Back']);

    switch (action) {
      case 'Add Milestone':           await addMilestone(projectId); break;
      case 'Update Milestone Status': await updateMilestoneStatus(milestones); break;
      case 'Back':                    return;
    }
  } catch (err) {
    printError(err instanceof Error ? err.message : 'Failed to manage milestones.');
  }

  return manageMilestonesScreen();
}

async function addMilestone(projectId: number): Promise<void> {
  const title = await promptText('Milestone Title:');
  const dueDate = await promptDate('Due Date (DD-MM-YYYY):');
  const storyPoints = await promptNumber('Story Points:', 0, 9999);
  await adminApi.addMilestone(projectId, { title, dueDate, storyPoints });
  printSuccess('Milestone added. ✓');
}

async function updateMilestoneStatus(milestones: Array<{ id: number; title: string }>): Promise<void> {
  if (milestones.length === 0) { printError('No milestones to update.'); return; }
  const titles = milestones.map((m) => m.title);
  const selected = await selectFromMenu('Select milestone:', titles);
  const milestone = milestones.find((m) => m.title === selected)!;
  const status = await selectFromMenu('New Status:', Object.values(MilestoneStatus));
  await adminApi.updateMilestoneStatus(milestone.id, status);
  printSuccess('Milestone status updated. ✓');
}

import { managerApi } from '../../apiClient/managerApi';
import { printHeader, printTable, printError, printDivider, formatHealthStatus, printInfo } from '../../utils/consoleUi';
import { selectFromMenu, confirm } from '../../utils/inputHelpers';
import chalk from 'chalk';

/** Screen 4.3 — My Projects + AI Risk Summary */
export async function myProjectsScreen(): Promise<void> {
  printHeader('MY PROJECTS');
  console.log();

  try {
    const projects = await managerApi.getMyProjects() as Array<{
      id: number; name: string; endDate: string; healthStatus: string;
    }>;

    if (projects.length === 0) { printInfo('No projects assigned.'); return; }

    projects.forEach((p, i) => {
      console.log(`  ${i + 1}.  ${chalk.bold(p.name)}   ${p.endDate}   ${formatHealthStatus(p.healthStatus)}`);
    });

    printDivider();
    const selected = await selectFromMenu('Select project to view details:', projects.map((p) => p.name));
    const project = projects.find((p) => p.name === selected)!;

    const detail = await managerApi.getProjectDetail(project.id) as {
      project: { name: string; healthStatus: string };
      milestones: Array<{ title: string; dueDate: string; storyPoints: number; status: string; healthFlag: string }>;
      allocations: Array<{ employeeName: string; utilisationPercent: number; fromDate: string; toDate: string }>;
      riskFlags: Array<{ type: string; message: string }>;
    };

    printDivider();
    console.log(chalk.bold(`\n  ── ${detail.project.name}  ${formatHealthStatus(detail.project.healthStatus)}\n`));

    // Risk Flags block — Screen 4.3
    if (detail.riskFlags && detail.riskFlags.length > 0) {
      console.log(chalk.red.bold('  Risk Flags:'));
      detail.riskFlags.forEach((f) => console.log(chalk.red(`    ✗  ${f.message}`)));
      console.log();
    }

    if (detail.milestones.length > 0) {
      const doneSP = detail.milestones.filter((m) => m.status === 'DONE').reduce((s, m) => s + (m.storyPoints ?? 0), 0);
      const totalSP = detail.milestones.reduce((s, m) => s + (m.storyPoints ?? 0), 0);
      console.log(chalk.cyan('  Milestones:'));
      printTable(
        ['#', 'Title', 'Due Date', 'SP', 'Status'],
        detail.milestones.map((m, i) => [i + 1, m.title, m.dueDate, m.storyPoints ?? 0, `${m.status}${m.healthFlag === 'OVERDUE' ? ' ⚠' : ''}`]),
      );
      console.log(`  SP: ${doneSP} done / ${totalSP} total\n`);
    }

    if (detail.allocations.length > 0) {
      console.log(chalk.cyan('  Allocated Resources:'));
      printTable(
        ['Name', '%', 'From', 'To'],
        detail.allocations.map((a) => [a.employeeName, `${a.utilisationPercent}%`, a.fromDate, a.toDate]),
      );
    }

    const getAI = await confirm('Get AI Risk Summary?');
    if (getAI) {
      console.log(chalk.dim('\n  Generating AI summary...\n'));
      const aiResult = await managerApi.aiRiskSummary(project.id) as { summary: string };
      printDivider();
      console.log(chalk.italic(`\n  "${aiResult.summary}"\n`));
      console.log(chalk.dim('  Note: AI-generated from milestone and timesheet data.\n'));
    }
  } catch (err) {
    printError(err instanceof Error ? err.message : 'Failed to load projects.');
  }
}

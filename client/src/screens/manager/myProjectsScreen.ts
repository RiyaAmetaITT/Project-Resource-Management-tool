import { managerApi } from '../../apiClient/managerApi';
import {
  printHeader,
  printTable,
  printError,
  printDivider,
  formatHealthStatus,
  printInfo,
  printMarkdownTable,
  returnToMenuPrompt,
} from '../../utils/consoleUi';
import { selectFromMenu, promptText } from '../../utils/inputHelpers';
import { formatDisplayDate } from '../../utils/dateFormat';
import chalk from 'chalk';

export async function myProjectsScreen(): Promise<void> {
  printHeader('MY PROJECTS');
  console.log();

  try {
    const projects = await managerApi.getMyProjects();

    if (projects.length === 0) {
      printInfo('No projects assigned.');
      return;
    }

    printTable(
      ['#', 'Project', 'End Date', 'Health'],
      projects.map((p, i) => [
        i + 1,
        p.name,
        formatDisplayDate(p.endDate),
        formatHealthStatus(p.healthStatus),
      ]),
    );

    printDivider();
    const selected = await selectFromMenu('Select project to view details:', projects.map((p) => p.name));
    const project = projects.find((p) => p.name === selected)!;

    const detail = await managerApi.getProjectDetail(project.id);

    printDivider();
    console.log(chalk.bold(`\n  ── ${detail.project.name} `));
    console.log(`  Health Status: ${formatHealthStatus(detail.project.healthStatus)}\n`);

    if (detail.riskFlags.length > 0) {
      console.log(chalk.red.bold('  Risk Flags:'));
      detail.riskFlags.forEach((f) => {
        const prefix = f.isPositive ? chalk.green('    ✓  ') : chalk.red('    ✗  ');
        console.log(`${prefix}${f.message}`);
      });
      console.log();
    }

    if (detail.milestones.length > 0) {
      console.log(chalk.cyan('  Milestones:'));
      printTable(
        ['#', 'Title', 'Due Date', 'Status'],
        detail.milestones.map((m, i) => [
          i + 1,
          m.title,
          formatDisplayDate(m.dueDate),
          `${m.status}${m.healthFlag === 'OVERDUE' ? '  ⚠ OVERDUE' : ''}`,
        ]),
      );
      console.log();
    }

    if (detail.allocations.length > 0) {
      console.log(chalk.cyan('  Allocated Resources:'));
      printTable(
        ['Name', '%', 'From', 'To'],
        detail.allocations.map((a) => [
          a.employeeName,
          `${a.utilisationPercent}%`,
          formatDisplayDate(a.fromDate),
          formatDisplayDate(a.toDate),
        ]),
      );
    }

    printDivider();
    console.log('  [A] Get AI Risk Summary     [B] Back\n');

    while (true) {
      const action = (await promptText('Action')).toUpperCase();
      if (action === 'B') return;

      if (action !== 'A') {
        console.log(chalk.red('  Enter A for AI Risk Summary or B to go back.'));
        continue;
      }

      try {
        console.log(chalk.dim('\n  Generating AI summary...\n'));
        const aiResult = await managerApi.aiRiskSummary(project.id);
        printDivider();
        console.log(chalk.bold(`\n  ── AI Risk Summary — ${detail.project.name} `));
        console.log();
        printMarkdownTable(aiResult.summary);
        console.log(chalk.dim('  Note: AI-generated from milestone and timesheet data.\n'));
      } catch (err) {
        printError(err instanceof Error ? err.message : 'AI risk summary failed.');
      }

      await returnToMenuPrompt();
      return;
    }
  } catch (err) {
    printError(err instanceof Error ? err.message : 'Failed to load projects.');
    await returnToMenuPrompt();
  }
}

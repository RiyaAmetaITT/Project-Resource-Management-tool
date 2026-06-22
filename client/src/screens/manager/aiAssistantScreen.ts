import { managerApi } from '../../apiClient/managerApi';
import {
  printHeader,
  printError,
  printDivider,
  printMenu,
  printTable,
  printMarkdownTable,
  formatHealthStatus,
} from '../../utils/consoleUi';
import { selectFromMenu, promptNumber, promptText } from '../../utils/inputHelpers';
import chalk from 'chalk';

const MENU_OPTIONS = [
  'Skill Match — Find best employees for a requirement',
  'Complete Team Building — Staff multiple roles from org bench',
  'Risk Summary — Get a health analysis for a project',
  'Back',
];

export async function aiAssistantScreen(): Promise<void> {
  printHeader('AI ASSISTANT');
  console.log();
  printMenu(MENU_OPTIONS);
  printDivider();

  const choice = await selectFromMenu(MENU_OPTIONS, { showList: false });

  switch (choice) {
    case 'Skill Match — Find best employees for a requirement': await skillMatch(); break;
    case 'Complete Team Building — Staff multiple roles from org bench': await teamBuild(); break;
    case 'Risk Summary — Get a health analysis for a project': await riskSummary(); break;
    case 'Back': return;
  }

  return aiAssistantScreen();
}

async function skillMatch(): Promise<void> {
  try {
    printDivider();
    console.log(chalk.bold('\n  ── Skill Match '));
    const projectId = await promptNumber('Enter Project ID:', 1, 99999);
    const requirement = await promptText('Describe your project requirement in plain English:');

    console.log(chalk.dim('\n  Searching... (calling AI)\n'));
    const { results } = await managerApi.aiSkillMatch(projectId, requirement);

    console.log(chalk.cyan.bold('  Results:\n'));
    printTable(
      ['#', 'Name', 'Reason', 'Availability', 'Suggested %'],
      results.map((r, i) => [
        i + 1,
        r.name,
        r.reason,
        r.availability ?? '—',
        r.suggestedUtilisationPercent != null ? `${r.suggestedUtilisationPercent}%` : '—',
      ]),
    );
    console.log();
    console.log(chalk.yellow(
      '  Note: These are AI-generated suggestions across all employees. Verify availability and skills before allocating.\n',
    ));
  } catch (err) {
    printError(err instanceof Error ? err.message : 'AI skill match failed.');
  }
}

async function teamBuild(): Promise<void> {
  try {
    printDivider();
    console.log(chalk.bold('\n  ── Complete Team Building '));
    console.log(chalk.dim(
      '  Describe every role you need in one prompt. The AI searches the entire organisation\n'
      + '  for BENCH employees and assigns the best match to each role (no duplicate people).\n',
    ));

    const requirement = await promptText(
      'Describe your team requirement (e.g. I need 1 Java developer, 1 QA, 1 SDET, 1 DevOps engineer):',
    );

    console.log(chalk.dim(
      '\n  Searching organisation bench... (calling AI — may take up to a minute)\n',
    ));
    const result = await managerApi.aiTeamBuild(requirement);

    console.log(chalk.cyan.bold(`  Searched ${result.benchSearched} bench employee(s) organisation-wide.\n`));

    if (result.filled.length > 0) {
      console.log(chalk.green.bold('  Filled Roles:\n'));
      printTable(
        ['Role', 'Employee', 'Matched Skills', 'Proficiency', 'Reason'],
        result.filled.map((r) => [
          r.roleTitle,
          r.employeeName,
          r.matchedSkills.join(', ') || '—',
          r.proficiencyLevels.join(', ') || '—',
          r.reason,
        ]),
      );
      console.log();
    }

    if (result.unfilled.length > 0) {
      console.log(chalk.red.bold('  Unfilled Roles:\n'));
      for (const role of result.unfilled) {
        const gapLabel =
          role.gapType === 'SKILL_GAP'
            ? 'Skill Gap'
            : role.gapType === 'AVAILABILITY_GAP'
              ? 'Availability Gap'
              : 'Bench Constraint';
        console.log(chalk.yellow(`  ${role.roleTitle}  [${gapLabel}]`));
        console.log(`    Required: ${role.requiredSkills.join(', ') || '—'}`);
        console.log(`    ${role.message}`);
        if (role.availableFrom) {
          console.log(chalk.dim(`    Available from: ${role.availableFrom}`));
        }
        if (role.skilledEmployees?.length) {
          console.log(chalk.dim(`    Skilled employees: ${role.skilledEmployees.join(', ')}`));
        }
        console.log();
      }
    }

    if (result.filled.length === 0 && result.unfilled.length === 0) {
      console.log(chalk.yellow('  No roles could be parsed from your requirement. Try listing each role clearly.\n'));
    }

    console.log(chalk.yellow(
      '  Note: Suggestions are from organisation-wide bench only. Verify skills and availability before allocating.\n',
    ));
  } catch (err) {
    printError(err instanceof Error ? err.message : 'AI team building failed.');
  }
}

async function riskSummary(): Promise<void> {
  try {
    printDivider();
    console.log(chalk.bold('\n  ── Risk Summary '));

    const projects = await managerApi.getMyProjects();
    if (projects.length === 0) {
      printError('No projects assigned.');
      return;
    }

    projects.forEach((p, i) => {
      console.log(`  ${i + 1}.  ${p.name}    ${formatHealthStatus(p.healthStatus)}`);
    });
    console.log();

    const pick = await promptNumber('Enter project number:', 1, projects.length);
    const project = projects[pick - 1];

    console.log(chalk.dim('\n  Generating AI summary...\n'));
    const result = await managerApi.aiRiskSummary(project.id);

    printDivider();
    console.log(chalk.bold('\n  Risk Summary:\n'));
    printMarkdownTable(result.summary);
    console.log(chalk.yellow('  Note: AI-generated from current milestone and timesheet data.\n'));
  } catch (err) {
    printError(err instanceof Error ? err.message : 'AI risk summary failed.');
  }
}

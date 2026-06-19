import { managerApi } from '../../apiClient/managerApi';
import { printHeader, printError, printDivider, printMenu } from '../../utils/consoleUi';
import { selectFromMenu, promptNumber, promptText } from '../../utils/inputHelpers';
import chalk from 'chalk';

const MENU_OPTIONS = ['Skill Match — Find best employees for a requirement', 'Risk Summary — Get a health analysis for a project', 'Back'];

/** Screen 4.5 — AI Assistant */
export async function aiAssistantScreen(): Promise<void> {
  printHeader('AI ASSISTANT');
  console.log();
  printMenu(MENU_OPTIONS);
  printDivider();

  const choice = await selectFromMenu(MENU_OPTIONS, { showList: false });

  switch (choice) {
    case 'Skill Match — Find best employees for a requirement': await skillMatch(); break;
    case 'Risk Summary — Get a health analysis for a project': await riskSummary(); break;
    case 'Back': return;
  }

  return aiAssistantScreen();
}

async function skillMatch(): Promise<void> {
  try {
    const projectId = await promptNumber('Enter Project ID:', 1, 99999);
    const requirement = await promptText('Describe your requirement in plain English:');

    console.log(chalk.dim('\n  Searching... (calling AI)\n'));
    const result = await managerApi.aiSkillMatch(projectId, requirement) as {
      results: Array<{ name: string; reason: string; suggestedUtilisationPercent?: number }>;
    };

    printDivider();
    console.log(chalk.cyan.bold('  Results:\n'));
    result.results.forEach((r, i) => {
      console.log(`  ${i + 1}.  ${chalk.bold(r.name)}`);
      console.log(`       ${r.reason}`);
      if (r.suggestedUtilisationPercent) console.log(`       Suggested: ${r.suggestedUtilisationPercent}%`);
      console.log();
    });
    console.log(chalk.yellow('  Note: AI-generated. Verify before confirming allocation.\n'));
  } catch (err) {
    printError(err instanceof Error ? err.message : 'AI skill match failed.');
  }
}

async function riskSummary(): Promise<void> {
  try {
    const projectId = await promptNumber('Enter Project ID:', 1, 99999);
    console.log(chalk.dim('\n  Generating AI summary...\n'));

    const result = await managerApi.aiRiskSummary(projectId) as { summary: string };

    printDivider();
    console.log(chalk.italic(`\n  "${result.summary}"\n`));
    console.log(chalk.yellow('  Note: AI-generated from current milestone and timesheet data.\n'));
  } catch (err) {
    printError(err instanceof Error ? err.message : 'AI risk summary failed.');
  }
}

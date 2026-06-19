import { adminApi } from '../../apiClient/adminApi';
import { printHeader, printTable, printSuccess, printError, printDivider } from '../../utils/consoleUi';
import { selectFromMenu, promptText, promptNumber } from '../../utils/inputHelpers';

/** Screen 3.5 — System Configuration */
export async function systemConfigScreen(): Promise<void> {
  printHeader('SYSTEM CONFIGURATION');
  console.log();

  try {
    const config = await adminApi.getConfig() as {
      llmProvider: string; llmApiKey: string; schedulerIntervalHrs: number; maxWeeklyHours: number;
    };

    printTable(
      ['Setting', 'Value'],
      [
        ['LLM Provider', config.llmProvider],
        ['LLM API Key', '****'],
        ['Scheduler Interval', `${config.schedulerIntervalHrs} hours`],
        ['Max Weekly Hours', String(config.maxWeeklyHours)],
      ],
    );
    printDivider();

    const action = await selectFromMenu('Select action:', [
      'Update LLM API Key',
      'Change LLM Provider',
      'Update Scheduler Interval',
      'Update Max Weekly Hours',
      'Back',
    ]);

    switch (action) {
      case 'Update LLM API Key': {
        const llmApiKey = await promptText('New API Key:');
        await adminApi.updateConfig({ llmApiKey });
        printSuccess('API key updated.');
        break;
      }
      case 'Change LLM Provider': {
        const llmProvider = await selectFromMenu('Provider:', ['gemini', 'groq']);
        await adminApi.updateConfig({ llmProvider });
        printSuccess(`Provider changed to ${llmProvider}.`);
        break;
      }
      case 'Update Scheduler Interval': {
        const schedulerIntervalHrs = await promptNumber('Interval (hours, 1–24):', 1, 24);
        await adminApi.updateConfig({ schedulerIntervalHrs });
        printSuccess('Scheduler interval updated.');
        break;
      }
      case 'Update Max Weekly Hours': {
        const maxWeeklyHours = await promptNumber('Max Weekly Hours (20–80):', 20, 80);
        await adminApi.updateConfig({ maxWeeklyHours });
        printSuccess('Max weekly hours updated.');
        break;
      }
      case 'Back': return;
    }
  } catch (err) {
    printError(err instanceof Error ? err.message : 'Failed to update config.');
  }

  return systemConfigScreen();
}

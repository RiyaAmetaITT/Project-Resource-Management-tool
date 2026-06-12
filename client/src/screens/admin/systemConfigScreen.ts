import { adminApi } from '../../apiClient/adminApi';
import { printHeader, printTable, printSuccess, printError, printDivider } from '../../utils/consoleUi';
import { selectFromMenu, promptText, promptNumber } from '../../utils/inputHelpers';

/** Screen 3.5 — System Configuration */
export async function systemConfigScreen(): Promise<void> {
  printHeader('SYSTEM CONFIGURATION');
  console.log();

  try {
    const config = await adminApi.getConfig();

    printTable(
      ['Setting', 'Value'],
      [
        ['LLM Provider', config.llmProvider],
        ['LLM Host', config.llmHost],
        ['LLM Model', config.llmModel],
        ['LLM API Key', '****'],
        ['Scheduler Interval', `${config.schedulerIntervalHrs} hours`],
        ['Max Weekly Hours', String(config.maxWeeklyHours)],
      ],
    );
    printDivider();

    const action = await selectFromMenu('Select action:', [
      'Update LLM Host',
      'Update LLM Model',
      'Update LLM API Key',
      'Update Scheduler Interval',
      'Update Max Weekly Hours',
      'Back',
    ]);

    switch (action) {
      case 'Update LLM Host': {
        const llmHost = await promptText(
          'New LLM Host (full URL, e.g. http://host/api/generate or https://api.groq.com/openai/v1):',
        );
        await adminApi.updateConfig({ llmHost });
        printSuccess('LLM host updated.');
        break;
      }
      case 'Update LLM Model': {
        const llmModel = await promptText('New LLM Model (e.g. gemma3:12b-it-q8_0):');
        if (!llmModel.trim()) {
          printError('Model name is required.');
          break;
        }
        await adminApi.updateConfig({ llmModel });
        printSuccess('LLM model updated.');
        break;
      }
      case 'Update LLM API Key': {
        const llmApiKey = await promptText('New API Key:');
        if (!llmApiKey.trim()) {
          printError('API key is required for cloud LLM providers.');
          break;
        }
        await adminApi.updateConfig({ llmApiKey });
        printSuccess('API key updated.');
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

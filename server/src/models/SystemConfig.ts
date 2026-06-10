import { LlmProvider } from '../types/enums';

export interface SystemConfig {
  id: number;
  llmProvider: LlmProvider;
  llmApiKey: string;
  schedulerIntervalHrs: number;
  maxWeeklyHours: number;
}

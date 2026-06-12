import { LlmProvider } from '../types/enums';

export interface SystemConfig {
  id: number;
  llmProvider: LlmProvider;
  llmHost: string;
  llmModel: string;
  llmApiKey: string;
  schedulerIntervalHrs: number;
  maxWeeklyHours: number;
}

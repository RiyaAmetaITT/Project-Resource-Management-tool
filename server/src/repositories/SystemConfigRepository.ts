import { RowDataPacket } from 'mysql2';
import pool from '../db/database';
import { SystemConfig } from '../models/SystemConfig';
import { SYSTEM_CONFIG_ROW_ID, DEFAULT_LLM_MODEL } from '../constants';
import { LlmProvider } from '../types/enums';

interface SystemConfigRow extends RowDataPacket {
  id: number;
  llm_provider: LlmProvider;
  llm_host: string | null;
  llm_model: string | null;
  llm_api_key: string;
  scheduler_interval_hrs: number;
  max_weekly_hours: number;
}

export class SystemConfigRepository {
  async getConfig(): Promise<SystemConfig> {
    const [rows] = await pool.query<SystemConfigRow[]>(
      'SELECT * FROM system_config WHERE id = ?',
      [SYSTEM_CONFIG_ROW_ID],
    );
    const row = rows[0];
    if (!row) {
      throw new Error('System configuration row is missing. Run migrations.');
    }
    return {
      id: row.id,
      llmProvider: row.llm_provider,
      llmHost: row.llm_host ?? '',
      llmModel: row.llm_model?.trim() || DEFAULT_LLM_MODEL,
      llmApiKey: row.llm_api_key,
      schedulerIntervalHrs: row.scheduler_interval_hrs,
      maxWeeklyHours: row.max_weekly_hours,
    };
  }

  async updateConfig(fields: Partial<SystemConfig>): Promise<SystemConfig> {
    const columnMap: Partial<Record<keyof SystemConfig, string>> = {
      llmProvider: 'llm_provider',
      llmHost: 'llm_host',
      llmModel: 'llm_model',
      llmApiKey: 'llm_api_key',
      schedulerIntervalHrs: 'scheduler_interval_hrs',
      maxWeeklyHours: 'max_weekly_hours',
    };
    const setClauses = (Object.keys(fields) as Array<keyof SystemConfig>)
      .filter((key) => columnMap[key] !== undefined)
      .map((key) => `${columnMap[key]} = ?`);
    const values = (Object.keys(fields) as Array<keyof SystemConfig>)
      .filter((key) => columnMap[key] !== undefined)
      .map((key) => fields[key]);

    if (setClauses.length > 0) {
      await pool.query(
        `UPDATE system_config SET ${setClauses.join(', ')} WHERE id = ?`,
        [...values, SYSTEM_CONFIG_ROW_ID],
      );
    }
    return this.getConfig();
  }
}

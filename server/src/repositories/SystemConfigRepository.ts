import { RowDataPacket } from 'mysql2';
import pool from '../db/database';
import { SystemConfig } from '../models/SystemConfig';
import { SYSTEM_CONFIG_ROW_ID } from '../constants';

type ConfigRow = SystemConfig & RowDataPacket;

/**
 * SystemConfigRepository — single-row table; no insert/delete exposed.
 * Only read and update are needed.
 */
export class SystemConfigRepository {
  async getConfig(): Promise<SystemConfig> {
    const [rows] = await pool.query<ConfigRow[]>(
      'SELECT * FROM system_config WHERE id = ?',
      [SYSTEM_CONFIG_ROW_ID],
    );
    if (!rows[0]) {
      throw new Error('System configuration row is missing. Run migrations.');
    }
    const row = rows[0] as any;
    return {
      id: row.id,
      llmProvider: row.llm_provider,
      llmApiKey: row.llm_api_key,
      schedulerIntervalHrs: row.scheduler_interval_hrs,
      maxWeeklyHours: row.max_weekly_hours,
    };
  }

  async updateConfig(fields: Partial<SystemConfig>): Promise<SystemConfig> {
    const columnMap: Partial<Record<keyof SystemConfig, string>> = {
      llmProvider: 'llm_provider',
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

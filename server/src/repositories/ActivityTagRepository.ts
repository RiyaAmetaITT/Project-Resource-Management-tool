import { RowDataPacket, ResultSetHeader } from 'mysql2';
import pool from '../db/database';
import { IRepository } from './IRepository';
import { ActivityTag } from '../models/ActivityTag';

type TagRow = ActivityTag & RowDataPacket;

export class ActivityTagRepository implements IRepository<ActivityTag> {
  async findById(id: number): Promise<ActivityTag | null> {
    const [rows] = await pool.query<TagRow[]>(
      'SELECT * FROM activity_tags WHERE id = ?',
      [id],
    );
    return rows[0] ?? null;
  }

  async save(entity: Partial<ActivityTag>): Promise<ActivityTag> {
    const [result] = await pool.query<ResultSetHeader>(
      'INSERT INTO activity_tags (timesheet_entry_id, tag_name) VALUES (?, ?)',
      [entity.timesheetEntryId, entity.tagName],
    );
    return this.findById(result.insertId) as Promise<ActivityTag>;
  }

  async delete(id: number): Promise<void> {
    await pool.query('DELETE FROM activity_tags WHERE id = ?', [id]);
  }

  async findAll(): Promise<ActivityTag[]> {
    const [rows] = await pool.query<TagRow[]>('SELECT * FROM activity_tags');
    return rows;
  }

  async findByTimesheetEntryId(timesheetEntryId: number): Promise<ActivityTag[]> {
    const [rows] = await pool.query<TagRow[]>(
      'SELECT * FROM activity_tags WHERE timesheet_entry_id = ?',
      [timesheetEntryId],
    );
    return rows;
  }

  /** Returns all unique tags an employee used in the last N weeks — feeds AI skill matching. */
  async findRecentTagsByEmployee(employeeId: number, weeksBack: number): Promise<string[]> {
    const [rows] = await pool.query<TagRow[]>(
      `SELECT DISTINCT at.tag_name
       FROM activity_tags at
       INNER JOIN timesheet_entries te ON te.id = at.timesheet_entry_id
       INNER JOIN timesheets t         ON t.id  = te.timesheet_id
       WHERE t.employee_id = ?
         AND t.week_start_date >= DATE_SUB(CURDATE(), INTERVAL ? WEEK)`,
      [employeeId, weeksBack],
    );
    return rows.map((row) => row.tagName);
  }
}

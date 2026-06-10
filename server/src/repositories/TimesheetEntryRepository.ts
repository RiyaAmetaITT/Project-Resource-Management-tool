import { RowDataPacket, ResultSetHeader } from 'mysql2';
import pool from '../db/database';
import { IRepository } from './IRepository';
import { TimesheetEntry } from '../models/TimesheetEntry';

type EntryRow = TimesheetEntry & RowDataPacket;

export class TimesheetEntryRepository implements IRepository<TimesheetEntry> {
  async findById(id: number): Promise<TimesheetEntry | null> {
    const [rows] = await pool.query<EntryRow[]>(
      'SELECT * FROM timesheet_entries WHERE id = ?',
      [id],
    );
    return rows[0] ?? null;
  }

  async save(entity: Partial<TimesheetEntry>): Promise<TimesheetEntry> {
    const [result] = await pool.query<ResultSetHeader>(
      'INSERT INTO timesheet_entries (timesheet_id, project_id, hours) VALUES (?, ?, ?)',
      [entity.timesheetId, entity.projectId, entity.hours],
    );
    return this.findById(result.insertId) as Promise<TimesheetEntry>;
  }

  async delete(id: number): Promise<void> {
    await pool.query('DELETE FROM timesheet_entries WHERE id = ?', [id]);
  }

  async findAll(): Promise<TimesheetEntry[]> {
    const [rows] = await pool.query<EntryRow[]>('SELECT * FROM timesheet_entries');
    return rows;
  }

  async findByTimesheetId(timesheetId: number): Promise<TimesheetEntry[]> {
    const [rows] = await pool.query<EntryRow[]>(
      'SELECT * FROM timesheet_entries WHERE timesheet_id = ?',
      [timesheetId],
    );
    return rows;
  }
}

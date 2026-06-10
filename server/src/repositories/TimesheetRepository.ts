import { RowDataPacket, ResultSetHeader } from 'mysql2';
import pool from '../db/database';
import { IRepository } from './IRepository';
import { Timesheet } from '../models/Timesheet';

type TimesheetRow = Timesheet & RowDataPacket;

export class TimesheetRepository implements IRepository<Timesheet> {
  async findById(id: number): Promise<Timesheet | null> {
    const [rows] = await pool.query<TimesheetRow[]>(
      'SELECT * FROM timesheets WHERE id = ?',
      [id],
    );
    return rows[0] ?? null;
  }

  async save(entity: Partial<Timesheet>): Promise<Timesheet> {
    const [result] = await pool.query<ResultSetHeader>(
      "INSERT INTO timesheets (employee_id, week_start_date, status) VALUES (?, ?, 'SUBMITTED')",
      [entity.employeeId, entity.weekStartDate],
    );
    return this.findById(result.insertId) as Promise<Timesheet>;
  }

  async delete(id: number): Promise<void> {
    await pool.query('DELETE FROM timesheets WHERE id = ?', [id]);
  }

  async findAll(): Promise<Timesheet[]> {
    const [rows] = await pool.query<TimesheetRow[]>('SELECT * FROM timesheets');
    return rows;
  }

  async findByEmployeeAndWeek(employeeId: number, weekStartDate: Date): Promise<Timesheet | null> {
    const [rows] = await pool.query<TimesheetRow[]>(
      'SELECT * FROM timesheets WHERE employee_id = ? AND week_start_date = ?',
      [employeeId, weekStartDate],
    );
    return rows[0] ?? null;
  }

  async findByEmployeeId(employeeId: number): Promise<Timesheet[]> {
    const [rows] = await pool.query<TimesheetRow[]>(
      'SELECT * FROM timesheets WHERE employee_id = ? ORDER BY week_start_date DESC',
      [employeeId],
    );
    return rows;
  }

  /** Returns submitted timesheets for all employees in a project for a given week. */
  async findByProjectAndWeek(projectId: number, weekStartDate: Date): Promise<TimesheetRow[]> {
    const [rows] = await pool.query<TimesheetRow[]>(
      `SELECT t.* FROM timesheets t
       INNER JOIN timesheet_entries te ON te.timesheet_id = t.id
       WHERE te.project_id = ? AND t.week_start_date = ?`,
      [projectId, weekStartDate],
    );
    return rows;
  }
}

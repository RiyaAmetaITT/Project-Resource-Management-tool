import { RowDataPacket, ResultSetHeader } from 'mysql2';
import pool from '../db/database';
import { IRepository } from './IRepository';
import { Timesheet } from '../models/Timesheet';

type TimesheetRow = Timesheet & RowDataPacket;

export class TimesheetRepository implements IRepository<Timesheet> {
  private mapRow(row: Record<string, unknown>): Timesheet {
    return {
      id: row.id as number,
      resourceId: row.resource_id as number,
      weekStartDate: row.week_start_date as Date,
      status: row.status as Timesheet['status'],
      createdAt: row.created_at as Date,
    };
  }

  async findById(id: number): Promise<Timesheet | null> {
    const [rows] = await pool.query<TimesheetRow[]>('SELECT * FROM timesheets WHERE id = ?', [id]);
    return rows[0] ? this.mapRow(rows[0]) : null;
  }

  async save(entity: Partial<Timesheet>): Promise<Timesheet> {
    const [result] = await pool.query<ResultSetHeader>(
      "INSERT INTO timesheets (resource_id, week_start_date, status) VALUES (?, ?, 'SUBMITTED')",
      [entity.resourceId, entity.weekStartDate],
    );
    return this.findById(result.insertId) as Promise<Timesheet>;
  }

  async delete(id: number): Promise<void> {
    await pool.query('DELETE FROM timesheets WHERE id = ?', [id]);
  }

  async findAll(): Promise<Timesheet[]> {
    const [rows] = await pool.query<TimesheetRow[]>('SELECT * FROM timesheets');
    return rows.map((r) => this.mapRow(r));
  }

  async findByResourceAndWeek(resourceId: number, weekStartDate: Date): Promise<Timesheet | null> {
    const [rows] = await pool.query<TimesheetRow[]>(
      'SELECT * FROM timesheets WHERE resource_id = ? AND week_start_date = ?',
      [resourceId, weekStartDate],
    );
    return rows[0] ? this.mapRow(rows[0]) : null;
  }

  async findByResourceId(resourceId: number): Promise<Timesheet[]> {
    const [rows] = await pool.query<TimesheetRow[]>(
      'SELECT * FROM timesheets WHERE resource_id = ? ORDER BY week_start_date DESC',
      [resourceId],
    );
    return rows.map((r) => this.mapRow(r));
  }

  async saveMissed(resourceId: number, weekStartDate: Date): Promise<void> {
    await pool.query(
      "INSERT IGNORE INTO timesheets (resource_id, week_start_date, status) VALUES (?, ?, 'MISSED')",
      [resourceId, weekStartDate],
    );
  }
}

import { RowDataPacket, ResultSetHeader } from 'mysql2';
import pool from '../db/database';
import { IRepository } from './IRepository';
import { Allocation } from '../models/Allocation';

type AllocationRow = Allocation & RowDataPacket;

/** Represents the sum of utilisations for a single employee in an overlapping period. */
export interface UtilisationSum extends RowDataPacket {
  total: number;
}

export class AllocationRepository implements IRepository<Allocation> {
  private mapRow(row: Record<string, unknown>): Allocation {
    return {
      id: row.id as number,
      employeeId: row.employee_id as number,
      projectId: row.project_id as number,
      utilisationPercent: row.utilisation_percent as number,
      fromDate: row.from_date as Date,
      toDate: row.to_date as Date,
      createdAt: row.created_at as Date,
    };
  }

  async findById(id: number): Promise<Allocation | null> {
    const [rows] = await pool.query<AllocationRow[]>(
      'SELECT * FROM allocations WHERE id = ?',
      [id],
    );
    return rows[0] ? this.mapRow(rows[0]) : null;
  }

  async save(entity: Partial<Allocation>): Promise<Allocation> {
    const [result] = await pool.query<ResultSetHeader>(
      'INSERT INTO allocations (employee_id, project_id, utilisation_percent, from_date, to_date) VALUES (?, ?, ?, ?, ?)',
      [entity.employeeId, entity.projectId, entity.utilisationPercent, entity.fromDate, entity.toDate],
    );
    return this.findById(result.insertId) as Promise<Allocation>;
  }

  async delete(id: number): Promise<void> {
    await pool.query('DELETE FROM allocations WHERE id = ?', [id]);
  }

  async findAll(): Promise<Allocation[]> {
    const [rows] = await pool.query<AllocationRow[]>('SELECT * FROM allocations ORDER BY id');
    return rows.map((r) => this.mapRow(r));
  }

  async findActiveByProject(projectId: number): Promise<Allocation[]> {
    const [rows] = await pool.query<AllocationRow[]>(
      'SELECT * FROM allocations WHERE project_id = ? AND to_date >= CURDATE()',
      [projectId],
    );
    return rows.map((r) => this.mapRow(r));
  }

  async findActiveByEmployee(employeeId: number): Promise<Allocation[]> {
    const [rows] = await pool.query<AllocationRow[]>(
      'SELECT * FROM allocations WHERE employee_id = ? AND to_date >= CURDATE()',
      [employeeId],
    );
    return rows.map((r) => this.mapRow(r));
  }

  /**
   * Sums utilisation for an employee over a date range to validate before a new allocation.
   * Excludes a specific allocation ID when checking (used when editing an existing allocation).
   */
  async sumUtilisationInPeriod(
    employeeId: number,
    fromDate: Date,
    toDate: Date,
    excludeAllocationId?: number,
  ): Promise<number> {
    const [rows] = await pool.query<UtilisationSum[]>(
      `SELECT COALESCE(SUM(utilisation_percent), 0) AS total
       FROM allocations
       WHERE employee_id = ?
         AND from_date < ?
         AND to_date > ?
         ${excludeAllocationId ? 'AND id != ?' : ''}`,
      excludeAllocationId
        ? [employeeId, toDate, fromDate, excludeAllocationId]
        : [employeeId, toDate, fromDate],
    );
    return rows[0].total;
  }

  async endAllocation(id: number, endDate: Date): Promise<void> {
    await pool.query('UPDATE allocations SET to_date = ? WHERE id = ?', [endDate, id]);
  }

  async endAllActiveForEmployee(employeeId: number, endDate: Date): Promise<void> {
    await pool.query(
      'UPDATE allocations SET to_date = ? WHERE employee_id = ? AND to_date >= CURDATE()',
      [endDate, employeeId],
    );
  }

  async findAllActive(): Promise<Allocation[]> {
    const [rows] = await pool.query<AllocationRow[]>(
      'SELECT * FROM allocations WHERE to_date >= CURDATE()',
    );
    return rows.map((r) => this.mapRow(r));
  }
}

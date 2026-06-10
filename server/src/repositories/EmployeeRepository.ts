import { RowDataPacket, ResultSetHeader } from 'mysql2';
import pool from '../db/database';
import { IRepository } from './IRepository';
import { Employee } from '../models/Employee';
import { EmployeeStatus } from '../types/enums';

type EmployeeRow = Employee & RowDataPacket;

export class EmployeeRepository implements IRepository<Employee> {
  private mapRow(row: Record<string, unknown>): Employee {
    return {
      id: row.id as number,
      userId: row.user_id as number,
      managerId: (row.manager_id as number | null) ?? null,
      name: row.name as string,
      email: row.email as string,
      department: row.department as string,
      designation: row.designation as string,
      status: row.status as Employee['status'],
      totalUtilisation: row.total_utilisation as number,
      isActive: !!row.is_active,
      createdAt: row.created_at as Date,
    };
  }

  async findById(id: number): Promise<Employee | null> {
    const [rows] = await pool.query<EmployeeRow[]>(
      'SELECT * FROM employees WHERE id = ?',
      [id],
    );
    return rows[0] ? this.mapRow(rows[0]) : null;
  }

  async save(entity: Partial<Employee>): Promise<Employee> {
    const [result] = await pool.query<ResultSetHeader>(
      `INSERT INTO employees
         (user_id, manager_id, name, email, department, designation, status, total_utilisation, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        entity.userId,
        entity.managerId ?? null,
        entity.name,
        entity.email,
        entity.department,
        entity.designation,
        entity.status ?? EmployeeStatus.BENCH,
        entity.totalUtilisation ?? 0,
        entity.isActive ?? true,
      ],
    );
    return this.findById(result.insertId) as Promise<Employee>;
  }

  async delete(id: number): Promise<void> {
    await pool.query('DELETE FROM employees WHERE id = ?', [id]);
  }

  async findAll(): Promise<Employee[]> {
    const [rows] = await pool.query<EmployeeRow[]>(
      'SELECT * FROM employees ORDER BY id',
    );
    return rows.map((r) => this.mapRow(r));
  }

  async findAllActive(): Promise<Employee[]> {
    const [rows] = await pool.query<EmployeeRow[]>(
      'SELECT * FROM employees WHERE is_active = TRUE ORDER BY id',
    );
    return rows.map((r) => this.mapRow(r));
  }

  /** Returns all active employees whose manager_id matches the given manager user ID. */
  async findByManagerId(managerId: number): Promise<Employee[]> {
    const [rows] = await pool.query<EmployeeRow[]>(
      'SELECT * FROM employees WHERE manager_id = ? AND is_active = TRUE ORDER BY id',
      [managerId],
    );
    return rows.map((r) => this.mapRow(r));
  }

  async findBenchEmployees(): Promise<Employee[]> {
    const [rows] = await pool.query<EmployeeRow[]>(
      "SELECT * FROM employees WHERE status = 'BENCH' AND is_active = TRUE",
    );
    return rows.map((r) => this.mapRow(r));
  }

  async findByUserId(userId: number): Promise<Employee | null> {
    const [rows] = await pool.query<EmployeeRow[]>(
      'SELECT * FROM employees WHERE user_id = ?',
      [userId],
    );
    return rows[0] ? this.mapRow(rows[0]) : null;
  }

  async update(id: number, fields: Partial<Employee>): Promise<void> {
    const updates = Object.entries(fields)
      .filter(([, value]) => value !== undefined)
      .map(([key]) => `${camelToSnake(key)} = ?`);
    const values = Object.entries(fields)
      .filter(([, value]) => value !== undefined)
      .map(([, value]) => value);

    if (updates.length === 0) return;
    await pool.query(
      `UPDATE employees SET ${updates.join(', ')} WHERE id = ?`,
      [...values, id],
    );
  }

  /** Updates manager_id for the Assign Manager feature (Screen 3.1.4). */
  async assignManager(employeeId: number, managerId: number): Promise<void> {
    await pool.query(
      'UPDATE employees SET manager_id = ? WHERE id = ?',
      [managerId, employeeId],
    );
  }

  async updateStatus(id: number, status: EmployeeStatus, totalUtilisation: number): Promise<void> {
    await pool.query(
      'UPDATE employees SET status = ?, total_utilisation = ? WHERE id = ?',
      [status, totalUtilisation, id],
    );
  }

  async setActiveStatus(id: number, isActive: boolean): Promise<void> {
    await pool.query('UPDATE employees SET is_active = ? WHERE id = ?', [isActive, id]);
  }
}

/** Converts camelCase field name to snake_case for dynamic SQL. */
function camelToSnake(str: string): string {
  return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}

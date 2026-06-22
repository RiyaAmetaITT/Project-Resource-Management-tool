import { RowDataPacket, ResultSetHeader } from 'mysql2';
import pool from '../db/database';
import { IRepository } from './IRepository';
import { Resource, ResourceProfile } from '../models/Resource';
import { ResourceStatus, Role } from '../types/enums';

const PROFILE_SELECT = `
  SELECT
    res.id, res.user_id, res.status, res.total_utilisation, res.created_at, res.manager_id,
    res.timesheet_access_frozen, res.timesheet_frozen_week_start,
    u.full_name, u.email, u.department, u.designation, u.is_active
  FROM resources res
  INNER JOIN users u ON u.id = res.user_id
`;

export class ResourceRepository implements IRepository<Resource> {
  private mapRow(row: Record<string, unknown>): Resource {
    return {
      id: row.id as number,
      userId: row.user_id as number,
      status: row.status as Resource['status'],
      totalUtilisation: row.total_utilisation as number,
      timesheetAccessFrozen: !!row.timesheet_access_frozen,
      timesheetFrozenWeekStart: (row.timesheet_frozen_week_start as Date | null) ?? null,
      createdAt: row.created_at as Date,
    };
  }

  private mapProfile(row: Record<string, unknown>): ResourceProfile {
    return {
      ...this.mapRow(row),
      fullName: row.full_name as string,
      email: row.email as string,
      department: (row.department as string | null) ?? null,
      designation: (row.designation as string | null) ?? null,
      managerId: (row.manager_id as number | null) ?? null,
      isActive: !!row.is_active,
    };
  }

  async findById(id: number): Promise<Resource | null> {
    const [rows] = await pool.query<RowDataPacket[]>('SELECT * FROM resources WHERE id = ?', [id]);
    return rows[0] ? this.mapRow(rows[0]) : null;
  }

  async findProfileById(id: number): Promise<ResourceProfile | null> {
    const [rows] = await pool.query<RowDataPacket[]>(`${PROFILE_SELECT} WHERE res.id = ?`, [id]);
    return rows[0] ? this.mapProfile(rows[0]) : null;
  }

  async save(entity: Partial<Resource>): Promise<Resource> {
    const [result] = await pool.query<ResultSetHeader>(
      'INSERT INTO resources (user_id, status, total_utilisation) VALUES (?, ?, ?)',
      [entity.userId, entity.status ?? ResourceStatus.BENCH, entity.totalUtilisation ?? 0],
    );
    return this.findById(result.insertId) as Promise<Resource>;
  }

  async delete(id: number): Promise<void> {
    await pool.query('DELETE FROM resources WHERE id = ?', [id]);
  }

  async findAll(): Promise<ResourceProfile[]> {
    const [rows] = await pool.query<RowDataPacket[]>(`${PROFILE_SELECT} ORDER BY res.id`);
    return rows.map((r) => this.mapProfile(r));
  }

  async findAllEmployees(): Promise<ResourceProfile[]> {
    const [rows] = await pool.query<RowDataPacket[]>(
      `${PROFILE_SELECT}
       INNER JOIN roles r ON r.id = u.role_id
       WHERE r.name = ?
       ORDER BY res.id`,
      [Role.EMPLOYEE],
    );
    return rows.map((r) => this.mapProfile(r));
  }

  async findEmployeeProfileById(id: number): Promise<ResourceProfile | null> {
    const [rows] = await pool.query<RowDataPacket[]>(
      `${PROFILE_SELECT}
       INNER JOIN roles r ON r.id = u.role_id
       WHERE res.id = ? AND r.name = ?`,
      [id, Role.EMPLOYEE],
    );
    return rows[0] ? this.mapProfile(rows[0]) : null;
  }

  async findAllActive(): Promise<ResourceProfile[]> {
    const [rows] = await pool.query<RowDataPacket[]>(
      `${PROFILE_SELECT} WHERE u.is_active = TRUE ORDER BY res.id`,
    );
    return rows.map((r) => this.mapProfile(r));
  }

  async findAllActiveEmployees(): Promise<ResourceProfile[]> {
    const [rows] = await pool.query<RowDataPacket[]>(
      `${PROFILE_SELECT}
       INNER JOIN roles r ON r.id = u.role_id
       WHERE u.is_active = TRUE AND r.name = ?
       ORDER BY res.id`,
      [Role.EMPLOYEE],
    );
    return rows.map((row) => this.mapProfile(row));
  }

  async findByManagerId(managerUserId: number): Promise<ResourceProfile[]> {
    const [rows] = await pool.query<RowDataPacket[]>(
      `${PROFILE_SELECT}
       INNER JOIN roles r ON r.id = u.role_id
       WHERE res.manager_id = ? AND u.is_active = TRUE AND r.name = ?
       ORDER BY res.id`,
      [managerUserId, Role.EMPLOYEE],
    );
    return rows.map((r) => this.mapProfile(r));
  }

  async assignManager(resourceId: number, managerUserId: number): Promise<void> {
    await pool.query('UPDATE resources SET manager_id = ? WHERE id = ?', [managerUserId, resourceId]);
  }

  async findActiveEmployeeProfileById(id: number): Promise<ResourceProfile | null> {
    const profile = await this.findEmployeeProfileById(id);
    return profile?.isActive ? profile : null;
  }

  async findByUserId(userId: number): Promise<Resource | null> {
    const [rows] = await pool.query<RowDataPacket[]>('SELECT * FROM resources WHERE user_id = ?', [userId]);
    return rows[0] ? this.mapRow(rows[0]) : null;
  }

  async updateStatus(id: number, status: ResourceStatus, totalUtilisation: number): Promise<void> {
    await pool.query(
      'UPDATE resources SET status = ?, total_utilisation = ? WHERE id = ?',
      [status, totalUtilisation, id],
    );
  }

  async setTimesheetFrozen(resourceId: number, weekStart: Date): Promise<void> {
    await pool.query(
      'UPDATE resources SET timesheet_access_frozen = TRUE, timesheet_frozen_week_start = ? WHERE id = ?',
      [weekStart, resourceId],
    );
  }

  async restoreTimesheetAccess(resourceId: number): Promise<void> {
    await pool.query(
      'UPDATE resources SET timesheet_access_frozen = FALSE, timesheet_frozen_week_start = NULL WHERE id = ?',
      [resourceId],
    );
  }

  async findFrozenByManagerId(managerUserId: number): Promise<ResourceProfile[]> {
    const [rows] = await pool.query<RowDataPacket[]>(
      `${PROFILE_SELECT}
       INNER JOIN roles r ON r.id = u.role_id
       WHERE res.manager_id = ?
         AND u.is_active = TRUE
         AND r.name = ?
         AND res.timesheet_access_frozen = TRUE
       ORDER BY res.id`,
      [managerUserId, Role.EMPLOYEE],
    );
    return rows.map((r) => this.mapProfile(r));
  }
}

import { RowDataPacket, ResultSetHeader } from 'mysql2';
import pool from '../db/database';
import { IRepository } from './IRepository';
import { Project } from '../models/Project';
import { HealthStatus, ProjectStatus } from '../types/enums';

type ProjectRow = Project & RowDataPacket;

export class ProjectRepository implements IRepository<Project> {
  private mapRow(row: Record<string, unknown>): Project {
    return {
      id: row.id as number,
      name: row.name as string,
      description: row.description as string,
      startDate: row.start_date as Date,
      endDate: row.end_date as Date,
      totalStoryPoints: row.total_story_points as number,
      status: row.status as Project['status'],
      healthStatus: row.health_status as Project['healthStatus'],
      managerId: row.manager_id as number,
      atRiskNotifiedAt: (row.at_risk_notified_at as Date | null) ?? null,
      createdAt: row.created_at as Date,
    };
  }

  async findById(id: number): Promise<Project | null> {
    const [rows] = await pool.query<ProjectRow[]>(
      'SELECT * FROM projects WHERE id = ?',
      [id],
    );
    return rows[0] ? this.mapRow(rows[0]) : null;
  }

  async save(entity: Partial<Project>): Promise<Project> {
    const [result] = await pool.query<ResultSetHeader>(
      `INSERT INTO projects (name, description, start_date, end_date, total_story_points, status, health_status, manager_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        entity.name,
        entity.description ?? '',
        entity.startDate,
        entity.endDate,
        entity.totalStoryPoints ?? 0,
        entity.status ?? ProjectStatus.PLANNED,
        entity.healthStatus ?? HealthStatus.ON_TRACK,
        entity.managerId,
      ],
    );
    return this.findById(result.insertId) as Promise<Project>;
  }

  async delete(id: number): Promise<void> {
    await pool.query('DELETE FROM projects WHERE id = ?', [id]);
  }

  async findAll(): Promise<Project[]> {
    const [rows] = await pool.query<ProjectRow[]>('SELECT * FROM projects ORDER BY id');
    return rows.map((r) => this.mapRow(r));
  }

  async findByManagerId(managerId: number): Promise<Project[]> {
    const [rows] = await pool.query<ProjectRow[]>(
      'SELECT * FROM projects WHERE manager_id = ?',
      [managerId],
    );
    return rows.map((r) => this.mapRow(r));
  }

  async update(id: number, fields: Partial<Project>): Promise<void> {
    const columnMap: Partial<Record<keyof Project, string>> = {
      name: 'name',
      description: 'description',
      startDate: 'start_date',
      endDate: 'end_date',
      totalStoryPoints: 'total_story_points',
      status: 'status',
      managerId: 'manager_id',
    };
    const keys = (Object.keys(fields) as Array<keyof Project>)
      .filter((key) => columnMap[key] !== undefined && fields[key] !== undefined);
    const setClauses = keys.map((key) => `${columnMap[key]} = ?`);
    const values = keys.map((key) => fields[key]);

    if (setClauses.length === 0) return;
    await pool.query(`UPDATE projects SET ${setClauses.join(', ')} WHERE id = ?`, [...values, id]);
  }

  async updateHealthStatus(id: number, healthStatus: HealthStatus): Promise<void> {
    await pool.query('UPDATE projects SET health_status = ? WHERE id = ?', [healthStatus, id]);
  }

  async markAtRiskNotified(id: number): Promise<void> {
    await pool.query(
      'UPDATE projects SET at_risk_notified_at = CURRENT_TIMESTAMP WHERE id = ?',
      [id],
    );
  }

  async clearAtRiskNotification(id: number): Promise<void> {
    await pool.query('UPDATE projects SET at_risk_notified_at = NULL WHERE id = ?', [id]);
  }
}

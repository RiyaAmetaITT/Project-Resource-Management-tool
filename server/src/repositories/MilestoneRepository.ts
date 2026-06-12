import { RowDataPacket, ResultSetHeader } from 'mysql2';
import pool from '../db/database';
import { IRepository } from './IRepository';
import { Milestone } from '../models/Milestone';
import { HealthFlag, MilestoneStatus } from '../types/enums';

type MilestoneRow = RowDataPacket;

export class MilestoneRepository implements IRepository<Milestone> {
  private mapRow(row: Record<string, unknown>): Milestone {
    return {
      id: row.id as number,
      projectId: row.project_id as number,
      title: row.title as string,
      dueDate: row.due_date as Date,
      storyPoints: row.story_points as number,
      status: row.status as Milestone['status'],
      healthFlag: row.health_flag as Milestone['healthFlag'],
    };
  }

  async findById(id: number): Promise<Milestone | null> {
    const [rows] = await pool.query<MilestoneRow[]>(
      'SELECT * FROM milestones WHERE id = ?',
      [id],
    );
    return rows[0] ? this.mapRow(rows[0]) : null;
  }

  async save(entity: Partial<Milestone>): Promise<Milestone> {
    const [result] = await pool.query<ResultSetHeader>(
      'INSERT INTO milestones (project_id, title, due_date, story_points, status, health_flag) VALUES (?, ?, ?, ?, ?, ?)',
      [
        entity.projectId,
        entity.title,
        entity.dueDate,
        entity.storyPoints ?? 0,
        entity.status ?? MilestoneStatus.NOT_STARTED,
        entity.healthFlag ?? HealthFlag.NORMAL,
      ],
    );
    return this.findById(result.insertId) as Promise<Milestone>;
  }

  async delete(id: number): Promise<void> {
    await pool.query('DELETE FROM milestones WHERE id = ?', [id]);
  }

  async findAll(): Promise<Milestone[]> {
    const [rows] = await pool.query<MilestoneRow[]>('SELECT * FROM milestones');
    return rows.map((r) => this.mapRow(r));
  }

  async findByProjectId(projectId: number): Promise<Milestone[]> {
    const [rows] = await pool.query<MilestoneRow[]>(
      'SELECT * FROM milestones WHERE project_id = ? ORDER BY due_date',
      [projectId],
    );
    return rows.map((r) => this.mapRow(r));
  }

  async updateStatus(id: number, status: MilestoneStatus): Promise<void> {
    await pool.query('UPDATE milestones SET status = ? WHERE id = ?', [status, id]);
  }

  async flagOverdue(id: number): Promise<void> {
    await pool.query(
      "UPDATE milestones SET health_flag = 'OVERDUE' WHERE id = ?",
      [id],
    );
  }

  async findIncompletePastDue(): Promise<Milestone[]> {
    const [rows] = await pool.query<MilestoneRow[]>(
      "SELECT * FROM milestones WHERE due_date < CURDATE() AND status != 'DONE' AND health_flag = 'NORMAL'",
    );
    return rows.map((r) => this.mapRow(r));
  }
}

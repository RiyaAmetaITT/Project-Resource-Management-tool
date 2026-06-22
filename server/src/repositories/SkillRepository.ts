import { RowDataPacket, ResultSetHeader } from 'mysql2';
import pool from '../db/database';
import { IRepository } from './IRepository';
import { Skill } from '../models/Skill';
import { SkillCategory } from '../types/enums';

export class SkillRepository implements IRepository<Skill> {
  private mapRow(row: Record<string, unknown>): Skill {
    return {
      id: row.id as number,
      skillName: row.skill_name as string,
      category: row.category as SkillCategory,
    };
  }

  async findById(id: number): Promise<Skill | null> {
    const [rows] = await pool.query<RowDataPacket[]>('SELECT * FROM skills WHERE id = ?', [id]);
    return rows[0] ? this.mapRow(rows[0]) : null;
  }

  async findByName(skillName: string): Promise<Skill | null> {
    const [rows] = await pool.query<RowDataPacket[]>(
      'SELECT * FROM skills WHERE skill_name = ?',
      [skillName],
    );
    return rows[0] ? this.mapRow(rows[0]) : null;
  }

  async findAll(): Promise<Skill[]> {
    const [rows] = await pool.query<RowDataPacket[]>('SELECT * FROM skills ORDER BY skill_name');
    return rows.map((row) => this.mapRow(row));
  }

  async save(entity: Partial<Skill>): Promise<Skill> {
    if (!entity.skillName || !entity.category) {
      throw new Error('skillName and category are required to save a skill.');
    }
    return this.createSkill(entity.skillName, entity.category);
  }

  async createSkill(skillName: string, category: SkillCategory): Promise<Skill> {
    const [result] = await pool.query<ResultSetHeader>(
      'INSERT INTO skills (skill_name, category) VALUES (?, ?)',
      [skillName, category],
    );
    return this.findById(result.insertId) as Promise<Skill>;
  }

  async delete(id: number): Promise<void> {
    await pool.query('DELETE FROM skills WHERE id = ?', [id]);
  }

  async findOrCreate(skillName: string, category: SkillCategory): Promise<Skill> {
    const existing = await this.findByName(skillName);
    return existing ?? this.createSkill(skillName, category);
  }
}

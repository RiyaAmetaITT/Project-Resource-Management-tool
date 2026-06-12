import { RowDataPacket, ResultSetHeader } from 'mysql2';
import pool from '../db/database';
import { ResourceSkill, ResourceSkillView } from '../models/ResourceSkill';
import { Proficiency } from '../types/enums';

export class ResourceSkillRepository {
  private mapView(row: Record<string, unknown>): ResourceSkillView {
    return {
      id: row.id as number,
      resourceId: row.resource_id as number,
      skillId: row.skill_id as number,
      proficiencyLevel: row.proficiency_level as Proficiency,
      skillName: row.skill_name as string,
      category: row.category as ResourceSkillView['category'],
    };
  }

  async findById(id: number): Promise<ResourceSkill | null> {
    const [rows] = await pool.query<RowDataPacket[]>(
      'SELECT * FROM resource_skills WHERE id = ?',
      [id],
    );
    if (!rows[0]) return null;
    return {
      id: rows[0].id as number,
      resourceId: rows[0].resource_id as number,
      skillId: rows[0].skill_id as number,
      proficiencyLevel: rows[0].proficiency_level as Proficiency,
    };
  }

  async save(entity: Partial<ResourceSkill>): Promise<ResourceSkill> {
    const [result] = await pool.query<ResultSetHeader>(
      'INSERT INTO resource_skills (resource_id, skill_id, proficiency_level) VALUES (?, ?, ?)',
      [entity.resourceId, entity.skillId, entity.proficiencyLevel],
    );
    return this.findById(result.insertId) as Promise<ResourceSkill>;
  }

  async delete(id: number): Promise<void> {
    await pool.query('DELETE FROM resource_skills WHERE id = ?', [id]);
  }

  async findByResourceId(resourceId: number): Promise<ResourceSkillView[]> {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT rs.*, s.skill_name, s.category
       FROM resource_skills rs
       INNER JOIN skills s ON s.id = rs.skill_id
       WHERE rs.resource_id = ?
       ORDER BY s.skill_name`,
      [resourceId],
    );
    return rows.map((r) => this.mapView(r));
  }

  async updateProficiency(id: number, proficiencyLevel: Proficiency): Promise<void> {
    await pool.query(
      'UPDATE resource_skills SET proficiency_level = ? WHERE id = ?',
      [proficiencyLevel, id],
    );
  }
}

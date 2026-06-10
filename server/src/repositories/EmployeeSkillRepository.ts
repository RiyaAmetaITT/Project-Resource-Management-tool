import { RowDataPacket, ResultSetHeader } from 'mysql2';
import pool from '../db/database';
import { IRepository } from './IRepository';
import { EmployeeSkill } from '../models/EmployeeSkill';

type SkillRow = EmployeeSkill & RowDataPacket;

export class EmployeeSkillRepository implements IRepository<EmployeeSkill> {
  async findById(id: number): Promise<EmployeeSkill | null> {
    const [rows] = await pool.query<SkillRow[]>(
      'SELECT * FROM employee_skills WHERE id = ?',
      [id],
    );
    return rows[0] ?? null;
  }

  async save(entity: Partial<EmployeeSkill>): Promise<EmployeeSkill> {
    const [result] = await pool.query<ResultSetHeader>(
      'INSERT INTO employee_skills (employee_id, skill_name, category, proficiency_level) VALUES (?, ?, ?, ?)',
      [entity.employeeId, entity.skillName, entity.category, entity.proficiencyLevel],
    );
    return this.findById(result.insertId) as Promise<EmployeeSkill>;
  }

  async delete(id: number): Promise<void> {
    await pool.query('DELETE FROM employee_skills WHERE id = ?', [id]);
  }

  async findAll(): Promise<EmployeeSkill[]> {
    const [rows] = await pool.query<SkillRow[]>('SELECT * FROM employee_skills');
    return rows;
  }

  async findByEmployeeId(employeeId: number): Promise<EmployeeSkill[]> {
    const [rows] = await pool.query<SkillRow[]>(
      'SELECT * FROM employee_skills WHERE employee_id = ?',
      [employeeId],
    );
    return rows;
  }

  async updateProficiency(id: number, proficiencyLevel: string): Promise<void> {
    await pool.query(
      'UPDATE employee_skills SET proficiency_level = ? WHERE id = ?',
      [proficiencyLevel, id],
    );
  }
}

import { RowDataPacket, ResultSetHeader } from 'mysql2';
import pool from '../db/database';
import { IRepository } from './IRepository';
import { User } from '../models/User';
import { Role } from '../types/enums';

type UserRow = RowDataPacket & {
  id: number;
  role_id: number;
  role_name: Role;
  manager_id: number | null;
  username: string;
  email: string;
  full_name: string;
  password_hash: string;
  department: string | null;
  designation: string | null;
  force_password_change: boolean;
  is_active: boolean;
  created_at: Date;
};

const USER_SELECT = `
  SELECT u.*, r.name AS role_name
  FROM users u
  INNER JOIN roles r ON r.id = u.role_id
`;

export class UserRepository implements IRepository<User> {
  private mapRow(row: UserRow): User {
    return {
      id: row.id,
      roleId: row.role_id,
      role: row.role_name,
      managerId: row.manager_id,
      username: row.username,
      email: row.email,
      fullName: row.full_name,
      passwordHash: row.password_hash,
      department: row.department,
      designation: row.designation,
      forcePasswordChange: !!row.force_password_change,
      isActive: !!row.is_active,
      createdAt: row.created_at,
    };
  }

  async findById(id: number): Promise<User | null> {
    const [rows] = await pool.query<UserRow[]>(`${USER_SELECT} WHERE u.id = ?`, [id]);
    return rows[0] ? this.mapRow(rows[0]) : null;
  }

  async save(entity: Partial<User>): Promise<User> {
    const [result] = await pool.query<ResultSetHeader>(
      `INSERT INTO users
         (role_id, manager_id, username, email, full_name, password_hash, department, designation, force_password_change, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        entity.roleId,
        entity.managerId ?? null,
        entity.username,
        entity.email,
        entity.fullName,
        entity.passwordHash,
        entity.department ?? null,
        entity.designation ?? null,
        entity.forcePasswordChange ?? true,
        entity.isActive ?? true,
      ],
    );
    return this.findById(result.insertId) as Promise<User>;
  }

  async delete(id: number): Promise<void> {
    await pool.query('DELETE FROM users WHERE id = ?', [id]);
  }

  async findAll(): Promise<User[]> {
    const [rows] = await pool.query<UserRow[]>(`${USER_SELECT} ORDER BY u.id`);
    return rows.map((r) => this.mapRow(r));
  }

  async findByUsername(username: string): Promise<User | null> {
    const [rows] = await pool.query<UserRow[]>(`${USER_SELECT} WHERE u.username = ?`, [username]);
    return rows[0] ? this.mapRow(rows[0]) : null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const [rows] = await pool.query<UserRow[]>(`${USER_SELECT} WHERE u.email = ?`, [email]);
    return rows[0] ? this.mapRow(rows[0]) : null;
  }

  async updatePassword(userId: number, passwordHash: string, forcePasswordChange = false): Promise<void> {
    await pool.query(
      'UPDATE users SET password_hash = ?, force_password_change = ? WHERE id = ?',
      [passwordHash, forcePasswordChange, userId],
    );
  }

  async setActiveStatus(userId: number, isActive: boolean): Promise<void> {
    await pool.query('UPDATE users SET is_active = ? WHERE id = ?', [isActive, userId]);
  }

  async assignManager(userId: number, managerId: number): Promise<void> {
    await pool.query('UPDATE users SET manager_id = ? WHERE id = ?', [managerId, userId]);
  }

  async updateProfile(
    userId: number,
    fields: Partial<Pick<User, 'fullName' | 'email' | 'department' | 'designation'>>,
  ): Promise<void> {
    const columnMap: Record<string, string> = {
      fullName: 'full_name',
      email: 'email',
      department: 'department',
      designation: 'designation',
    };
    const updates: string[] = [];
    const values: unknown[] = [];

    for (const [key, column] of Object.entries(columnMap)) {
      const value = fields[key as keyof typeof fields];
      if (value !== undefined) {
        updates.push(`${column} = ?`);
        values.push(value);
      }
    }

    if (updates.length === 0) return;
    await pool.query(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, [...values, userId]);
  }
}

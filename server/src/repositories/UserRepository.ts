import { RowDataPacket, ResultSetHeader } from 'mysql2';
import pool from '../db/database';
import { IRepository } from './IRepository';
import { User } from '../models/User';

type UserRow = User & RowDataPacket;

export class UserRepository implements IRepository<User> {
  private mapRow(row: any): User {
    return {
      id: row.id,
      username: row.username,
      email: row.email,
      fullName: row.full_name,
      passwordHash: row.password_hash,
      role: row.role,
      forcePasswordChange: !!row.force_password_change,
      isActive: !!row.is_active,
      createdAt: row.created_at,
    };
  }

  async findById(id: number): Promise<User | null> {
    const [rows] = await pool.query<UserRow[]>(
      'SELECT * FROM users WHERE id = ?',
      [id],
    );
    return rows[0] ? this.mapRow(rows[0]) : null;
  }

  async save(entity: Partial<User>): Promise<User> {
    const [result] = await pool.query<ResultSetHeader>(
      `INSERT INTO users (username, email, full_name, password_hash, role, force_password_change, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        entity.username,
        entity.email,
        entity.fullName,
        entity.passwordHash,
        entity.role,
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
    const [rows] = await pool.query<UserRow[]>('SELECT * FROM users ORDER BY id');
    return rows.map(r => this.mapRow(r));
  }

  async findByUsername(username: string): Promise<User | null> {
    const [rows] = await pool.query<UserRow[]>(
      'SELECT * FROM users WHERE username = ?',
      [username],
    );
    return rows[0] ? this.mapRow(rows[0]) : null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const [rows] = await pool.query<UserRow[]>(
      'SELECT * FROM users WHERE email = ?',
      [email],
    );
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
}

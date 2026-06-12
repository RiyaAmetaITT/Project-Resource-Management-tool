import { RowDataPacket } from 'mysql2';
import pool from '../db/database';
import { RoleRecord } from '../models/Role';
import { Role } from '../types/enums';

type RoleRow = RoleRecord & RowDataPacket;

export class RoleRepository {
  async findById(id: number): Promise<RoleRecord | null> {
    const [rows] = await pool.query<RoleRow[]>('SELECT * FROM roles WHERE id = ?', [id]);
    return rows[0] ? { id: rows[0].id, name: rows[0].name as Role } : null;
  }

  async findByName(name: Role): Promise<RoleRecord | null> {
    const [rows] = await pool.query<RoleRow[]>('SELECT * FROM roles WHERE name = ?', [name]);
    return rows[0] ? { id: rows[0].id, name: rows[0].name as Role } : null;
  }
}

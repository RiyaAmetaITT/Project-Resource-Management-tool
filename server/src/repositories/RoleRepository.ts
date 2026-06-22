import { RowDataPacket } from 'mysql2';
import pool from '../db/database';
import { IRepository } from './IRepository';
import { RoleRecord } from '../models/Role';
import { Role } from '../types/enums';

type RoleRow = RoleRecord & RowDataPacket;

export class RoleRepository implements IRepository<RoleRecord> {
  async findById(id: number): Promise<RoleRecord | null> {
    const [rows] = await pool.query<RoleRow[]>('SELECT * FROM roles WHERE id = ?', [id]);
    return rows[0] ? { id: rows[0].id, name: rows[0].name as Role } : null;
  }

  async findByName(name: Role): Promise<RoleRecord | null> {
    const [rows] = await pool.query<RoleRow[]>('SELECT * FROM roles WHERE name = ?', [name]);
    return rows[0] ? { id: rows[0].id, name: rows[0].name as Role } : null;
  }

  async findAll(): Promise<RoleRecord[]> {
    const [rows] = await pool.query<RoleRow[]>('SELECT * FROM roles ORDER BY id');
    return rows.map((row) => ({ id: row.id, name: row.name as Role }));
  }

  async save(_entity: Partial<RoleRecord>): Promise<RoleRecord> {
    throw new Error('Role creation is not supported via repository.');
  }

  async delete(_id: number): Promise<void> {
    throw new Error('Role deletion is not supported via repository.');
  }
}

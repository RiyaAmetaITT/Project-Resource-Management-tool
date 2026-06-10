import mysql from 'mysql2/promise';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config({ path: path.join(__dirname, '../../../.env') });

let pool: mysql.Pool | null = null;

export async function canConnectToDb(): Promise<boolean> {
  try {
    const conn = await getPool().getConnection();
    conn.release();
    return true;
  } catch {
    return false;
  }
}

export function getPool(): mysql.Pool {
  if (!pool) {
    pool = mysql.createPool({
      host: process.env.DB_HOST ?? 'localhost',
      port: Number(process.env.DB_PORT ?? 3306),
      user: process.env.DB_USER ?? 'root',
      password: process.env.DB_PASSWORD ?? '',
      database: process.env.DB_NAME ?? 'prm_tool',
      waitForConnections: true,
      connectionLimit: 5,
      multipleStatements: true,
    });
  }
  return pool;
}

async function tableExists(tableName: string): Promise<boolean> {
  const p = getPool();
  const [rows] = await p.query(
    `SELECT TABLE_NAME FROM information_schema.TABLES
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?`,
    [process.env.DB_NAME ?? 'prm_tool', tableName],
  );
  return (rows as unknown[]).length > 0;
}

export async function runMigrationsIfNeeded(): Promise<void> {
  if (await tableExists('users')) {
    return;
  }

  const migrationsDir = path.join(__dirname, '../../../server/src/db/migrations');
  const files = fs.readdirSync(migrationsDir).filter((f) => f.endsWith('.sql')).sort();
  const p = getPool();
  for (const file of files) {
    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');
    await p.query(sql);
  }
}

/** Verifies DB connectivity and schema readiness for integration tests. */
export async function ensureDbReady(): Promise<boolean> {
  try {
    const connected = await canConnectToDb();
    if (!connected) return false;
    await runMigrationsIfNeeded();
    return await tableExists('users');
  } catch {
    return false;
  }
}

export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

/** Unique suffix to avoid collisions across test runs. */
export function uniqueId(): string {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

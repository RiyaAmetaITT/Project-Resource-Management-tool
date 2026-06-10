import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const BCRYPT_SALT_ROUNDS = 12;
const DEFAULT_ADMIN_USERNAME = 'admin';
const DEFAULT_ADMIN_PASSWORD = 'Admin@1234';

/**
 * Idempotent seed script — safe to run multiple times.
 * Creates the first Admin user if it does not already exist.
 * BRD §3.1: "The very first Admin account... is inserted directly into
 * the database using a one-time seed/setup script."
 */
async function seed(): Promise<void> {
  const initPool = mysql.createPool({
    host: process.env.DB_HOST ?? 'localhost',
    port: Number(process.env.DB_PORT ?? 3306),
    user: process.env.DB_USER ?? 'root',
    password: process.env.DB_PASSWORD ?? '',
  });
  
  await initPool.query('CREATE DATABASE IF NOT EXISTS prm_tool');
  await initPool.end();

  const pool = mysql.createPool({
    host: process.env.DB_HOST ?? 'localhost',
    port: Number(process.env.DB_PORT ?? 3306),
    user: process.env.DB_USER ?? 'root',
    password: process.env.DB_PASSWORD ?? '',
    database: process.env.DB_NAME ?? 'prm_tool',
    multipleStatements: true,
  });

  console.log('Running migrations...');
  await runMigrations(pool);

  console.log('Checking for existing admin...');
  const [rows] = await pool.query(
    'SELECT id FROM users WHERE username = ?',
    [DEFAULT_ADMIN_USERNAME],
  );

  const existingUsers = rows as Array<{ id: number }>;
  if (existingUsers.length > 0) {
    console.log(`Admin user '${DEFAULT_ADMIN_USERNAME}' already exists. Seed skipped.`);
    await pool.end();
    return;
  }

  const passwordHash = await bcrypt.hash(DEFAULT_ADMIN_PASSWORD, BCRYPT_SALT_ROUNDS);

  await pool.query(
    `INSERT INTO users (username, email, full_name, password_hash, role, force_password_change, is_active)
     VALUES (?, ?, ?, ?, 'ADMIN', TRUE, TRUE)`,
    [DEFAULT_ADMIN_USERNAME, 'admin@prm.local', 'System Admin', passwordHash],
  );

  console.log('✓ Admin user created successfully.');
  console.log(`  Username : ${DEFAULT_ADMIN_USERNAME}`);
  console.log(`  Password : ${DEFAULT_ADMIN_PASSWORD}`);
  console.log('  ⚠  Change this password on first login.\n');

  await pool.end();
}

async function runMigrations(pool: mysql.Pool): Promise<void> {
  const migrationsDir = path.resolve(__dirname, '../server/src/db/migrations');
  const files = fs.readdirSync(migrationsDir).filter((f) => f.endsWith('.sql')).sort();

  for (const file of files) {
    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');
    await pool.query(sql);
    console.log(`  ✓ Migration: ${file}`);
  }
}

seed().catch((err: unknown) => {
  console.error('Seed failed:', err);
  process.exit(1);
});

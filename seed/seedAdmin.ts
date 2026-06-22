import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const BCRYPT_SALT_ROUNDS = 12;
const DEFAULT_ADMIN_USERNAME = 'admin';
const DEFAULT_ADMIN_PASSWORD = 'Admin@1234';

async function seed(): Promise<void> {
  const dbName = process.env.DB_NAME ?? 'prm_tool';
  const initPool = mysql.createPool({
    host: process.env.DB_HOST ?? 'localhost',
    port: Number(process.env.DB_PORT ?? 3306),
    user: process.env.DB_USER ?? 'root',
    password: process.env.DB_PASSWORD ?? '',
    multipleStatements: true,
  });

  console.log(`Dropping database '${dbName}' if it exists...`);
  await initPool.query(`DROP DATABASE IF EXISTS \`${dbName}\``);
  console.log(`Creating database '${dbName}'...`);
  await initPool.query(`CREATE DATABASE \`${dbName}\``);
  await initPool.end();

  const pool = mysql.createPool({
    host: process.env.DB_HOST ?? 'localhost',
    port: Number(process.env.DB_PORT ?? 3306),
    user: process.env.DB_USER ?? 'root',
    password: process.env.DB_PASSWORD ?? '',
    database: dbName,
    multipleStatements: true,
  });

  console.log('Running migrations...');
  await runMigrations(pool);

  console.log('Creating bootstrap admin user...');
  const passwordHash = await bcrypt.hash(DEFAULT_ADMIN_PASSWORD, BCRYPT_SALT_ROUNDS);

  await pool.query(
    `INSERT INTO users (role_id, username, email, full_name, password_hash, force_password_change, is_active)
     VALUES (1, ?, ?, ?, ?, TRUE, TRUE)`,
    [DEFAULT_ADMIN_USERNAME, 'admin@prm.local', 'System Admin', passwordHash],
  );

  console.log('✓ Database created and admin user seeded.');
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

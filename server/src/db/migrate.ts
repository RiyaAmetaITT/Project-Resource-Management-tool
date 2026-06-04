import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import pool from './database';

dotenv.config();

const MIGRATIONS_DIR = path.join(__dirname, 'migrations');

async function runMigrations(): Promise<void> {
  const migrationFiles = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((file) => file.endsWith('.sql'))
    .sort();
  console.log(`Found ${migrationFiles.length} migration files.`);

  for (const file of migrationFiles) {
    const filePath = path.join(MIGRATIONS_DIR, file);
    const sql = fs.readFileSync(filePath, 'utf-8');

    console.log(`  Running: ${file}`);
    await pool.query(sql);
    console.log(`  ✓ Done:  ${file}`);
  }

  console.log('\nAll migrations completed successfully.');
  await pool.end();
}

runMigrations().catch((error: unknown) => {
  console.error('Migration failed:', error);
  process.exit(1);
});

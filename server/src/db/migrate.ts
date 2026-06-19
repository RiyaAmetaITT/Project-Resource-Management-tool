import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import pool from './database';

dotenv.config();

const MIGRATIONS_DIR = path.join(__dirname, 'migrations');

function splitSqlStatements(sql: string): string[] {
  return sql
    .split(';')
    .map((statement) => statement.trim())
    .filter((statement) => statement.length > 0);
}

async function ensureMigrationsTable(): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id         INT AUTO_INCREMENT PRIMARY KEY,
      filename   VARCHAR(255) NOT NULL UNIQUE,
      applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

async function isMigrationPending(filename: string): Promise<boolean> {
  const pendingChecks: Record<string, () => Promise<boolean>> = {
    '017_add_timesheet_notification_fields.sql': async () => {
      const [cols] = await pool.query("SHOW COLUMNS FROM timesheets LIKE 'reminder_count'");
      return (cols as unknown[]).length === 0;
    },
    '018_add_project_at_risk_notification.sql': async () => {
      const [cols] = await pool.query("SHOW COLUMNS FROM projects LIKE 'at_risk_notified_at'");
      return (cols as unknown[]).length === 0;
    },
  };

  const check = pendingChecks[filename];
  return check ? check() : false;
}

async function backfillMigrationHistory(migrationFiles: string[]): Promise<void> {
  const [countRows] = await pool.query('SELECT COUNT(*) AS c FROM schema_migrations');
  if (Number((countRows as Array<{ c: number }>)[0].c) > 0) return;

  const [tables] = await pool.query('SHOW TABLES');
  if ((tables as unknown[]).length === 0) return;

  console.log('Existing database detected — backfilling migration history.');
  for (const file of migrationFiles) {
    if (await isMigrationPending(file)) continue;

    await pool.query('INSERT INTO schema_migrations (filename) VALUES (?)', [file]);
    console.log(`  Recorded as applied: ${file}`);
  }
}

async function runMigrations(): Promise<void> {
  const migrationFiles = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((file) => file.endsWith('.sql'))
    .sort();

  console.log(`Found ${migrationFiles.length} migration files.`);

  await ensureMigrationsTable();
  await backfillMigrationHistory(migrationFiles);

  for (const file of migrationFiles) {
    const [appliedRows] = await pool.query(
      'SELECT 1 FROM schema_migrations WHERE filename = ? LIMIT 1',
      [file],
    );
    if ((appliedRows as unknown[]).length > 0) {
      console.log(`  Skipped: ${file}`);
      continue;
    }

    const filePath = path.join(MIGRATIONS_DIR, file);
    const sql = fs.readFileSync(filePath, 'utf-8');
    const statements = splitSqlStatements(sql);

    console.log(`  Running: ${file}`);
    for (const statement of statements) {
      await pool.query(statement);
    }

    await pool.query('INSERT INTO schema_migrations (filename) VALUES (?)', [file]);
    console.log(`  ✓ Done:  ${file}`);
  }

  console.log('\nAll migrations completed successfully.');
  await pool.end();
}

runMigrations().catch((error: unknown) => {
  console.error('Migration failed:', error);
  process.exit(1);
});

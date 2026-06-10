import bcrypt from 'bcryptjs';
import { getPool, uniqueId } from './db';
import { BCRYPT_SALT_ROUNDS } from '../../../server/src/constants';
import { Role } from '../../../server/src/types/enums';

export interface IntegrationUsers {
  adminToken: string;
  managerToken: string;
  employeeToken: string;
  adminUserId: number;
  managerUserId: number;
  employeeUserId: number;
  employeeId: number;
  projectId: number;
  managerUsername: string;
  employeeUsername: string;
  managerPassword: string;
  employeePassword: string;
}

const DEFAULT_PASSWORD = 'TestPass1';

async function createUser(
  username: string,
  email: string,
  fullName: string,
  role: Role,
  password: string = DEFAULT_PASSWORD,
): Promise<number> {
  const pool = getPool();
  const passwordHash = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);
  const [result] = await pool.query(
    `INSERT INTO users (username, email, full_name, password_hash, role, force_password_change, is_active)
     VALUES (?, ?, ?, ?, ?, FALSE, TRUE)`,
    [username, email, fullName, passwordHash, role],
  );
  const insertId = (result as { insertId: number }).insertId;

  if (role === Role.MANAGER || role === Role.EMPLOYEE) {
    await pool.query(
      `INSERT INTO employees (user_id, name, email, department, designation, status, total_utilisation, is_active)
       VALUES (?, ?, ?, 'Engineering', 'Staff', 'BENCH', 0, TRUE)`,
      [insertId, fullName, email],
    );
  }

  return insertId;
}

async function login(username: string, password: string): Promise<string> {
  const { api } = await import('./testApp');
  const res = await api()
    .post('/auth/login')
    .send({ username, password });
  if (res.status !== 200) {
    throw new Error(`Login failed for ${username}: ${JSON.stringify(res.body)}`);
  }
  return res.body.data.token as string;
}

export async function seedIntegrationFixtures(): Promise<IntegrationUsers> {
  const suffix = uniqueId();
  const managerUsername = `mgr_${suffix}`;
  const employeeUsername = `emp_${suffix}`;
  const managerPassword = DEFAULT_PASSWORD;
  const employeePassword = DEFAULT_PASSWORD;

  const managerUserId = await createUser(
    managerUsername,
    `mgr_${suffix}@test.local`,
    'Test Manager',
    Role.MANAGER,
    managerPassword,
  );

  const employeeUserId = await createUser(
    employeeUsername,
    `emp_${suffix}@test.local`,
    'Test Employee',
    Role.EMPLOYEE,
    employeePassword,
  );

  const pool = getPool();
  const [empRows] = await pool.query(
    'SELECT id FROM employees WHERE user_id = ?',
    [employeeUserId],
  );
  const employeeId = (empRows as Array<{ id: number }>)[0].id;

  await pool.query('UPDATE employees SET manager_id = ? WHERE id = ?', [managerUserId, employeeId]);

  const [projResult] = await pool.query(
    `INSERT INTO projects (name, description, start_date, end_date, total_story_points, status, manager_id, health_status)
     VALUES (?, 'Integration test project', '2025-01-01', '2026-12-31', 50, 'ACTIVE', ?, 'ON_TRACK')`,
    [`Proj_${suffix}`, managerUserId],
  );
  const projectId = (projResult as { insertId: number }).insertId;

  const [adminRows] = await pool.query("SELECT id FROM users WHERE username = 'admin'");
  let adminUserId = (adminRows as Array<{ id: number }>)[0]?.id;
  let adminToken = '';
  if (adminUserId) {
    try {
      adminToken = await login('admin', 'Admin@1234');
    } catch {
      adminToken = '';
    }
  }

  const managerToken = await login(managerUsername, managerPassword);
  const employeeToken = await login(employeeUsername, employeePassword);

  return {
    adminToken,
    managerToken,
    employeeToken,
    adminUserId: adminUserId ?? 0,
    managerUserId,
    employeeUserId,
    employeeId,
    projectId,
    managerUsername,
    employeeUsername,
    managerPassword,
    employeePassword,
  };
}

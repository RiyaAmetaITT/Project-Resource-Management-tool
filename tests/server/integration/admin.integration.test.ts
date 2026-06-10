import { api, authHeader } from '../helpers/testApp';
import { ensureDbReady, closePool, uniqueId } from '../helpers/db';
import { Role, ProjectStatus } from '../../../server/src/types/enums';

describe('Admin API (integration)', () => {
  let dbAvailable = false;
  let adminToken: string;

  beforeAll(async () => {
    if (process.env.SKIP_INTEGRATION === 'true') return;
    dbAvailable = await ensureDbReady();
    if (!dbAvailable) return;

    const loginRes = await api()
      .post('/auth/login')
      .send({ username: 'admin', password: 'Admin@1234' });
    if (loginRes.status === 200) {
      adminToken = loginRes.body.data.token;
    }
  });

  afterAll(async () => {
    await closePool();
  });

  const skipIfNoDb = () => {
    if (!dbAvailable || !adminToken) {
      console.warn('Skipping admin integration test — DB or admin seed unavailable');
      return true;
    }
    return false;
  };

  it('GET /admin/users requires admin role', async () => {
    const res = await api().get('/admin/users');
    expect(res.status).toBe(401);
  });

  it('GET /admin/users returns user list for admin', async () => {
    if (skipIfNoDb()) return;
    const res = await api().get('/admin/users').set(authHeader(adminToken));
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('POST /admin/users creates a new employee user', async () => {
    if (skipIfNoDb()) return;
    const suffix = uniqueId();
    const res = await api()
      .post('/admin/users')
      .set(authHeader(adminToken))
      .send({
        username: `user_${suffix}`,
        email: `user_${suffix}@test.local`,
        fullName: 'Integration User',
        role: Role.EMPLOYEE,
        temporaryPassword: 'TempPass1',
      });
    expect(res.status).toBe(201);
    expect(res.body.data.username).toBe(`user_${suffix}`);
  });

  it('GET /admin/employees returns employees', async () => {
    if (skipIfNoDb()) return;
    const res = await api().get('/admin/employees').set(authHeader(adminToken));
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);
  });

  it('GET /admin/config masks API key', async () => {
    if (skipIfNoDb()) return;
    const res = await api().get('/admin/config').set(authHeader(adminToken));
    expect(res.status).toBe(200);
    expect(res.body.data.llmApiKey).toBe('****');
  });

  it('POST /admin/projects creates project with valid manager', async () => {
    if (skipIfNoDb()) return;
    const suffix = uniqueId();

    const mgrRes = await api()
      .post('/admin/users')
      .set(authHeader(adminToken))
      .send({
        username: `mgr_${suffix}`,
        email: `mgr_${suffix}@test.local`,
        fullName: 'Proj Manager',
        role: Role.MANAGER,
        temporaryPassword: 'TempPass1',
      });
    expect(mgrRes.status).toBe(201);
    const managerId = mgrRes.body.data.id;

    const res = await api()
      .post('/admin/projects')
      .set(authHeader(adminToken))
      .send({
        name: `Project ${suffix}`,
        description: 'Test',
        startDate: '01-01-2025',
        endDate: '31-12-2026',
        status: ProjectStatus.ACTIVE,
        managerId,
      });
    expect(res.status).toBe(201);
    expect(res.body.data.name).toBe(`Project ${suffix}`);
  });
});

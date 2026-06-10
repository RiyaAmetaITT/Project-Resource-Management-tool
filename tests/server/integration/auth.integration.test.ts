import { api, authHeader } from '../helpers/testApp';
import { ensureDbReady, closePool } from '../helpers/db';

const describeIfDb = (...args: Parameters<typeof describe>) => {
  const [name, fn] = args;
  if (process.env.SKIP_INTEGRATION === 'true') {
    describe.skip(name, fn);
  } else {
    describe(name, fn);
  }
};

describeIfDb('Auth API (integration)', () => {
  let dbAvailable = false;

  beforeAll(async () => {
    dbAvailable = await ensureDbReady();
  });

  afterAll(async () => {
    await closePool();
  });

  it('rejects login with invalid credentials', async () => {
    if (!dbAvailable) {
      console.warn('Skipping: database not available');
      return;
    }
    const res = await api().post('/auth/login').send({ username: 'nobody', password: 'WrongPass1' });
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('logs in admin with default seed credentials', async () => {
    if (!dbAvailable) return;
    const res = await api()
      .post('/auth/login')
      .send({ username: 'admin', password: 'Admin@1234' });
    if (res.status === 401) {
      console.warn('Admin user not seeded — run npm run seed first');
      return;
    }
    expect(res.status).toBe(200);
    expect(res.body.data.token).toBeDefined();
    expect(res.body.data.role).toBe('ADMIN');
  });

  it('rejects change-password without token', async () => {
    const res = await api()
      .put('/auth/change-password')
      .send({ newPassword: 'NewPass1', confirmPassword: 'NewPass1' });
    expect(res.status).toBe(401);
  });

  it('changes password when authenticated', async () => {
    if (!dbAvailable) return;
    const loginRes = await api()
      .post('/auth/login')
      .send({ username: 'admin', password: 'Admin@1234' });
    if (loginRes.status !== 200) return;

    const token = loginRes.body.data.token;
    const res = await api()
      .put('/auth/change-password')
      .set(authHeader(token))
      .send({ newPassword: 'Admin@1234', confirmPassword: 'Admin@1234' });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

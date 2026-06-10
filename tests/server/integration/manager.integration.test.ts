import { api, authHeader } from '../helpers/testApp';
import { ensureDbReady, closePool } from '../helpers/db';
import { seedIntegrationFixtures, IntegrationUsers } from '../helpers/integrationFixtures';

describe('Manager API (integration)', () => {
  let dbAvailable = false;
  let fixtures: IntegrationUsers | null = null;

  beforeAll(async () => {
    if (process.env.SKIP_INTEGRATION === 'true') return;
    dbAvailable = await ensureDbReady();
    if (!dbAvailable) return;
    try {
      fixtures = await seedIntegrationFixtures();
    } catch (err) {
      console.warn('Could not seed fixtures:', err);
    }
  });

  afterAll(async () => {
    await closePool();
  });

  const skip = () => !dbAvailable || !fixtures;

  it('GET /manager/resources/dashboard returns bench and allocated', async () => {
    if (skip()) return;
    const res = await api()
      .get('/manager/resources/dashboard')
      .set(authHeader(fixtures!.managerToken));
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('bench');
    expect(res.body.data).toHaveProperty('allocated');
  });

  it('GET /manager/projects returns manager projects', async () => {
    if (skip()) return;
    const res = await api()
      .get('/manager/projects')
      .set(authHeader(fixtures!.managerToken));
    expect(res.status).toBe(200);
    expect(res.body.data.some((p: { id: number }) => p.id === fixtures!.projectId)).toBe(true);
  });

  it('POST /manager/allocations creates allocation for team member', async () => {
    if (skip()) return;
    const res = await api()
      .post('/manager/allocations')
      .set(authHeader(fixtures!.managerToken))
      .send({
        employeeId: fixtures!.employeeId,
        projectId: fixtures!.projectId,
        utilisationPercent: 50,
        fromDate: '01-01-2025',
        toDate: '31-12-2026',
      });
    expect(res.status).toBe(201);
    expect(res.body.data.utilisationPercent).toBe(50);
  });

  it('rejects allocation for employee not on team', async () => {
    if (skip()) return;
    const otherMgr = await seedIntegrationFixtures();
    const res = await api()
      .post('/manager/allocations')
      .set(authHeader(otherMgr.managerToken))
      .send({
        employeeId: fixtures!.employeeId,
        projectId: otherMgr.projectId,
        utilisationPercent: 25,
        fromDate: '01-01-2025',
        toDate: '31-12-2026',
      });
    expect(res.status).toBe(403);
  });

  it('GET /manager/projects/:id/detail returns project detail', async () => {
    if (skip()) return;
    const res = await api()
      .get(`/manager/projects/${fixtures!.projectId}/detail`)
      .set(authHeader(fixtures!.managerToken));
    expect(res.status).toBe(200);
    expect(res.body.data.project).toBeDefined();
    expect(res.body.data.milestones).toBeDefined();
  });
});

import { api, authHeader } from '../helpers/testApp';
import { ensureDbReady, closePool, getPool } from '../helpers/db';
import { seedIntegrationFixtures, IntegrationUsers } from '../helpers/integrationFixtures';
import { getWeekStartDate } from '../../../server/src/utils/dateUtils';

describe('Employee API (integration)', () => {
  let dbAvailable = false;
  let fixtures: IntegrationUsers | null = null;

  beforeAll(async () => {
    if (process.env.SKIP_INTEGRATION === 'true') return;
    dbAvailable = await ensureDbReady();
    if (!dbAvailable) return;
    try {
      fixtures = await seedIntegrationFixtures();
      const pool = getPool();
      await pool.query(
        `INSERT INTO allocations (employee_id, project_id, utilisation_percent, from_date, to_date)
         VALUES (?, ?, 50, '2020-01-01', '2030-12-31')`,
        [fixtures.employeeId, fixtures.projectId],
      );
    } catch (err) {
      console.warn('Could not seed employee fixtures:', err);
    }
  });

  afterAll(async () => {
    await closePool();
  });

  const skip = () => !dbAvailable || !fixtures;

  const formatWeek = (d: Date) => {
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    return `${dd}-${mm}-${d.getFullYear()}`;
  };

  it('GET /employee/allocations returns active allocations', async () => {
    if (skip()) return;
    const res = await api()
      .get('/employee/allocations')
      .set(authHeader(fixtures!.employeeToken));
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);
  });

  it('POST /employee/timesheets submits timesheet for past week', async () => {
    if (skip()) return;
    const lastWeek = getWeekStartDate(new Date());
    lastWeek.setDate(lastWeek.getDate() - 7);

    const res = await api()
      .post('/employee/timesheets')
      .set(authHeader(fixtures!.employeeToken))
      .send({
        weekStartDate: formatWeek(lastWeek),
        entries: [
          {
            projectId: fixtures!.projectId,
            hours: 20,
            activityTags: ['Bug Fixing'],
          },
        ],
      });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
  });

  it('rejects duplicate timesheet submission', async () => {
    if (skip()) return;
    const lastWeek = getWeekStartDate(new Date());
    lastWeek.setDate(lastWeek.getDate() - 7);

    const res = await api()
      .post('/employee/timesheets')
      .set(authHeader(fixtures!.employeeToken))
      .send({
        weekStartDate: formatWeek(lastWeek),
        entries: [{ projectId: fixtures!.projectId, hours: 10, activityTags: [] }],
      });
    expect(res.status).toBe(409);
  });

  it('GET /employee/timesheets returns history', async () => {
    if (skip()) return;
    const res = await api()
      .get('/employee/timesheets')
      .set(authHeader(fixtures!.employeeToken));
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('GET /employee/timesheets/missed-check returns missed status', async () => {
    if (skip()) return;
    const res = await api()
      .get('/employee/timesheets/missed-check')
      .set(authHeader(fixtures!.employeeToken));
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('hasMissedLastWeek');
  });
});

import { api } from '../helpers/testApp';

describe('Health endpoint (integration)', () => {
  it('GET /health returns ok', async () => {
    const res = await api().get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.timestamp).toBeDefined();
  });
});

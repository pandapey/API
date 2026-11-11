require('./setup');
const request = require('supertest');
const { createApp } = require('../src/app');

const app = createApp();

async function registerLogin(email = 'tester@example.com') {
  await request(app).post('/api/auth/register').send({ name: 'Tester', email, password: 'Password123' });
  const login = await request(app).post('/api/auth/login').send({ email, password: 'Password123' });
  return login.body.data.accessToken;
}

describe('Auth + scopes + version copy + logs export', () => {
  test('register -> login -> me', async () => {
    const token = await registerLogin();
    expect(token).toBeDefined();
    const me = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${token}`);
    expect(me.status).toBe(200);
    expect(me.body.data.email).toBe('tester@example.com');
  });

  test('project + version copy + endpoint + scoped key gateway', async () => {
    const token = await registerLogin('scope@example.com');
    const H = { Authorization: `Bearer ${token}` };
    const proj = await request(app).post('/api/projects').set(H).send({ name: 'ScopeProj', basePath: '/v1' });
    expect(proj.status).toBe(201);
    const pid = proj.body.data._id;

    const v1 = await request(app).post(`/api/projects/${pid}/versions`).set(H).send({ version: 'v1' });
    expect(v1.status).toBe(201);

    await request(app).post(`/api/projects/${pid}/endpoints`).set(H).send({ method: 'GET', path: '/hello', version: 'v1', authRequired: true });
    await request(app).post(`/api/projects/${pid}/endpoints`).set(H).send({ method: 'GET', path: '/bye', version: 'v1', authRequired: true });

    const v2 = await request(app).post(`/api/projects/${pid}/versions`).set(H).send({ version: 'v2', copyFrom: 'v1' });
    expect(v2.status).toBe(201);
    expect(v2.body.data.copiedEndpoints).toBe(2);

    const key = await request(app).post(`/api/projects/${pid}/keys`).set(H).send({ name: 'scoped', scopes: ['GET /hello'] });
    expect(key.status).toBe(201);
    const raw = key.body.data.apiKey;

    const ok = await request(app).get(`/gateway/${pid}/hello?version=v1`).set('x-api-key', raw);
    expect(ok.status).toBe(200);

    const denied = await request(app).get(`/gateway/${pid}/bye?version=v1`).set('x-api-key', raw);
    expect(denied.status).toBe(403);
    expect(denied.body.errorCode).toBe('INSUFFICIENT_SCOPE');
  });

  test('logs export CSV + analytics overview has today/month/keys', async () => {
    const token = await registerLogin('exp@example.com');
    const H = { Authorization: `Bearer ${token}` };
    const proj = await request(app).post('/api/projects').set(H).send({ name: 'ExpProj', basePath: '/v1' });
    const pid = proj.body.data._id;
    await request(app).post(`/api/projects/${pid}/versions`).set(H).send({ version: 'v1' });
    await request(app).post(`/api/projects/${pid}/endpoints`).set(H).send({ method: 'GET', path: '/hi', version: 'v1', authRequired: false });
    await request(app).get(`/gateway/${pid}/hi?version=v1`);
    await new Promise((r) => setTimeout(r, 300));

    const exp = await request(app).get('/api/logs/export').set(H);
    expect(exp.status).toBe(200);
    expect(exp.headers['content-type']).toMatch(/csv/);

    const ov = await request(app).get('/api/analytics/overview?range=7d').set(H);
    expect(ov.status).toBe(200);
    expect(ov.body.data.total).toBeGreaterThanOrEqual(1);
    expect(ov.body.data.today).toBeDefined();
    expect(ov.body.data.month).toBeDefined();
  });
});

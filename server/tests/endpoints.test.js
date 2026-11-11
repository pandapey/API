require('./setup');
const request = require('supertest');
const { createApp } = require('../src/app');

const app = createApp();

describe('Endpoints + gateway + logs + analytics', () => {
  test('CRUD endpoint, gateway mock, logs, analytics', async () => {
    await request(app).post('/api/auth/register').send({ name: 'EP', email: 'ep@example.com', password: 'Password123' });
    const login = await request(app).post('/api/auth/login').send({ email: 'ep@example.com', password: 'Password123' });
    const token = login.body.data.accessToken;

    const proj = await request(app).post('/api/projects').set('Authorization', `Bearer ${token}`).send({ name: 'EP Project' });
    const projectId = proj.body.data._id;

    const created = await request(app)
      .post(`/api/projects/${projectId}/endpoints`)
      .set('Authorization', `Bearer ${token}`)
      .send({ method: 'GET', path: '/users/:id', version: 'v1', authRequired: false, exampleResponse: { ok: true }, latencyMs: 0 });
    expect(created.status).toBe(201);

    const gw = await request(app).get(`/gateway/${projectId}/users/123?version=v1`);
    expect(gw.status).toBe(200);
    expect(gw.body.success).toBe(true);

    // wait a tick for async log write
    await new Promise((r) => setTimeout(r, 500));

    const logs = await request(app).get(`/api/logs?projectId=${projectId}`).set('Authorization', `Bearer ${token}`);
    expect(logs.status).toBe(200);
    expect(logs.body.data.items.length).toBeGreaterThanOrEqual(1);

    const analytics = await request(app)
      .get(`/api/analytics/overview?projectId=${projectId}&range=7d`)
      .set('Authorization', `Bearer ${token}`);
    expect(analytics.status).toBe(200);
    expect(analytics.body.data.total).toBeGreaterThanOrEqual(1);
  });
});

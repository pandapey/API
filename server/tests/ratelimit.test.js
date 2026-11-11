require('./setup');
const request = require('supertest');
const { createApp } = require('../src/app');

const app = createApp();

describe('Rate limit', () => {
  test('per-key fixed window returns 429 and headers', async () => {
    await request(app).post('/api/auth/register').send({ name: 'RL', email: 'rl@example.com', password: 'Password123' });
    const login = await request(app).post('/api/auth/login').send({ email: 'rl@example.com', password: 'Password123' });
    const token = login.body.data.accessToken;

    const proj = await request(app).post('/api/projects').set('Authorization', `Bearer ${token}`).send({ name: 'RL Project' });
    const projectId = proj.body.data._id;

    await request(app)
      .post(`/api/projects/${projectId}/endpoints`)
      .set('Authorization', `Bearer ${token}`)
      .send({ method: 'GET', path: '/ping', version: 'v1', authRequired: false, exampleResponse: { pong: true }, latencyMs: 0 });

    // create key with very low limit (1/min)
    const keyRes = await request(app)
      .post(`/api/projects/${projectId}/keys`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'rl key', rateLimitPerMin: 1 });
    const raw = keyRes.body.data.apiKey;

    const first = await request(app).get(`/gateway/${projectId}/ping?version=v1`).set('x-api-key', raw);
    expect(first.status).toBe(200);
    expect(first.headers['x-ratelimit-limit']).toBeDefined();

    const second = await request(app).get(`/gateway/${projectId}/ping?version=v1`).set('x-api-key', raw);
    expect(second.status).toBe(429);
    expect(second.body.errorCode).toBe('RATE_LIMIT_EXCEEDED');
  });
});

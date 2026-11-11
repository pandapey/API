require('./setup');
const request = require('supertest');
const { createApp } = require('../src/app');

const app = createApp();

async function registerAndLogin(email = 'keyuser@example.com') {
  await request(app).post('/api/auth/register').send({ name: 'Key User', email, password: 'Password123' });
  const login = await request(app).post('/api/auth/login').send({ email, password: 'Password123' });
  return login.body.data.accessToken;
}

describe('API keys', () => {
  test('create project + key, gateway works, revoke blocks', async () => {
    const token = await registerAndLogin();
    const proj = await request(app).post('/api/projects').set('Authorization', `Bearer ${token}`).send({ name: 'Key Project' });
    expect(proj.status).toBe(201);
    const projectId = proj.body.data._id;

    await request(app)
      .post(`/api/projects/${projectId}/endpoints`)
      .set('Authorization', `Bearer ${token}`)
      .send({ method: 'GET', path: '/hello', version: 'v1', authRequired: true, exampleResponse: { hi: 1 } });

    const keyRes = await request(app)
      .post(`/api/projects/${projectId}/keys`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'test key' });
    expect(keyRes.status).toBe(201);
    const raw = keyRes.body.data.apiKey;
    expect(raw).toMatch(/^dk_live_/);

    const gw = await request(app).get(`/gateway/${projectId}/hello?version=v1`).set('x-api-key', raw);
    expect(gw.status).toBe(200);
    expect(gw.body.success).toBe(true);

    // list mine hides hash
    const list = await request(app).get('/api/keys').set('Authorization', `Bearer ${token}`);
    expect(list.status).toBe(200);
    expect(list.body.data.items[0].keyHash).toBeUndefined();

    // revoke
    const keyId = keyRes.body.data.id;
    const rev = await request(app).post(`/api/keys/${keyId}/revoke`).set('Authorization', `Bearer ${token}`);
    expect(rev.status).toBe(200);

    const gw2 = await request(app).get(`/gateway/${projectId}/hello?version=v1`).set('x-api-key', raw);
    expect(gw2.status).toBe(401);
  });
});

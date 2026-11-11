require('./setup');
const request = require('supertest');
const { createApp } = require('../src/app');

const app = createApp();

describe('Auth', () => {
  test('register -> login -> me -> refresh -> logout', async () => {
    const reg = await request(app).post('/api/auth/register').send({
      name: 'Tester',
      email: 'tester@example.com',
      password: 'Password123',
    });
    expect(reg.status).toBe(201);
    expect(reg.body.success).toBe(true);
    expect(reg.body.data.accessToken).toBeDefined();

    const login = await request(app).post('/api/auth/login').send({
      email: 'tester@example.com',
      password: 'Password123',
    });
    expect(login.status).toBe(200);
    const token = login.body.data.accessToken;
    expect(token).toBeDefined();
    const cookies = login.headers['set-cookie'];
    expect(cookies).toBeDefined();

    const me = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${token}`);
    expect(me.status).toBe(200);
    expect(me.body.data.email).toBe('tester@example.com');

    const cookieHeader = Array.isArray(cookies) ? cookies.map((c) => c.split(';')[0]).join('; ') : cookies;
    const refreshed = await request(app).post('/api/auth/refresh').set('Cookie', cookieHeader);
    expect(refreshed.status).toBe(200);
    expect(refreshed.body.data.accessToken).toBeDefined();

    // Logout revokes the presented refresh token.
    const loggedOut = await request(app).post('/api/auth/logout').set('Cookie', cookieHeader);
    expect(loggedOut.status).toBe(200);
    const afterLogout = await request(app).post('/api/auth/refresh').set('Cookie', cookieHeader);
    expect(afterLogout.status).toBe(401);
  });

  test('forgot + reset + verify-email (mock)', async () => {
    const reg = await request(app).post('/api/auth/register').send({
      name: 'Reset User',
      email: 'reset@example.com',
      password: 'Password123',
    });
    expect(reg.status).toBe(201);

    // verify-email consumes the verification token issued at registration.
    const User = require('../src/models/User');
    const stored = await User.findOne({ email: 'reset@example.com' }).select('verificationToken').lean();
    expect(stored?.verificationToken).toBeDefined();
    const verify = await request(app).post('/api/auth/verify-email').send({ token: stored.verificationToken });
    expect(verify.status).toBe(200);
    expect(verify.body.data.user.isVerified).toBe(true);

    const forgot = await request(app).post('/api/auth/forgot').send({ email: 'reset@example.com' });
    expect(forgot.status).toBe(200);
    const resetToken = forgot.body.data.resetToken;
    expect(resetToken).toBeDefined();
    const reset = await request(app).post('/api/auth/reset').send({ token: resetToken, password: 'NewPass123' });
    expect(reset.status).toBe(200);
    const login = await request(app).post('/api/auth/login').send({ email: 'reset@example.com', password: 'NewPass123' });
    expect(login.status).toBe(200);
  });
});

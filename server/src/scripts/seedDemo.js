/**
 * Idempotent demo seed:
 *  - ensures developer demo user exists (demo@devapihub.dev / DemoPass123!)
 *  - ensures a sample project + version + endpoints + api key exists
 * Run: npm run seed:demo  (requires MONGO_URI)
 */
require('dotenv').config();
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const env = require('../config/env');
const { DEMO_CREDENTIALS } = require('../config/demo');
const User = require('../models/User');
const ApiProject = require('../models/ApiProject');
const ApiVersion = require('../models/ApiVersion');
const ApiEndpoint = require('../models/ApiEndpoint');
const ApiKey = require('../models/ApiKey');
const { generateApiKey } = require('../utils/apiKey');

async function ensureDemo() {
  await mongoose.connect(env.mongoUri);
  const email = DEMO_CREDENTIALS.email.toLowerCase();
  let user = await User.findOne({ email });
  if (!user) {
    const passwordHash = await bcrypt.hash(DEMO_CREDENTIALS.password, 10);
    user = await User.create({
      name: DEMO_CREDENTIALS.name,
      email,
      passwordHash,
      role: 'developer',
      isVerified: true,
    });
    // eslint-disable-next-line no-console
    console.log(`[seed] demo user created: ${email}`);
  } else {
    let changed = false;
    if (user.suspended) { user.suspended = false; changed = true; }
    if (user.role === 'admin') { user.role = 'developer'; changed = true; }
    if (!user.isVerified) { user.isVerified = true; changed = true; }
    // Reset password to known demo password so public demo always works
    const ok = await bcrypt.compare(DEMO_CREDENTIALS.password, user.passwordHash);
    if (!ok) {
      user.passwordHash = await bcrypt.hash(DEMO_CREDENTIALS.password, 10);
      changed = true;
    }
    if (changed) {
      await user.save();
      // eslint-disable-next-line no-console
      console.log('[seed] demo user refreshed');
    } else {
      // eslint-disable-next-line no-console
      console.log('[seed] demo user exists');
    }
  }

  let project = await ApiProject.findOne({ owner: user._id, slug: 'demo-weather-api' });
  if (!project) {
    project = await ApiProject.create({
      name: 'Demo Weather API',
      slug: 'demo-weather-api',
      description: 'Sample public demo project with mock endpoints. Explore gateway, logs and analytics.',
      basePath: '/v1',
      owner: user._id,
      status: 'published',
      rateLimitPerMin: 120,
    });
    // eslint-disable-next-line no-console
    console.log('[seed] demo project created');
  }

  let version = await ApiVersion.findOne({ project: project._id, version: 'v1' });
  if (!version) {
    version = await ApiVersion.create({ project: project._id, version: 'v1', description: 'Initial demo version', isDefault: true });
  }

  const seeds = [
    { method: 'GET', path: '/current', description: 'Current weather (mock)', authRequired: false, exampleResponse: { tempC: 22, condition: 'Sunny', city: 'Demo City' } },
    { method: 'GET', path: '/forecast', description: '7-day forecast (mock)', authRequired: true, exampleResponse: { days: 7, forecast: 'Mock forecast data' } },
    { method: 'POST', path: '/alerts', description: 'Create alert (mock)', authRequired: true, exampleResponse: { created: true } },
  ];
  for (const s of seeds) {
    const exists = await ApiEndpoint.findOne({ project: project._id, method: s.method, path: s.path });
    if (!exists) {
      await ApiEndpoint.create({ project: project._id, versionId: version._id, version: 'v1', ...s, isActive: true });
    }
  }

  const keyCount = await ApiKey.countDocuments({ owner: user._id, project: project._id });
  if (keyCount === 0) {
    const { raw, hash, prefix, last4 } = generateApiKey();
    await ApiKey.create({
      name: 'Demo key',
      keyHash: hash, prefix, last4,
      project: project._id, owner: user._id,
      rateLimitPerMin: 60, scopes: [],
    });
    // eslint-disable-next-line no-console
    console.log('[seed] demo api key created (raw shown once here for local setup only):', raw);
  }
  // eslint-disable-next-line no-console
  console.log(`[seed] done. Demo login: ${email} / (see server/src/config/demo.js)`);
  await mongoose.disconnect();
}

if (require.main === module) {
  ensureDemo().catch((e) => {
    // eslint-disable-next-line no-console
    console.error('[seed] failed:', e.message);
    process.exit(1);
  });
}

module.exports = { ensureDemo };

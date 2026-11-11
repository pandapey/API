require('dotenv').config();
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const env = require('../config/env');
const logger = require('../config/logger');
const User = require('../models/User');
const ApiProject = require('../models/ApiProject');
const ApiVersion = require('../models/ApiVersion');
const ApiEndpoint = require('../models/ApiEndpoint');
const ApiKey = require('../models/ApiKey');
const Webhook = require('../models/Webhook');
const { generateApiKey } = require('../utils/apiKey');

async function main() {
  const uri = process.env.MONGO_URI || env.mongoUri;
  await mongoose.connect(uri);
  logger.info(`Seed connected: ${uri}`);

  // Admin
  let admin = await User.findOne({ email: 'admin@devapi.local' });
  if (!admin) {
    admin = await User.create({
      name: 'Admin',
      email: 'admin@devapi.local',
      passwordHash: await bcrypt.hash('Admin123!', 10),
      role: 'admin',
      isVerified: true,
    });
    console.log('Created admin admin@devapi.local / Admin123!');
  } else {
    admin.passwordHash = await bcrypt.hash('Admin123!', 10);
    admin.role = 'admin';
    admin.isVerified = true;
    admin.suspended = false;
    await admin.save();
    console.log('Reset admin admin@devapi.local / Admin123!');
  }

  // Developer
  let dev = await User.findOne({ email: 'demo@devapi.local' });
  if (!dev) {
    dev = await User.create({
      name: 'Demo Developer',
      email: 'demo@devapi.local',
      passwordHash: await bcrypt.hash('Demo123!', 10),
      role: 'user',
      isVerified: true,
    });
    console.log('Created developer demo@devapi.local / Demo123!');
  } else {
    dev.passwordHash = await bcrypt.hash('Demo123!', 10);
    dev.isVerified = true;
    dev.suspended = false;
    await dev.save();
    console.log('Reset developer demo@devapi.local / Demo123!');
  }

  // Sample Weather API project
  let project = await ApiProject.findOne({ name: 'Weather API' });
  if (!project) {
    project = await ApiProject.create({
      name: 'Weather API',
      slug: 'weather-api',
      description: 'Sample weather mock API',
      owner: dev._id,
      status: 'published',
      rateLimitPerMin: 300,
    });
    console.log('Created project Weather API');
  } else {
    project.owner = dev._id;
    project.status = 'published';
    await project.save();
  }

  let v1 = await ApiVersion.findOne({ project: project._id, version: 'v1' });
  if (!v1) {
    v1 = await ApiVersion.create({ project: project._id, version: 'v1', description: 'Version 1', isDefault: true });
  }

  const endpoints = [
    { method: 'GET', path: '/weather', description: 'Current weather', exampleResponse: { temp: 22, unit: 'C', condition: 'Sunny' } },
    { method: 'GET', path: '/forecast', description: 'Forecast', exampleResponse: { days: [{ day: 'Mon', temp: 21 }, { day: 'Tue', temp: 19 }] } },
    { method: 'GET', path: '/cities/:id', description: 'City by id', exampleResponse: { id: 1, name: 'Berlin', temp: 18 } },
    { method: 'POST', path: '/alerts', description: 'Create alert', exampleResponse: { id: 1, created: true } },
    { method: 'DELETE', path: '/alerts/:id', description: 'Delete alert', exampleResponse: { deleted: true } },
  ];

  for (const e of endpoints) {
    const exists = await ApiEndpoint.findOne({ project: project._id, method: e.method, path: e.path, version: 'v1' });
    if (!exists) {
      await ApiEndpoint.create({
        project: project._id,
        versionId: v1._id,
        version: 'v1',
        method: e.method,
        path: e.path,
        description: e.description,
        authRequired: true,
        exampleResponse: e.exampleResponse,
        latencyMs: 40,
      });
      console.log(`Created endpoint ${e.method} ${e.path}`);
    }
  }

  // API key (fresh each seed for demo)
  const { raw, hash, prefix, last4 } = generateApiKey();
  await ApiKey.create({
    name: 'Seed Key',
    keyHash: hash,
    prefix,
    last4,
    project: project._id,
    owner: dev._id,
    rateLimitPerMin: 120,
  });
  console.log('--------------------------------------------------');
  console.log(`Sample API key (store now, shown once): ${raw}`);
  console.log(`Project ID: ${project._id.toString()}`);
  console.log(`Try: GET /gateway/${project._id.toString()}/weather?version=v1 with x-api-key header`);
  console.log('--------------------------------------------------');

  const hookExists = await Webhook.findOne({ project: project._id });
  if (!hookExists) {
    await Webhook.create({
      project: project._id,
      owner: dev._id,
      url: 'https://example.com/webhook',
      events: ['api.request', 'api.error'],
      secret: 'seedsecret123',
      isActive: true,
    });
    console.log('Created sample webhook https://example.com/webhook');
  }

  await mongoose.disconnect();
  console.log('Seed done');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

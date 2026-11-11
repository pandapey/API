require('dotenv').config();
const http = require('http');
const { Server } = require('socket.io');
const env = require('./config/env');
const logger = require('./config/logger');
const { connectDB } = require('./config/db');
const { createApp } = require('./app');

const ApiProject = require('./models/ApiProject');
const { verifyAccessToken } = require('./utils/jwt');

async function main() {
  await connectDB(env.mongoUri);

  // Idempotent demo seed so the public demo login always works.
  // Non-fatal: a failed seed never blocks boot (demo data is optional).
  // Production opts in explicitly via SEED_DEMO=true (see docker-compose).
  if (env.nodeEnv !== 'production' || process.env.SEED_DEMO === 'true') {
    try {
      const { ensureDemo } = require('./scripts/seedDemo');
      await ensureDemo();
    } catch (e) {
      logger.warn(`demo seed skipped: ${e.message}`);
    }
  }

  const app = createApp();
  const server = http.createServer(app);

  const io = new Server(server, {
    cors: { origin: [env.frontendUrl, 'http://localhost:3000', 'http://localhost:5173'], credentials: true },
  });
  app.set('io', io);

  io.on('connection', (socket) => {
    logger.info(`Socket connected: ${socket.id}`);
    // Authenticated scoped rooms: join { project, token }.
    // Token is verified + project ownership checked to prevent cross-tenant sniffing.
    socket.on('join', async (payload) => {
      try {
        const pid = typeof payload === 'string' ? payload : payload?.project;
        const token = typeof payload === 'object' ? payload?.token : null;
        if (!pid || !/^[a-fA-F0-9]{24}$/.test(String(pid))) return;
        if (!token) return;
        let decoded;
        try {
          decoded = verifyAccessToken(String(token));
        } catch {
          return;
        }
        const project = await ApiProject.findById(pid).select('owner').lean();
        if (!project) return;
        const ownerId = String(project.owner);
        if (decoded.role !== 'admin' && ownerId !== String(decoded.sub)) return;
        socket.join(`project:${pid}`);
      } catch (_) {}
    });
    socket.on('disconnect', () => logger.info(`Socket disconnected: ${socket.id}`));
  });

  // start background workers/scheduler (non-blocking, never crash)
  try {
    const { startWorkers } = require('./jobs/workers');
    startWorkers().catch((e) => logger.warn(`workers: ${e.message}`));
    const { startScheduler } = require('./jobs/scheduler');
    startScheduler();
  } catch (e) {
    logger.warn(`background init failed: ${e.message}`);
  }

  server.listen(env.port, () => {
    logger.info(`DevAPI Hub server listening on :${env.port} (${env.nodeEnv})`);
  });
}

if (require.main === module) {
  main().catch((err) => {
    logger.error(`Fatal: ${err.message}`);
    process.exit(1);
  });
}

module.exports = { main };

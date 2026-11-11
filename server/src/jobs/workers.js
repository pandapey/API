const logger = require('../config/logger');

/**
 * Workers: if BullMQ + redis available, start real workers.
 * Otherwise no-op (jobs run inline via addJob).
 * Also provides cleanup + aggregation helpers callable by scheduler.
 */
async function cleanupOldLogs(days = 90) {
  try {
    const ApiRequestLog = require('../models/ApiRequestLog');
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const res = await ApiRequestLog.deleteMany({ timestamp: { $lt: cutoff } });
    logger.info(`Cleanup old logs >${days}d: deleted ${res.deletedCount}`);
    return res.deletedCount;
  } catch (err) {
    logger.warn(`cleanupOldLogs failed: ${err.message}`);
    return 0;
  }
}

async function runAggregation() {
  try {
    const { aggregateRecentHours } = require('../services/usageService');
    const n = await aggregateRecentHours(2);
    logger.info(`Aggregation done: ${n} project-hours`);
    return n;
  } catch (err) {
    logger.warn(`runAggregation failed: ${err.message}`);
    return 0;
  }
}

async function startWorkers() {
  const { redisAvailable } = require('../config/redis');
  const { initRedis } = require('../config/redis');
  await initRedis().catch(() => {});
  if (!redisAvailable()) {
    logger.info('Workers: redis unavailable, using inline execution (no dedicated workers)');
    return;
  }
  try {
    const { Worker } = require('bullmq');
    const url = process.env.REDIS_URL;
    const w = new Worker(
      'webhook-delivery',
      async (job) => {
        const { processDeliveryJob } = require('../services/webhookService');
        await processDeliveryJob(job.data);
      },
      { connection: { url } }
    );
    w.on('failed', (job, err) => logger.warn(`Worker job ${job?.id} failed: ${err.message}`));
    logger.info('BullMQ workers started');
  } catch (err) {
    logger.warn(`startWorkers failed, inline fallback: ${err.message}`);
  }
}

module.exports = { startWorkers, cleanupOldLogs, runAggregation };

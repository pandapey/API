/**
 * BullMQ OPTIONAL: tries to create queues if redis available,
 * else exports addJob(name, data) that executes inline.
 */
const logger = require('../config/logger');
const env = require('../config/env');
const { redisAvailable } = require('../config/redis');

let webhookQueue = null;
let useBull = false;

try {
  const { Queue } = require('bullmq');
  // lazy init after redis check
  const tryInit = async () => {
    const { initRedis } = require('../config/redis');
    await initRedis();
    if (redisAvailable()) {
      // BullMQ needs its own connection opts; reuse URL
      webhookQueue = new Queue('webhook-delivery', { connection: { url: env.redisUrl, maxRetriesPerRequest: null } });
      // avoid unhandled error crash
      webhookQueue.on('error', (e) => logger.warn(`BullMQ queue error: ${e.message}`));
      useBull = true;
      logger.info('BullMQ queues enabled');
    }
  };
  tryInit().catch(() => {});
} catch (err) {
  logger.warn(`BullMQ unavailable, inline fallback: ${err.message}`);
}

async function addJob(name, data) {
  if (useBull && webhookQueue) {
    try {
      // attempts: 1 — the delivery function itself retries with backoff and
      // records attempts on the WebhookDelivery doc. BullMQ-level retries would
      // re-run the whole job from scratch and amplify HTTP calls (up to 9x).
      await webhookQueue.add(name, data, { attempts: 1 });
      return { queued: true };
    } catch (err) {
      logger.warn(`BullMQ addJob failed, inline fallback: ${err.message}`);
    }
  }
  // Inline fallback: execute directly
  try {
    if (name === 'webhook-delivery' || name === 'webhook') {
      const { processDeliveryJob } = require('../services/webhookService');
      // don't await long delivery blocking response; run async
      setImmediate(() => {
        processDeliveryJob(data).catch((e) => logger.warn(`Inline webhook job failed: ${e.message}`));
      });
      return { queued: false, inline: true };
    }
    if (name === 'email') {
      const { sendEmail } = require('../utils/email');
      setImmediate(() => {
        sendEmail(data.to, data.subject, data.body, { type: data.type, userId: data.userId }).catch(() => {});
      });
      return { queued: false, inline: true };
    }
    // generic: log
    logger.info(`Inline job ${name} executed`);
    return { queued: false, inline: true };
  } catch (err) {
    logger.warn(`Inline job ${name} failed: ${err.message}`);
    return { queued: false, error: err.message };
  }
}

module.exports = { addJob, _isBull: () => useBull };

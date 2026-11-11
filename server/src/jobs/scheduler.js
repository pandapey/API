const logger = require('../config/logger');

let started = false;

function startScheduler() {
  if (started) return;
  started = true;
  const { cleanupOldLogs, runAggregation } = require('./workers');

  const runAgg = () => runAggregation().catch((e) => logger.warn(e.message));
  const runClean = () => cleanupOldLogs(90).catch((e) => logger.warn(e.message));

  try {
    const cron = require('node-cron');
    // Every hour at minute 5: aggregation
    cron.schedule('5 * * * *', runAgg);
    // Daily at 2am: cleanup
    cron.schedule('0 2 * * *', runClean);
    logger.info('Scheduler started (node-cron)');
  } catch (err) {
    logger.warn(`node-cron unavailable, setInterval fallback: ${err.message}`);
    setInterval(runAgg, 60 * 60 * 1000);
    setInterval(runClean, 24 * 60 * 60 * 1000);
  }
  // Run aggregation once shortly after boot (non-blocking)
  setTimeout(runAgg, 15000);
}

module.exports = { startScheduler };

const ApiRequestLog = require('../models/ApiRequestLog');
const UsageRecord = require('../models/UsageRecord');
const logger = require('../config/logger');

function hourFloor(d) {
  const c = new Date(d);
  c.setMinutes(0, 0, 0);
  return c;
}

async function aggregateHour(projectId, periodStart) {
  const start = hourFloor(periodStart);
  const end = new Date(start.getTime() + 60 * 60 * 1000);
  const match = { project: projectId, timestamp: { $gte: start, $lt: end } };
  // if projectId null -> aggregate all projects grouped
  const pipeline = [];
  if (projectId) pipeline.push({ $match: match });
  else pipeline.push({ $match: { timestamp: { $gte: start, $lt: end } } });
  pipeline.push({
    $group: {
      _id: '$project',
      total: { $sum: 1 },
      success: { $sum: { $cond: [{ $lt: ['$statusCode', 400] }, 1, 0] } },
      errors: { $sum: { $cond: [{ $gte: ['$statusCode', 400] }, 1, 0] } },
      avgLatency: { $avg: '$responseTimeMs' },
    },
  });
  const rows = await ApiRequestLog.aggregate(pipeline);
  for (const r of rows) {
    await UsageRecord.updateOne(
      { project: r._id, periodStart: start },
      {
        $set: {
          project: r._id,
          periodStart: start,
          periodEnd: end,
          year: start.getFullYear(),
          month: start.getMonth() + 1,
          day: start.getDate(),
          hour: start.getHours(),
          totalRequests: r.total,
          successCount: r.success,
          errorCount: r.errors,
          avgLatencyMs: Number(Number(r.avgLatency || 0).toFixed(2)),
        },
      },
      { upsert: true }
    );
  }
  return rows.length;
}

async function aggregateRecentHours(hours = 2) {
  const now = new Date();
  let total = 0;
  for (let i = 0; i < hours; i++) {
    const h = new Date(now.getTime() - i * 60 * 60 * 1000);
    try {
      total += await aggregateHour(null, h);
    } catch (err) {
      logger.warn(`usage aggregation failed for hour ${h}: ${err.message}`);
    }
  }
  return total;
}

module.exports = { aggregateHour, aggregateRecentHours };

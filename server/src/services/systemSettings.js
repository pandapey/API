const SystemSetting = require('../models/SystemSetting');

/**
 * System settings reader with a short TTL cache. Admin PUTs invalidate the
 * cache immediately; every other consumer (gateway limiter, scheduler,
 * registration) reads through this so hot paths don't hit Mongo per request.
 */
const TTL_MS = 15_000;
let cache = { at: 0, data: {} };

function normalize(items) {
  const obj = {};
  for (const s of items || []) obj[s.key] = s.value;
  return obj;
}

async function getSettings(force = false) {
  if (!force && Date.now() - cache.at < TTL_MS) return cache.data;
  try {
    const items = await SystemSetting.find().lean();
    cache = { at: Date.now(), data: normalize(items) };
  } catch (_) {
    // On failure keep serving the last known snapshot (stale-but-alive).
    if (cache.at === 0) cache = { at: Date.now(), data: {} };
  }
  return cache.data;
}

function invalidateSettings() {
  cache = { at: 0, data: {} };
}

async function getSetting(key, fallback) {
  const all = await getSettings();
  const v = all[key];
  return v === undefined || v === null ? fallback : v;
}

module.exports = { getSettings, getSetting, invalidateSettings };

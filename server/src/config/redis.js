/**
 * Redis is OPTIONAL.
 * Tries to connect to REDIS_URL, falls back to in-memory Map if unavailable.
 * Never crashes if redis down.
 */
const env = require('./env');
const logger = require('./logger');

let client = null;
let available = false;
let connecting = null;

// In-memory fallbacks
const memCounters = new Map(); // key -> { count, expiresAt }
const memCache = new Map(); // key -> { value, expiresAt }

function now() {
  return Date.now();
}

function getMemCounter(key) {
  const e = memCounters.get(key);
  if (!e) return null;
  if (e.expiresAt && e.expiresAt < now()) {
    memCounters.delete(key);
    return null;
  }
  return e;
}

async function initRedis() {
  if (connecting) return connecting;
  let tmpClient = null;
  connecting = (async () => {
    try {
      // Lazy require so app still boots if ioredis missing
      const Redis = require('ioredis');
      const c = new Redis(env.redisUrl, {
        maxRetriesPerRequest: 1,
        enableReadyCheck: true,
        retryStrategy: () => null,
        connectTimeout: 2000,
        lazyConnect: true,
      });
      tmpClient = c;
      c.on('error', (err) => {
        logger.warn(`Redis error, falling back to memory: ${err.message}`);
        available = false;
      });
      // race connect with timeout (unrefed so jest can exit)
      const timeoutP = new Promise((_, rej) => {
        const t = setTimeout(() => rej(new Error('redis connect timeout')), 2500);
        if (t.unref) t.unref();
      });
      await Promise.race([c.connect().then(() => c.ping()), timeoutP]);
      client = c;
      available = true;
      logger.info('Redis connected');
    } catch (err) {
      logger.warn(`Redis unavailable, using in-memory fallback: ${err.message}`);
      try {
        // ensure no open handle keeps process alive
        if (tmpClient && tmpClient.disconnect) tmpClient.disconnect();
      } catch (_) {}
      client = null;
      available = false;
    }
    return available;
  })();
  return connecting;
}

// fire and forget, don't block boot
initRedis().catch(() => {});

function redisAvailable() {
  return available && !!client;
}

/**
 * Increment counter with TTL (fixed window).
 * Returns current count after increment.
 * Race-safe: sets TTL when count==1 OR when key has no TTL (ttl==-1).
 */
async function incrWithTTL(key, ttlSec) {
  if (redisAvailable()) {
    try {
      const count = await client.incr(key);
      if (count === 1) {
        await client.expire(key, ttlSec);
      } else {
        // Repair missing TTL (race where expire failed / key persisted)
        try {
          const ttl = await client.ttl(key);
          if (ttl === -1) await client.expire(key, ttlSec);
        } catch (_) {}
      }
      return count;
    } catch (err) {
      logger.warn(`Redis incr failed, memory fallback: ${err.message}`);
    }
  }
  const existing = getMemCounter(key);
  if (!existing) {
    memCounters.set(key, { count: 1, expiresAt: now() + ttlSec * 1000 });
    return 1;
  }
  existing.count += 1;
  memCounters.set(key, existing);
  return existing.count;
}

// Periodic sweep of expired in-memory entries to prevent unbounded growth
if (!global.__devapiMemSweep) {
  global.__devapiMemSweep = true;
  const sweep = () => {
    try {
      const t = now();
      for (const [k, v] of memCounters) {
        if (v.expiresAt && v.expiresAt < t) memCounters.delete(k);
      }
      for (const [k, v] of memCache) {
        if (v.expiresAt && v.expiresAt < t) memCache.delete(k);
      }
      // Hard cap: drop oldest if maps grow too large
      if (memCounters.size > 20000) {
        const keys = [...memCounters.keys()].slice(0, 5000);
        for (const k of keys) memCounters.delete(k);
      }
      if (memCache.size > 5000) {
        const keys = [...memCache.keys()].slice(0, 1000);
        for (const k of keys) memCache.delete(k);
      }
    } catch (_) {}
  };
  const timer = setInterval(sweep, 60 * 1000);
  if (timer.unref) timer.unref();
}

async function getCounter(key) {
  if (redisAvailable()) {
    try {
      const v = await client.get(key);
      return v ? parseInt(v, 10) : 0;
    } catch (_) {
      // fallback
    }
  }
  const e = getMemCounter(key);
  return e ? e.count : 0;
}

async function getCache(key) {
  if (redisAvailable()) {
    try {
      const v = await client.get(`cache:${key}`);
      return v ? JSON.parse(v) : null;
    } catch (_) {
      // fallback
    }
  }
  const e = memCache.get(key);
  if (!e) return null;
  if (e.expiresAt && e.expiresAt < now()) {
    memCache.delete(key);
    return null;
  }
  return e.value;
}

async function setCache(key, value, ttlSec = 60) {
  if (redisAvailable()) {
    try {
      await client.set(`cache:${key}`, JSON.stringify(value), 'EX', ttlSec);
      return;
    } catch (_) {
      // fallback
    }
  }
  memCache.set(key, { value, expiresAt: now() + ttlSec * 1000 });
}

async function delCache(key) {
  if (redisAvailable()) {
    try {
      await client.del(`cache:${key}`);
    } catch (_) {}
  }
  memCache.delete(key);
  // wildcard-ish: delete keys starting with prefix
  for (const k of [...memCache.keys()]) {
    if (k.startsWith(key)) memCache.delete(k);
  }
}

async function delCacheByPrefix(prefix) {
  await delCache(prefix);
}

function getRedisClient() {
  return client;
}

module.exports = {
  initRedis,
  redisAvailable,
  incrWithTTL,
  getCounter,
  getCache,
  setCache,
  delCache,
  delCacheByPrefix,
  getRedisClient,
};

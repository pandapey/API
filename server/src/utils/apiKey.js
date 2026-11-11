const crypto = require('crypto');

function generateApiKey() {
  const raw = `dk_live_${crypto.randomBytes(16).toString('hex')}`; // 32 hex chars
  const hash = hashApiKey(raw);
  const prefix = raw.slice(0, 8 + 5); // keep readable prefix e.g. dk_live_xxx — store first 8 after? spec: first 8 chars
  // spec: prefix (first 8 chars) + last4
  const shortPrefix = raw.slice(0, 8);
  const last4 = raw.slice(-4);
  return { raw, hash, prefix: shortPrefix, fullPrefix: prefix, last4 };
}

function hashApiKey(raw) {
  return crypto.createHash('sha256').update(raw).digest('hex');
}

function sha256(str) {
  return crypto.createHash('sha256').update(str).digest('hex');
}

module.exports = { generateApiKey, hashApiKey, sha256 };

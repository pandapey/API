const axios = require('axios');
const ApiProject = require('../models/ApiProject');
const ApiEndpoint = require('../models/ApiEndpoint');
const logger = require('../config/logger');
const { asyncHandler, ApiError } = require('../utils/asyncHandler');
const { triggerEvent } = require('../services/webhookService');

function normalizePath(p) {
  if (!p) return '/';
  let s = String(p);
  if (!s.startsWith('/')) s = `/${s}`;
  // remove trailing slash except root
  if (s.length > 1 && s.endsWith('/')) s = s.slice(0, -1);
  return s;
}

// Match endpoint: exact method+path, also support :param segments
function matchEndpoint(endpoints, method, requestPath) {
  // 1) exact
  let ep = endpoints.find((e) => e.method === method && normalizePath(e.path) === normalizePath(requestPath));
  if (ep) return { endpoint: ep, params: {} };
  // 2) pattern with :param
  for (const e of endpoints) {
    if (e.method !== method) continue;
    const epParts = normalizePath(e.path).split('/').filter(Boolean);
    const reqParts = normalizePath(requestPath).split('/').filter(Boolean);
    if (epParts.length !== reqParts.length) continue;
    const params = {};
    let ok = true;
    for (let i = 0; i < epParts.length; i++) {
      if (epParts[i].startsWith(':')) {
        params[epParts[i].slice(1)] = reqParts[i];
      } else if (epParts[i] !== reqParts[i]) {
        ok = false;
        break;
      }
    }
    if (ok) return { endpoint: e, params };
  }
  return null;
}

function isBlockedUpstreamTarget(targetUrl) {
  try {
    const u = new URL(targetUrl);
    if (!['http:', 'https:'].includes(u.protocol)) return true;
    if (u.username || u.password) return true;
    let host = u.hostname.toLowerCase().replace(/^\[|\]$/g, '');
    // Decode common obfuscations: strip trailing dot
    if (host.endsWith('.')) host = host.slice(0, -1);
    // Block localhost / private / link-local / metadata
    if (host === 'localhost' || host.endsWith('.localhost')) return true;
    if (host === '169.254.169.254' || host === 'metadata.google.internal' || host === 'metadata.google.com') return true;
    // IPv4 decimal/octal/hex forms: e.g. 2130706433, 0x7f.0.0.1, 0177.0.0.1
    const asIpv4 = (() => {
      if (/^\d+$/.test(host)) {
        const n = Number(host);
        if (!Number.isSafeInteger(n) || n < 0 || n > 0xffffffff) return null;
        return [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255];
      }
      const parts = host.split('.');
      if (parts.length !== 4) return null;
      const nums = [];
      for (const p of parts) {
        let v;
        if (/^0x[0-9a-f]+$/i.test(p)) v = parseInt(p, 16);
        else if (/^0[0-7]+$/.test(p) && p.length > 1) v = parseInt(p, 8);
        else if (/^\d+$/.test(p)) v = Number(p);
        else return null;
        if (!Number.isInteger(v) || v < 0 || v > 255) return null;
        nums.push(v);
      }
      return nums;
    })();
    if (asIpv4) {
      const [a, b] = asIpv4;
      if (a === 127 || a === 10) return true;
      if (a === 172 && b >= 16 && b <= 31) return true;
      if (a === 192 && b === 168) return true;
      if (a === 169 && b === 254) return true;
      if (a === 0) return true;
    }
    // Dotted decimal already covered above; also block IPv6 loopback / private
    const v4 = host.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/);
    if (v4) {
      const [, a, b] = v4.map(Number);
      if (a === 127 || a === 10) return true;
      if (a === 172 && b >= 16 && b <= 31) return true;
      if (a === 192 && b === 168) return true;
      if (a === 169 && b === 254) return true;
      if (a === 0) return true;
    }
    if (host === '::1' || host === '::ffff:127.0.0.1' || host === '0:0:0:0:0:ffff:127.0.0.1') return true;
    return false;
  } catch {
    return true;
  }
}

function ipIsPrivateIp(ip) {
  const v = String(ip).toLowerCase().replace(/^\[|\]$/g, '');
  if (v === '::1' || v === '::ffff:127.0.0.1') return true;
  if (v.includes(':')) {
    // IPv6: block loopback/link-local/unique-local
    if (v.startsWith('fe80:') || v.startsWith('fec0:') || v.startsWith('fc') || v.startsWith('fd')) return true;
    return false;
  }
  const m = v.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/);
  if (!m) return false;
  const a = Number(m[1]);
  const b = Number(m[2]);
  if (a === 127 || a === 10 || a === 0) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 169 && b === 254) return true;
  return false;
}

async function hostnameResolvesToPrivate(hostname) {
  try {
    const dns = require('dns').promises;
    const clean = String(hostname).replace(/^\[|\]$/g, '').replace(/\.$/, '');
    // Literal IPs: check directly without DNS.
    if (/^[\d.]+$/.test(clean) || clean.includes(':')) return ipIsPrivateIp(clean);
    const records = await dns.lookup(clean, { all: true }).catch(() => []);
    if (!records.length) return true; // fail-closed: unresolvable => block proxy
    return records.some((r) => ipIsPrivateIp(r.address));
  } catch {
    return true;
  }
}

function generateMock(endpoint, params, query) {
  if (endpoint.exampleResponse && typeof endpoint.exampleResponse === 'object' && Object.keys(endpoint.exampleResponse).length) {
    return endpoint.exampleResponse;
  }
  // generic mock
  return {
    mock: true,
    method: endpoint.method,
    path: endpoint.path,
    version: endpoint.version,
    params,
    query,
    timestamp: new Date().toISOString(),
    data: {
      id: Math.floor(Math.random() * 100000),
      message: `Mock response for ${endpoint.method} ${endpoint.path}`,
    },
  };
}

const handleGateway = asyncHandler(async (req, res) => {
  const { projectId } = req.params;
  const subPath = req.params[0] || req.params.path || '';
  // req.params[0] for wildcard; express4 with /* gives 0
  let requestPath = '/';
  if (typeof subPath === 'string') requestPath = `/${subPath}`;
  else if (req.params.path) requestPath = `/${req.params.path}`;

  // Also handle /gateway/:projectId with no trailing path
  if (req.originalUrl) {
    // fallback: strip prefix /gateway/<projectId>
    const prefix = `/gateway/${projectId}`;
    const idx = req.originalUrl.indexOf(prefix);
    if (idx !== -1) {
      let rest = req.originalUrl.slice(idx + prefix.length).split('?')[0];
      if (!rest) rest = '/';
      requestPath = rest;
    }
  }
  requestPath = normalizePath(requestPath);
  // Path traversal guard: reject encoded or literal .. segments
  const rawLower = String(req.originalUrl || '').toLowerCase();
  if (rawLower.includes('..') || rawLower.includes('%2e') || rawLower.includes('%2f%2e')) {
    throw new ApiError(400, 'Invalid path', 'INVALID_PATH');
  }

  const project = await ApiProject.findById(projectId);
  if (!project) {
    req.logErrorMessage = 'Project not found';
    throw new ApiError(404, 'Project not found', 'PROJECT_NOT_FOUND');
  }
  req.gatewayProject = project;

  const version = req.query.version || req.headers['x-api-version'] || 'v1';

  const endpoints = await ApiEndpoint.find({ project: project._id, isActive: true });
  // prefer requested version, fallback any version
  let candidates = endpoints.filter((e) => e.version === version);
  if (!candidates.length) candidates = endpoints;

  const matched = matchEndpoint(candidates, req.method, requestPath);
  if (!matched) {
    req.logErrorMessage = `No endpoint for ${req.method} ${requestPath}`;
    // fire error webhook async
    triggerEvent(project._id, 'api.error', { method: req.method, path: requestPath, statusCode: 404 }).catch((e) => logger.warn(`webhook trigger failed: ${e.message}`));
    throw new ApiError(404, `No mock endpoint for ${req.method} ${requestPath} (version ${version})`, 'ENDPOINT_NOT_FOUND');
  }

  const { endpoint, params } = matched;
  req.gatewayEndpoint = endpoint;

  // Auth check
  if (endpoint.authRequired && !req.apiKey) {
    req.logErrorMessage = 'API key required';
    triggerEvent(project._id, 'api.error', { method: req.method, path: requestPath, statusCode: 401 }).catch((e) => logger.warn(`webhook trigger failed: ${e.message}`));
    throw new ApiError(401, 'API key required for this endpoint', 'INVALID_API_KEY');
  }

  // If key present but belongs to different project -> forbid
  if (req.apiKey) {
    const kp = req.apiKey.project;
    const keyProjectId = kp && kp._id ? kp._id.toString() : String(kp);
    if (keyProjectId !== project._id.toString()) {
      req.logErrorMessage = 'API key not valid for this project';
      throw new ApiError(403, 'API key not valid for this project', 'INVALID_API_KEY');
    }
    // Scope check: if key has scopes, endpoint must be listed (e.g. "GET /hello" or "*")
    const scopes = req.apiKey.scopes || [];
    if (scopes.length) {
      const label = `${endpoint.method} ${endpoint.path}`;
      const allowed = scopes.includes('*') || scopes.includes(label) || scopes.includes(endpoint.path);
      if (!allowed) {
        req.logErrorMessage = `API key lacks scope for ${label}`;
        triggerEvent(project._id, 'api.error', { method: req.method, path: requestPath, statusCode: 403 }).catch((e) => logger.warn(`webhook trigger failed: ${e.message}`));
        throw new ApiError(403, `API key lacks scope for ${label}`, 'INSUFFICIENT_SCOPE');
      }
    }
  }

  // Simulate latency
  const latency = Math.min(endpoint.latencyMs || 0, 2000);
  if (latency > 0) await new Promise((r) => setTimeout(r, Math.min(latency, 500)));

  // --- Proxy mode: if project has upstreamUrl, forward to real API ---
  if (project.upstreamUrl && String(project.upstreamUrl).trim()) {
    const base = String(project.upstreamUrl).trim().replace(/\/$/, '');
    const { version: _v, ...forwardQuery } = req.query || {};
    void _v;
    const qs = new URLSearchParams(forwardQuery).toString();
    const target = `${base}${requestPath}${qs ? `?${qs}` : ''}`;
    if (isBlockedUpstreamTarget(target)) {
      req.logErrorMessage = 'Upstream target blocked';
      throw new ApiError(400, 'Upstream URL is not allowed', 'UPSTREAM_BLOCKED');
    }
    try {
      const targetHost = new URL(target).hostname;
      if (await hostnameResolvesToPrivate(targetHost)) {
        req.logErrorMessage = 'Upstream target resolves to private IP';
        throw new ApiError(400, 'Upstream URL is not allowed', 'UPSTREAM_BLOCKED');
      }
    } catch (e) {
      if (e?.statusCode === 400 || e?.errorCode === 'UPSTREAM_BLOCKED') throw e;
      req.logErrorMessage = 'Upstream DNS check failed';
      throw new ApiError(400, 'Upstream URL is not allowed', 'UPSTREAM_BLOCKED');
    }
    const forwardHeaders = {};
    if (req.headers['content-type']) forwardHeaders['content-type'] = req.headers['content-type'];
    if (req.headers.accept) forwardHeaders.accept = req.headers.accept;
    try {
      const upstreamRes = await axios({
        method: req.method,
        url: target,
        data: ['GET', 'HEAD', 'DELETE'].includes(req.method) ? undefined : req.body,
        headers: forwardHeaders,
        timeout: 10000,
        validateStatus: () => true,
        maxBodyLength: 5 * 1024 * 1024,
        maxContentLength: 5 * 1024 * 1024,
        maxRedirects: 0,
      });
      const ok = upstreamRes.status < 400;
      if (!ok) {
        req.logErrorMessage = `Upstream ${upstreamRes.status} for ${req.method} ${requestPath}`;
        triggerEvent(project._id, 'api.error', {
          method: req.method,
          path: requestPath,
          statusCode: upstreamRes.status,
          proxied: true,
        }).catch((e) => logger.warn(`webhook trigger failed: ${e.message}`));
      } else {
        triggerEvent(project._id, 'api.request', {
          method: req.method,
          path: requestPath,
          endpoint: `${endpoint.method} ${endpoint.path}`,
          statusCode: upstreamRes.status,
          keyPrefix: req.apiKey ? req.apiKey.prefix : null,
          proxied: true,
        }).catch((e) => logger.warn(`webhook trigger failed: ${e.message}`));
      }
      return res.status(upstreamRes.status).json({ success: ok, data: upstreamRes.data, proxied: true });
    } catch (err) {
      if (err.response) {
        const status = err.response.status || 502;
        req.logErrorMessage = `Upstream ${status} for ${req.method} ${requestPath}`;
        triggerEvent(project._id, 'api.error', {
          method: req.method,
          path: requestPath,
          statusCode: status,
          proxied: true,
        }).catch((e) => logger.warn(`webhook trigger failed: ${e.message}`));
        return res.status(status).json({ success: false, data: err.response.data, proxied: true });
      }
      req.logErrorMessage = `Upstream unreachable: ${err.message}`;
      triggerEvent(project._id, 'api.error', {
        method: req.method,
        path: requestPath,
        statusCode: 502,
        error: err.message,
      }).catch((e) => logger.warn(`webhook trigger failed: ${e.message}`));
      throw new ApiError(502, `Upstream unreachable: ${err.message}`, 'UPSTREAM_UNREACHABLE');
    }
  }

  // --- Mock mode (no upstreamUrl): return exampleResponse ---
  const mock = generateMock(endpoint, params, req.query);

  // Fire webhooks (don't await)
  triggerEvent(project._id, 'api.request', {
    method: req.method,
    path: requestPath,
    endpoint: `${endpoint.method} ${endpoint.path}`,
    statusCode: 200,
    keyPrefix: req.apiKey ? req.apiKey.prefix : null,
  }).catch((e) => logger.warn(`webhook trigger failed: ${e.message}`));

  res.json({ success: true, data: mock });
});

module.exports = { handleGateway, isBlockedUpstreamTarget, normalizePath, hostnameResolvesToPrivate, ipIsPrivateIp };

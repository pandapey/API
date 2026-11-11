const crypto = require('crypto');
const axios = require('axios');
const logger = require('../config/logger');
const Webhook = require('../models/Webhook');
const WebhookDelivery = require('../models/WebhookDelivery');

function signPayload(secret, payloadStr) {
  if (!secret) return null;
  return crypto.createHmac('sha256', secret).update(payloadStr).digest('hex');
}

function isBlockedWebhookTarget(targetUrl) {
  try {
    // Reuse gateway SSRF guard when available to keep one allowlist.
    const { isBlockedUpstreamTarget } = require('../controllers/gatewayController');
    if (typeof isBlockedUpstreamTarget === 'function' && isBlockedUpstreamTarget(targetUrl)) return true;
  } catch {}
  try {
    const u = new URL(targetUrl);
    if (!['http:', 'https:'].includes(u.protocol)) return true;
    const host = u.hostname.toLowerCase();
    if (host === 'localhost' || host.endsWith('.localhost')) return true;
    if (host === '169.254.169.254' || host === 'metadata.google.internal') return true;
    return false;
  } catch {
    return true;
  }
}

async function deliverOnce(webhook, event, payload, deliveryDoc, { maxAttempts: maxAttemptsOpt } = {}) {
  // Default 3 attempts with 1s/3s backoff (used by inline execution).
  // BullMQ jobs pass maxAttempts: 1 because the queue retries the job itself.
  const maxAttempts = Number.isFinite(maxAttemptsOpt) && maxAttemptsOpt > 0 ? maxAttemptsOpt : 3;
  if (isBlockedWebhookTarget(webhook.url)) {
    const msg = 'Webhook URL target is blocked (private/metadata/localhost)';
    logger.warn(`Webhook ${webhook._id} blocked: ${webhook.url}`);
    if (deliveryDoc) {
      deliveryDoc.status = 'failed';
      deliveryDoc.error = msg;
      await deliveryDoc.save().catch(() => {});
    }
    return { ok: false, error: msg };
  }
  try {
    const { hostnameResolvesToPrivate } = require('../controllers/gatewayController');
    if (typeof hostnameResolvesToPrivate === 'function') {
      const host = new URL(webhook.url).hostname;
      if (await hostnameResolvesToPrivate(host)) {
        const msg = 'Webhook URL resolves to private IP (DNS rebinding blocked)';
        logger.warn(`Webhook ${webhook._id} DNS-blocked: ${webhook.url}`);
        if (deliveryDoc) {
          deliveryDoc.status = 'failed';
          deliveryDoc.error = msg;
          await deliveryDoc.save().catch(() => {});
        }
        return { ok: false, error: msg };
      }
    }
  } catch (e) {
    const msg = 'Webhook URL DNS check failed — blocked';
    if (deliveryDoc) {
      deliveryDoc.status = 'failed';
      deliveryDoc.error = msg;
      await deliveryDoc.save().catch(() => {});
    }
    return { ok: false, error: msg };
  }
  const bodyStr = JSON.stringify({ event, project: webhook.project?.toString?.() || webhook.project, data: payload, timestamp: new Date().toISOString() });
  const signature = signPayload(webhook.secret, bodyStr);
  const headers = {
    'Content-Type': 'application/json',
    'X-Webhook-Event': event,
    ...(webhook.headers || {}),
  };
  if (signature) headers['X-Webhook-Signature'] = signature;

  let lastError = null;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      if (deliveryDoc) {
        deliveryDoc.attempts = attempt;
        await deliveryDoc.save().catch(() => {});
      }
      const res = await axios.post(webhook.url, bodyStr, {
        headers,
        timeout: 8000,
        validateStatus: () => true,
        maxBodyLength: 1024 * 1024,
        maxContentLength: 1024 * 1024,
        maxRedirects: 0,
      });
      if (res.status >= 200 && res.status < 300) {
        if (deliveryDoc) {
          deliveryDoc.status = 'success';
          deliveryDoc.responseStatus = res.status;
          deliveryDoc.responseBody = String(res.data ?? '').slice(0, 2000);
          deliveryDoc.error = null;
          await deliveryDoc.save().catch(() => {});
        }
        return { ok: true, status: res.status };
      }
      lastError = `HTTP ${res.status}`;
      logger.warn(`Webhook ${webhook._id} attempt ${attempt} got ${res.status}`);
      if (deliveryDoc) {
        deliveryDoc.responseStatus = res.status;
        deliveryDoc.responseBody = String(JSON.stringify(res.data ?? '')).slice(0, 2000);
      }
    } catch (err) {
      lastError = err.message;
      logger.warn(`Webhook ${webhook._id} attempt ${attempt} failed: ${err.message}`);
      if (deliveryDoc) deliveryDoc.error = err.message;
    }
    // backoff: 1s, 3s
    if (attempt < maxAttempts) {
      await new Promise((r) => setTimeout(r, attempt * 1000));
    }
  }
  if (deliveryDoc) {
    deliveryDoc.status = 'failed';
    deliveryDoc.error = lastError;
    await deliveryDoc.save().catch(() => {});
  }
  return { ok: false, error: lastError };
}

async function triggerEvent(projectId, event, payload = {}) {
  try {
    const hooks = await Webhook.find({ project: projectId, isActive: true, events: event });
    if (!hooks.length) return [];
    const { addJob } = require('../jobs/queues');
    const results = [];
    for (const h of hooks) {
      const delivery = await WebhookDelivery.create({
        webhook: h._id,
        project: projectId,
        event,
        payload,
        status: 'pending',
        attempts: 0,
      });
      // queue (or inline if no redis). Job data carries no retry hints:
      // processDeliveryJob always runs deliverOnce's own 3-attempt backoff,
      // and BullMQ jobs are configured with attempts:1 (no queue-level retry)
      // so total HTTP deliveries per event stay at exactly 3.
      await addJob('webhook-delivery', { webhookId: h._id.toString(), deliveryId: delivery._id.toString(), event, payload });
      results.push(delivery._id.toString());
    }
    return results;
  } catch (err) {
    logger.warn(`triggerEvent failed: ${err.message}`);
    return [];
  }
}

async function processDeliveryJob(data) {
  const { webhookId, deliveryId, event, payload } = data;
  const webhook = await Webhook.findById(webhookId);
  const delivery = await WebhookDelivery.findById(deliveryId);
  if (!webhook || !delivery) return;
  await deliverOnce(webhook, event, payload, delivery);
}

module.exports = { triggerEvent, deliverOnce, processDeliveryJob, signPayload, isBlockedWebhookTarget };

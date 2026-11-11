const { v4: uuidv4 } = require('uuid');
const logger = require('../config/logger');
const Notification = require('../models/Notification');

async function sendEmail(to, subject, body, opts = {}) {
  const type = opts.type || 'email';
  const userId = opts.userId || null;
  // Mock email via console
  logger.info(`[MOCK EMAIL] to=${to} subject=${subject} body=${body}`);
  console.log(`[MOCK EMAIL] to=${to} subject=${subject}\n${body}`);
  try {
    await Notification.create({
      user: userId,
      email: to,
      type,
      subject,
      body,
    });
  } catch (err) {
    logger.warn(`Failed to persist notification: ${err.message}`);
  }
  return { id: uuidv4(), to, subject };
}

module.exports = { sendEmail };

const env = require('../config/env');
const logger = require('../config/logger');

class HttpError extends Error {
  constructor(statusCode, message, errorCode, details) {
    super(message);
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.details = details;
  }
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  let status = err.statusCode || err.status || 500;
  let message = err.message || 'Internal server error';
  let code = err.errorCode || err.code || (status === 500 ? 'INTERNAL_ERROR' : 'REQUEST_FAILED');

  // Mongoose validation / cast
  if (err.name === 'ValidationError') {
    status = 400;
    code = 'VALIDATION_ERROR';
    message = err.message;
  }
  if (err.name === 'CastError') {
    status = 400;
    code = 'INVALID_ID';
    message = 'Invalid id format';
  }
  if (err.code === 11000) {
    status = 409;
    code = 'DUPLICATE';
    message = 'Duplicate key error';
  }

  // Zod passthrough (if thrown directly)
  if (err.name === 'ZodError') {
    status = 400;
    code = 'VALIDATION_ERROR';
    message = 'Validation failed';
  }

  if (status === 500 && env.isProd) {
    message = 'Internal server error';
  }

  logger.error(`${req.method} ${req.originalUrl} -> ${status} ${code}: ${message}`);

  const body = { success: false, message, errorCode: code };
  // Never leak internal details/stack in production
  if (!env.isProd) {
    if (err.details) body.details = err.details;
    if (err.errors && !body.details) body.details = err.errors;
    if (status === 500 && err.stack) body.stack = err.stack;
  } else if (status !== 500) {
    // For 4xx in prod, include safe validation details only (no stack)
    if (err.details && typeof err.details === 'object') body.details = err.details;
  }
  res.status(status).json(body);
}

function notFound(req, res) {
  res.status(404).json({ success: false, message: 'Route not found', errorCode: 'NOT_FOUND' });
}

module.exports = { errorHandler, notFound, HttpError };

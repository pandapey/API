function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

class ApiError extends Error {
  constructor(statusCode, message, errorCode, details) {
    super(message);
    this.statusCode = statusCode;
    this.errorCode = errorCode || 'INTERNAL_ERROR';
    this.details = details;
  }
}

module.exports = { asyncHandler, ApiError };

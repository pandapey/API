const { ApiError } = require('../utils/asyncHandler');

function validate(schemas) {
  return (req, res, next) => {
    try {
      if (schemas.params) {
        const parsed = schemas.params.parse(req.params);
        req.params = parsed;
      }
      if (schemas.query) {
        const parsed = schemas.query.parse(req.query);
        req.query = parsed;
      }
      if (schemas.body) {
        const parsed = schemas.body.parse(req.body);
        req.body = parsed;
      }
      next();
    } catch (err) {
      const details = err.errors || err.issues || [];
      return next(new ApiError(400, 'Validation failed', 'VALIDATION_ERROR', details));
    }
  };
}

module.exports = { validate };

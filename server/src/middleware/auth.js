const { verifyAccessToken } = require('../utils/jwt');
const { ApiError } = require('../utils/asyncHandler');
const User = require('../models/User');

async function protect(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) throw new ApiError(401, 'Not authorized, token missing', 'UNAUTHORIZED');
    let decoded;
    try {
      decoded = verifyAccessToken(token);
    } catch (e) {
      throw new ApiError(401, 'Not authorized, token invalid', 'UNAUTHORIZED');
    }
    const user = await User.findById(decoded.sub);
    if (!user) throw new ApiError(401, 'User not found', 'UNAUTHORIZED');
    if (user.suspended) throw new ApiError(403, 'Account suspended', 'ACCOUNT_SUSPENDED');
    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
}

function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user) return next(new ApiError(401, 'Not authorized', 'UNAUTHORIZED'));
    if (!roles.includes(req.user.role)) {
      return next(new ApiError(403, 'Forbidden: insufficient role', 'FORBIDDEN'));
    }
    next();
  };
}

module.exports = { protect, authorize };

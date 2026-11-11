const express = require('express');
const rateLimit = require('express-rate-limit');
const { register, login, refresh, logout, me, forgot, reset, verifyEmail } = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { registerSchema, loginSchema, forgotSchema, resetSchema, verifyEmailSchema } = require('../validators/auth');

const router = express.Router();

// Brute-force protection for auth endpoints (in-memory; shared Redis layer is global limiter)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({ success: false, message: 'Too many auth attempts, try again later', errorCode: 'RATE_LIMIT_EXCEEDED' });
  },
});

router.post('/register', authLimiter, validate({ body: registerSchema }), register);
router.post('/login', authLimiter, validate({ body: loginSchema }), login);
router.post('/refresh', authLimiter, refresh);
router.post('/logout', logout);
router.get('/me', protect, me);
const { updateMe } = require('../controllers/authController');
router.patch('/me', protect, updateMe);
router.post('/forgot', authLimiter, validate({ body: forgotSchema }), forgot);
router.post('/reset', authLimiter, validate({ body: resetSchema }), reset);
router.post('/verify-email', authLimiter, validate({ body: verifyEmailSchema }), verifyEmail);
// Aliases for frontend compatibility (frontend uses -password suffix)
router.post('/forgot-password', authLimiter, validate({ body: forgotSchema }), forgot);
router.post('/reset-password', authLimiter, validate({ body: resetSchema }), reset);

module.exports = router;

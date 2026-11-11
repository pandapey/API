const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const env = require('../config/env');

function signAccessToken(user) {
  const payload = { sub: user._id.toString(), email: user.email, role: user.role };
  return jwt.sign(payload, env.jwtAccessSecret, { expiresIn: env.jwtAccessExpires });
}

function signRefreshToken(user, jti) {
  const payload = { sub: user._id.toString(), jti: jti || uuidv4() };
  const token = jwt.sign(payload, env.jwtRefreshSecret, { expiresIn: env.jwtRefreshExpires });
  return { token, jti: payload.jti };
}

function verifyAccessToken(token) {
  return jwt.verify(token, env.jwtAccessSecret);
}

function verifyRefreshToken(token) {
  return jwt.verify(token, env.jwtRefreshSecret);
}

module.exports = { signAccessToken, signRefreshToken, verifyAccessToken, verifyRefreshToken };

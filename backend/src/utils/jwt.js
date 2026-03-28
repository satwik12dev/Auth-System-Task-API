const jwt = require('jsonwebtoken');

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'change_this_access_secret_in_production';
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'change_this_refresh_secret_in_production';

const ACCESS_EXPIRES = process.env.JWT_ACCESS_EXPIRES || '15m';
const REFRESH_EXPIRES = process.env.JWT_REFRESH_EXPIRES || '7d';

/**
 * Generate a short-lived access token
 */
const generateAccessToken = (payload) => {
  return jwt.sign(payload, ACCESS_SECRET, {
    expiresIn: ACCESS_EXPIRES,
    issuer: 'task-api',
    audience: 'task-api-client',
  });
};

/**
 * Generate a long-lived refresh token
 */
const generateRefreshToken = (payload) => {
  return jwt.sign(payload, REFRESH_SECRET, {
    expiresIn: REFRESH_EXPIRES,
    issuer: 'task-api',
    audience: 'task-api-client',
  });
};

/**
 * Verify an access token; throws if invalid/expired
 */
const verifyAccessToken = (token) => {
  return jwt.verify(token, ACCESS_SECRET, {
    issuer: 'task-api',
    audience: 'task-api-client',
  });
};

/**
 * Verify a refresh token; throws if invalid/expired
 */
const verifyRefreshToken = (token) => {
  return jwt.verify(token, REFRESH_SECRET, {
    issuer: 'task-api',
    audience: 'task-api-client',
  });
};

/**
 * Calculate refresh token expiry as a Date object
 */
const getRefreshTokenExpiry = () => {
  const days = parseInt(REFRESH_EXPIRES) || 7;
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
};

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  getRefreshTokenExpiry,
};

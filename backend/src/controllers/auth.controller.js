const bcrypt = require('bcryptjs');
const { query } = require('../config/db');
const {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  getRefreshTokenExpiry,
} = require('../utils/jwt');
const { sendSuccess, sendError } = require('../utils/response');
const logger = require('../utils/logger');

/**
 * POST /api/v1/auth/register
 */
const register = async (req, res, next) => {
  try {
    const { name, email, password, role = 'user' } = req.body;

    // Check existing user
    const existing = await query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return sendError(res, { statusCode: 409, message: 'Email is already registered' });
    }

    // Hash password (cost factor 12)
    const hashedPassword = await bcrypt.hash(password, 12);

    const result = await query(
      `INSERT INTO users (name, email, password, role)
       VALUES ($1, $2, $3, $4)
       RETURNING id, name, email, role, created_at`,
      [name, email, hashedPassword, role]
    );

    const user = result.rows[0];
    const accessToken = generateAccessToken({ id: user.id, email: user.email, role: user.role });
    const refreshToken = generateRefreshToken({ id: user.id });

    // Persist refresh token
    await query(
      `INSERT INTO refresh_tokens (user_id, token, expires_at)
       VALUES ($1, $2, $3)`,
      [user.id, refreshToken, getRefreshTokenExpiry()]
    );

    logger.info(`New user registered: ${email} (${role})`);

    return sendSuccess(res, {
      statusCode: 201,
      message: 'Registration successful',
      data: { user, accessToken, refreshToken },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/v1/auth/login
 */
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const result = await query(
      'SELECT id, name, email, password, role, is_active FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      // Use same message to prevent user enumeration
      return sendError(res, { statusCode: 401, message: 'Invalid email or password' });
    }

    const user = result.rows[0];

    if (!user.is_active) {
      return sendError(res, { statusCode: 401, message: 'Account has been deactivated' });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return sendError(res, { statusCode: 401, message: 'Invalid email or password' });
    }

    const accessToken = generateAccessToken({ id: user.id, email: user.email, role: user.role });
    const refreshToken = generateRefreshToken({ id: user.id });

    await query(
      `INSERT INTO refresh_tokens (user_id, token, expires_at)
       VALUES ($1, $2, $3)`,
      [user.id, refreshToken, getRefreshTokenExpiry()]
    );

    const { password: _, ...safeUser } = user;

    logger.info(`User logged in: ${email}`);

    return sendSuccess(res, {
      message: 'Login successful',
      data: { user: safeUser, accessToken, refreshToken },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/v1/auth/refresh
 * Exchange a refresh token for a new access token
 */
const refreshToken = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return sendError(res, { statusCode: 400, message: 'Refresh token is required' });
    }

    let decoded;
    try {
      decoded = verifyRefreshToken(refreshToken);
    } catch {
      return sendError(res, { statusCode: 401, message: 'Invalid or expired refresh token' });
    }

    // Check token exists in DB and is not expired
    const tokenResult = await query(
      `SELECT id FROM refresh_tokens
       WHERE token = $1 AND user_id = $2 AND expires_at > NOW()`,
      [refreshToken, decoded.id]
    );

    if (tokenResult.rows.length === 0) {
      return sendError(res, { statusCode: 401, message: 'Refresh token is invalid or revoked' });
    }

    const userResult = await query(
      'SELECT id, email, role, is_active FROM users WHERE id = $1',
      [decoded.id]
    );

    const user = userResult.rows[0];
    if (!user || !user.is_active) {
      return sendError(res, { statusCode: 401, message: 'User not found or inactive' });
    }

    // Token rotation: delete old, issue new
    await query('DELETE FROM refresh_tokens WHERE token = $1', [refreshToken]);

    const newAccessToken = generateAccessToken({ id: user.id, email: user.email, role: user.role });
    const newRefreshToken = generateRefreshToken({ id: user.id });

    await query(
      `INSERT INTO refresh_tokens (user_id, token, expires_at)
       VALUES ($1, $2, $3)`,
      [user.id, newRefreshToken, getRefreshTokenExpiry()]
    );

    return sendSuccess(res, {
      message: 'Tokens refreshed',
      data: { accessToken: newAccessToken, refreshToken: newRefreshToken },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/v1/auth/logout
 * Revoke refresh token
 */
const logout = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    if (refreshToken) {
      await query('DELETE FROM refresh_tokens WHERE token = $1', [refreshToken]);
    }

    return sendSuccess(res, { message: 'Logged out successfully' });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/v1/auth/me
 * Get current authenticated user
 */
const getMe = async (req, res, next) => {
  try {
    const result = await query(
      'SELECT id, name, email, role, is_active, created_at, updated_at FROM users WHERE id = $1',
      [req.user.id]
    );

    return sendSuccess(res, {
      message: 'Profile retrieved',
      data: { user: result.rows[0] },
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { register, login, refreshToken, logout, getMe };

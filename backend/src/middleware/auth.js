const { verifyAccessToken } = require('../utils/jwt');
const { sendError } = require('../utils/response');
const { query } = require('../config/db');

/**
 * Middleware: Verify JWT access token and attach user to request
 */
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return sendError(res, {
        statusCode: 401,
        message: 'Access token is required. Use: Authorization: Bearer <token>',
      });
    }

    const token = authHeader.split(' ')[1];
    const decoded = verifyAccessToken(token);

    // Fetch fresh user from DB to check is_active / role changes
    const result = await query(
      'SELECT id, name, email, role, is_active FROM users WHERE id = $1',
      [decoded.id]
    );

    if (result.rows.length === 0) {
      return sendError(res, { statusCode: 401, message: 'User not found' });
    }

    const user = result.rows[0];
    if (!user.is_active) {
      return sendError(res, { statusCode: 401, message: 'Account has been deactivated' });
    }

    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return sendError(res, { statusCode: 401, message: 'Access token has expired' });
    }
    if (err.name === 'JsonWebTokenError') {
      return sendError(res, { statusCode: 401, message: 'Invalid access token' });
    }
    next(err);
  }
};

/**
 * Middleware factory: Restrict to specific roles
 * Usage: authorize('admin') or authorize('admin', 'user')
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return sendError(res, { statusCode: 401, message: 'Authentication required' });
    }
    if (!roles.includes(req.user.role)) {
      return sendError(res, {
        statusCode: 403,
        message: `Access denied. Required role: ${roles.join(' or ')}`,
      });
    }
    next();
  };
};

/**
 * Middleware: User can only access their own resources (or admin can access all)
 */
const authorizeOwnerOrAdmin = (resourceUserIdField = 'user_id') => {
  return (req, res, next) => {
    if (req.user.role === 'admin') return next();

    const resourceUserId = req.resource?.[resourceUserIdField];
    if (resourceUserId && resourceUserId !== req.user.id) {
      return sendError(res, { statusCode: 403, message: 'Access denied. You can only manage your own resources.' });
    }
    next();
  };
};

module.exports = { authenticate, authorize, authorizeOwnerOrAdmin };

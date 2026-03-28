const logger = require('../utils/logger');

/**
 * 404 handler — must be registered AFTER all routes
 */
const notFound = (req, res, next) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
};

/**
 * Global error handler — must be the LAST middleware (4 params)
 */
const errorHandler = (err, req, res, next) => {
  logger.error(`${err.name}: ${err.message}`, { stack: err.stack, path: req.path });

  // PostgreSQL unique violation
  if (err.code === '23505') {
    const field = err.detail?.match(/\(([^)]+)\)/)?.[1] || 'field';
    return res.status(409).json({
      success: false,
      message: `A record with this ${field} already exists`,
    });
  }

  // PostgreSQL foreign key violation
  if (err.code === '23503') {
    return res.status(400).json({
      success: false,
      message: 'Referenced resource does not exist',
    });
  }

  // PostgreSQL connection error
  if (err.code === 'ECONNREFUSED' || err.code === '57P01') {
    return res.status(503).json({
      success: false,
      message: 'Database service unavailable',
    });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired token',
    });
  }

  // Validation error (express-validator)
  if (err.name === 'ValidationError') {
    return res.status(422).json({
      success: false,
      message: 'Validation failed',
      errors: err.errors,
    });
  }

  // SyntaxError (malformed JSON)
  if (err instanceof SyntaxError && err.status === 400) {
    return res.status(400).json({
      success: false,
      message: 'Invalid JSON in request body',
    });
  }

  // Default 500
  const statusCode = err.statusCode || err.status || 500;
  return res.status(statusCode).json({
    success: false,
    message: process.env.NODE_ENV === 'production'
      ? 'An internal server error occurred'
      : err.message || 'Internal server error',
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
  });
};

module.exports = { notFound, errorHandler };

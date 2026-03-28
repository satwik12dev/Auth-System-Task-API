const { validationResult, body, param, query } = require('express-validator');
const { sendError } = require('../utils/response');

/**
 * Run this after any chain of check() validators.
 * Returns 422 with all errors if validation fails.
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return sendError(res, {
      statusCode: 422,
      message: 'Validation failed',
      errors: errors.array().map((e) => ({ field: e.path, message: e.msg })),
    });
  }
  next();
};

// ─── Auth validators ──────────────────────────────────────────────────────────
const registerValidators = [
  body('name')
    .trim()
    .notEmpty().withMessage('Name is required')
    .isLength({ min: 2, max: 100 }).withMessage('Name must be 2–100 characters')
    .escape(),
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Must be a valid email')
    .normalizeEmail(),
  body('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .matches(/[A-Z]/).withMessage('Password must contain an uppercase letter')
    .matches(/[0-9]/).withMessage('Password must contain a number'),
  body('role')
    .optional()
    .isIn(['user', 'admin']).withMessage('Role must be user or admin'),
];

const loginValidators = [
  body('email')
    .trim().notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Must be a valid email')
    .normalizeEmail(),
  body('password')
    .notEmpty().withMessage('Password is required'),
];

// ─── Task validators ──────────────────────────────────────────────────────────
const createTaskValidators = [
  body('title')
    .trim().notEmpty().withMessage('Title is required')
    .isLength({ min: 1, max: 200 }).withMessage('Title must be 1–200 characters')
    .escape(),
  body('description')
    .optional()
    .trim().isLength({ max: 2000 }).withMessage('Description must be ≤ 2000 characters')
    .escape(),
  body('status')
    .optional()
    .isIn(['pending', 'in_progress', 'completed', 'cancelled'])
    .withMessage('Status must be: pending, in_progress, completed, or cancelled'),
  body('priority')
    .optional()
    .isIn(['low', 'medium', 'high']).withMessage('Priority must be: low, medium, or high'),
  body('due_date')
    .optional({ nullable: true, checkFalsy: true })
    .isISO8601().withMessage('due_date must be a valid date (YYYY-MM-DD)'),
];

const updateTaskValidators = [
  body('title')
    .optional().trim()
    .isLength({ min: 1, max: 200 }).withMessage('Title must be 1–200 characters')
    .escape(),
  body('description')
    .optional({ nullable: true })
    .trim().isLength({ max: 2000 }).withMessage('Description ≤ 2000 characters')
    .escape(),
  body('status')
    .optional()
    .isIn(['pending', 'in_progress', 'completed', 'cancelled'])
    .withMessage('Invalid status'),
  body('priority')
    .optional()
    .isIn(['low', 'medium', 'high']).withMessage('Invalid priority'),
  body('due_date')
    .optional({ nullable: true, checkFalsy: true })
    .isISO8601().withMessage('due_date must be a valid date'),
];

const uuidParam = (name) => [
  param(name)
    .isUUID().withMessage(`${name} must be a valid UUID`),
];

const listQueryValidators = [
  query('page').optional().isInt({ min: 1 }).withMessage('page must be ≥ 1').toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('limit must be 1–100').toInt(),
  query('status').optional().isIn(['pending', 'in_progress', 'completed', 'cancelled']),
  query('priority').optional().isIn(['low', 'medium', 'high']),
  query('sort').optional().isIn(['created_at', 'updated_at', 'due_date', 'title', 'priority']),
  query('order').optional().isIn(['asc', 'desc']),
];

module.exports = {
  validate,
  registerValidators,
  loginValidators,
  createTaskValidators,
  updateTaskValidators,
  uuidParam,
  listQueryValidators,
};

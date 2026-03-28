const express = require('express');
const router = express.Router();
const { body } = require('express-validator');

const {
  getUsers, getUserById, updateUser, deleteUser, changePassword,
} = require('../../controllers/users.controller');
const { authenticate, authorize } = require('../../middleware/auth');
const { uuidParam, validate } = require('../../middleware/validate');

router.use(authenticate);

/**
 * @swagger
 * tags:
 *   name: Users
 *   description: User management — admin only (except self-service)
 */

/**
 * @swagger
 * /api/v1/users:
 *   get:
 *     summary: List all users (admin only)
 *     tags: [Users]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer }
 *       - in: query
 *         name: limit
 *         schema: { type: integer }
 *       - in: query
 *         name: role
 *         schema: { type: string, enum: [user, admin] }
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Paginated list of users
 *       403:
 *         description: Admin access required
 */
router.get('/', authorize('admin'), getUsers);

/**
 * @swagger
 * /api/v1/users/me/password:
 *   patch:
 *     summary: Change your own password
 *     tags: [Users]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [currentPassword, newPassword]
 *             properties:
 *               currentPassword: { type: string }
 *               newPassword:     { type: string, minLength: 8 }
 *     responses:
 *       200:
 *         description: Password changed
 *       401:
 *         description: Current password incorrect
 */
router.patch('/me/password', [
  body('currentPassword').notEmpty().withMessage('Current password required'),
  body('newPassword')
    .notEmpty().withMessage('New password required')
    .isLength({ min: 8 }).withMessage('New password must be ≥ 8 characters')
    .matches(/[A-Z]/).withMessage('Must contain uppercase letter')
    .matches(/[0-9]/).withMessage('Must contain a number'),
  validate,
], changePassword);

/**
 * @swagger
 * /api/v1/users/{id}:
 *   get:
 *     summary: Get user by ID (admin or self)
 *     tags: [Users]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: User data with task count
 *       403:
 *         description: Access denied
 *       404:
 *         description: User not found
 */
router.get('/:id', uuidParam('id'), validate, getUserById);

/**
 * @swagger
 * /api/v1/users/{id}:
 *   patch:
 *     summary: Update user role or status (admin only)
 *     tags: [Users]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:      { type: string }
 *               role:      { type: string, enum: [user, admin] }
 *               is_active: { type: boolean }
 *     responses:
 *       200:
 *         description: User updated
 *       403:
 *         description: Admin access required
 */
router.patch('/:id', authorize('admin'), uuidParam('id'), validate, updateUser);

/**
 * @swagger
 * /api/v1/users/{id}:
 *   delete:
 *     summary: Delete a user (admin only)
 *     tags: [Users]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: User deleted
 *       403:
 *         description: Admin access required
 */
router.delete('/:id', authorize('admin'), uuidParam('id'), validate, deleteUser);

module.exports = router;

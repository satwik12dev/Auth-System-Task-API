const express = require('express');
const router = express.Router();

const {
  getTasks, getTaskById, createTask, updateTask, deleteTask, getTaskStats,
} = require('../../controllers/tasks.controller');
const { authenticate, authorize } = require('../../middleware/auth');
const {
  createTaskValidators, updateTaskValidators, uuidParam, listQueryValidators, validate,
} = require('../../middleware/validate');

// All task routes require authentication
router.use(authenticate);

/**
 * @swagger
 * tags:
 *   name: Tasks
 *   description: Task CRUD — users manage own tasks, admins manage all
 */

/**
 * @swagger
 * /api/v1/tasks/stats:
 *   get:
 *     summary: Get task statistics (admin only)
 *     tags: [Tasks]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Statistics by status and priority
 *       403:
 *         description: Admin access required
 */
router.get('/stats', authorize('admin'), getTaskStats);

/**
 * @swagger
 * /api/v1/tasks:
 *   get:
 *     summary: List tasks (users see own; admins see all)
 *     tags: [Tasks]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 10, maximum: 100 }
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [pending, in_progress, completed, cancelled] }
 *       - in: query
 *         name: priority
 *         schema: { type: string, enum: [low, medium, high] }
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *         description: Search in title and description
 *       - in: query
 *         name: sort
 *         schema: { type: string, enum: [created_at, updated_at, due_date, title, priority] }
 *       - in: query
 *         name: order
 *         schema: { type: string, enum: [asc, desc] }
 *     responses:
 *       200:
 *         description: Paginated task list
 */
router.get('/', listQueryValidators, validate, getTasks);

/**
 * @swagger
 * /api/v1/tasks/{id}:
 *   get:
 *     summary: Get a single task by ID
 *     tags: [Tasks]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Task detail
 *       403:
 *         description: Access denied
 *       404:
 *         description: Task not found
 */
router.get('/:id', uuidParam('id'), validate, getTaskById);

/**
 * @swagger
 * /api/v1/tasks:
 *   post:
 *     summary: Create a new task
 *     tags: [Tasks]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title]
 *             properties:
 *               title:       { type: string, example: "Design API schema" }
 *               description: { type: string, example: "Create ERD and OpenAPI spec" }
 *               status:      { type: string, enum: [pending, in_progress, completed, cancelled] }
 *               priority:    { type: string, enum: [low, medium, high] }
 *               due_date:    { type: string, format: date, example: "2025-12-31" }
 *     responses:
 *       201:
 *         description: Task created
 *       422:
 *         description: Validation error
 */
router.post('/', createTaskValidators, validate, createTask);

/**
 * @swagger
 * /api/v1/tasks/{id}:
 *   patch:
 *     summary: Partially update a task
 *     tags: [Tasks]
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
 *               title:       { type: string }
 *               description: { type: string }
 *               status:      { type: string, enum: [pending, in_progress, completed, cancelled] }
 *               priority:    { type: string, enum: [low, medium, high] }
 *               due_date:    { type: string, format: date }
 *     responses:
 *       200:
 *         description: Task updated
 *       403:
 *         description: Access denied
 *       404:
 *         description: Task not found
 */
router.patch('/:id', [...uuidParam('id'), ...updateTaskValidators], validate, updateTask);

/**
 * @swagger
 * /api/v1/tasks/{id}:
 *   delete:
 *     summary: Delete a task
 *     tags: [Tasks]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Task deleted
 *       403:
 *         description: Access denied
 *       404:
 *         description: Task not found
 */
router.delete('/:id', uuidParam('id'), validate, deleteTask);

module.exports = router;

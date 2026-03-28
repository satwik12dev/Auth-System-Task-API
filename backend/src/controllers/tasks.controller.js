const { query } = require('../config/db');
const { sendSuccess, sendError, sendPaginated } = require('../utils/response');

/**
 * GET /api/v1/tasks
 * List tasks with filtering, sorting, and pagination
 * - Users see only their tasks
 * - Admins see all tasks
 */
const getTasks = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 10,
      status,
      priority,
      search,
      sort = 'created_at',
      order = 'desc',
    } = req.query;

    const offset = (page - 1) * limit;
    const isAdmin = req.user.role === 'admin';

    const conditions = [];
    const params = [];
    let paramIdx = 1;

    if (!isAdmin) {
      conditions.push(`t.user_id = $${paramIdx++}`);
      params.push(req.user.id);
    }

    if (status) {
      conditions.push(`t.status = $${paramIdx++}`);
      params.push(status);
    }

    if (priority) {
      conditions.push(`t.priority = $${paramIdx++}`);
      params.push(priority);
    }

    if (search) {
      conditions.push(`(t.title ILIKE $${paramIdx} OR t.description ILIKE $${paramIdx})`);
      params.push(`%${search}%`);
      paramIdx++;
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    // Whitelist sort columns to prevent injection
    const allowedSorts = ['created_at', 'updated_at', 'due_date', 'title', 'priority'];
    const safeSort = allowedSorts.includes(sort) ? sort : 'created_at';
    const safeOrder = order === 'asc' ? 'ASC' : 'DESC';

    const countResult = await query(
      `SELECT COUNT(*) FROM tasks t ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].count);

    const dataResult = await query(
      `SELECT
         t.id, t.title, t.description, t.status, t.priority,
         t.due_date, t.user_id, t.created_at, t.updated_at,
         u.name AS user_name, u.email AS user_email
       FROM tasks t
       JOIN users u ON t.user_id = u.id
       ${whereClause}
       ORDER BY t.${safeSort} ${safeOrder}
       LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`,
      [...params, limit, offset]
    );

    return sendPaginated(res, {
      data: dataResult.rows,
      total,
      page,
      limit,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/v1/tasks/:id
 */
const getTaskById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const isAdmin = req.user.role === 'admin';

    const result = await query(
      `SELECT t.*, u.name AS user_name, u.email AS user_email
       FROM tasks t JOIN users u ON t.user_id = u.id
       WHERE t.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return sendError(res, { statusCode: 404, message: 'Task not found' });
    }

    const task = result.rows[0];

    // Non-admins can only view their own tasks
    if (!isAdmin && task.user_id !== req.user.id) {
      return sendError(res, { statusCode: 403, message: 'Access denied' });
    }

    return sendSuccess(res, { message: 'Task retrieved', data: { task } });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/v1/tasks
 */
const createTask = async (req, res, next) => {
  try {
    const { title, description, status = 'pending', priority = 'medium', due_date } = req.body;

    const result = await query(
      `INSERT INTO tasks (title, description, status, priority, due_date, user_id)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [title, description || null, status, priority, due_date || null, req.user.id]
    );

    return sendSuccess(res, {
      statusCode: 201,
      message: 'Task created successfully',
      data: { task: result.rows[0] },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/v1/tasks/:id
 * Partial update — only provided fields are updated
 */
const updateTask = async (req, res, next) => {
  try {
    const { id } = req.params;
    const isAdmin = req.user.role === 'admin';

    // Fetch existing task
    const existing = await query('SELECT * FROM tasks WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return sendError(res, { statusCode: 404, message: 'Task not found' });
    }

    const task = existing.rows[0];
    if (!isAdmin && task.user_id !== req.user.id) {
      return sendError(res, { statusCode: 403, message: 'Access denied' });
    }

    const { title, description, status, priority, due_date } = req.body;

    const updates = [];
    const params = [];
    let idx = 1;

    if (title !== undefined) { updates.push(`title = $${idx++}`); params.push(title); }
    if (description !== undefined) { updates.push(`description = $${idx++}`); params.push(description); }
    if (status !== undefined) { updates.push(`status = $${idx++}`); params.push(status); }
    if (priority !== undefined) { updates.push(`priority = $${idx++}`); params.push(priority); }
    if (due_date !== undefined) { updates.push(`due_date = $${idx++}`); params.push(due_date || null); }

    if (updates.length === 0) {
      return sendError(res, { statusCode: 400, message: 'No fields to update' });
    }

    params.push(id);
    const result = await query(
      `UPDATE tasks SET ${updates.join(', ')} WHERE id = $${idx} RETURNING *`,
      params
    );

    return sendSuccess(res, {
      message: 'Task updated successfully',
      data: { task: result.rows[0] },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /api/v1/tasks/:id
 */
const deleteTask = async (req, res, next) => {
  try {
    const { id } = req.params;
    const isAdmin = req.user.role === 'admin';

    const existing = await query('SELECT * FROM tasks WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return sendError(res, { statusCode: 404, message: 'Task not found' });
    }

    const task = existing.rows[0];
    if (!isAdmin && task.user_id !== req.user.id) {
      return sendError(res, { statusCode: 403, message: 'Access denied' });
    }

    await query('DELETE FROM tasks WHERE id = $1', [id]);

    return sendSuccess(res, { message: 'Task deleted successfully' });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/v1/tasks/stats  (admin only)
 */
const getTaskStats = async (req, res, next) => {
  try {
    const stats = await query(`
      SELECT
        COUNT(*) FILTER (WHERE status = 'pending')     AS pending,
        COUNT(*) FILTER (WHERE status = 'in_progress') AS in_progress,
        COUNT(*) FILTER (WHERE status = 'completed')   AS completed,
        COUNT(*) FILTER (WHERE status = 'cancelled')   AS cancelled,
        COUNT(*)                                        AS total,
        COUNT(*) FILTER (WHERE priority = 'high')      AS high_priority,
        COUNT(DISTINCT user_id)                         AS total_users_with_tasks
      FROM tasks
    `);

    return sendSuccess(res, {
      message: 'Task statistics retrieved',
      data: { stats: stats.rows[0] },
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { getTasks, getTaskById, createTask, updateTask, deleteTask, getTaskStats };

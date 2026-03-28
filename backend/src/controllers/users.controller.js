const bcrypt = require('bcryptjs');
const { query } = require('../config/db');
const { sendSuccess, sendError, sendPaginated } = require('../utils/response');

/**
 * GET /api/v1/users  (admin only)
 */
const getUsers = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, role, search } = req.query;
    const offset = (page - 1) * limit;

    const conditions = [];
    const params = [];
    let idx = 1;

    if (role) {
      conditions.push(`role = $${idx++}`);
      params.push(role);
    }
    if (search) {
      conditions.push(`(name ILIKE $${idx} OR email ILIKE $${idx})`);
      params.push(`%${search}%`);
      idx++;
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const countResult = await query(`SELECT COUNT(*) FROM users ${where}`, params);
    const total = parseInt(countResult.rows[0].count);

    const dataResult = await query(
      `SELECT id, name, email, role, is_active, created_at, updated_at
       FROM users ${where}
       ORDER BY created_at DESC
       LIMIT $${idx} OFFSET $${idx + 1}`,
      [...params, limit, offset]
    );

    return sendPaginated(res, { data: dataResult.rows, total, page, limit });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/v1/users/:id
 * Admin can get any user; regular users can only get themselves
 */
const getUserById = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (req.user.role !== 'admin' && req.user.id !== id) {
      return sendError(res, { statusCode: 403, message: 'Access denied' });
    }

    const result = await query(
      `SELECT u.id, u.name, u.email, u.role, u.is_active, u.created_at, u.updated_at,
              COUNT(t.id) AS task_count
       FROM users u
       LEFT JOIN tasks t ON t.user_id = u.id
       WHERE u.id = $1
       GROUP BY u.id`,
      [id]
    );

    if (result.rows.length === 0) {
      return sendError(res, { statusCode: 404, message: 'User not found' });
    }

    return sendSuccess(res, { message: 'User retrieved', data: { user: result.rows[0] } });
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/v1/users/:id  (admin only — update role / active status)
 */
const updateUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { role, is_active, name } = req.body;

    const existing = await query('SELECT id FROM users WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return sendError(res, { statusCode: 404, message: 'User not found' });
    }

    // Prevent admin from deactivating themselves
    if (id === req.user.id && is_active === false) {
      return sendError(res, { statusCode: 400, message: 'You cannot deactivate your own account' });
    }

    const updates = [];
    const params = [];
    let idx = 1;

    if (name !== undefined) { updates.push(`name = $${idx++}`); params.push(name); }
    if (role !== undefined) { updates.push(`role = $${idx++}`); params.push(role); }
    if (is_active !== undefined) { updates.push(`is_active = $${idx++}`); params.push(is_active); }

    if (updates.length === 0) {
      return sendError(res, { statusCode: 400, message: 'No fields to update' });
    }

    params.push(id);
    const result = await query(
      `UPDATE users SET ${updates.join(', ')} WHERE id = $${idx}
       RETURNING id, name, email, role, is_active, updated_at`,
      params
    );

    return sendSuccess(res, {
      message: 'User updated successfully',
      data: { user: result.rows[0] },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /api/v1/users/:id  (admin only)
 */
const deleteUser = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (id === req.user.id) {
      return sendError(res, { statusCode: 400, message: 'You cannot delete your own account' });
    }

    const existing = await query('SELECT id FROM users WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return sendError(res, { statusCode: 404, message: 'User not found' });
    }

    await query('DELETE FROM users WHERE id = $1', [id]);

    return sendSuccess(res, { message: 'User deleted successfully' });
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/v1/users/me/password
 * Change own password
 */
const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const result = await query('SELECT password FROM users WHERE id = $1', [req.user.id]);
    const user = result.rows[0];

    const valid = await bcrypt.compare(currentPassword, user.password);
    if (!valid) {
      return sendError(res, { statusCode: 401, message: 'Current password is incorrect' });
    }

    const hashed = await bcrypt.hash(newPassword, 12);
    await query('UPDATE users SET password = $1 WHERE id = $2', [hashed, req.user.id]);

    // Revoke all refresh tokens for this user (force re-login everywhere)
    await query('DELETE FROM refresh_tokens WHERE user_id = $1', [req.user.id]);

    return sendSuccess(res, { message: 'Password changed successfully. Please log in again.' });
  } catch (err) {
    next(err);
  }
};

module.exports = { getUsers, getUserById, updateUser, deleteUser, changePassword };

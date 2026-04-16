const bcrypt = require('bcryptjs');
const { query } = require('../config/db');
const { sendSuccess, sendError, sendPaginated } = require('../utils/response');

/* ================= GET USERS ================= */
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

    const countResult = await query(
      `SELECT COUNT(*) FROM users ${where}`,
      params
    );

    const total = parseInt(countResult.rows[0].count);

    const dataResult = await query(
      `SELECT id, name, email, role, is_active, created_at, updated_at
       FROM users ${where}
       ORDER BY created_at DESC
       LIMIT $${idx} OFFSET $${idx + 1}`,
      [...params, limit, offset]
    );

    const statsResult = await query(`
      SELECT 
        COUNT(*) FILTER (WHERE is_active = true) AS active,
        COUNT(*) FILTER (WHERE is_active = false) AS inactive
      FROM users
    `);

    return sendPaginated(res, {
      data: dataResult.rows,
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      activeUsers: parseInt(statsResult.rows[0].active),
      inactiveUsers: parseInt(statsResult.rows[0].inactive)
    });

  } catch (err) {
    next(err);
  }
};

/* ================= GET USER BY ID ================= */
const getUserById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const result = await query(
      `SELECT id, name, email, role, is_active FROM users WHERE id = $1`,
      [id]
    );

    if (!result.rows.length) {
      return sendError(res, "User not found", 404);
    }

    return sendSuccess(res, result.rows[0]);

  } catch (err) {
    next(err);
  }
};

/* ================= UPDATE USER ================= */
const updateUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, role, is_active } = req.body;

    const result = await query(
      `UPDATE users 
       SET name = COALESCE($1, name),
           role = COALESCE($2, role),
           is_active = COALESCE($3, is_active)
       WHERE id = $4
       RETURNING *`,
      [name, role, is_active, id]
    );

    return sendSuccess(res, result.rows[0], "User updated");

  } catch (err) {
    next(err);
  }
};

/* ================= DELETE USER ================= */
const deleteUser = async (req, res, next) => {
  try {
    const { id } = req.params;

    await query(`DELETE FROM users WHERE id = $1`, [id]);

    return sendSuccess(res, null, "User deleted");

  } catch (err) {
    next(err);
  }
};

/* ================= CHANGE PASSWORD ================= */
const changePassword = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { currentPassword, newPassword } = req.body;

    const result = await query(`SELECT password FROM users WHERE id = $1`, [userId]);

    const isMatch = await bcrypt.compare(currentPassword, result.rows[0].password);

    if (!isMatch) {
      return sendError(res, "Incorrect current password", 401);
    }

    const hashed = await bcrypt.hash(newPassword, 10);

    await query(`UPDATE users SET password = $1 WHERE id = $2`, [hashed, userId]);

    return sendSuccess(res, null, "Password changed");

  } catch (err) {
    next(err);
  }
};

/* ================= EXPORT ================= */
module.exports = {
  getUsers,
  getUserById,
  updateUser,
  deleteUser,
  changePassword
};
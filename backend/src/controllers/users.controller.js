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

    // 🔹 Filter by role
    if (role) {
      conditions.push(`role = $${idx++}`);
      params.push(role);
    }

    // 🔹 Search by name/email
    if (search) {
      conditions.push(`(name ILIKE $${idx} OR email ILIKE $${idx})`);
      params.push(`%${search}%`);
      idx++;
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    // 🔹 Total users count (with filters)
    const countResult = await query(
      `SELECT COUNT(*) FROM users ${where}`,
      params
    );
    const total = parseInt(countResult.rows[0].count);

    // 🔹 Get paginated users
    const dataResult = await query(
      `SELECT id, name, email, role, is_active, created_at, updated_at
       FROM users ${where}
       ORDER BY created_at DESC
       LIMIT $${idx} OFFSET $${idx + 1}`,
      [...params, limit, offset]
    );

    // 🔥 🔹 Active / Inactive stats (optimized query)
    const statsResult = await query(`
      SELECT 
        COUNT(*) FILTER (WHERE is_active = true) AS active,
        COUNT(*) FILTER (WHERE is_active = false) AS inactive
      FROM users
    `);

    const activeUsers = parseInt(statsResult.rows[0].active);
    const inactiveUsers = parseInt(statsResult.rows[0].inactive);

    // 🔹 Final response
    return sendPaginated(res, {
      data: dataResult.rows,
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      activeUsers,
      inactiveUsers
    });

  } catch (err) {
    next(err);
  }
};

module.exports = { getUsers };
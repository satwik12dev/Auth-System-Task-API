/**
 * Standardised API response helpers
 * All responses follow: { success, message, data?, meta?, errors? }
 */

const sendSuccess = (res, { statusCode = 200, message = 'Success', data = null, meta = null }) => {
  const body = { success: true, message };
  if (data !== null) body.data = data;
  if (meta !== null) body.meta = meta;
  return res.status(statusCode).json(body);
};

const sendError = (res, { statusCode = 500, message = 'Internal server error', errors = null }) => {
  const body = { success: false, message };
  if (errors) body.errors = errors;
  return res.status(statusCode).json(body);
};

const sendPaginated = (res, { data, total, page, limit }) => {
  return res.status(200).json({
    success: true,
    data,
    meta: {
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(total / limit),
    },
  });
};

module.exports = { sendSuccess, sendError, sendPaginated };

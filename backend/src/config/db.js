const { Pool } = require('pg');
const logger = require('../utils/logger');

// ✅ Use SSL ONLY if explicitly enabled
const useSSL = process.env.DB_SSL === 'true';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// Handle unexpected errors
pool.on('error', (err) => {
  logger.error('Unexpected PostgreSQL pool error', err);
});

/**
 * Execute query
 */
const query = async (text, params) => {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    logger.debug(`Query executed in ${duration}ms`);
    return res;
  } catch (err) {
    logger.error(`Query error: ${err.message}`);
    throw err;
  }
};

/**
 * Get client (for transactions)
 */
const getClient = () => pool.connect();

/**
 * Test DB connection
 */
const testConnection = async () => {
  try {
    const res = await pool.query('SELECT NOW()');
    logger.info(`✅ PostgreSQL connected — ${res.rows[0].now}`);
  } catch (err) {
    logger.error('❌ PostgreSQL connection failed:', err.message);
    throw err;
  }
};

module.exports = {
  query,
  getClient,
  pool,
  testConnection,
};
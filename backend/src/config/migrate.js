require('dotenv').config({ path: '../../.env' });
const { query, pool } = require('./db');
const logger = require('../utils/logger');

const migrate = async () => {
  logger.info('Running database migrations...');

  // Enable UUID extension
  await query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`);

  // Users table
  await query(`
    CREATE TABLE IF NOT EXISTS users (
      id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      name        VARCHAR(100) NOT NULL,
      email       VARCHAR(255) UNIQUE NOT NULL,
      password    VARCHAR(255) NOT NULL,
      role        VARCHAR(20) NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
      is_active   BOOLEAN NOT NULL DEFAULT true,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  // Tasks table
  await query(`
    CREATE TABLE IF NOT EXISTS tasks (
      id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      title       VARCHAR(200) NOT NULL,
      description TEXT,
      status      VARCHAR(20) NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
      priority    VARCHAR(10) NOT NULL DEFAULT 'medium'
                    CHECK (priority IN ('low', 'medium', 'high')),
      due_date    DATE,
      user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  // Refresh tokens table (for token rotation / logout)
  await query(`
    CREATE TABLE IF NOT EXISTS refresh_tokens (
      id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token       VARCHAR(512) NOT NULL UNIQUE,
      expires_at  TIMESTAMPTZ NOT NULL,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  // Auto-update updated_at trigger
  await query(`
    CREATE OR REPLACE FUNCTION update_updated_at_column()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
    END;
    $$ language 'plpgsql';
  `);

  await query(`
    DROP TRIGGER IF EXISTS update_users_updated_at ON users;
    CREATE TRIGGER update_users_updated_at
      BEFORE UPDATE ON users
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  `);

  await query(`
    DROP TRIGGER IF EXISTS update_tasks_updated_at ON tasks;
    CREATE TRIGGER update_tasks_updated_at
      BEFORE UPDATE ON tasks
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  `);

  // Indexes for performance
  await query(`CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks(user_id);`);
  await query(`CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);`);
  await query(`CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority);`);
  await query(`CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);`);
  await query(`CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens(user_id);`);

  logger.info('✅ Migrations completed successfully');
  await pool.end();
};

migrate().catch((err) => {
  logger.error('Migration failed:', err);
  process.exit(1);
});

require('dotenv').config({ path: '../../.env' });
const bcrypt = require('bcryptjs');
const { query, pool } = require('./db');
const logger = require('../utils/logger');

const seed = async () => {
  logger.info('Seeding database with demo data...');

  // Create admin user
  const adminPassword = await bcrypt.hash('Admin@1234', 12);
  const adminRes = await query(
    `INSERT INTO users (name, email, password, role)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name
     RETURNING id, email`,
    ['Admin User', 'admin@example.com', adminPassword, 'admin']
  );
  const admin = adminRes.rows[0];
  logger.info(`Admin: ${admin.email}`);

  // Create regular user
  const userPassword = await bcrypt.hash('User@1234', 12);
  const userRes = await query(
    `INSERT INTO users (name, email, password, role)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name
     RETURNING id, email`,
    ['Jane Doe', 'jane@example.com', userPassword, 'user']
  );
  const user = userRes.rows[0];
  logger.info(`User: ${user.email}`);

  // Create demo tasks
  const tasks = [
    { title: 'Design database schema', description: 'Create ERD and write migration scripts', status: 'completed', priority: 'high', user_id: user.id },
    { title: 'Implement JWT authentication', description: 'Access + refresh token flow with rotation', status: 'completed', priority: 'high', user_id: user.id },
    { title: 'Build CRUD endpoints', description: 'Tasks API with filtering and pagination', status: 'in_progress', priority: 'high', user_id: user.id },
    { title: 'Write Swagger documentation', description: 'OpenAPI 3.0 spec for all endpoints', status: 'in_progress', priority: 'medium', user_id: user.id },
    { title: 'Build React frontend', description: 'Dashboard UI connecting to the API', status: 'pending', priority: 'medium', user_id: user.id },
    { title: 'Add input validation', description: 'express-validator rules for all routes', status: 'completed', priority: 'medium', user_id: admin.id },
    { title: 'Set up Docker deployment', description: 'docker-compose for postgres, redis, api', status: 'pending', priority: 'low', user_id: admin.id },
    { title: 'Configure rate limiting', description: 'Per-route limiters for auth endpoints', status: 'completed', priority: 'high', user_id: admin.id },
  ];

  for (const task of tasks) {
    await query(
      `INSERT INTO tasks (title, description, status, priority, user_id)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT DO NOTHING`,
      [task.title, task.description, task.status, task.priority, task.user_id]
    );
  }

  logger.info(`✅ Seeded ${tasks.length} tasks`);
  logger.info('\n─────────────────────────────────────────');
  logger.info('Demo credentials:');
  logger.info('  Admin → admin@example.com / Admin@1234');
  logger.info('  User  → jane@example.com  / User@1234');
  logger.info('─────────────────────────────────────────\n');

  await pool.end();
};

seed().catch((err) => {
  logger.error('Seed failed:', err);
  process.exit(1);
});

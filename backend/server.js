require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const swaggerUi = require('swagger-ui-express');
const xssClean = require('xss-clean');

const { swaggerSpec } = require('./src/config/swagger');
const { testConnection } = require('./src/config/db');
const { errorHandler, notFound } = require('./src/middleware/errorHandler');
const logger = require('./src/utils/logger');

// Routes
const authRoutes = require('./src/routes/v1/auth.routes');
const taskRoutes = require('./src/routes/v1/tasks.routes');
const userRoutes = require('./src/routes/v1/users.routes');

const app = express();
const PORT = process.env.PORT || 5000;

// ─── Security ─────────────────────────────────────
app.use(helmet({ contentSecurityPolicy: false }));
app.use(xssClean());

// ✅ FIXED CORS
app.use(cors({
  origin: '*', // 🔥 simplest fix
}));

// ─── Rate Limiting ───────────────────────────────
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
});
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
});
app.use(globalLimiter);

// ─── Body Parsing ────────────────────────────────
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true }));

// ─── Logging ─────────────────────────────────────
app.use(morgan('dev'));

// ─── Swagger ─────────────────────────────────────
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// ─── Health ──────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({ status: 'OK' });
});

// ─── Routes ──────────────────────────────────────
app.use('/api/v1/auth', authLimiter, authRoutes);
app.use('/api/v1/tasks', taskRoutes);
app.use('/api/v1/users', userRoutes);

// ─── Errors ──────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

// ─── Start ───────────────────────────────────────
const start = async () => {
  await testConnection();

  app.listen(PORT, () => {
    logger.info(`🚀 Server running on port ${PORT}`);
    logger.info(`📚 API Docs: http://localhost:${PORT}/api/docs`);
  });
};

start();

module.exports = app;
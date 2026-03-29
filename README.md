# ⬡ TaskAPI — Scalable REST API with Auth & RBAC

A production-grade REST API built with **Node.js + Express + PostgreSQL** featuring JWT authentication, role-based access control, full task CRUD, Swagger docs, and a React frontend.

---

## 📁 Project Structure

```
project/
├── backend/
│   ├── server.js                    # Entry point
│   ├── Dockerfile
│   ├── .env.example
│   └── src/
│       ├── config/
│       │   ├── db.js                # PostgreSQL pool
│       │   ├── migrate.js           # Schema migrations
│       │   ├── seed.js              # Demo data
│       │   └── swagger.js           # OpenAPI 3.0 config
│       ├── controllers/
│       │   ├── auth.controller.js   # Register, login, refresh, logout, me
│       │   ├── tasks.controller.js  # Full CRUD + stats
│       │   └── users.controller.js  # Admin user management
│       ├── middleware/
│       │   ├── auth.js              # JWT verify + RBAC
│       │   ├── validate.js          # express-validator rules
│       │   └── errorHandler.js      # Global error handler
│       ├── routes/v1/
│       │   ├── auth.routes.js
│       │   ├── tasks.routes.js
│       │   └── users.routes.js
│       └── utils/
│           ├── jwt.js               # Token generation & verification
│           ├── logger.js            # Winston logger
│           └── response.js          # Standardised response helpers
├── frontend/
│   └── index.html                   # Single-file React app (CDN)
├── docs/
│   └── TaskAPI.postman_collection.json
└── docker-compose.yml
```

---

## 🚀 Quick Start

### Option A — Docker (Recommended)

```bash
# Clone & start everything
git clone <your-repo-url>
cd project

# Set JWT secrets
export JWT_ACCESS_SECRET=$(node -e "console.log(require('crypto').randomBytes(64).toString('hex'))")
export JWT_REFRESH_SECRET=$(node -e "console.log(require('crypto').randomBytes(64).toString('hex'))")

docker-compose up --build
```

Services will be available at:
| Service  | URL |
|----------|-----|
| API      | http://localhost:5000 |
| Swagger  | http://localhost:5000/api/docs |
| Frontend | http://localhost:3000 |
| Health   | http://localhost:5000/health |

---

### Option B — Local Development

**Prerequisites:** Node.js ≥ 18, PostgreSQL 14+

```bash
# 1. Install dependencies
cd backend
npm install

# 2. Configure environment
cp .env.example .env
# Edit .env — set DB credentials and JWT secrets

# 3. Create database
createdb taskapi   # or use psql

# 4. Run migrations
node src/config/migrate.js

# 5. Seed demo data (optional)
node src/config/seed.js

# 6. Start dev server
npm run dev
```

**Frontend:** Open `frontend/index.html` in a browser (or serve with `npx serve frontend`).

---

## 🔐 Demo Credentials (after seeding)

| Role  | Email                | Password    |
|-------|----------------------|-------------|
| Admin | admin@example.com    | Admin@1234  |
| User  | jane@example.com     | User@1234   |

---

## 📌 API Reference

### Base URL: `http://localhost:5000/api/v1`

### Authentication Endpoints

| Method | Endpoint           | Auth | Description |
|--------|--------------------|------|-------------|
| POST   | `/auth/register`   | No   | Register new user |
| POST   | `/auth/login`      | No   | Login → access + refresh tokens |
| POST   | `/auth/refresh`    | No   | Rotate refresh token |
| POST   | `/auth/logout`     | Yes  | Revoke refresh token |
| GET    | `/auth/me`         | Yes  | Get current user profile |

### Task Endpoints

| Method | Endpoint           | Auth | Role  | Description |
|--------|--------------------|------|-------|-------------|
| GET    | `/tasks`           | Yes  | Any   | List tasks (users see own; admins see all) |
| GET    | `/tasks/stats`     | Yes  | Admin | Task statistics |
| GET    | `/tasks/:id`       | Yes  | Any   | Get single task |
| POST   | `/tasks`           | Yes  | Any   | Create task |
| PATCH  | `/tasks/:id`       | Yes  | Any   | Update task (own only; admin any) |
| DELETE | `/tasks/:id`       | Yes  | Any   | Delete task (own only; admin any) |

**Query params for GET /tasks:** `page`, `limit`, `status`, `priority`, `search`, `sort`, `order`

### User Endpoints (Admin Only)

| Method | Endpoint              | Auth | Role  | Description |
|--------|-----------------------|------|-------|-------------|
| GET    | `/users`              | Yes  | Admin | List all users |
| GET    | `/users/:id`          | Yes  | Any*  | Get user (self or admin) |
| PATCH  | `/users/:id`          | Yes  | Admin | Update role / status |
| DELETE | `/users/:id`          | Yes  | Admin | Delete user |
| PATCH  | `/users/me/password`  | Yes  | Any   | Change own password |

---

## 🔑 JWT Flow

```
1. Client registers / logs in → receives accessToken (15m) + refreshToken (7d)
2. Client sends: Authorization: Bearer <accessToken> on every protected request
3. When access token expires → POST /auth/refresh with refreshToken
4. Refresh token is rotated (old revoked, new issued) on each refresh
5. Logout → refresh token deleted from DB (invalidated server-side)
```


---
---
## 🐳 Docker Commands
```
1. docker-compose up --build
2. docker-compose down
3. docker-compose restart
```
---
## 🛡️ Security Measures

| Concern | Solution |
|---------|----------|
| Password storage | bcryptjs, cost factor 12 |
| Token strategy | Short-lived access (15m) + rotated refresh (7d) |
| Token storage | Refresh tokens stored in DB for revocation |
| Input sanitization | express-validator + xss-clean + body size limit |
| Rate limiting | 200 req/15min global; 20 req/15min on auth routes |
| Headers | Helmet (CSP, HSTS, X-Frame-Options, etc.) |
| SQL injection | Parameterised queries only (pg library) |
| User enumeration | Same error message for invalid email/password |
| Admin self-lock | Cannot deactivate/delete own account |
| Logging | Winston (errors to file, combined log, console) |

---

## 🗃️ Database Schema
Create the tables in postgreSQL using docker image by run the following command in the docker terminal 
"docker exec -it taskapi_postgres psql -U postgres -d taskapi"
```sql
-- USERS
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  role TEXT DEFAULT 'user',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- TASKS
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'pending',
  priority TEXT DEFAULT 'medium',
  due_date DATE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- REFRESH TOKENS (FIXED)
CREATE TABLE refresh_tokens (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  token TEXT NOT NULL,
  expires_at TIMESTAMP NOT NULL,   -- 🔥 IMPORTANT FIX
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Indexes:** `users.email`, `tasks.user_id`, `tasks.status`, `tasks.priority`, `refresh_tokens.user_id`

---

## 📚 API Documentation

- **Swagger UI:** http://localhost:5000/api/docs
- **Postman Collection:** `docs/TaskAPI.postman_collection.json`

Import the Postman collection, hit **Login** once, then all tokens auto-populate via test scripts.

---

## 📈 Scalability Notes

### Current Architecture
Single Node.js process + PostgreSQL + connection pooling (max 20 connections).

### Horizontal Scaling Path

**Load Balancing**
- Place a **NGINX** or **AWS ALB** in front of multiple API instances
- JWT is stateless — any instance can validate any token
- Sticky sessions NOT required

**Database Scaling**
- Add **PostgreSQL read replicas** for GET-heavy workloads
- Route writes to primary, reads to replicas via connection routing
- Use **PgBouncer** as a connection pooler to handle thousands of clients

**Caching (Redis)**
- Cache `GET /tasks` list responses with user-scoped keys (TTL: 60s)
- Cache user lookups from JWT verification (avoid a DB hit per request)
- Use Redis pub/sub for cache invalidation on write operations
- Session store for refresh tokens (faster than PostgreSQL for high-volume auth)

**Microservices Split**
```
API Gateway (NGINX / Kong)
├── Auth Service       → handles tokens, user identity
├── Task Service       → CRUD, filtering, notifications
├── User Service       → admin management, profiles
└── Notification Service → email, webhooks (event-driven)
```
Each service gets its own database and scales independently.

**Message Queues (RabbitMQ / SQS)**
- Background jobs: email notifications, report generation
- Decouple task creation from downstream side-effects

**Observability**
- Structured logs → **ELK Stack** / **CloudWatch**
- Metrics → **Prometheus + Grafana**
- Tracing → **OpenTelemetry + Jaeger**
- Alerts → **PagerDuty / OpsGenie**

**Deployment**
- **Docker + Kubernetes** for container orchestration
- **Helm charts** for environment-specific config
- **CI/CD** via GitHub Actions (lint → test → build → deploy)
- **Blue/Green deployments** for zero-downtime releases

---

## 🧪 Adding New Modules

The project is structured for easy extension:

```bash
# 1. Add a controller
touch src/controllers/products.controller.js

# 2. Add validators in middleware/validate.js

# 3. Create route file with Swagger annotations
touch src/routes/v1/products.routes.js

# 4. Register in server.js
app.use('/api/v1/products', productRoutes);

# 5. Add migration for new table
# Edit src/config/migrate.js
```

---

## 📝 Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 5000 | Server port |
| `NODE_ENV` | development | Environment |
| `DB_HOST` | localhost | PostgreSQL host |
| `DB_PORT` | 5432 | PostgreSQL port |
| `DB_NAME` | taskapi | Database name |
| `DB_USER` | postgres | Database user |
| `DB_PASSWORD` | — | Database password |
| `JWT_ACCESS_SECRET` | — | **Must be set in production** |
| `JWT_REFRESH_SECRET` | — | **Must be set in production** |
| `JWT_ACCESS_EXPIRES` | 15m | Access token TTL |
| `JWT_REFRESH_EXPIRES` | 7d | Refresh token TTL |
| `CLIENT_URL` | http://localhost:3000 | CORS allowed origin |
| `LOG_LEVEL` | info | Winston log level |

---

## ✅ Checklist

- [x] User registration & login with bcrypt password hashing
- [x] JWT access + refresh token flow with rotation
- [x] Role-based access control (user / admin)
- [x] Full CRUD for Tasks with filtering, sorting, pagination
- [x] API versioning (`/api/v1/`)
- [x] Global error handler with PostgreSQL error mapping
- [x] Input validation (express-validator) + XSS sanitization
- [x] Rate limiting (global + auth-route specific)
- [x] Security headers (Helmet)
- [x] Swagger / OpenAPI 3.0 documentation
- [x] Postman collection
- [x] PostgreSQL schema with indexes and triggers
- [x] Winston structured logging
- [x] Docker + docker-compose
- [x] React frontend with auth, dashboard, CRUD UI, API tester
- [x] README with setup + scalability notes

---

---
## Features Checklist

- [x] Auth (JWT)
- [x] RBAC
- [x] CRUD APIs
- [x] Swagger docs
- [x] Docker setup
- [x] PostgreSQL DB
- [x] Frontend UI
---

*Built in 3 days as a full-stack REST API assessment project.*
---
## Author

Built by Satwik 🚀
Full Stack Developer
---
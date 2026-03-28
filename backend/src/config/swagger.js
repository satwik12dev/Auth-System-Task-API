const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Task Manager REST API',
      version: '1.0.0',
      description: `
## Scalable REST API with Authentication & Role-Based Access Control

### Features
- JWT-based authentication (access + refresh tokens)
- Role-based access control (**user** / **admin**)
- Full CRUD for Tasks with filtering & pagination
- Input validation, rate limiting, error handling

### Authentication
1. Register a user via \`POST /api/v1/auth/register\`
2. Login via \`POST /api/v1/auth/login\` — get \`accessToken\`
3. Click **Authorize** and enter: \`Bearer <your_access_token>\`
      `,
      contact: { name: 'API Support', email: 'support@example.com' },
      license: { name: 'MIT' },
    },
    servers: [
      { url: 'http://localhost:5000', description: 'Development' },
      { url: 'https://api.yourdomain.com', description: 'Production' },
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            name: { type: 'string', example: 'Jane Doe' },
            email: { type: 'string', format: 'email', example: 'jane@example.com' },
            role: { type: 'string', enum: ['user', 'admin'], example: 'user' },
            is_active: { type: 'boolean' },
            created_at: { type: 'string', format: 'date-time' },
          },
        },
        Task: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            title: { type: 'string', example: 'Build REST API' },
            description: { type: 'string', example: 'Implement authentication and CRUD' },
            status: { type: 'string', enum: ['pending', 'in_progress', 'completed', 'cancelled'] },
            priority: { type: 'string', enum: ['low', 'medium', 'high'] },
            due_date: { type: 'string', format: 'date', example: '2025-12-31' },
            user_id: { type: 'string', format: 'uuid' },
            created_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time' },
          },
        },
        Error: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            message: { type: 'string', example: 'Error message' },
            errors: { type: 'array', items: { type: 'object' } },
          },
        },
        Success: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            message: { type: 'string' },
            data: { type: 'object' },
          },
        },
        Pagination: {
          type: 'object',
          properties: {
            total: { type: 'integer' },
            page: { type: 'integer' },
            limit: { type: 'integer' },
            totalPages: { type: 'integer' },
          },
        },
      },
    },
  },
  apis: ['./src/routes/v1/*.js'],
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = { swaggerSpec };

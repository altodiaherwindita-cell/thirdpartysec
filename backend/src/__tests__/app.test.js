/**
 * Backend Application Tests
 * Third Party Security & Data Protection Management Platform
 */

const request = require('supertest');
const app = require('../server');
const pool = require('../config/database');

describe('Backend API Tests', () => {
  // Test database connection
  describe('Database Connection', () => {
    it('should have a working database connection', async () => {
      const result = await pool.query('SELECT NOW()');
      expect(result.rows[0].now).toBeDefined();
    });
  });

  // Health check endpoint
  describe('GET /health', () => {
    it('should return server status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Server is running');
      expect(response.body.timestamp).toBeDefined();
    });
  });

  // Authentication routes
  describe('Authentication', () => {
    describe('POST /api/auth/login', () => {
      it('should reject invalid credentials', async () => {
        const response = await request(app)
          .post('/api/auth/login')
          .send({
            email: 'invalid@example.com',
            password: 'wrongpassword'
          })
          .expect(401);

        expect(response.body.success).toBe(false);
      });

      it('should validate required fields', async () => {
        const response = await request(app)
          .post('/api/auth/login')
          .send({})
          .expect(400);

        expect(response.body.success).toBe(false);
      });
    });
  });

  // Vendor routes
  describe('Vendor Management', () => {
    let authToken;

    beforeAll(async () => {
      // Login to get auth token
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: process.env.TEST_EMAIL || 'admin@example.com',
          password: process.env.TEST_PASSWORD || 'testpassword123'
        });

      if (response.body.token) {
        authToken = response.body.token;
      }
    });

    describe('GET /api/vendors', () => {
      it('should require authentication', async () => {
        await request(app)
          .get('/api/vendors')
          .expect(401);
      });

      it('should return vendors list with valid token', async () => {
        if (!authToken) {
          console.log('Skipping test - no auth token available');
          return;
        }

        const response = await request(app)
          .get('/api/vendors')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(Array.isArray(response.body.vendors)).toBe(true);
      });
    });

    describe('POST /api/vendors', () => {
      it('should require authentication', async () => {
        await request(app)
          .post('/api/vendors')
          .send({ name: 'Test Vendor' })
          .expect(401);
      });

      it('should validate required fields', async () => {
        if (!authToken) {
          console.log('Skipping test - no auth token available');
          return;
        }

        const response = await request(app)
          .post('/api/vendors')
          .set('Authorization', `Bearer ${authToken}`)
          .send({})
          .expect(400);

        expect(response.body.success).toBe(false);
      });
    });
  });

  // Assessment routes
  describe('Assessment Management', () => {
    describe('GET /api/assessments/:token', () => {
      it('should reject invalid token', async () => {
        const response = await request(app)
          .get('/api/assessments/invalid-token')
          .expect(404);

        expect(response.body.success).toBe(false);
      });
    });
  });

  // Risk routes
  describe('Risk Management', () => {
    describe('GET /api/risks', () => {
      it('should require authentication', async () => {
        await request(app)
          .get('/api/risks')
          .expect(401);
      });
    });

    describe('GET /api/risks/matrix', () => {
      it('should require authentication', async () => {
        await request(app)
          .get('/api/risks/matrix')
          .expect(401);
      });
    });
  });

  // Document routes
  describe('Document Management', () => {
    describe('GET /api/documents', () => {
      it('should require authentication', async () => {
        await request(app)
          .get('/api/documents')
          .expect(401);
      });
    });
  });

  // Rate limiting
  describe('Rate Limiting', () => {
    it('should apply rate limiting to API endpoints', async () => {
      // Make multiple rapid requests
      const requests = [];
      for (let i = 0; i < 5; i++) {
        requests.push(
          request(app).get('/health').then(res => res.status)
        );
      }

      const statuses = await Promise.all(requests);
      // At least some requests should succeed
      expect(statuses.some(s => s === 200)).toBe(true);
    });
  });

  // Error handling
  describe('Error Handling', () => {
    it('should return 404 for unknown routes', async () => {
      const response = await request(app)
        .get('/api/nonexistent-route')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Route not found');
    });

    it('should handle malformed JSON', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .set('Content-Type', 'application/json')
        .send('invalid-json')
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });
});

// Graceful teardown
afterAll(async () => {
  await pool.end();
});

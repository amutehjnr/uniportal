'use strict';
/**
 * Auth API Integration Tests
 * Run: npm test
 * Requires: MONGODB_URI_TEST set in .env
 */
const request = require('supertest');
const mongoose = require('mongoose');

// Mock env before requiring app modules
process.env.NODE_ENV = 'test';
process.env.MONGODB_URI = process.env.MONGODB_URI_TEST || 'mongodb://localhost/uniportal_test';
process.env.JWT_ACCESS_SECRET = 'test-access-secret-32chars-minimum';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-32chars-minimum';
process.env.JWT_ACCESS_EXPIRES_IN = '15m';
process.env.JWT_REFRESH_EXPIRES_IN = '7d';
process.env.COOKIE_SECRET = 'test-cookie-secret';

const app = require('../src/config/express');
const User = require('../src/models/User');

describe('Auth API', () => {
  const testUser = { firstName: 'Test', lastName: 'User', email: `test_${Date.now()}@example.com`, password: 'TestPass1' };

  beforeAll(async () => {
    await mongoose.connect(process.env.MONGODB_URI);
  });

  afterAll(async () => {
    await User.deleteMany({ email: testUser.email });
    await mongoose.disconnect();
  });

  describe('POST /api/v1/auth/register', () => {
    it('should register a new student', async () => {
      const res = await request(app).post('/api/v1/auth/register').send(testUser);
      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.email).toBe(testUser.email);
      expect(res.body.data.role).toBe('student');
    });

    it('should reject duplicate email', async () => {
      const res = await request(app).post('/api/v1/auth/register').send(testUser);
      expect(res.status).toBe(409);
    });

    it('should reject weak password', async () => {
      const res = await request(app).post('/api/v1/auth/register').send({ ...testUser, email: 'new@test.com', password: 'weak' });
      expect(res.status).toBe(422);
    });
  });

  describe('POST /api/v1/auth/login', () => {
    it('should login with valid credentials', async () => {
      const res = await request(app).post('/api/v1/auth/login').send({ email: testUser.email, password: testUser.password });
      expect(res.status).toBe(200);
      expect(res.body.data.accessToken).toBeDefined();
      expect(res.headers['set-cookie']).toBeDefined();
    });

    it('should reject invalid password', async () => {
      const res = await request(app).post('/api/v1/auth/login').send({ email: testUser.email, password: 'WrongPass1' });
      expect(res.status).toBe(401);
    });

    it('should reject non-existent email', async () => {
      const res = await request(app).post('/api/v1/auth/login').send({ email: 'nobody@example.com', password: 'Test1234' });
      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/v1/auth/me', () => {
    it('should return 401 without token', async () => {
      const res = await request(app).get('/api/v1/auth/me');
      expect(res.status).toBe(401);
    });

    it('should return user with valid token', async () => {
      const loginRes = await request(app).post('/api/v1/auth/login').send({ email: testUser.email, password: testUser.password });
      const { accessToken } = loginRes.body.data;
      const res = await request(app).get('/api/v1/auth/me').set('Authorization', `Bearer ${accessToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data.email).toBe(testUser.email);
    });
  });

  describe('Health Check', () => {
    it('GET /health should return ok', async () => {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
    });
  });
});

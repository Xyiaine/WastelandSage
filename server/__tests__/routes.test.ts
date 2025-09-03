
import request from 'supertest';
import express from 'express';
import { registerRoutes } from '../routes';
import { MemoryStorage } from '../storage';

describe('API Routes Integration Tests', () => {
  let app: express.Application;
  let storage: MemoryStorage;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    storage = new MemoryStorage();
    registerRoutes(app, storage);
  });

  describe('Sessions API', () => {
    test('POST /api/sessions creates new session', async () => {
      const sessionData = {
        name: 'Test Session',
        creatorMode: 'road',
        currentPhase: 0,
        duration: 0,
        aiMode: 'continuity'
      };

      const response = await request(app)
        .post('/api/sessions')
        .send(sessionData)
        .expect(201);

      expect(response.body).toMatchObject({
        name: 'Test Session',
        creatorMode: 'road'
      });
      expect(response.body.id).toBeDefined();
    });

    test('GET /api/sessions/:id retrieves session', async () => {
      // First create a session
      const createResponse = await request(app)
        .post('/api/sessions')
        .send({ name: 'Test', creatorMode: 'road', currentPhase: 0, duration: 0, aiMode: 'continuity' });

      const sessionId = createResponse.body.id;

      // Then retrieve it
      const response = await request(app)
        .get(`/api/sessions/${sessionId}`)
        .expect(200);

      expect(response.body.name).toBe('Test');
    });

    test('PATCH /api/sessions/:id updates session', async () => {
      // Create session
      const createResponse = await request(app)
        .post('/api/sessions')
        .send({ name: 'Test', creatorMode: 'road', currentPhase: 0, duration: 0, aiMode: 'continuity' });

      const sessionId = createResponse.body.id;

      // Update it
      await request(app)
        .patch(`/api/sessions/${sessionId}`)
        .send({ name: 'Updated Test' })
        .expect(200);

      // Verify update
      const getResponse = await request(app)
        .get(`/api/sessions/${sessionId}`);

      expect(getResponse.body.name).toBe('Updated Test');
    });
  });

  describe('Health Check', () => {
    test('GET /api/health returns healthy status', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect(200);

      expect(response.body.status).toBe('healthy');
    });
  });
});

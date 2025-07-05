import express from 'express';
import request from 'supertest';
import { 
  requestIdMiddleware, 
  requestBodyLogger, 
  createMorganMiddleware,
  errorRequestLogger, 
  requestCompletionLogger 
} from '../requestLogger';
import logger from '../../utils/logger';

// Mock winston logger
jest.mock('../../utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  warn: jest.fn()
}));

describe('Request Logger Integration', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    
    // Apply logging middleware in the correct order
    app.use(requestIdMiddleware);
    app.use(requestCompletionLogger);
    app.use(createMorganMiddleware());
    app.use(express.json());
    app.use(requestBodyLogger);
    
    // Test routes
    app.get('/api/test', (req, res) => {
      res.json({ 
        message: 'success', 
        requestId: req.requestId,
        timestamp: new Date().toISOString()
      });
    });

    app.post('/api/test', (req, res) => {
      res.json({ 
        message: 'data received', 
        body: req.body,
        requestId: req.requestId
      });
    });

    app.get('/api/error', (req, res, next) => {
      const error = new Error('Test error');
      next(error);
    });

    app.get('/health', (req, res) => {
      res.json({ status: 'ok', requestId: req.requestId });
    });

    // Error handling
    app.use(errorRequestLogger);
    app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
      res.status(500).json({ error: err.message, requestId: req.requestId });
    });
    
    // Clear all mocks
    jest.clearAllMocks();
  });

  describe('GET /api/test', () => {
    it('should log request and response with request ID', async () => {
      const response = await request(app)
        .get('/api/test')
        .expect(200);

      // Should have request ID in response
      expect(response.body.requestId).toBeDefined();
      expect(response.headers['x-request-id']).toBeDefined();
      expect(response.body.requestId).toBe(response.headers['x-request-id']);

      // Should have logged the request
      expect(logger.info).toHaveBeenCalledWith('HTTP Request', expect.objectContaining({
        requestId: response.body.requestId,
        method: 'GET',
        url: '/api/test',
        path: '/api/test'
      }));

      // Should have logged the completion
      expect(logger.info).toHaveBeenCalledWith('HTTP Request Completed', expect.objectContaining({
        requestId: response.body.requestId,
        method: 'GET',
        url: '/api/test',
        statusCode: 200,
        performance: expect.objectContaining({
          duration: expect.any(Number)
        })
      }));
    });
  });

  describe('POST /api/test', () => {
    it('should log request body while filtering sensitive data', async () => {
      const testData = {
        username: 'testuser',
        password: 'secret123',
        apiKey: 'key123',
        normalField: 'normalValue'
      };

      const response = await request(app)
        .post('/api/test')
        .send(testData)
        .expect(200);

      // Should have logged the request with filtered body
      expect(logger.info).toHaveBeenCalledWith('HTTP Request', expect.objectContaining({
        requestId: response.body.requestId,
        method: 'POST',
        url: '/api/test',
        body: {
          username: 'testuser',
          password: '[FILTERED]',
          apiKey: '[FILTERED]',
          normalField: 'normalValue'
        }
      }));
    });
  });

  describe('GET /health', () => {
    it('should handle health check requests normally', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body.status).toBe('ok');
      expect(response.body.requestId).toBeDefined();
      
      // Should still log health checks (they're not filtered in our simple implementation)
      expect(logger.info).toHaveBeenCalledWith('HTTP Request', expect.objectContaining({
        path: '/health'
      }));
    });
  });

  describe('Error handling', () => {
    it('should log errors with request context', async () => {
      const response = await request(app)
        .get('/api/error')
        .expect(500);

      expect(response.body.error).toBe('Test error');
      expect(response.body.requestId).toBeDefined();

      // Should have logged the error
      expect(logger.error).toHaveBeenCalledWith('HTTP Request Error', expect.objectContaining({
        requestId: response.body.requestId,
        error: expect.objectContaining({
          name: 'Error',
          message: 'Test error'
        }),
        request: expect.objectContaining({
          method: 'GET',
          url: '/api/error'
        })
      }));
    });
  });

  describe('Performance timing', () => {
    it('should track request performance timing', async () => {
      const start = Date.now();
      
      const response = await request(app)
        .get('/api/test')
        .expect(200);

      const end = Date.now();
      const actualDuration = end - start;

      // Find the completion log
      const completionLog = (logger.info as jest.Mock).mock.calls.find(call => 
        call[0] === 'HTTP Request Completed'
      );

      expect(completionLog).toBeDefined();
      expect(completionLog[1].performance.duration).toBeGreaterThan(0);
      expect(completionLog[1].performance.duration).toBeLessThan(actualDuration + 100); // Allow some margin
    });
  });
});
import { Request, Response, NextFunction } from 'express';
import { 
  requestIdMiddleware, 
  requestBodyLogger, 
  errorRequestLogger 
} from '../requestLogger';
import logger from '../../utils/logger';

// Mock winston logger
jest.mock('../../utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  warn: jest.fn()
}));

describe('Request Logger Middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let nextFunction: NextFunction;

  beforeEach(() => {
    mockRequest = {
      method: 'GET',
      url: '/api/test',
      path: '/api/test',
      query: {},
      headers: { 'user-agent': 'test-agent' },
      ip: '127.0.0.1',
      connection: { remoteAddress: '127.0.0.1' },
      get: jest.fn(),
      body: { test: 'data' }
    };

    mockResponse = {
      setHeader: jest.fn(),
      getHeader: jest.fn(),
      getHeaders: jest.fn(() => ({})),
      on: jest.fn(),
      send: jest.fn(),
      json: jest.fn(),
      statusCode: 200
    };

    nextFunction = jest.fn();
    
    // Clear all mocks
    jest.clearAllMocks();
  });

  describe('requestIdMiddleware', () => {
    it('should generate and set request ID', () => {
      requestIdMiddleware(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(mockRequest.requestId).toBeDefined();
      expect(mockRequest.requestId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
      expect(mockResponse.setHeader).toHaveBeenCalledWith('X-Request-ID', mockRequest.requestId);
      expect(mockRequest.startTime).toBeDefined();
      expect(nextFunction).toHaveBeenCalled();
    });
  });

  describe('requestBodyLogger', () => {
    it('should log request details for API routes', () => {
      mockRequest.requestId = 'test-request-id';
      mockRequest.walletAddress = 'test-wallet';

      requestBodyLogger(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(logger.info).toHaveBeenCalledWith('HTTP Request', expect.objectContaining({
        requestId: 'test-request-id',
        method: 'GET',
        url: '/api/test',
        path: '/api/test',
        walletAddress: 'test-wallet'
      }));
      expect(nextFunction).toHaveBeenCalled();
    });

    it('should skip logging if no request ID', () => {
      requestBodyLogger(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(logger.info).not.toHaveBeenCalled();
      expect(nextFunction).toHaveBeenCalled();
    });

    it('should filter sensitive data from request body', () => {
      mockRequest.requestId = 'test-request-id';
      mockRequest.body = {
        username: 'user',
        password: 'secret123',
        apiKey: 'key123',
        normalField: 'value'
      };

      requestBodyLogger(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(logger.info).toHaveBeenCalledWith('HTTP Request', expect.objectContaining({
        body: {
          username: 'user',
          password: '[FILTERED]',
          apiKey: '[FILTERED]',
          normalField: 'value'
        }
      }));
    });
  });

  describe('errorRequestLogger', () => {
    it('should log error details with request context', () => {
      const error = new Error('Test error');
      mockRequest.requestId = 'test-request-id';
      mockRequest.walletAddress = 'test-wallet';

      errorRequestLogger(error, mockRequest as Request, mockResponse as Response, nextFunction);

      expect(logger.error).toHaveBeenCalledWith('HTTP Request Error', expect.objectContaining({
        requestId: 'test-request-id',
        error: {
          name: 'Error',
          message: 'Test error',
          stack: error.stack
        },
        request: expect.objectContaining({
          method: 'GET',
          url: '/api/test',
          walletAddress: 'test-wallet'
        })
      }));
      expect(nextFunction).toHaveBeenCalledWith(error);
    });

    it('should skip logging if no request ID', () => {
      const error = new Error('Test error');

      errorRequestLogger(error, mockRequest as Request, mockResponse as Response, nextFunction);

      expect(logger.error).not.toHaveBeenCalled();
      expect(nextFunction).toHaveBeenCalledWith(error);
    });
  });
});
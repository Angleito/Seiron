/**
 * Chat Sessions API Tests
 * Automated tests for chat session endpoints
 */

import { createMocks } from 'node-mocks-http';
import type { NextApiRequest, NextApiResponse } from 'next';

// Mock environment variables
process.env.OPENAI_API_KEY = 'test-key';
process.env.NEXT_PUBLIC_BACKEND_URL = 'http://localhost:3000';

describe('Chat Sessions API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/chat/sessions', () => {
    it('should return 200 with sessions array', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
        headers: {
          'content-type': 'application/json',
        },
      });

      // Import handler dynamically to avoid module loading issues
      const handler = await import('../../api/chat/sessions');
      
      // Mock the response
      const mockSessions = [
        { id: '1', title: 'Session 1', createdAt: new Date().toISOString() },
        { id: '2', title: 'Session 2', createdAt: new Date().toISOString() },
      ];

      // Override the handler implementation for testing
      jest.spyOn(global, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => ({ sessions: mockSessions }),
      } as Response);

      await handler.default(req, res);

      expect(res._getStatusCode()).toBe(200);
      const jsonData = JSON.parse(res._getData());
      expect(jsonData).toHaveProperty('sessions');
      expect(Array.isArray(jsonData.sessions)).toBe(true);
    });

    it('should handle 401 unauthorized gracefully', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
      });

      const handler = await import('../../api/chat/sessions');
      
      jest.spyOn(global, 'fetch').mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ error: 'Unauthorized' }),
      } as Response);

      await handler.default(req, res);

      expect(res._getStatusCode()).toBe(401);
    });

    it('should handle network errors', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
      });

      const handler = await import('../../api/chat/sessions');
      
      jest.spyOn(global, 'fetch').mockRejectedValueOnce(new Error('Network error'));

      await handler.default(req, res);

      expect(res._getStatusCode()).toBe(500);
      const jsonData = JSON.parse(res._getData());
      expect(jsonData).toHaveProperty('error');
    });
  });

  describe('POST /api/chat/sessions', () => {
    it('should create a new session', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: {
          title: 'New Session',
          metadata: { test: true },
        },
      });

      const handler = await import('../../api/chat/sessions');
      
      const mockSession = {
        id: 'new-session-id',
        title: 'New Session',
        createdAt: new Date().toISOString(),
      };

      jest.spyOn(global, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => mockSession,
      } as Response);

      await handler.default(req, res);

      expect(res._getStatusCode()).toBe(201);
      const jsonData = JSON.parse(res._getData());
      expect(jsonData).toHaveProperty('id');
      expect(jsonData.title).toBe('New Session');
    });

    it('should validate request body', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: {}, // Empty body
      });

      const handler = await import('../../api/chat/sessions');
      
      await handler.default(req, res);

      expect(res._getStatusCode()).toBe(400);
      const jsonData = JSON.parse(res._getData());
      expect(jsonData).toHaveProperty('error');
    });
  });

  describe('DELETE /api/chat/sessions/:id', () => {
    it('should delete a session', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'DELETE',
        query: { id: 'session-to-delete' },
      });

      const handler = await import('../../api/chat/sessions');
      
      jest.spyOn(global, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      } as Response);

      await handler.default(req, res);

      expect(res._getStatusCode()).toBe(200);
      const jsonData = JSON.parse(res._getData());
      expect(jsonData.success).toBe(true);
    });

    it('should handle missing session ID', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'DELETE',
        query: {}, // No ID
      });

      const handler = await import('../../api/chat/sessions');
      
      await handler.default(req, res);

      expect(res._getStatusCode()).toBe(400);
      const jsonData = JSON.parse(res._getData());
      expect(jsonData).toHaveProperty('error');
    });
  });

  describe('CORS headers', () => {
    it('should include CORS headers in response', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'OPTIONS',
      });

      const handler = await import('../../api/chat/sessions');
      
      await handler.default(req, res);

      expect(res._getStatusCode()).toBe(200);
      expect(res._getHeaders()).toHaveProperty('access-control-allow-origin');
      expect(res._getHeaders()).toHaveProperty('access-control-allow-methods');
    });
  });
});
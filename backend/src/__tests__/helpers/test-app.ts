import express, { Express } from 'express';
import cors from 'cors';
import { aiRouter } from '../../routes/ai';
import { cacheService } from '../../utils/cache';
import { createTestServices } from './test-services';

export const createTestApp = (): Express => {
  const app = express();

  // Basic middleware
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Add test services to request context
  app.use((req, res, next) => {
    req.services = createTestServices();
    next();
  });

  // Add AI routes
  app.use('/api/ai', aiRouter);

  // Error handling middleware
  app.use((err: any, req: any, res: any, next: any) => {
    console.error('Test app error:', err);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: err.message
    });
  });

  return app;
};

// Extend Express Request interface for TypeScript
declare global {
  namespace Express {
    interface Request {
      services: ReturnType<typeof createTestServices>;
    }
  }
}
import { VercelRequest, VercelResponse } from '@vercel/node';
import { createServer } from 'http';
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { aiRouter } from '../backend/src/routes/ai';
import { errorHandler } from '../backend/src/middleware/errorHandler';
import { requestIdMiddleware } from '../backend/src/middleware/requestLogger';

dotenv.config();

const app = express();

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || true,
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(requestIdMiddleware);

// Routes
app.use('/api/ai', aiRouter);

// Error handling
app.use(errorHandler);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  return new Promise((resolve) => {
    // Create a mock server to handle the request
    const server = createServer(app);
    
    // Handle the request
    app(req as any, res as any, (err: any) => {
      if (err) {
        console.error('AI API Error:', err);
        res.status(500).json({ error: 'Internal server error' });
      }
      resolve(undefined);
    });
  });
}
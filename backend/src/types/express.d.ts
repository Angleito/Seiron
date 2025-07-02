import { SocketService } from '../services/SocketService';
import { PortfolioService } from '../services/PortfolioService';
import { AIService } from '../services/AIService';

declare global {
  namespace Express {
    interface Request {
      services: {
        socket: SocketService;
        portfolio: PortfolioService;
        ai: AIService;
      };
      walletAddress?: string;
    }
  }
}

export {};
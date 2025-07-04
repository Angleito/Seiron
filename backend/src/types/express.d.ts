import { SocketService } from '../services/SocketService';
import { PortfolioService } from '../services/PortfolioService';
import { AIService } from '../services/AIService';
import { ConfirmationService } from '../services/ConfirmationService';

declare global {
  namespace Express {
    interface Request {
      services: {
        socket: SocketService;
        portfolio: PortfolioService;
        ai: AIService;
        confirmation: ConfirmationService;
      };
      walletAddress?: string;
    }
  }
}

export {};
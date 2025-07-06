import { SocketService } from '../services/SocketService';
import { PortfolioService } from '../services/PortfolioService';
import { AIService } from '../services/AIService';
import { ConfirmationService } from '../services/ConfirmationService';
import { OrchestratorService } from '../services/OrchestratorService';
import { SeiIntegrationService } from '../services/SeiIntegrationService';
import { PortfolioAnalyticsService } from '../services/PortfolioAnalyticsService';
import { RealTimeDataService } from '../services/RealTimeDataService';
import { SupabaseService } from '../services/SupabaseService';

declare global {
  namespace Express {
    interface Request {
      services: {
        socket: SocketService;
        portfolio: PortfolioService;
        ai: AIService;
        confirmation: ConfirmationService;
        orchestrator: OrchestratorService;
        seiIntegration: SeiIntegrationService;
        portfolioAnalytics: PortfolioAnalyticsService;
        realTimeData: RealTimeDataService;
        supabase: SupabaseService;
      };
      walletAddress?: string;
      requestId?: string;
      startTime?: number;
    }
  }
}

export {};
import { config } from 'dotenv';
import { OrchestratorService, EnhancedUserIntent } from './src/services/OrchestratorService';
import { SeiIntegrationService } from './src/services/SeiIntegrationService';
import { PortfolioAnalyticsService } from './src/services/PortfolioAnalyticsService';
import { RealTimeDataService } from './src/services/RealTimeDataService';
import { SocketService } from './src/services/SocketService';
import { createServiceLogger } from './src/services/LoggingService';

// Load environment variables
config();

const logger = createServiceLogger('TestOrchestrator');

async function testOrchestrator() {
  try {
    // Create mock services
    const socketService = new SocketService();
    const seiIntegration = new SeiIntegrationService(
      {
        hiveIntelligence: null as any,
        seiAgentKit: null as any,
        mcpAdapter: null as any
      },
      socketService
    );
    const portfolioAnalytics = new PortfolioAnalyticsService(
      null as any,
      null as any,
      seiIntegration
    );
    const realTimeData = new RealTimeDataService(
      null as any,
      null as any,
      socketService
    );

    // Create orchestrator
    const orchestrator = new OrchestratorService(
      seiIntegration,
      portfolioAnalytics,
      realTimeData,
      socketService
    );

    // Test intent
    const testIntent: EnhancedUserIntent = {
      id: 'test-intent-123',
      userId: 'test-user',
      walletAddress: '0x1234567890123456789012345678901234567890',
      type: 'info',
      action: 'general_query',
      parameters: {},
      priority: 'medium',
      context: {
        sessionId: 'test-session',
        timestamp: new Date(),
        source: 'chat'
      }
    };

    logger.info('Testing orchestrator with intent:', testIntent);

    // Process intent
    const result = await orchestrator.processIntent(testIntent)();
    
    if (result._tag === 'Left') {
      logger.error('Orchestrator failed:', result.left);
    } else {
      logger.info('Orchestrator succeeded:', result.right);
    }
  } catch (error) {
    logger.error('Test failed:', error);
  }
}

// Run test
testOrchestrator().catch(console.error);
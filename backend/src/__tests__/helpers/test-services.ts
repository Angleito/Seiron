import { AIService } from '../../services/AIService';
import { createMockPortfolioService } from './mock-portfolio-service';

export const createTestServices = () => {
  const mockPortfolioService = createMockPortfolioService();
  const aiService = new AIService();

  return {
    ai: aiService,
    portfolio: mockPortfolioService
  };
};

// Mock portfolio service for testing
const createMockPortfolioService = () => {
  return {
    getPortfolioData: jest.fn().mockResolvedValue({
      right: {
        totalValue: 10000,
        tokens: [
          { symbol: 'SEI', amount: 1000, value: 450 },
          { symbol: 'USDC', amount: 5000, value: 5000 }
        ]
      }
    })
  };
};
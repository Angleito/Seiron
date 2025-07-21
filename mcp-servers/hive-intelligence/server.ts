import { z } from 'zod';
import { BaseMCPServer, MCPTool } from '../base-server.js';
import axios from 'axios';
import { createHash } from 'crypto';

// Environment configuration
const HIVE_API_KEY = process.env.HIVE_INTELLIGENCE_API_KEY || '';
const HIVE_BASE_URL = process.env.HIVE_INTELLIGENCE_BASE_URL || 'https://api.hiveintelligence.xyz/v1';
const CACHE_TTL = parseInt(process.env.HIVE_CACHE_TTL || '300') * 1000; // Convert to ms

// Simple in-memory cache for production
class SimpleCache {
  private cache = new Map<string, { data: any; timestamp: number }>();

  get(key: string): any | null {
    const item = this.cache.get(key);
    if (!item) return null;
    
    if (Date.now() - item.timestamp > CACHE_TTL) {
      this.cache.delete(key);
      return null;
    }
    
    return item.data;
  }

  set(key: string, data: any): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    });
  }

  generateKey(method: string, params: any): string {
    const hash = createHash('md5');
    hash.update(`${method}:${JSON.stringify(params)}`);
    return hash.digest('hex');
  }
}

class HiveIntelligenceMCPServer extends BaseMCPServer {
  private cache = new SimpleCache();
  private axiosInstance = axios.create({
    baseURL: HIVE_BASE_URL,
    headers: {
      'Authorization': `Bearer ${HIVE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    timeout: 30000,
  });

  constructor() {
    if (!HIVE_API_KEY) {
      console.error('WARNING: HIVE_INTELLIGENCE_API_KEY not set. Server will return errors.');
    }

    const tools: MCPTool[] = [
      {
        name: 'getMarketData',
        description: 'Get real-time and historical market data for specified symbols',
        inputSchema: z.object({
          symbols: z.array(z.string()).describe('Array of token symbols'),
          timeframe: z.string().optional().describe('Time period for historical data'),
          limit: z.number().optional().describe('Number of data points to return'),
          includeMetrics: z.boolean().optional().describe('Include technical indicators'),
        }),
        handler: async (args) => {
          const cacheKey = this.cache.generateKey('getMarketData', args);
          const cached = this.cache.get(cacheKey);
          if (cached) return cached;

          try {
            const response = await this.axiosInstance.post('/market/data', {
              symbols: args.symbols,
              timeframe: args.timeframe || '24h',
              limit: args.limit || 100,
              include_metrics: args.includeMetrics || false,
            });

            this.cache.set(cacheKey, response.data);
            return response.data;
          } catch (error: any) {
            throw new Error(`Failed to fetch market data: ${error.response?.data?.message || error.message}`);
          }
        },
      },
      {
        name: 'getSentimentAnalysis',
        description: 'Get sentiment analysis from multiple sources',
        inputSchema: z.object({
          symbols: z.array(z.string()).describe('Tokens to analyze'),
          sources: z.array(z.string()).optional().describe('Data sources to include'),
          timeRange: z.string().optional().describe('Time range for analysis'),
        }),
        handler: async (args) => {
          const cacheKey = this.cache.generateKey('getSentimentAnalysis', args);
          const cached = this.cache.get(cacheKey);
          if (cached) return cached;

          try {
            const response = await this.axiosInstance.post('/sentiment/analyze', {
              symbols: args.symbols,
              sources: args.sources || ['twitter', 'reddit', 'news'],
              time_range: args.timeRange || '24h',
            });

            this.cache.set(cacheKey, response.data);
            return response.data;
          } catch (error: any) {
            throw new Error(`Failed to fetch sentiment analysis: ${error.response?.data?.message || error.message}`);
          }
        },
      },
      {
        name: 'getPricePredictions',
        description: 'Get AI-powered price predictions',
        inputSchema: z.object({
          symbol: z.string().describe('Token symbol'),
          timeframes: z.array(z.string()).describe('Prediction timeframes'),
          includeConfidence: z.boolean().optional(),
        }),
        handler: async (args) => {
          try {
            const response = await this.axiosInstance.post('/predictions/price', {
              symbol: args.symbol,
              timeframes: args.timeframes,
              include_confidence: args.includeConfidence !== false,
            });

            return response.data;
          } catch (error: any) {
            throw new Error(`Failed to fetch price predictions: ${error.response?.data?.message || error.message}`);
          }
        },
      },
      {
        name: 'getTradingSignals',
        description: 'Get automated trading signals and recommendations',
        inputSchema: z.object({
          symbols: z.array(z.string()),
          riskProfile: z.enum(['conservative', 'moderate', 'aggressive']),
          includeStopLoss: z.boolean().optional(),
        }),
        handler: async (args) => {
          try {
            const response = await this.axiosInstance.post('/trading/signals', {
              symbols: args.symbols,
              risk_profile: args.riskProfile,
              include_stop_loss: args.includeStopLoss || true,
            });

            return response.data;
          } catch (error: any) {
            throw new Error(`Failed to fetch trading signals: ${error.response?.data?.message || error.message}`);
          }
        },
      },
      {
        name: 'getNewsAggregation',
        description: 'Get aggregated crypto news with sentiment',
        inputSchema: z.object({
          keywords: z.array(z.string()).optional(),
          sources: z.array(z.string()).optional(),
          limit: z.number().optional(),
          minSentiment: z.number().optional(),
        }),
        handler: async (args) => {
          const cacheKey = this.cache.generateKey('getNewsAggregation', args);
          const cached = this.cache.get(cacheKey);
          if (cached) return cached;

          try {
            const response = await this.axiosInstance.get('/news/aggregate', {
              params: {
                keywords: args.keywords?.join(','),
                sources: args.sources?.join(','),
                limit: args.limit || 20,
                min_sentiment: args.minSentiment,
              },
            });

            this.cache.set(cacheKey, response.data);
            return response.data;
          } catch (error: any) {
            throw new Error(`Failed to fetch news: ${error.response?.data?.message || error.message}`);
          }
        },
      },
      {
        name: 'getOnChainMetrics',
        description: 'Get on-chain analytics and metrics',
        inputSchema: z.object({
          chain: z.string().describe('Blockchain name'),
          metrics: z.array(z.string()).describe('Specific metrics to retrieve'),
          timeRange: z.string().optional(),
        }),
        handler: async (args) => {
          const cacheKey = this.cache.generateKey('getOnChainMetrics', args);
          const cached = this.cache.get(cacheKey);
          if (cached) return cached;

          try {
            const response = await this.axiosInstance.post('/onchain/metrics', {
              chain: args.chain,
              metrics: args.metrics,
              time_range: args.timeRange || '24h',
            });

            this.cache.set(cacheKey, response.data);
            return response.data;
          } catch (error: any) {
            throw new Error(`Failed to fetch on-chain metrics: ${error.response?.data?.message || error.message}`);
          }
        },
      },
      {
        name: 'getPortfolioAnalysis',
        description: 'Analyze portfolio performance and get recommendations',
        inputSchema: z.object({
          portfolio: z.array(z.object({
            symbol: z.string(),
            amount: z.number(),
            avgBuyPrice: z.number().optional(),
          })),
          includeRecommendations: z.boolean().optional(),
        }),
        handler: async (args) => {
          try {
            const response = await this.axiosInstance.post('/portfolio/analyze', {
              portfolio: args.portfolio,
              include_recommendations: args.includeRecommendations || true,
            });

            return response.data;
          } catch (error: any) {
            throw new Error(`Failed to analyze portfolio: ${error.response?.data?.message || error.message}`);
          }
        },
      },
    ];

    super({
      name: 'hive-intelligence-mcp',
      version: '1.0.0',
      description: 'Hive Intelligence MCP Server - Production Market Data and Analytics',
      tools,
    });
  }
}

// Start the server
const server = new HiveIntelligenceMCPServer();
server.start().catch(console.error);
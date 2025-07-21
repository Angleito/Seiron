import { z } from 'zod';
import { EnhancedBaseMCPServer, MCPTool } from './enhanced-base-server.js';
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

class HiveIntelligenceMCPServer extends EnhancedBaseMCPServer {
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
      console.error('Please set HIVE_INTELLIGENCE_API_KEY in your .env file.');
    } else {
      console.error(`Initializing Hive Intelligence MCP Server with API key: ${HIVE_API_KEY.substring(0, 10)}...`);
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
        textFormatter: (result) => {
          const lines = [`Here's the current market data:\n`];
          
          if (result.data) {
            for (const [symbol, data] of Object.entries(result.data)) {
              const d: any = data;
              lines.push(`${symbol} is trading at $${d.price?.toFixed(4) || 'N/A'}`);
              if (d.change24h !== undefined) {
                lines.push(`  24h change: ${d.change24h > 0 ? '+' : ''}${d.change24h.toFixed(2)}%`);
              }
              if (d.volume24h) {
                lines.push(`  24h volume: $${(d.volume24h / 1000000).toFixed(2)}M`);
              }
              if (d.marketCap) {
                lines.push(`  Market cap: $${(d.marketCap / 1000000000).toFixed(2)}B`);
              }
              lines.push('');
            }
          }
          
          return lines.join('\n').trim();
        }
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
        textFormatter: (result) => {
          const lines = [`Market sentiment analysis for ${result.symbols?.join(', ') || 'the market'}:\n`];
          
          if (result.sentiment?.overall !== undefined) {
            const score = result.sentiment.overall;
            let sentiment = 'neutral';
            if (score > 0.7) sentiment = 'very bullish';
            else if (score > 0.5) sentiment = 'bullish';
            else if (score < 0.3) sentiment = 'bearish';
            else if (score < 0.5) sentiment = 'slightly bearish';
            
            lines.push(`Overall sentiment is ${sentiment} with a score of ${(score * 100).toFixed(1)}%.`);
          }
          
          if (result.sentiment?.sources) {
            lines.push('\nSentiment by source:');
            for (const [source, data] of Object.entries(result.sentiment.sources)) {
              const s: any = data;
              lines.push(`- ${source}: ${(s.score * 100).toFixed(1)}% (${s.volume} mentions)`);
            }
          }
          
          if (result.sentiment?.trending_topics?.length > 0) {
            lines.push(`\nTrending topics: ${result.sentiment.trending_topics.join(', ')}`);
          }
          
          return lines.join('\n');
        }
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
        textFormatter: (result) => {
          const lines = [`Price predictions for ${result.symbol}:`];
          lines.push(`Current price: $${result.current_price?.toFixed(4) || 'N/A'}\n`);
          
          if (result.predictions) {
            lines.push('Predicted prices:');
            for (const [timeframe, prediction] of Object.entries(result.predictions)) {
              const p: any = prediction;
              const change = ((p.price - result.current_price) / result.current_price) * 100;
              lines.push(`- ${timeframe}: $${p.price.toFixed(4)} (${change > 0 ? '+' : ''}${change.toFixed(2)}%)`);
              if (p.confidence !== undefined) {
                lines.push(`  Confidence: ${(p.confidence * 100).toFixed(0)}%`);
              }
            }
          }
          
          if (result.factors?.length > 0) {
            lines.push(`\nKey factors: ${result.factors.join(', ')}`);
          }
          
          return lines.join('\n');
        }
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
        textFormatter: (result) => {
          const lines = [`Trading signals for ${result.risk_profile || 'moderate'} risk profile:\n`];
          
          if (result.signals?.length > 0) {
            for (const signal of result.signals) {
              lines.push(`${signal.symbol}: ${signal.action}`);
              lines.push(`  Signal strength: ${(signal.strength * 100).toFixed(0)}%`);
              if (signal.entry_price) {
                lines.push(`  Entry price: $${signal.entry_price.toFixed(4)}`);
              }
              if (signal.stop_loss) {
                lines.push(`  Stop loss: $${signal.stop_loss.toFixed(4)}`);
              }
              if (signal.take_profit) {
                lines.push(`  Take profit: $${signal.take_profit.toFixed(4)}`);
              }
              if (signal.risk_reward_ratio) {
                lines.push(`  Risk/reward: 1:${signal.risk_reward_ratio.toFixed(1)}`);
              }
              lines.push('');
            }
          }
          
          return lines.join('\n').trim();
        }
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
        textFormatter: (result) => {
          const lines = [`Latest crypto news:\n`];
          
          if (result.articles?.length > 0) {
            for (const article of result.articles.slice(0, 5)) {
              lines.push(`• ${article.title}`);
              if (article.sentiment !== undefined) {
                const sentiment = article.sentiment > 0.6 ? 'positive' : article.sentiment < 0.4 ? 'negative' : 'neutral';
                lines.push(`  Sentiment: ${sentiment}`);
              }
              if (article.summary) {
                lines.push(`  ${article.summary.substring(0, 100)}...`);
              }
              lines.push('');
            }
          }
          
          if (result.avg_sentiment !== undefined) {
            lines.push(`Overall news sentiment: ${(result.avg_sentiment * 100).toFixed(0)}% positive`);
          }
          
          return lines.join('\n').trim();
        }
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
        textFormatter: (result) => {
          const lines = [`On-chain metrics for ${result.chain}:\n`];
          
          if (result.metrics) {
            const m = result.metrics;
            if (m.active_addresses) {
              lines.push(`Active addresses: ${m.active_addresses.toLocaleString()}`);
            }
            if (m.transaction_count) {
              lines.push(`Transactions: ${m.transaction_count.toLocaleString()}`);
            }
            if (m.total_value_locked) {
              lines.push(`Total value locked: $${(m.total_value_locked / 1000000).toFixed(2)}M`);
            }
            if (m.gas_usage !== undefined) {
              lines.push(`Network utilization: ${(m.gas_usage * 100).toFixed(1)}%`);
            }
            if (m.validator_count) {
              lines.push(`Active validators: ${m.validator_count}`);
            }
            if (m.staking_ratio !== undefined) {
              lines.push(`Staking ratio: ${(m.staking_ratio * 100).toFixed(1)}%`);
            }
          }
          
          return lines.join('\n');
        }
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
        textFormatter: (result) => {
          const lines = [`Portfolio Analysis:\n`];
          
          lines.push(`Total value: $${result.total_value_usd?.toFixed(2) || 'N/A'}`);
          
          if (result.holdings?.length > 0) {
            lines.push('\nHoldings:');
            for (const holding of result.holdings) {
              lines.push(`- ${holding.symbol}: ${holding.amount} units ($${holding.value_usd?.toFixed(2)})`);
              if (holding.pnl !== undefined) {
                lines.push(`  P&L: ${holding.pnl > 0 ? '+' : ''}${holding.pnl.toFixed(2)}%`);
              }
            }
          }
          
          if (result.diversification_score !== undefined) {
            lines.push(`\nDiversification score: ${(result.diversification_score * 100).toFixed(0)}%`);
          }
          
          if (result.recommendations?.length > 0) {
            lines.push('\nRecommendations:');
            for (const rec of result.recommendations) {
              lines.push(`• ${rec}`);
            }
          }
          
          return lines.join('\n');
        }
      },
    ];

    super({
      name: 'hive-intelligence-mcp',
      version: '1.0.0',
      description: 'Hive Intelligence MCP Server - Production Market Data and Analytics with Natural Language Output',
      tools,
      formatAsText: true,
    });
  }

  protected defaultTextFormatter(toolName: string, result: any): string {
    // Fallback formatter if no specific formatter is provided
    return `Result from ${toolName}:\n${JSON.stringify(result, null, 2)}`;
  }
}

// Start the server
const server = new HiveIntelligenceMCPServer();
server.start().catch(console.error);
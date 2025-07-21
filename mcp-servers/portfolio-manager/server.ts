import { z } from 'zod';
import { BaseMCPServer, MCPTool } from './base-server.js';
import axios from 'axios';
import { createHash } from 'crypto';

// Environment configuration
const PORTFOLIO_API_URL = process.env.PORTFOLIO_API_URL || 'http://localhost:8000/api';
const PORTFOLIO_API_KEY = process.env.PORTFOLIO_API_KEY || '';
const COINGECKO_API_KEY = process.env.COINGECKO_API_KEY || '';
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

// Redis client for caching
import Redis from 'ioredis';

class PortfolioManagerMCPServer extends BaseMCPServer {
  private redis?: Redis;
  private axiosInstance = axios.create({
    baseURL: PORTFOLIO_API_URL,
    headers: {
      'Authorization': `Bearer ${PORTFOLIO_API_KEY}`,
      'Content-Type': 'application/json',
    },
    timeout: 30000,
  });

  constructor() {
    // Initialize Redis with proper error handling
    let redis: Redis | undefined;
    try {
      redis = new Redis(REDIS_URL);
      redis.on('connect', () => console.log('Redis connected successfully'));
      redis.on('error', (err) => console.warn('Redis error:', err.message));
      console.log('Redis client initialized');
    } catch (error) {
      console.warn('Redis initialization failed, running without cache:', error);
      redis = undefined;
    }
    
    const tools: MCPTool[] = [
      {
        name: 'analyzePortfolioComposition',
        description: 'Analyze portfolio composition and diversification',
        inputSchema: z.object({
          walletAddress: z.string().describe('Wallet address to analyze'),
          includeStakedAssets: z.boolean().optional(),
          includeDeFiPositions: z.boolean().optional(),
        }),
        handler: async (args) => {
          try {
            // Get portfolio data from backend API
            const response = await this.axiosInstance.get(`/portfolio/${args.walletAddress}`, {
              params: {
                include_staked: args.includeStakedAssets,
                include_defi: args.includeDeFiPositions,
              },
            });

            // Calculate composition metrics
            const portfolio = response.data;
            const totalValue = portfolio.holdings.reduce((sum: number, h: any) => sum + h.value_usd, 0);
            
            const composition = portfolio.holdings.map((holding: any) => ({
              symbol: holding.symbol,
              amount: holding.amount,
              value_usd: holding.value_usd,
              percentage: (holding.value_usd / totalValue) * 100,
              price_usd: holding.price_usd,
            }));

            // Calculate diversification score (Herfindahl-Hirschman Index)
            const hhi = composition.reduce((sum: number, h: any) => sum + Math.pow(h.percentage, 2), 0);
            const diversificationScore = 1 - (hhi / 10000);

            return {
              wallet_address: args.walletAddress,
              total_value_usd: totalValue,
              composition,
              diversification_score: diversificationScore,
              asset_count: composition.length,
              largest_position: composition.sort((a: any, b: any) => b.percentage - a.percentage)[0],
            };
          } catch (error: any) {
            throw new Error(`Failed to analyze portfolio: ${error.response?.data?.message || error.message}`);
          }
        },
      },
      {
        name: 'getHistoricalPerformance',
        description: 'Get historical performance data for a portfolio',
        inputSchema: z.object({
          walletAddress: z.string(),
          timeframe: z.enum(['24h', '7d', '30d', '90d', '1y', 'all']),
          interval: z.enum(['hourly', 'daily', 'weekly']).optional(),
        }),
        handler: async (args) => {
          try {
            const response = await this.axiosInstance.get(`/portfolio/${args.walletAddress}/performance`, {
              params: {
                timeframe: args.timeframe,
                interval: args.interval || 'daily',
              },
            });

            const performance = response.data;
            
            // Calculate performance metrics
            const currentValue = performance.data_points[performance.data_points.length - 1]?.value || 0;
            const startValue = performance.data_points[0]?.value || 0;
            const absoluteReturn = currentValue - startValue;
            const percentageReturn = startValue > 0 ? ((currentValue - startValue) / startValue) * 100 : 0;
            
            // Calculate max drawdown
            let maxDrawdown = 0;
            let peak = startValue;
            
            for (const point of performance.data_points) {
              if (point.value > peak) peak = point.value;
              const drawdown = ((peak - point.value) / peak) * 100;
              if (drawdown > maxDrawdown) maxDrawdown = drawdown;
            }

            return {
              wallet_address: args.walletAddress,
              timeframe: args.timeframe,
              start_value_usd: startValue,
              current_value_usd: currentValue,
              absolute_return_usd: absoluteReturn,
              percentage_return: percentageReturn,
              max_drawdown_percentage: maxDrawdown,
              data_points: performance.data_points,
            };
          } catch (error: any) {
            throw new Error(`Failed to get historical performance: ${error.response?.data?.message || error.message}`);
          }
        },
      },
      {
        name: 'calculateRiskMetrics',
        description: 'Calculate portfolio risk metrics',
        inputSchema: z.object({
          walletAddress: z.string(),
          riskFreeRate: z.number().optional().describe('Annual risk-free rate (default: 0.02)'),
          confidenceLevel: z.number().optional().describe('VaR confidence level (default: 0.95)'),
        }),
        handler: async (args) => {
          try {
            // Get portfolio and historical data
            const [portfolioResponse, performanceResponse] = await Promise.all([
              this.axiosInstance.get(`/portfolio/${args.walletAddress}`),
              this.axiosInstance.get(`/portfolio/${args.walletAddress}/performance`, {
                params: { timeframe: '90d', interval: 'daily' },
              }),
            ]);

            const portfolio = portfolioResponse.data;
            const performance = performanceResponse.data;

            // Calculate returns
            const returns: number[] = [];
            for (let i = 1; i < performance.data_points.length; i++) {
              const dailyReturn = (performance.data_points[i].value - performance.data_points[i-1].value) / performance.data_points[i-1].value;
              returns.push(dailyReturn);
            }

            // Calculate volatility (standard deviation)
            const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
            const variance = returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length;
            const volatility = Math.sqrt(variance);
            const annualizedVolatility = volatility * Math.sqrt(365);

            // Calculate Sharpe Ratio
            const riskFreeRate = args.riskFreeRate || 0.02;
            const annualizedReturn = avgReturn * 365;
            const sharpeRatio = (annualizedReturn - riskFreeRate) / annualizedVolatility;

            // Calculate VaR (Value at Risk)
            const sortedReturns = [...returns].sort((a, b) => a - b);
            const varIndex = Math.floor((1 - (args.confidenceLevel || 0.95)) * sortedReturns.length);
            const var95 = sortedReturns[varIndex] * portfolio.total_value_usd;

            // Calculate Beta (would need market data in production)
            const beta = 1.0; // Placeholder - would calculate against market index

            return {
              wallet_address: args.walletAddress,
              total_value_usd: portfolio.total_value_usd,
              volatility: {
                daily: volatility,
                annualized: annualizedVolatility,
              },
              sharpe_ratio: sharpeRatio,
              value_at_risk: {
                confidence_level: args.confidenceLevel || 0.95,
                daily_var_usd: var95,
                percentage: (var95 / portfolio.total_value_usd) * 100,
              },
              beta,
              risk_score: this.calculateRiskScore(annualizedVolatility, sharpeRatio, portfolio.diversification_score),
            };
          } catch (error: any) {
            throw new Error(`Failed to calculate risk metrics: ${error.response?.data?.message || error.message}`);
          }
        },
      },
      {
        name: 'assessLiquidityRisk',
        description: 'Assess liquidity risk of portfolio holdings',
        inputSchema: z.object({
          walletAddress: z.string(),
          liquidationTimeframe: z.enum(['immediate', '1day', '7days', '30days']).optional(),
        }),
        handler: async (args) => {
          try {
            const response = await this.axiosInstance.get(`/portfolio/${args.walletAddress}/liquidity`, {
              params: {
                timeframe: args.liquidationTimeframe || '1day',
              },
            });

            const liquidityData = response.data;
            
            // Categorize assets by liquidity
            const liquidityCategories = {
              high: liquidityData.assets.filter((a: any) => a.liquidity_score >= 0.8),
              medium: liquidityData.assets.filter((a: any) => a.liquidity_score >= 0.5 && a.liquidity_score < 0.8),
              low: liquidityData.assets.filter((a: any) => a.liquidity_score < 0.5),
            };

            return {
              wallet_address: args.walletAddress,
              total_value_usd: liquidityData.total_value_usd,
              liquidity_breakdown: {
                high_liquidity_usd: liquidityCategories.high.reduce((sum: number, a: any) => sum + a.value_usd, 0),
                medium_liquidity_usd: liquidityCategories.medium.reduce((sum: number, a: any) => sum + a.value_usd, 0),
                low_liquidity_usd: liquidityCategories.low.reduce((sum: number, a: any) => sum + a.value_usd, 0),
              },
              liquidity_score: liquidityData.overall_liquidity_score,
              estimated_liquidation_impact: liquidityData.estimated_impact_percentage,
              illiquid_positions: liquidityCategories.low,
              recommendations: liquidityData.recommendations,
            };
          } catch (error: any) {
            throw new Error(`Failed to assess liquidity risk: ${error.response?.data?.message || error.message}`);
          }
        },
      },
      {
        name: 'generateRebalancingSuggestions',
        description: 'Generate portfolio rebalancing suggestions',
        inputSchema: z.object({
          walletAddress: z.string(),
          targetAllocation: z.array(z.object({
            symbol: z.string(),
            percentage: z.number(),
          })).optional(),
          riskTolerance: z.enum(['conservative', 'moderate', 'aggressive']),
          rebalancingThreshold: z.number().optional().describe('Minimum deviation to trigger rebalancing (default: 5%)'),
        }),
        handler: async (args) => {
          try {
            const response = await this.axiosInstance.post('/portfolio/rebalance', {
              wallet_address: args.walletAddress,
              target_allocation: args.targetAllocation,
              risk_tolerance: args.riskTolerance,
              threshold: args.rebalancingThreshold || 5,
            });

            return response.data;
          } catch (error: any) {
            throw new Error(`Failed to generate rebalancing suggestions: ${error.response?.data?.message || error.message}`);
          }
        },
      },
      {
        name: 'optimizeTaxStrategy',
        description: 'Optimize portfolio for tax efficiency',
        inputSchema: z.object({
          walletAddress: z.string(),
          taxRate: z.number().describe('Capital gains tax rate (0-1)'),
          holdingPeriod: z.enum(['short_term', 'long_term']),
          includeHarvesting: z.boolean().optional(),
        }),
        handler: async (args) => {
          try {
            const response = await this.axiosInstance.post('/portfolio/tax-optimize', {
              wallet_address: args.walletAddress,
              tax_rate: args.taxRate,
              holding_period: args.holdingPeriod,
              include_harvesting: args.includeHarvesting !== false,
            });

            return response.data;
          } catch (error: any) {
            throw new Error(`Failed to optimize tax strategy: ${error.response?.data?.message || error.message}`);
          }
        },
      },
      {
        name: 'trackPerformanceMetrics',
        description: 'Track real-time portfolio performance metrics',
        inputSchema: z.object({
          walletAddress: z.string(),
          metrics: z.array(z.enum(['pnl', 'roi', 'volatility', 'correlation', 'beta'])),
          benchmark: z.string().optional().describe('Benchmark to compare against'),
        }),
        handler: async (args) => {
          try {
            const response = await this.axiosInstance.get(`/portfolio/${args.walletAddress}/metrics`, {
              params: {
                metrics: args.metrics.join(','),
                benchmark: args.benchmark,
              },
            });

            return response.data;
          } catch (error: any) {
            throw new Error(`Failed to track performance metrics: ${error.response?.data?.message || error.message}`);
          }
        },
      },
      {
        name: 'generatePerformanceReport',
        description: 'Generate comprehensive portfolio performance report',
        inputSchema: z.object({
          walletAddress: z.string(),
          reportType: z.enum(['summary', 'detailed', 'tax', 'risk']),
          timeframe: z.enum(['monthly', 'quarterly', 'yearly', 'custom']),
          startDate: z.string().optional(),
          endDate: z.string().optional(),
        }),
        handler: async (args) => {
          try {
            const response = await this.axiosInstance.post('/portfolio/report', {
              wallet_address: args.walletAddress,
              report_type: args.reportType,
              timeframe: args.timeframe,
              start_date: args.startDate,
              end_date: args.endDate,
            });

            return response.data;
          } catch (error: any) {
            throw new Error(`Failed to generate performance report: ${error.response?.data?.message || error.message}`);
          }
        },
      },
    ];

    super({
      name: 'portfolio-manager-mcp',
      version: '1.0.0',
      description: 'Portfolio Manager MCP Server - Production Portfolio Analytics',
      tools,
    });

    this.redis = redis;
  }

  private calculateRiskScore(volatility: number, sharpeRatio: number, diversificationScore: number): number {
    // Risk score from 0-100 (higher = riskier)
    const volScore = Math.min(volatility * 100, 40); // Max 40 points
    const sharpeScore = Math.max(0, 20 - (sharpeRatio * 10)); // Max 20 points  
    const diversScore = (1 - diversificationScore) * 40; // Max 40 points
    
    return Math.round(volScore + sharpeScore + diversScore);
  }
}

// Start the server
const server = new PortfolioManagerMCPServer();
server.start().catch(console.error);
import { MCPServerConfig, MCPTool, MCPDataSchema } from './types';

/**
 * Hive Intelligence MCP Server Configuration
 * 
 * This configuration defines the MCP server for Hive Intelligence integration,
 * exposing market data, sentiment analysis, trading signals, and news aggregation.
 */
export const HiveIntelligenceMCPConfig: MCPServerConfig = {
  name: 'hive-intelligence',
  displayName: 'Hive Intelligence',
  description: 'Advanced crypto analytics, market intelligence, and sentiment analysis powered by Hive Intelligence',
  version: '1.0.0',
  
  // Server connection configuration
  connection: {
    endpoint: process.env.HIVE_INTELLIGENCE_ENDPOINT || 'wss://api.hiveintelligence.io',
    port: parseInt(process.env.HIVE_INTELLIGENCE_PORT || '443'),
    secure: true,
    apiKey: process.env.HIVE_INTELLIGENCE_API_KEY,
    network: (process.env.HIVE_INTELLIGENCE_NETWORK || 'mainnet') as 'mainnet' | 'testnet' | 'devnet',
    connectionTimeout: 30000,
    heartbeatInterval: 30000,
    maxReconnectAttempts: 5
  },

  // Authentication configuration
  authentication: {
    type: 'api-key',
    required: true,
    headerName: 'X-Hive-API-Key',
    credentials: {
      apiKey: process.env.HIVE_INTELLIGENCE_API_KEY || '',
      apiSecret: process.env.HIVE_INTELLIGENCE_API_SECRET
    }
  },

  // Available tools/functions
  tools: [
    {
      name: 'getMarketData',
      displayName: 'Get Market Data',
      description: 'Retrieve real-time and historical market data for cryptocurrencies',
      category: 'market-data',
      parameters: {
        type: 'object',
        properties: {
          symbols: {
            type: 'array',
            items: { type: 'string' },
            description: 'Array of cryptocurrency symbols (e.g., ["SEI", "BTC", "ETH"])'
          },
          timeframe: {
            type: 'string',
            enum: ['1m', '5m', '15m', '30m', '1h', '4h', '1d', '1w', '1M'],
            description: 'Time interval for data points',
            default: '1h'
          },
          limit: {
            type: 'number',
            description: 'Number of data points to return',
            minimum: 1,
            maximum: 1000,
            default: 100
          },
          includeMetrics: {
            type: 'boolean',
            description: 'Include additional market metrics',
            default: true
          }
        },
        required: ['symbols']
      },
      responseSchema: 'MarketDataResponse'
    },
    {
      name: 'getSentimentAnalysis',
      displayName: 'Get Sentiment Analysis',
      description: 'Analyze market sentiment from social media, news, and on-chain data',
      category: 'sentiment',
      parameters: {
        type: 'object',
        properties: {
          symbols: {
            type: 'array',
            items: { type: 'string' },
            description: 'Cryptocurrency symbols to analyze'
          },
          sources: {
            type: 'array',
            items: { 
              type: 'string',
              enum: ['twitter', 'reddit', 'telegram', 'discord', 'news', 'on-chain']
            },
            description: 'Data sources for sentiment analysis',
            default: ['twitter', 'reddit', 'news']
          },
          timeRange: {
            type: 'string',
            enum: ['1h', '4h', '24h', '7d', '30d'],
            description: 'Time range for analysis',
            default: '24h'
          },
          includeTrends: {
            type: 'boolean',
            description: 'Include trending topics and keywords',
            default: true
          }
        },
        required: ['symbols']
      },
      responseSchema: 'SentimentAnalysisResponse'
    },
    {
      name: 'getPricePredictions',
      displayName: 'Get Price Predictions',
      description: 'AI-powered price predictions and market forecasts',
      category: 'predictions',
      parameters: {
        type: 'object',
        properties: {
          symbol: {
            type: 'string',
            description: 'Cryptocurrency symbol for prediction'
          },
          timeframes: {
            type: 'array',
            items: {
              type: 'string',
              enum: ['1h', '4h', '24h', '7d', '30d', '90d']
            },
            description: 'Prediction timeframes',
            default: ['24h', '7d']
          },
          confidenceThreshold: {
            type: 'number',
            description: 'Minimum confidence level (0-1)',
            minimum: 0,
            maximum: 1,
            default: 0.7
          },
          includeRationale: {
            type: 'boolean',
            description: 'Include AI reasoning for predictions',
            default: true
          }
        },
        required: ['symbol']
      },
      responseSchema: 'PricePredictionResponse'
    },
    {
      name: 'getTradingSignals',
      displayName: 'Get Trading Signals',
      description: 'Generate trading signals based on technical and fundamental analysis',
      category: 'trading',
      parameters: {
        type: 'object',
        properties: {
          symbols: {
            type: 'array',
            items: { type: 'string' },
            description: 'Symbols to generate signals for'
          },
          strategies: {
            type: 'array',
            items: {
              type: 'string',
              enum: ['momentum', 'mean-reversion', 'breakout', 'trend-following', 'ai-composite']
            },
            description: 'Trading strategies to use',
            default: ['ai-composite']
          },
          riskLevel: {
            type: 'string',
            enum: ['conservative', 'moderate', 'aggressive'],
            description: 'Risk tolerance level',
            default: 'moderate'
          },
          timeHorizon: {
            type: 'string',
            enum: ['scalping', 'day-trading', 'swing', 'position'],
            description: 'Trading time horizon',
            default: 'swing'
          }
        },
        required: ['symbols']
      },
      responseSchema: 'TradingSignalsResponse'
    },
    {
      name: 'getNewsAggregation',
      displayName: 'Get News Aggregation',
      description: 'Aggregate and analyze crypto news from multiple sources',
      category: 'news',
      parameters: {
        type: 'object',
        properties: {
          keywords: {
            type: 'array',
            items: { type: 'string' },
            description: 'Keywords or symbols to filter news'
          },
          sources: {
            type: 'array',
            items: { type: 'string' },
            description: 'Specific news sources to include'
          },
          sentiment: {
            type: 'string',
            enum: ['all', 'positive', 'negative', 'neutral'],
            description: 'Filter by sentiment',
            default: 'all'
          },
          limit: {
            type: 'number',
            description: 'Number of articles to return',
            minimum: 1,
            maximum: 100,
            default: 20
          },
          timeRange: {
            type: 'string',
            enum: ['1h', '4h', '24h', '7d', '30d'],
            description: 'Time range for news',
            default: '24h'
          }
        }
      },
      responseSchema: 'NewsAggregationResponse'
    },
    {
      name: 'getOnChainMetrics',
      displayName: 'Get On-Chain Metrics',
      description: 'Retrieve on-chain analytics and metrics for SEI and other blockchains',
      category: 'on-chain',
      parameters: {
        type: 'object',
        properties: {
          chain: {
            type: 'string',
            enum: ['sei', 'ethereum', 'bitcoin', 'solana', 'arbitrum'],
            description: 'Blockchain to analyze',
            default: 'sei'
          },
          metrics: {
            type: 'array',
            items: {
              type: 'string',
              enum: ['tvl', 'active-addresses', 'transaction-volume', 'gas-usage', 'dex-volume', 'nft-volume']
            },
            description: 'Metrics to retrieve'
          },
          timeRange: {
            type: 'string',
            enum: ['24h', '7d', '30d', '90d'],
            description: 'Time range for metrics',
            default: '7d'
          },
          granularity: {
            type: 'string',
            enum: ['hour', 'day', 'week'],
            description: 'Data granularity',
            default: 'day'
          }
        },
        required: ['chain', 'metrics']
      },
      responseSchema: 'OnChainMetricsResponse'
    },
    {
      name: 'getPortfolioAnalysis',
      displayName: 'Get Portfolio Analysis',
      description: 'Comprehensive portfolio analysis with AI-powered insights',
      category: 'portfolio',
      parameters: {
        type: 'object',
        properties: {
          walletAddress: {
            type: 'string',
            description: 'Wallet address to analyze'
          },
          chains: {
            type: 'array',
            items: { type: 'string' },
            description: 'Blockchains to include in analysis',
            default: ['sei']
          },
          includeDefi: {
            type: 'boolean',
            description: 'Include DeFi positions analysis',
            default: true
          },
          includeNfts: {
            type: 'boolean',
            description: 'Include NFT holdings analysis',
            default: true
          },
          benchmarks: {
            type: 'array',
            items: { type: 'string' },
            description: 'Benchmark indices for comparison',
            default: ['BTC', 'ETH', 'SEI']
          }
        },
        required: ['walletAddress']
      },
      responseSchema: 'PortfolioAnalysisResponse'
    }
  ] as MCPTool[],

  // Data schemas
  schemas: {
    MarketDataResponse: {
      type: 'object',
      properties: {
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              symbol: { type: 'string' },
              timestamp: { type: 'number' },
              price: { type: 'number' },
              volume: { type: 'number' },
              marketCap: { type: 'number' },
              change24h: { type: 'number' },
              high24h: { type: 'number' },
              low24h: { type: 'number' },
              metrics: {
                type: 'object',
                properties: {
                  rsi: { type: 'number' },
                  macd: { type: 'object' },
                  movingAverages: { type: 'object' },
                  volumeProfile: { type: 'object' }
                }
              }
            }
          }
        },
        metadata: {
          type: 'object',
          properties: {
            requestId: { type: 'string' },
            timestamp: { type: 'number' },
            creditsUsed: { type: 'number' }
          }
        }
      }
    },
    SentimentAnalysisResponse: {
      type: 'object',
      properties: {
        sentiment: {
          type: 'object',
          properties: {
            overall: {
              type: 'object',
              properties: {
                score: { type: 'number' },
                label: { type: 'string', enum: ['very-bearish', 'bearish', 'neutral', 'bullish', 'very-bullish'] },
                confidence: { type: 'number' }
              }
            },
            sources: {
              type: 'object',
              additionalProperties: {
                type: 'object',
                properties: {
                  score: { type: 'number' },
                  volume: { type: 'number' },
                  trend: { type: 'string' }
                }
              }
            },
            trends: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  keyword: { type: 'string' },
                  mentions: { type: 'number' },
                  sentiment: { type: 'number' },
                  growth: { type: 'number' }
                }
              }
            }
          }
        },
        insights: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              type: { type: 'string' },
              message: { type: 'string' },
              importance: { type: 'string' },
              source: { type: 'string' }
            }
          }
        }
      }
    },
    PricePredictionResponse: {
      type: 'object',
      properties: {
        predictions: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              timeframe: { type: 'string' },
              predictedPrice: { type: 'number' },
              confidence: { type: 'number' },
              range: {
                type: 'object',
                properties: {
                  low: { type: 'number' },
                  high: { type: 'number' }
                }
              },
              drivers: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    factor: { type: 'string' },
                    impact: { type: 'string' },
                    description: { type: 'string' }
                  }
                }
              }
            }
          }
        },
        analysis: {
          type: 'object',
          properties: {
            technicalScore: { type: 'number' },
            fundamentalScore: { type: 'number' },
            sentimentScore: { type: 'number' },
            riskScore: { type: 'number' },
            rationale: { type: 'string' }
          }
        }
      }
    },
    TradingSignalsResponse: {
      type: 'object',
      properties: {
        signals: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              symbol: { type: 'string' },
              action: { type: 'string', enum: ['buy', 'sell', 'hold'] },
              strength: { type: 'number' },
              entryPrice: { type: 'number' },
              targetPrices: { type: 'array', items: { type: 'number' } },
              stopLoss: { type: 'number' },
              riskReward: { type: 'number' },
              timeHorizon: { type: 'string' },
              strategy: { type: 'string' },
              indicators: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    name: { type: 'string' },
                    value: { type: 'number' },
                    signal: { type: 'string' }
                  }
                }
              },
              confidence: { type: 'number' },
              rationale: { type: 'string' }
            }
          }
        },
        marketConditions: {
          type: 'object',
          properties: {
            trend: { type: 'string' },
            volatility: { type: 'string' },
            momentum: { type: 'string' },
            volume: { type: 'string' }
          }
        }
      }
    },
    NewsAggregationResponse: {
      type: 'object',
      properties: {
        articles: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              title: { type: 'string' },
              summary: { type: 'string' },
              source: { type: 'string' },
              url: { type: 'string' },
              publishedAt: { type: 'string' },
              sentiment: {
                type: 'object',
                properties: {
                  score: { type: 'number' },
                  label: { type: 'string' }
                }
              },
              relevance: { type: 'number' },
              keywords: { type: 'array', items: { type: 'string' } },
              relatedSymbols: { type: 'array', items: { type: 'string' } },
              impact: {
                type: 'object',
                properties: {
                  level: { type: 'string' },
                  description: { type: 'string' }
                }
              }
            }
          }
        },
        summary: {
          type: 'object',
          properties: {
            totalArticles: { type: 'number' },
            sentimentDistribution: { type: 'object' },
            topKeywords: { type: 'array', items: { type: 'string' } },
            keyInsights: { type: 'array', items: { type: 'string' } }
          }
        }
      }
    },
    OnChainMetricsResponse: {
      type: 'object',
      properties: {
        metrics: {
          type: 'object',
          additionalProperties: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                timestamp: { type: 'number' },
                value: { type: 'number' },
                change24h: { type: 'number' }
              }
            }
          }
        },
        summary: {
          type: 'object',
          properties: {
            chain: { type: 'string' },
            timeRange: { type: 'string' },
            highlights: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  metric: { type: 'string' },
                  trend: { type: 'string' },
                  insight: { type: 'string' }
                }
              }
            }
          }
        }
      }
    },
    PortfolioAnalysisResponse: {
      type: 'object',
      properties: {
        portfolio: {
          type: 'object',
          properties: {
            totalValue: { type: 'number' },
            totalCost: { type: 'number' },
            pnl: { type: 'number' },
            pnlPercentage: { type: 'number' },
            holdings: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  symbol: { type: 'string' },
                  amount: { type: 'number' },
                  value: { type: 'number' },
                  cost: { type: 'number' },
                  pnl: { type: 'number' },
                  allocation: { type: 'number' }
                }
              }
            },
            defiPositions: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  protocol: { type: 'string' },
                  type: { type: 'string' },
                  value: { type: 'number' },
                  apy: { type: 'number' },
                  rewards: { type: 'number' }
                }
              }
            },
            nfts: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  collection: { type: 'string' },
                  tokenId: { type: 'string' },
                  estimatedValue: { type: 'number' },
                  rarity: { type: 'string' }
                }
              }
            }
          }
        },
        analysis: {
          type: 'object',
          properties: {
            diversification: {
              type: 'object',
              properties: {
                score: { type: 'number' },
                recommendations: { type: 'array', items: { type: 'string' } }
              }
            },
            risk: {
              type: 'object',
              properties: {
                score: { type: 'number' },
                volatility: { type: 'number' },
                var95: { type: 'number' },
                factors: { type: 'array', items: { type: 'string' } }
              }
            },
            performance: {
              type: 'object',
              properties: {
                vs_btc: { type: 'number' },
                vs_eth: { type: 'number' },
                vs_market: { type: 'number' },
                sharpeRatio: { type: 'number' }
              }
            },
            opportunities: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  type: { type: 'string' },
                  description: { type: 'string' },
                  expectedReturn: { type: 'number' },
                  risk: { type: 'string' }
                }
              }
            }
          }
        }
      }
    }
  } as Record<string, MCPDataSchema>,

  // Event subscriptions
  events: [
    'market:price-update',
    'market:volume-spike',
    'sentiment:shift',
    'news:breaking',
    'signal:generated',
    'prediction:update',
    'portfolio:alert',
    'chain:metric-anomaly'
  ],

  // Rate limiting
  rateLimits: {
    requestsPerMinute: 60,
    requestsPerHour: 1000,
    burstLimit: 10
  },

  // Caching configuration
  caching: {
    enabled: true,
    ttl: {
      marketData: 60, // 1 minute
      sentiment: 300, // 5 minutes
      predictions: 900, // 15 minutes
      news: 600, // 10 minutes
      onChain: 300, // 5 minutes
      portfolio: 180 // 3 minutes
    }
  },

  // Error handling
  errorHandling: {
    retryAttempts: 3,
    retryDelay: 1000,
    exponentialBackoff: true,
    fallbackToCache: true
  },

  // Metadata
  metadata: {
    website: 'https://hiveintelligence.io',
    documentation: 'https://docs.hiveintelligence.io',
    support: 'support@hiveintelligence.io',
    pricing: 'https://hiveintelligence.io/pricing',
    features: [
      'Real-time market data and analytics',
      'AI-powered sentiment analysis',
      'Price predictions with ML models',
      'Automated trading signals',
      'News aggregation and analysis',
      'On-chain metrics and insights',
      'Portfolio analysis and optimization',
      'Multi-chain support including SEI'
    ]
  }
};

export default HiveIntelligenceMCPConfig;
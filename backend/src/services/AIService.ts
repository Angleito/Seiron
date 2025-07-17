import { pipe } from 'fp-ts/function';
import * as TE from 'fp-ts/TaskEither';
import * as E from 'fp-ts/Either';
import OpenAI from 'openai';
import { createServiceLogger } from './LoggingService';
import { withErrorRecovery } from './ErrorHandlingService';
import { performance } from 'perf_hooks';
import type {
  HiveIntelligenceAdapter,
  SeiAgentKitAdapter,
  SeiMCPAdapter
} from './SeiIntegrationService';

// Types will be defined locally for now
export interface Command {
  type: string;
  payload?: any;
}

export interface AIResponse {
  message: string;
  command?: Command;
  suggestions?: string[];
  confidence: number;
  reasoning?: string;
  blockchainData?: {
    hiveInsights?: any;
    marketData?: any;
    isBlockchainQuery: boolean;
    queryType?: 'price' | 'defi' | 'staking' | 'wallet' | 'transaction' | 'general';
  };
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
}

export interface ChatContext {
  walletAddress: string;
  messages: ChatMessage[];
  portfolioData?: any;
  blockchainContext?: {
    recentBlockchainQueries: Array<{
      query: string;
      timestamp: Date;
      type: string;
      hadBlockchainData: boolean;
    }>;
    preferredQueryTypes: string[];
  };
}

export class AIService {
  private openai: OpenAI;
  private chatInterface: ChatInterface;
  private contexts: Map<string, ChatContext> = new Map();
  private logger = createServiceLogger('AIService');
  private hiveAdapter?: HiveIntelligenceAdapter;
  private sakAdapter?: SeiAgentKitAdapter;
  private mcpAdapter?: SeiMCPAdapter;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
    this.chatInterface = new ChatInterface();
    this.logger.info('AIService initialized with Dragon Ball Z theming', {
      hasOpenAIKey: !!process.env.OPENAI_API_KEY,
      initializationTime: new Date().toISOString()
    });
  }

  /**
   * Process user message and generate AI response
   */
  public processMessage = (
    message: string,
    walletAddress: string,
    portfolioData?: any
  ): TE.TaskEither<Error, AIResponse> => {
    const startTime = performance.now();
    const requestId = `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    this.logger.info('Processing message', {
      requestId,
      walletAddress,
      messageLength: message.length,
      hasPortfolioData: !!portfolioData,
      timestamp: new Date().toISOString()
    });
    
    return pipe(
      this.updateContext(walletAddress, message, portfolioData),
      TE.chain(() => this.detectBlockchainIntent(message, walletAddress)),
      TE.chain(blockchainIntent => 
        pipe(
          this.parseCommand(message),
          TE.chain(command => this.generateResponseWithBlockchainData(message, command, walletAddress, blockchainIntent))
        )
      ),
      TE.map(response => {
        const duration = performance.now() - startTime;
        this.logger.info('Message processed successfully', {
          requestId,
          walletAddress,
          duration: Math.round(duration),
          responseLength: response.message.length,
          hasCommand: !!response.command,
          confidence: response.confidence,
          hasBlockchainData: !!response.blockchainData
        });
        return response;
      }),
      TE.mapLeft(error => {
        const duration = performance.now() - startTime;
        this.logger.error('Message processing failed', {
          requestId,
          walletAddress,
          duration: Math.round(duration),
          error: error.message,
          stack: error.stack
        });
        return error;
      })
    );
  };

  /**
   * Detect blockchain intent from user message
   */
  private detectBlockchainIntent = (
    message: string,
    walletAddress: string
  ): TE.TaskEither<Error, { isBlockchainQuery: boolean; queryType?: string; confidence: number }> => {
    const startTime = performance.now();
    
    this.logger.debug('Detecting blockchain intent', {
      messageLength: message.length,
      walletAddress,
      timestamp: new Date().toISOString()
    });
    
    return TE.of((() => {
      const lowerMessage = message.toLowerCase();
      const blockchainKeywords = {
        price: ['price', 'cost', 'value', 'worth', 'market cap', 'mcap', 'token price'],
        defi: ['defi', 'yield', 'apy', 'apr', 'liquidity', 'swap', 'pool', 'farm', 'stake', 'unstake'],
        staking: ['stake', 'staking', 'delegate', 'validator', 'rewards', 'unstake', 'undelegate'],
        wallet: ['balance', 'wallet', 'address', 'transfer', 'send', 'receive', 'transaction history'],
        transaction: ['transaction', 'tx', 'hash', 'confirm', 'pending', 'failed', 'gas', 'fee'],
        general: ['sei', 'blockchain', 'network', 'block', 'consensus', 'node', 'protocol']
      };
      
      let maxConfidence = 0;
      let detectedType = 'general';
      let isBlockchainQuery = false;
      
      for (const [type, keywords] of Object.entries(blockchainKeywords)) {
        const matchCount = keywords.filter(keyword => lowerMessage.includes(keyword)).length;
        const confidence = matchCount / keywords.length;
        
        if (confidence > maxConfidence) {
          maxConfidence = confidence;
          detectedType = type;
        }
        
        if (matchCount > 0) {
          isBlockchainQuery = true;
        }
      }
      
      // Additional heuristics for blockchain detection
      if (!isBlockchainQuery) {
        const portfolioKeywords = ['portfolio', 'holdings', 'assets', 'positions', 'trades'];
        const protocolKeywords = ['yei', 'dragonswap', 'takara', 'silo', 'astroport'];
        
        if (portfolioKeywords.some(keyword => lowerMessage.includes(keyword)) ||
            protocolKeywords.some(keyword => lowerMessage.includes(keyword))) {
          isBlockchainQuery = true;
          detectedType = 'defi';
          maxConfidence = 0.7;
        }
      }
      
      const duration = performance.now() - startTime;
      const result = {
        isBlockchainQuery,
        queryType: isBlockchainQuery ? detectedType : undefined,
        confidence: maxConfidence
      };
      
      this.logger.debug('Blockchain intent detection completed', {
        walletAddress,
        duration: Math.round(duration),
        result,
        matchedKeywords: isBlockchainQuery
      });
      
      return result;
    })());
  };

  /**
   * Parse command from natural language
   */
  private parseCommand = (message: string): TE.TaskEither<Error, Command | undefined> => {
    const startTime = performance.now();
    
    this.logger.debug('Parsing command from message', {
      messageLength: message.length,
      timestamp: new Date().toISOString()
    });
    
    return pipe(
      this.chatInterface.parseCommand(message),
      TE.fromEither,
      TE.orElse(() => TE.right(undefined)),
      TE.map(command => {
        const duration = performance.now() - startTime;
        this.logger.debug('Command parsing completed', {
          duration: Math.round(duration),
          commandType: command?.type,
          hasCommand: !!command
        });
        return command;
      })
    );
  };

  /**
   * Generate AI response with blockchain data integration
   */
  private generateResponseWithBlockchainData = (
    message: string,
    command: Command | undefined,
    walletAddress: string,
    blockchainIntent: { isBlockchainQuery: boolean; queryType?: string; confidence: number }
  ): TE.TaskEither<Error, AIResponse> => {
    const startTime = performance.now();
    
    this.logger.debug('Generating response with blockchain data', {
      walletAddress,
      hasCommand: !!command,
      blockchainIntent,
      timestamp: new Date().toISOString()
    });
    
    return pipe(
      blockchainIntent.isBlockchainQuery && blockchainIntent.confidence > 0.3
        ? this.fetchBlockchainData(message, walletAddress, blockchainIntent.queryType!)
        : TE.right(undefined),
      TE.chain(blockchainData => this.generateResponse(message, command, walletAddress, blockchainData)),
      TE.map(response => {
        const duration = performance.now() - startTime;
        this.logger.debug('Response with blockchain data generated', {
          walletAddress,
          duration: Math.round(duration),
          hasBlockchainData: !!response.blockchainData,
          blockchainIntent
        });
        return response;
      })
    );
  };

  /**
   * Fetch blockchain data using Hive Intelligence
   */
  private fetchBlockchainData = (
    message: string,
    walletAddress: string,
    queryType: string
  ): TE.TaskEither<Error, any> => {
    const startTime = performance.now();
    
    this.logger.debug('Fetching blockchain data', {
      walletAddress,
      queryType,
      hasHiveAdapter: !!this.hiveAdapter,
      timestamp: new Date().toISOString()
    });
    
    if (!this.hiveAdapter) {
      this.logger.debug('Hive adapter not available, skipping blockchain data fetch', { walletAddress });
      return TE.right(undefined);
    }
    
    return pipe(
      this.hiveAdapter.search(message, { walletAddress, queryType }),
      TE.map(hiveResponse => {
        const duration = performance.now() - startTime;
        this.logger.info('Blockchain data fetched successfully', {
          walletAddress,
          queryType,
          duration: Math.round(duration),
          hasData: !!hiveResponse.data
        });
        
        return {
          hiveInsights: hiveResponse.data,
          queryType,
          fetchedAt: new Date().toISOString(),
          source: 'hive'
        };
      }),
      TE.orElse(error => {
        const duration = performance.now() - startTime;
        this.logger.warn('Failed to fetch blockchain data', {
          walletAddress,
          queryType,
          duration: Math.round(duration),
          error: error.message
        });
        // Return undefined instead of failing to maintain backward compatibility
        return TE.right(undefined);
      })
    );
  };

  /**
   * Generate AI response using OpenAI
   */
  private generateResponse = (
    message: string,
    command: Command | undefined,
    walletAddress: string,
    blockchainData?: any
  ): TE.TaskEither<Error, AIResponse> => {
    const startTime = performance.now();
    const openAIStartTime = performance.now();
    
    return TE.tryCatch(
      async () => {
        const context = this.contexts.get(walletAddress);
        const systemPrompt = this.buildSystemPrompt(context, blockchainData);
        
        const messageHistory = context?.messages.slice(-10) || [];
        const chatMessages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
          { role: 'system', content: systemPrompt },
          ...messageHistory.map(m => ({ 
            role: m.role as 'user' | 'assistant', 
            content: m.content 
          } as OpenAI.Chat.Completions.ChatCompletionMessageParam)),
          { role: 'user', content: message }
        ];
        
        this.logger.debug('Calling OpenAI API', {
          walletAddress,
          model: 'gpt-4',
          messageCount: chatMessages.length,
          historyLength: messageHistory.length,
          systemPromptLength: systemPrompt.length,
          hasCommand: !!command,
          commandType: command?.type
        });
        
        const completion = await this.openai.chat.completions.create({
          model: 'gpt-4',
          messages: chatMessages,
          temperature: 0.7,
          max_tokens: 500
        });
        
        const openAIDuration = performance.now() - openAIStartTime;
        
        this.logger.info('OpenAI API call completed', {
          walletAddress,
          duration: Math.round(openAIDuration),
          usage: completion.usage,
          finishReason: completion.choices[0]?.finish_reason,
          responseLength: completion.choices[0]?.message?.content?.length || 0
        });
        
        const aiMessage = completion.choices[0]?.message?.content || 'I apologize, but I could not process your request.';
        
        // Update context with AI response
        if (context) {
          context.messages.push({
            role: 'assistant',
            content: aiMessage,
            timestamp: new Date().toISOString()
          });
          
          this.logger.debug('Updated conversation context', {
            walletAddress,
            totalMessages: context.messages.length,
            lastMessageRole: 'assistant'
          });
        }
        
        const suggestions = this.generateSuggestions(message, context);
        const confidence = command ? 0.9 : 0.7;
        const reasoning = command ? `Detected command: ${command.type}` : 'General conversation';
        
        const totalDuration = performance.now() - startTime;
        
        this.logger.debug('AI response generated', {
          walletAddress,
          totalDuration: Math.round(totalDuration),
          openAIDuration: Math.round(openAIDuration),
          suggestionsCount: suggestions.length,
          confidence,
          reasoning,
          hasBlockchainData: !!blockchainData
        });
        
        const response: AIResponse = {
          message: aiMessage,
          command,
          suggestions,
          confidence,
          reasoning
        };
        
        // Add blockchain data if available
        if (blockchainData) {
          response.blockchainData = {
            hiveInsights: blockchainData.hiveInsights,
            marketData: blockchainData.marketData,
            isBlockchainQuery: true,
            queryType: blockchainData.queryType as 'price' | 'defi' | 'staking' | 'wallet' | 'transaction' | 'general'
          };
          
          // Update context with blockchain query tracking
          this.updateBlockchainContext(walletAddress, message, blockchainData.queryType, true);
        }
        
        return response;
      },
      (error) => {
        const duration = performance.now() - startTime;
        this.logger.error('OpenAI API call failed', {
          walletAddress,
          duration: Math.round(duration),
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
          hasCommand: !!command
        });
        return new Error(`Failed to generate AI response: ${error}`);
      }
    );
  };

  /**
   * Update conversation context
   */
  private updateContext = (
    walletAddress: string,
    message: string,
    portfolioData?: any
  ): TE.TaskEither<Error, void> =>
    TE.of((() => {
      let context = this.contexts.get(walletAddress);
      const isNewContext = !context;
      
      if (!context) {
        context = {
          walletAddress,
          messages: [],
          portfolioData,
          blockchainContext: {
            recentBlockchainQueries: [],
            preferredQueryTypes: []
          }
        };
        this.contexts.set(walletAddress, context);
        
        this.logger.debug('Created new chat context', {
          walletAddress,
          hasPortfolioData: !!portfolioData
        });
      }

      if (portfolioData) {
        context.portfolioData = portfolioData;
        this.logger.debug('Updated portfolio data in context', {
          walletAddress,
          portfolioValueUSD: portfolioData.totalValueUSD,
          lendingPositions: portfolioData.lendingPositions?.length || 0,
          liquidityPositions: portfolioData.liquidityPositions?.length || 0
        });
      }

      context.messages.push({
        role: 'user',
        content: message,
        timestamp: new Date().toISOString()
      });

      // Keep last 50 messages to prevent memory bloat
      const originalLength = context.messages.length;
      if (context.messages.length > 50) {
        context.messages = context.messages.slice(-50);
        this.logger.debug('Trimmed context messages', {
          walletAddress,
          originalLength,
          newLength: context.messages.length
        });
      }
      
      this.logger.debug('Updated chat context', {
        walletAddress,
        totalMessages: context.messages.length,
        isNewContext,
        messageLength: message.length
      });
    })());

  /**
   * Build system prompt for AI
   */
  private buildSystemPrompt(context?: ChatContext, blockchainData?: any): string {
    const basePrompt = `You are an AI assistant for the Sei Portfolio Manager, a DeFi portfolio management platform on the Sei Network.

Your capabilities include:
- Managing lending positions on Yei Finance (Aave V3 fork)
- Managing concentrated liquidity positions on DragonSwap V2
- Providing portfolio analysis and recommendations
- Executing transactions through natural language commands
- Accessing real-time blockchain data and market insights

Current supported commands:
- Supply/Withdraw from lending markets
- Borrow/Repay loans
- Add/Remove liquidity positions
- Check portfolio status
- Rebalance positions

Guidelines:
- Be concise and helpful
- Always confirm transaction details before execution
- Provide clear explanations of risks
- Suggest optimal strategies based on market conditions
- Use technical terms when appropriate but explain them clearly
- When blockchain data is available, incorporate it into your responses
- Prioritize real-time data over general information

When users ask about transactions, parse their intent and provide clear next steps.`;

    let contextualPrompt = basePrompt;

    if (context?.portfolioData) {
      contextualPrompt += `

Current Portfolio Data:
- Total Value: $${context.portfolioData.totalValueUSD?.toFixed(2) || '0.00'}
- Lending Positions: ${context.portfolioData.lendingPositions?.length || 0}
- Liquidity Positions: ${context.portfolioData.liquidityPositions?.length || 0}
- Health Factor: ${context.portfolioData.healthFactor || 'N/A'}`;
    }

    if (blockchainData && blockchainData.hiveInsights) {
      contextualPrompt += `

Real-time Blockchain Insights:
${JSON.stringify(blockchainData.hiveInsights, null, 2)}

Use this blockchain data to provide more accurate and timely advice.`;
    }

    if (context?.blockchainContext && context.blockchainContext.recentBlockchainQueries.length > 0) {
      const recentQueries = context.blockchainContext.recentBlockchainQueries.slice(-3);
      contextualPrompt += `

Recent Blockchain Queries:
${recentQueries.map(q => `- ${q.type}: ${q.query.substring(0, 100)}...`).join('\n')}`;
    }

    contextualPrompt += `

Use this context to provide personalized advice.`;

    return contextualPrompt;
  }

  /**
   * Generate conversation suggestions
   */
  private generateSuggestions(_message: string, context?: ChatContext): string[] {
    const defaultSuggestions = [
      "Show my portfolio",
      "Supply 1000 USDC to Yei Finance",
      "Check my lending positions",
      "What's my current APY?",
      "Rebalance my portfolio"
    ];

    // Contextual suggestions based on portfolio state
    if (context?.portfolioData) {
      const suggestions = [];
      
      if (context.portfolioData.lendingPositions?.length === 0) {
        suggestions.push("Start lending to earn yield");
      }
      
      if (context.portfolioData.liquidityPositions?.length === 0) {
        suggestions.push("Add liquidity to earn fees");
      }
      
      if (context.portfolioData.healthFactor < 1.5) {
        suggestions.push("Improve health factor by adding collateral");
      }

      return suggestions.length > 0 ? suggestions : defaultSuggestions;
    }

    // Add blockchain-specific suggestions based on recent queries
    if (context?.blockchainContext && context.blockchainContext.preferredQueryTypes.length > 0) {
      const blockchainSuggestions = [];
      
      if (context.blockchainContext.preferredQueryTypes.includes('price')) {
        blockchainSuggestions.push("Check SEI token price", "Show market cap data");
      }
      
      if (context.blockchainContext.preferredQueryTypes.includes('defi')) {
        blockchainSuggestions.push("Find best yield opportunities", "Check DeFi protocol stats");
      }
      
      if (context.blockchainContext.preferredQueryTypes.includes('staking')) {
        blockchainSuggestions.push("Show staking rewards", "Check validator performance");
      }
      
      if (blockchainSuggestions.length > 0) {
        return [...blockchainSuggestions, ...defaultSuggestions.slice(0, 3)];
      }
    }

    return defaultSuggestions;
  }

  /**
   * Get conversation history
   */
  public getConversationHistory = (walletAddress: string): ChatMessage[] => {
    const context = this.contexts.get(walletAddress);
    const messages = context?.messages || [];
    
    this.logger.debug('Retrieved conversation history', {
      walletAddress,
      messageCount: messages.length,
      contextExists: !!context
    });
    
    return messages;
  };

  /**
   * Clear conversation history
   */
  public clearConversationHistory = (walletAddress: string): TE.TaskEither<Error, void> =>
    TE.of((() => {
      const context = this.contexts.get(walletAddress);
      const hadMessages = context?.messages.length || 0;
      
      if (context) {
        context.messages = [];
      }
      
      this.logger.info('Cleared conversation history', {
        walletAddress,
        clearedMessageCount: hadMessages,
        contextExists: !!context
      });
    })());

  /**
   * Update blockchain context for query tracking
   */
  private updateBlockchainContext = (
    walletAddress: string,
    query: string,
    queryType: string,
    hadBlockchainData: boolean
  ): void => {
    const context = this.contexts.get(walletAddress);
    if (!context) return;

    if (!context.blockchainContext) {
      context.blockchainContext = {
        recentBlockchainQueries: [],
        preferredQueryTypes: []
      };
    }

    // Add to recent queries
    context.blockchainContext.recentBlockchainQueries.push({
      query,
      timestamp: new Date(),
      type: queryType,
      hadBlockchainData
    });

    // Keep only last 10 queries
    if (context.blockchainContext.recentBlockchainQueries.length > 10) {
      context.blockchainContext.recentBlockchainQueries = 
        context.blockchainContext.recentBlockchainQueries.slice(-10);
    }

    // Update preferred query types
    const queryTypeCounts = context.blockchainContext.recentBlockchainQueries.reduce((acc, q) => {
      acc[q.type] = (acc[q.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    context.blockchainContext.preferredQueryTypes = Object.entries(queryTypeCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([type]) => type);

    this.logger.debug('Updated blockchain context', {
      walletAddress,
      queryType,
      totalQueries: context.blockchainContext.recentBlockchainQueries.length,
      preferredTypes: context.blockchainContext.preferredQueryTypes
    });
  };

  /**
   * Generate portfolio analysis
   */
  public generatePortfolioAnalysis = (
    portfolioData: any,
    walletAddress: string
  ): TE.TaskEither<Error, string> => {
    const startTime = performance.now();
    
    this.logger.info('Generating portfolio analysis', {
      walletAddress,
      portfolioValue: portfolioData.totalValueUSD,
      lendingPositions: portfolioData.lendingPositions?.length || 0,
      liquidityPositions: portfolioData.liquidityPositions?.length || 0,
      timestamp: new Date().toISOString()
    });
    
    return TE.tryCatch(
      async () => {
        const prompt = `Analyze this DeFi portfolio and provide insights:

Portfolio Data:
${JSON.stringify(portfolioData, null, 2)}

Provide:
1. Risk assessment
2. Yield optimization suggestions
3. Rebalancing recommendations
4. Market outlook impact

Keep the analysis concise and actionable.`;

        const apiStartTime = performance.now();
        const completion = await this.openai.chat.completions.create({
          model: 'gpt-4',
          messages: [{ role: 'user', content: prompt }] as OpenAI.Chat.Completions.ChatCompletionMessageParam[],
          temperature: 0.3,
          max_tokens: 800
        });
        
        const apiDuration = performance.now() - apiStartTime;
        const totalDuration = performance.now() - startTime;
        
        this.logger.info('Portfolio analysis generated', {
          walletAddress,
          apiDuration: Math.round(apiDuration),
          totalDuration: Math.round(totalDuration),
          usage: completion.usage,
          analysisLength: completion.choices[0]?.message?.content?.length || 0
        });

        return completion.choices[0]?.message?.content || 'Unable to generate analysis.';
      },
      (error) => {
        const duration = performance.now() - startTime;
        this.logger.error('Portfolio analysis generation failed', {
          walletAddress,
          duration: Math.round(duration),
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        });
        return new Error(`Failed to generate portfolio analysis: ${error}`);
      }
    );
  };

  /**
   * Generate enhanced portfolio analysis using all adapters
   */
  public generateEnhancedPortfolioAnalysis = (
    portfolioData: any,
    walletAddress: string,
    options: {
      includeHiveInsights?: boolean;
      includeSAKData?: boolean;
      includeMCPRealtime?: boolean;
    } = {}
  ): TE.TaskEither<Error, any> => {
    const startTime = performance.now();
    
    this.logger.info('Generating enhanced portfolio analysis', {
      walletAddress,
      options,
      portfolioValue: portfolioData.totalValueUSD,
      timestamp: new Date().toISOString()
    });
    
    return pipe(
      this.gatherAdapterData('analyze portfolio performance and recommendations', walletAddress),
      TE.chain(adapterData => {
        this.logger.debug('Adapter data gathered for enhanced analysis', {
          walletAddress,
          hiveDataAvailable: !!adapterData.hiveData,
          sakDataAvailable: !!adapterData.sakData,
          mcpDataAvailable: !!adapterData.mcpData
        });
        
        return TE.tryCatch(
          async () => {
            const baseAnalysisPrompt = `Analyze this DeFi portfolio with enhanced data sources:\n\nPortfolio Data:\n${JSON.stringify(portfolioData, null, 2)}`;

            let enhancedPrompt = baseAnalysisPrompt;

            if (options.includeHiveInsights && adapterData.hiveData) {
              enhancedPrompt += `\n\nHive Intelligence Insights:\n${JSON.stringify(adapterData.hiveData, null, 2)}`;
            }

            if (options.includeSAKData && adapterData.sakData) {
              enhancedPrompt += `\n\nSei Agent Kit Data:\n${JSON.stringify(adapterData.sakData, null, 2)}`;
            }

            if (options.includeMCPRealtime && adapterData.mcpData) {
              enhancedPrompt += `\n\nReal-time Blockchain Data:\n${JSON.stringify(adapterData.mcpData, null, 2)}`;
            }

            enhancedPrompt += `\n\nProvide:\n1. Comprehensive risk assessment\n2. AI-powered yield optimization suggestions\n3. Real-time market impact analysis\n4. Actionable rebalancing recommendations\n5. Dragon Ball Z themed power level assessment\n\nKeep the analysis detailed yet actionable.`;

            const apiStartTime = performance.now();
            const completion = await this.openai.chat.completions.create({
              model: 'gpt-4',
              messages: [{ role: 'user', content: enhancedPrompt }] as OpenAI.Chat.Completions.ChatCompletionMessageParam[],
              temperature: 0.3,
              max_tokens: 1200
            });
            
            const apiDuration = performance.now() - apiStartTime;
            const totalDuration = performance.now() - startTime;
            
            this.logger.info('Enhanced portfolio analysis completed', {
              walletAddress,
              apiDuration: Math.round(apiDuration),
              totalDuration: Math.round(totalDuration),
              usage: completion.usage,
              analysisLength: completion.choices[0]?.message?.content?.length || 0
            });

            const analysisText = completion.choices[0]?.message?.content || 'Unable to generate enhanced analysis.';
            
            return {
              analysisText,
              enhancedData: this.generateEnhancedAnalysis(adapterData),
              rawAdapterData: adapterData,
              timestamp: new Date().toISOString(),
              analysisType: 'enhanced_comprehensive'
            };
          },
          (error) => {
            const duration = performance.now() - startTime;
            this.logger.error('Enhanced portfolio analysis failed', {
              walletAddress,
              duration: Math.round(duration),
              error: error instanceof Error ? error.message : String(error),
              stack: error instanceof Error ? error.stack : undefined
            });
            return new Error(`Failed to generate enhanced portfolio analysis: ${error}`);
          }
        );
      })
    );
  };

  /**
   * Process message with enhanced features
   */
  public processMessageEnhanced = (
    message: string,
    walletAddress: string,
    portfolioData?: any
  ): TE.TaskEither<Error, AIResponse> => {
    this.logger.debug('Processing enhanced message', {
      walletAddress,
      messageLength: message.length,
      hasPortfolioData: !!portfolioData,
      adapterStatus: this.getAdapterStatus()
    });
    
    // For now, use the same logic as processMessage
    // In the future, this can be enhanced with additional adapters
    return this.processMessage(message, walletAddress, portfolioData);
  };

  /**
   * Gather data from all adapters
   */
  private gatherAdapterData = (
    query: string,
    walletAddress: string
  ): TE.TaskEither<Error, any> => {
    const startTime = performance.now();
    
    this.logger.debug('Gathering adapter data', {
      query,
      walletAddress,
      adapterStatus: this.getAdapterStatus()
    });
    
    return pipe(
      TE.tryCatch(
        async () => {
          const results: any = {
            hiveData: null,
            sakData: null,
            mcpData: null,
            timestamp: new Date().toISOString()
          };

          // Gather Hive Intelligence data
          if (this.hiveAdapter) {
            try {
              this.logger.debug('Calling Hive Intelligence adapter', { query, walletAddress });
              const hiveResult = await this.hiveAdapter.search(query, { walletAddress })();
              if (E.isRight(hiveResult)) {
                results.hiveData = hiveResult.right;
                this.logger.debug('Hive data gathered successfully', { walletAddress, hasData: !!hiveResult.right });
              } else {
                this.logger.error('Hive adapter call failed', { error: hiveResult.left.message, walletAddress });
                results.hiveData = { error: 'Hive adapter failed', query, timestamp: new Date().toISOString() };
              }
            } catch (error) {
              this.logger.warn('Hive adapter failed', { 
                walletAddress, 
                error: error instanceof Error ? error.message : String(error) 
              });
              results.hiveData = { error: 'Hive adapter unavailable', query, timestamp: new Date().toISOString() };
            }
          } else {
            this.logger.debug('Hive adapter not available', { walletAddress });
            results.hiveData = { error: 'Hive adapter not initialized', query, timestamp: new Date().toISOString() };
          }

          // Gather SAK (Sei Agent Kit) data
          if (this.sakAdapter) {
            try {
              this.logger.debug('Calling SAK adapter', { query, walletAddress });
              const sakToolsResult = this.sakAdapter.getSAKTools();
              const sakTools = E.isRight(sakToolsResult) ? sakToolsResult.right : [];
              results.sakData = { 
                tools: sakTools, 
                walletAddress,
                timestamp: new Date().toISOString() 
              };
              this.logger.debug('SAK data gathered successfully', { walletAddress, toolCount: sakTools?.length || 0 });
            } catch (error) {
              this.logger.warn('SAK adapter failed', { 
                walletAddress, 
                error: error instanceof Error ? error.message : String(error) 
              });
              results.sakData = { error: 'SAK adapter unavailable', timestamp: new Date().toISOString() };
            }
          } else {
            this.logger.debug('SAK adapter not available', { walletAddress });
            results.sakData = { error: 'SAK adapter not initialized', timestamp: new Date().toISOString() };
          }

          // Gather MCP (real-time blockchain) data
          if (this.mcpAdapter && this.mcpAdapter.isConnected()) {
            try {
              this.logger.debug('Calling MCP adapter', { walletAddress });
              const blockchainStateResult = await this.mcpAdapter.getBlockchainState()();
              const walletBalanceResult = await this.mcpAdapter.getWalletBalance(walletAddress)();
              
              const blockchainState = E.isRight(blockchainStateResult) ? blockchainStateResult.right : null;
              const walletBalance = E.isRight(walletBalanceResult) ? walletBalanceResult.right : null;
              results.mcpData = { 
                blockchainState, 
                walletBalance,
                isConnected: true,
                timestamp: new Date().toISOString() 
              };
              this.logger.debug('MCP data gathered successfully', { walletAddress, hasBalance: !!walletBalance });
            } catch (error) {
              this.logger.warn('MCP adapter failed', { 
                walletAddress, 
                error: error instanceof Error ? error.message : String(error) 
              });
              results.mcpData = { error: 'MCP adapter failed', isConnected: false, timestamp: new Date().toISOString() };
            }
          } else {
            this.logger.debug('MCP adapter not available or disconnected', { 
              walletAddress, 
              isAvailable: !!this.mcpAdapter,
              isConnected: this.mcpAdapter?.isConnected() || false 
            });
            results.mcpData = { 
              error: 'MCP adapter not connected', 
              isConnected: false, 
              timestamp: new Date().toISOString() 
            };
          }

          const duration = performance.now() - startTime;
          this.logger.info('All adapter data gathered', {
            walletAddress,
            duration: Math.round(duration),
            hiveSuccess: !!results.hiveData && !results.hiveData.error,
            sakSuccess: !!results.sakData && !results.sakData.error,
            mcpSuccess: !!results.mcpData && !results.mcpData.error
          });

          return results;
        },
        (error) => {
          const duration = performance.now() - startTime;
          this.logger.error('Failed to gather adapter data', {
            walletAddress,
            query,
            duration: Math.round(duration),
            error: error instanceof Error ? error.message : String(error)
          });
          return new Error(`Failed to gather adapter data: ${error}`);
        }
      )
    );
  };

  /**
   * Generate enhanced analysis from adapter data
   */
  private generateEnhancedAnalysis = (adapterData: any): any => {
    return {
      riskScore: 0.5,
      yieldOptimizations: [],
      marketInsights: [],
      rebalancingRecommendations: [],
      powerLevel: 'Over 9000! 🐉'
    };
  };

  /**
   * Get adapter connection status
   */
  public getAdapterStatus(): {
    hive: boolean;
    sak: boolean;
    mcp: boolean;
  } {
    return {
      hive: !!this.hiveAdapter,
      sak: !!this.sakAdapter,
      mcp: !!this.mcpAdapter && this.mcpAdapter.isConnected()
    };
  }

  /**
   * Initialize adapters
   */
  public initializeAdapters(
    hiveAdapter?: HiveIntelligenceAdapter,
    sakAdapter?: SeiAgentKitAdapter,
    mcpAdapter?: SeiMCPAdapter
  ): void {
    if (hiveAdapter) this.hiveAdapter = hiveAdapter;
    if (sakAdapter) this.sakAdapter = sakAdapter;
    if (mcpAdapter) this.mcpAdapter = mcpAdapter;
    
    this.logger.info('Adapters initialized', {
      hiveAdapter: !!hiveAdapter,
      sakAdapter: !!sakAdapter,
      mcpAdapter: !!mcpAdapter,
      mcpConnected: mcpAdapter?.isConnected(),
      timestamp: new Date().toISOString()
    });
  }
}

// ChatInterface class implementation
class ChatInterface {
  parseCommand(message: string): E.Either<Error, Command | undefined> {
    // Simplified command parsing
    const lowerMessage = message.toLowerCase();
    
    if (lowerMessage.includes('supply') || lowerMessage.includes('lend')) {
      return E.right({ type: 'supply', payload: { action: 'supply' } });
    }
    
    if (lowerMessage.includes('withdraw') || lowerMessage.includes('remove')) {
      return E.right({ type: 'withdraw', payload: { action: 'withdraw' } });
    }
    
    if (lowerMessage.includes('swap') || lowerMessage.includes('trade')) {
      return E.right({ type: 'swap', payload: { action: 'swap' } });
    }
    
    if (lowerMessage.includes('balance') || lowerMessage.includes('portfolio')) {
      return E.right({ type: 'query', payload: { action: 'balance' } });
    }
    
    if (lowerMessage.includes('stake') || lowerMessage.includes('delegate')) {
      return E.right({ type: 'stake', payload: { action: 'stake' } });
    }
    
    if (lowerMessage.includes('price') || lowerMessage.includes('market')) {
      return E.right({ type: 'market_query', payload: { action: 'price_check' } });
    }
    
    return E.right(undefined);
  }
}

/**
 * Blockchain integration utility functions
 */
export const BlockchainIntegrationUtils = {
  /**
   * Check if message is blockchain-related
   */
  isBlockchainQuery: (message: string): boolean => {
    const blockchainKeywords = [
      'price', 'token', 'coin', 'crypto', 'blockchain', 'defi', 'yield',
      'stake', 'swap', 'liquidity', 'pool', 'validator', 'apy', 'apr',
      'balance', 'wallet', 'transaction', 'gas', 'fee', 'sei', 'network'
    ];
    
    const lowerMessage = message.toLowerCase();
    return blockchainKeywords.some(keyword => lowerMessage.includes(keyword));
  },

  /**
   * Extract query type from message
   */
  extractQueryType: (message: string): string => {
    const lowerMessage = message.toLowerCase();
    
    if (lowerMessage.includes('price') || lowerMessage.includes('cost') || lowerMessage.includes('value')) {
      return 'price';
    }
    if (lowerMessage.includes('stake') || lowerMessage.includes('delegate') || lowerMessage.includes('validator')) {
      return 'staking';
    }
    if (lowerMessage.includes('yield') || lowerMessage.includes('pool') || lowerMessage.includes('liquidity')) {
      return 'defi';
    }
    if (lowerMessage.includes('balance') || lowerMessage.includes('wallet') || lowerMessage.includes('address')) {
      return 'wallet';
    }
    if (lowerMessage.includes('transaction') || lowerMessage.includes('tx') || lowerMessage.includes('gas')) {
      return 'transaction';
    }
    
    return 'general';
  },

  /**
   * Format blockchain data for response
   */
  formatBlockchainResponse: (data: any): string => {
    if (!data || !data.hiveInsights) {
      return 'No blockchain data available.';
    }
    
    try {
      const insights = data.hiveInsights;
      if (typeof insights === 'string') {
        return insights;
      }
      
      if (typeof insights === 'object') {
        return JSON.stringify(insights, null, 2);
      }
      
      return 'Blockchain data retrieved successfully.';
    } catch (error) {
      return 'Error formatting blockchain data.';
    }
  }
};

/**
 * Export types for external use
 */
export type { 
  ChatContext as AIServiceChatContext, 
  AIResponse as AIServiceResponse, 
  Command as AIServiceCommand, 
  ChatMessage as AIServiceChatMessage 
};
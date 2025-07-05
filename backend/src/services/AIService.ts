import { pipe } from 'fp-ts/function';
import * as TE from 'fp-ts/TaskEither';
import * as E from 'fp-ts/Either';
import OpenAI from 'openai';
import { createServiceLogger } from './LoggingService';
import { withErrorRecovery } from './ErrorHandlingService';

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
    this.logger.info('AIService initialized with Dragon Ball Z theming');
  }

  /**
   * Process user message and generate AI response
   */
  public processMessage = (
    message: string,
    walletAddress: string,
    portfolioData?: any
  ): TE.TaskEither<Error, AIResponse> =>
    pipe(
      this.updateContext(walletAddress, message, portfolioData),
      TE.chain(() => this.parseCommand(message)),
      TE.chain(command => this.generateResponse(message, command, walletAddress))
    );

  /**
   * Parse command from natural language
   */
  private parseCommand = (message: string): TE.TaskEither<Error, Command | undefined> =>
    pipe(
      this.chatInterface.parseCommand(message),
      TE.fromEither,
      TE.orElse(() => TE.right(undefined))
    );

  /**
   * Generate AI response using OpenAI
   */
  private generateResponse = (
    message: string,
    command: Command | undefined,
    walletAddress: string
  ): TE.TaskEither<Error, AIResponse> =>
    TE.tryCatch(
      async () => {
        const context = this.contexts.get(walletAddress);
        const systemPrompt = this.buildSystemPrompt(context);

        const completion = await this.openai.chat.completions.create({
          model: 'gpt-4',
          messages: [
            { role: 'system', content: systemPrompt },
            ...context?.messages.slice(-10).map(m => ({ 
              role: m.role as 'user' | 'assistant', 
              content: m.content 
            })) || [],
            { role: 'user', content: message }
          ],
          temperature: 0.7,
          max_tokens: 500
        });

        const aiMessage = completion.choices[0]?.message?.content || 'I apologize, but I could not process your request.';
        
        // Update context with AI response
        if (context) {
          context.messages.push({
            role: 'assistant',
            content: aiMessage,
            timestamp: new Date().toISOString()
          });
        }

        return {
          message: aiMessage,
          command,
          suggestions: this.generateSuggestions(message, context),
          confidence: command ? 0.9 : 0.7,
          reasoning: command ? `Detected command: ${command.type}` : 'General conversation'
        };
      },
      (error) => new Error(`Failed to generate AI response: ${error}`)
    );

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
      
      if (!context) {
        context = {
          walletAddress,
          messages: [],
          portfolioData
        };
        this.contexts.set(walletAddress, context);
      }

      if (portfolioData) {
        context.portfolioData = portfolioData;
      }

      context.messages.push({
        role: 'user',
        content: message,
        timestamp: new Date().toISOString()
      });

      // Keep last 50 messages to prevent memory bloat
      if (context.messages.length > 50) {
        context.messages = context.messages.slice(-50);
      }
    })());

  /**
   * Build system prompt for AI
   */
  private buildSystemPrompt(context?: ChatContext): string {
    const basePrompt = `You are an AI assistant for the Sei Portfolio Manager, a DeFi portfolio management platform on the Sei Network.

Your capabilities include:
- Managing lending positions on Yei Finance (Aave V3 fork)
- Managing concentrated liquidity positions on DragonSwap V2
- Providing portfolio analysis and recommendations
- Executing transactions through natural language commands

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

When users ask about transactions, parse their intent and provide clear next steps.`;

    if (context?.portfolioData) {
      return `${basePrompt}

Current Portfolio Data:
- Total Value: $${context.portfolioData.totalValueUSD?.toFixed(2) || '0.00'}
- Lending Positions: ${context.portfolioData.lendingPositions?.length || 0}
- Liquidity Positions: ${context.portfolioData.liquidityPositions?.length || 0}
- Health Factor: ${context.portfolioData.healthFactor || 'N/A'}

Use this context to provide personalized advice.`;
    }

    return basePrompt;
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

    return defaultSuggestions;
  }

  /**
   * Get conversation history
   */
  public getConversationHistory = (walletAddress: string): ChatMessage[] => {
    return this.contexts.get(walletAddress)?.messages || [];
  };

  /**
   * Clear conversation history
   */
  public clearConversationHistory = (walletAddress: string): TE.TaskEither<Error, void> =>
    TE.of((() => {
      const context = this.contexts.get(walletAddress);
      if (context) {
        context.messages = [];
      }
    })());

  /**
   * Generate portfolio analysis
   */
  public generatePortfolioAnalysis = (
    portfolioData: any,
    _walletAddress: string
  ): TE.TaskEither<Error, string> =>
    TE.tryCatch(
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

        const completion = await this.openai.chat.completions.create({
          model: 'gpt-4',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.3,
          max_tokens: 800
        });

        return completion.choices[0]?.message?.content || 'Unable to generate analysis.';
      },
      (error) => new Error(`Failed to generate portfolio analysis: ${error}`)
    );

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
  ): TE.TaskEither<Error, any> =>
    pipe(
      this.gatherAdapterData('analyze portfolio performance and recommendations', walletAddress),
      TE.chain(adapterData => 
        TE.tryCatch(
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

            const completion = await this.openai.chat.completions.create({
              model: 'gpt-4',
              messages: [{ role: 'user', content: enhancedPrompt }],
              temperature: 0.3,
              max_tokens: 1200
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
          (error) => new Error(`Failed to generate enhanced portfolio analysis: ${error}`)
        )
      )
    );

  /**
   * Process message with enhanced features
   */
  public processMessageEnhanced = (
    message: string,
    walletAddress: string,
    portfolioData?: any
  ): TE.TaskEither<Error, AIResponse> => {
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
    // Mock implementation for now
    return TE.right({
      hiveData: { query, insights: [], timestamp: new Date().toISOString() },
      sakData: { tools: [], executions: [], timestamp: new Date().toISOString() },
      mcpData: { state: 'connected', data: {}, timestamp: new Date().toISOString() }
    });
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
  }
}

// Adapter interface types
interface HiveIntelligenceAdapter {
  search: (query: string, metadata?: any) => Promise<any>;
  getAnalytics: (query: string, metadata?: any) => Promise<any>;
}

interface SeiAgentKitAdapter {
  executeTool: (toolName: string, params: any) => Promise<any>;
  getTools: () => Promise<any>;
}

interface SeiMCPAdapter {
  isConnected: () => boolean;
  getBlockchainState: () => Promise<any>;
  getWalletBalance: (address: string) => Promise<any>;
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
    
    return E.right(undefined);
  }
}
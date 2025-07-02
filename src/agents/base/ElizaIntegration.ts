import { Either, left, right } from 'fp-ts/Either';
import { TaskEither } from 'fp-ts/TaskEither';
import * as TE from 'fp-ts/TaskEither';
import { pipe } from 'fp-ts/function';
import { BaseAgent, AgentConfig, AgentError, ActionContext, ActionResult } from './BaseAgent';

/**
 * ElizaOS Integration Layer
 * 
 * Provides seamless integration between DeFi agents and ElizaOS character system
 * - Character file format support
 * - Message routing and processing
 * - Context management
 * - Plugin integration
 */

export interface ElizaCharacter {
  name: string;
  username: string;
  description: string;
  bio: string[];
  lore: string[];
  knowledge: string[];
  messageExamples: MessageExample[];
  postExamples: string[];
  topics: string[];
  style: CharacterStyle;
  adjectives: string[];
  settings: CharacterSettings;
  plugins: string[];
}

export interface MessageExample {
  user: string;
  content: { text: string };
}

export interface CharacterStyle {
  all: string[];
  chat: string[];
  post: string[];
}

export interface CharacterSettings {
  secrets?: Record<string, string>;
  voice?: {
    model?: string;
    url?: string;
  };
  embeddingModel?: string;
  chains?: Record<string, any>;
}

export interface ElizaMessage {
  userId: string;
  content: {
    text: string;
    action?: string;
    source?: string;
    url?: string;
    inReplyTo?: string;
  };
  agentId: string;
  roomId: string;
}

export interface ElizaResponse {
  text: string;
  action?: string;
  metadata?: Record<string, any>;
}

export interface ElizaContext {
  agentId: string;
  userId: string;
  roomId: string;
  messageHistory: ElizaMessage[];
  userState: Record<string, any>;
  environmentState: Record<string, any>;
}

/**
 * ElizaOS Integration Service
 */
export class ElizaIntegration {
  private agents: Map<string, BaseAgent> = new Map();
  private characters: Map<string, ElizaCharacter> = new Map();
  private contexts: Map<string, ElizaContext> = new Map();

  /**
   * Register agent with ElizaOS character
   */
  public registerAgent(agent: BaseAgent, character: ElizaCharacter): Either<AgentError, void> {
    const agentConfig = agent.getConfig();
    
    if (this.agents.has(agentConfig.id)) {
      return left(this.createError('AGENT_EXISTS', `Agent ${agentConfig.id} already registered`));
    }

    this.agents.set(agentConfig.id, agent);
    this.characters.set(agentConfig.id, character);

    return right(undefined);
  }

  /**
   * Process message through ElizaOS system
   */
  public processMessage(message: ElizaMessage): TaskEither<AgentError, ElizaResponse> {
    const agent = this.agents.get(message.agentId);
    
    if (!agent) {
      return TE.left(this.createError('AGENT_NOT_FOUND', `Agent ${message.agentId} not found`));
    }

    return pipe(
      this.getOrCreateContext(message),
      TE.fromEither,
      TE.chain(context => this.processWithContext(agent, message, context))
    );
  }

  /**
   * Generate ElizaOS character file
   */
  public generateCharacterFile(
    agentConfig: AgentConfig,
    characterConfig: Partial<ElizaCharacter>
  ): ElizaCharacter {
    const defaultCharacter: ElizaCharacter = {
      name: agentConfig.name,
      username: agentConfig.id.toLowerCase(),
      description: agentConfig.description,
      bio: [
        `I am ${agentConfig.name}, a specialized DeFi agent.`,
        `My capabilities include: ${agentConfig.capabilities.join(', ')}.`,
        "I help users optimize their DeFi strategies and manage risk."
      ],
      lore: [
        "I was created to democratize access to sophisticated DeFi strategies.",
        "I continuously learn from market conditions and user preferences.",
        "My goal is to maximize yields while minimizing risks."
      ],
      knowledge: this.generateKnowledgeBase(agentConfig),
      messageExamples: this.generateMessageExamples(agentConfig),
      postExamples: this.generatePostExamples(agentConfig),
      topics: this.generateTopics(agentConfig),
      style: {
        all: [
          "Be professional and informative",
          "Focus on data-driven insights",
          "Always consider risk management",
          "Explain complex concepts clearly"
        ],
        chat: [
          "Respond with actionable advice",
          "Ask clarifying questions when needed",
          "Provide specific numbers and metrics"
        ],
        post: [
          "Share market insights",
          "Highlight opportunities and risks",
          "Use relevant DeFi terminology"
        ]
      },
      adjectives: this.generateAdjectives(agentConfig),
      settings: {
        secrets: {},
        voice: {
          model: "en_US-hfc_female-medium"
        },
        embeddingModel: "text-embedding-ada-002",
        chains: {
          sei: true
        }
      },
      plugins: agentConfig.capabilities.map(cap => `${cap.toLowerCase()}-plugin`)
    };

    return { ...defaultCharacter, ...characterConfig };
  }

  /**
   * Load character from file
   */
  public loadCharacterFromFile(filePath: string): TaskEither<AgentError, ElizaCharacter> {
    return pipe(
      TE.tryCatch(
        async () => {
          const fs = await import('fs/promises');
          const content = await fs.readFile(filePath, 'utf-8');
          return JSON.parse(content) as ElizaCharacter;
        },
        error => this.createError('CHARACTER_LOAD_FAILED', `Failed to load character: ${error}`)
      )
    );
  }

  /**
   * Save character to file
   */
  public saveCharacterToFile(character: ElizaCharacter, filePath: string): TaskEither<AgentError, void> {
    return pipe(
      TE.tryCatch(
        async () => {
          const fs = await import('fs/promises');
          const content = JSON.stringify(character, null, 2);
          await fs.writeFile(filePath, content, 'utf-8');
        },
        error => this.createError('CHARACTER_SAVE_FAILED', `Failed to save character: ${error}`)
      )
    );
  }

  /**
   * Get agent context
   */
  public getContext(agentId: string, userId: string, roomId: string): Either<AgentError, ElizaContext> {
    const contextKey = `${agentId}:${userId}:${roomId}`;
    const context = this.contexts.get(contextKey);
    
    if (!context) {
      return left(this.createError('CONTEXT_NOT_FOUND', 'Context not found'));
    }

    return right(context);
  }

  /**
   * Update context state
   */
  public updateContext(
    agentId: string, 
    userId: string, 
    roomId: string, 
    updates: Partial<ElizaContext>
  ): Either<AgentError, void> {
    const contextKey = `${agentId}:${userId}:${roomId}`;
    const existingContext = this.contexts.get(contextKey);
    
    if (!existingContext) {
      return left(this.createError('CONTEXT_NOT_FOUND', 'Context not found'));
    }

    const updatedContext: ElizaContext = {
      ...existingContext,
      ...updates
    };

    this.contexts.set(contextKey, updatedContext);
    return right(undefined);
  }

  /**
   * Clear context
   */
  public clearContext(agentId: string, userId: string, roomId: string): void {
    const contextKey = `${agentId}:${userId}:${roomId}`;
    this.contexts.delete(contextKey);
  }

  /**
   * Get or create context
   */
  private getOrCreateContext(message: ElizaMessage): Either<AgentError, ElizaContext> {
    const contextKey = `${message.agentId}:${message.userId}:${message.roomId}`;
    let context = this.contexts.get(contextKey);

    if (!context) {
      context = {
        agentId: message.agentId,
        userId: message.userId,
        roomId: message.roomId,
        messageHistory: [],
        userState: {},
        environmentState: {}
      };
      this.contexts.set(contextKey, context);
    }

    // Add message to history
    context.messageHistory.push(message);
    
    // Keep only last 50 messages
    if (context.messageHistory.length > 50) {
      context.messageHistory = context.messageHistory.slice(-50);
    }

    return right(context);
  }

  /**
   * Process message with context
   */
  private processWithContext(
    agent: BaseAgent,
    message: ElizaMessage,
    context: ElizaContext
  ): TaskEither<AgentError, ElizaResponse> {
    const actionContext: ActionContext = {
      agentId: message.agentId,
      userId: message.userId,
      parameters: {
        message: message.content.text,
        action: message.content.action,
        context: context,
        messageHistory: context.messageHistory
      },
      state: agent.getState(),
      metadata: {
        roomId: message.roomId,
        timestamp: new Date()
      }
    };

    const actionId = message.content.action || 'process_message';

    return pipe(
      agent.executeAction(actionId, actionContext),
      TE.map(result => this.convertToElizaResponse(result)),
      TE.mapLeft(error => {
        // Return a helpful error response
        return this.createError('ACTION_FAILED', `Failed to process message: ${error.message}`);
      })
    );
  }

  /**
   * Convert action result to Eliza response
   */
  private convertToElizaResponse(result: ActionResult): ElizaResponse {
    if (typeof result.data === 'string') {
      return { text: result.data };
    }

    if (result.data && typeof result.data === 'object') {
      return {
        text: result.data.text || result.message || 'Action completed successfully',
        action: result.data.action,
        metadata: result.data.metadata
      };
    }

    return {
      text: result.message || 'Action completed successfully'
    };
  }

  /**
   * Generate knowledge base for agent
   */
  private generateKnowledgeBase(config: AgentConfig): string[] {
    const knowledge = [
      "DeFi (Decentralized Finance) protocols enable financial services without intermediaries",
      "Yield farming involves providing liquidity to earn rewards",
      "Impermanent loss occurs when token prices diverge in liquidity pools",
      "Smart contracts automate financial agreements on blockchain",
      "Risk management is crucial in DeFi due to volatility and smart contract risks"
    ];

    // Add capability-specific knowledge
    if (config.capabilities.includes('lending')) {
      knowledge.push(
        "Lending protocols allow users to earn interest on deposits",
        "Collateralization ratios determine borrowing capacity",
        "Interest rates fluctuate based on supply and demand"
      );
    }

    if (config.capabilities.includes('liquidity')) {
      knowledge.push(
        "Automated Market Makers (AMMs) facilitate token swaps",
        "Concentrated liquidity improves capital efficiency",
        "Price ranges determine liquidity provision effectiveness"
      );
    }

    return knowledge;
  }

  /**
   * Generate message examples
   */
  private generateMessageExamples(config: AgentConfig): MessageExample[] {
    const examples: MessageExample[] = [
      {
        user: "What's the best lending strategy right now?",
        content: { text: "Based on current market conditions, I recommend a conservative approach with stable lending protocols. The optimal strategy would be..." }
      },
      {
        user: "How risky is yield farming?",
        content: { text: "Yield farming carries several risks including impermanent loss, smart contract risk, and market volatility. Let me break down these risks..." }
      }
    ];

    return examples;
  }

  /**
   * Generate post examples
   */
  private generatePostExamples(config: AgentConfig): string[] {
    return [
      "Market analysis shows increased volatility in DeFi yields. Consider adjusting position sizes accordingly.",
      "New lending opportunities detected with competitive rates. Risk assessment in progress.",
      "Impermanent loss calculations suggest rebalancing for optimal returns."
    ];
  }

  /**
   * Generate topics
   */
  private generateTopics(config: AgentConfig): string[] {
    const topics = ["DeFi", "yield farming", "risk management", "portfolio optimization"];
    
    config.capabilities.forEach(cap => {
      topics.push(cap);
    });

    return topics;
  }

  /**
   * Generate adjectives
   */
  private generateAdjectives(config: AgentConfig): string[] {
    return [
      "analytical", "strategic", "risk-aware", "data-driven", 
      "knowledgeable", "helpful", "precise", "reliable"
    ];
  }

  /**
   * Create standardized error
   */
  private createError(code: string, message: string): AgentError {
    return {
      code,
      message,
      timestamp: new Date(),
      agentId: 'eliza-integration'
    };
  }
}
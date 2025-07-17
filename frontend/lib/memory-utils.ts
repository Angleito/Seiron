import { AIMemoryEntry, ConversationMemory, ConversationTurn } from './conversation-memory';
import { logger } from './logger';

// Portfolio context types
export interface PortfolioMemoryContext {
  totalValue?: number;
  topHoldings?: Array<{ symbol: string; value: number; percentage: number }>;
  recentTransactions?: Array<{ type: 'buy' | 'sell'; symbol: string; amount: number; timestamp: number }>;
  riskProfile?: 'conservative' | 'moderate' | 'aggressive';
  investmentGoals?: string[];
  timeHorizon?: string;
  lastUpdated: number;
}

export interface VoiceInteractionContext {
  preferredVoice?: string;
  speechRate?: number;
  volumeLevel?: number;
  languagePreference?: string;
  useNaturalPauses?: boolean;
  contextualResponses?: boolean;
}

export interface UserPreferences {
  trading?: {
    confirmationRequired?: boolean;
    maxTransactionSize?: number;
    autoRebalance?: boolean;
    notifications?: boolean;
  };
  ai?: {
    personalityStyle?: 'professional' | 'casual' | 'technical';
    responseLength?: 'brief' | 'detailed' | 'comprehensive';
    includeAnalysis?: boolean;
    provideSuggestions?: boolean;
  };
  voice?: VoiceInteractionContext;
  portfolio?: {
    autoUpdate?: boolean;
    showRealTimeValues?: boolean;
    includeNews?: boolean;
    alertThresholds?: Record<string, number>;
  };
}

// Memory categorization and scoring utilities
export class MemoryUtils {
  // Extract actionable items from conversation
  static extractActionableItems(conversation: ConversationMemory): AIMemoryEntry[] {
    const actionableMemories: AIMemoryEntry[] = [];
    const actionKeywords = [
      'buy', 'sell', 'invest', 'purchase', 'trade', 'allocate',
      'remind', 'alert', 'notify', 'track', 'monitor',
      'research', 'analyze', 'review', 'check',
      'set', 'configure', 'adjust', 'change'
    ];

    conversation.turns.forEach(turn => {
      if (turn.role === 'user') {
        const content = turn.content.toLowerCase();
        
        actionKeywords.forEach(keyword => {
          if (content.includes(keyword)) {
            const memoryKey = `action_${keyword}_${turn.id}`;
            const memoryEntry: AIMemoryEntry = {
              id: `mem_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
              userId: conversation.userId,
              sessionId: conversation.sessionId,
              key: memoryKey,
              value: {
                action: keyword,
                context: turn.content,
                extractedAt: Date.now(),
                turnId: turn.id,
                priority: this.calculateActionPriority(keyword, content),
              },
              category: 'interaction',
              confidence: this.calculateConfidence(keyword, content),
              createdAt: new Date(),
              updatedAt: new Date(),
              conversationId: conversation.id,
              turnId: turn.id,
            };
            actionableMemories.push(memoryEntry);
          }
        });
      }
    });

    return actionableMemories;
  }

  // Extract portfolio preferences from conversation
  static extractPortfolioPreferences(conversation: ConversationMemory): AIMemoryEntry[] {
    const preferenceMemories: AIMemoryEntry[] = [];
    const preferencePatterns = [
      { pattern: /risk\s+(averse|tolerant|seeking)/i, key: 'risk_profile' },
      { pattern: /invest\s+for\s+(\d+)\s+(year|month)/i, key: 'time_horizon' },
      { pattern: /(conservative|aggressive|moderate)\s+(approach|strategy)/i, key: 'investment_style' },
      { pattern: /(growth|value|dividend)\s+(stock|investment)/i, key: 'investment_type_preference' },
      { pattern: /prefer\s+(individual|etf|mutual)\s+(stock|fund)/i, key: 'security_type_preference' },
    ];

    conversation.turns.forEach(turn => {
      if (turn.role === 'user') {
        preferencePatterns.forEach(({ pattern, key }) => {
          const match = turn.content.match(pattern);
          if (match) {
            const memoryEntry: AIMemoryEntry = {
              id: `mem_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
              userId: conversation.userId,
              sessionId: conversation.sessionId,
              key: `portfolio_${key}`,
              value: {
                preference: match[1] || match[0],
                context: turn.content,
                extractedAt: Date.now(),
                source: 'voice_conversation',
              },
              category: 'preference',
              confidence: 0.8,
              createdAt: new Date(),
              updatedAt: new Date(),
              conversationId: conversation.id,
              turnId: turn.id,
            };
            preferenceMemories.push(memoryEntry);
          }
        });
      }
    });

    return preferenceMemories;
  }

  // Extract voice interaction preferences
  static extractVoicePreferences(conversation: ConversationMemory): AIMemoryEntry[] {
    const voiceMemories: AIMemoryEntry[] = [];
    const voicePatterns = [
      { pattern: /speak\s+(faster|slower|louder|quieter)/i, key: 'speech_adjustment' },
      { pattern: /(brief|detailed|comprehensive)\s+(response|answer)/i, key: 'response_length' },
      { pattern: /(formal|casual|professional)\s+(tone|style)/i, key: 'communication_style' },
      { pattern: /don't\s+(repeat|explain|analyze)/i, key: 'interaction_preference' },
    ];

    conversation.turns.forEach(turn => {
      if (turn.role === 'user') {
        voicePatterns.forEach(({ pattern, key }) => {
          const match = turn.content.match(pattern);
          if (match) {
            const memoryEntry: AIMemoryEntry = {
              id: `mem_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
              userId: conversation.userId,
              sessionId: conversation.sessionId,
              key: `voice_${key}`,
              value: {
                preference: match[1] || match[0],
                context: turn.content,
                extractedAt: Date.now(),
                appliedToFuture: true,
              },
              category: 'preference',
              confidence: 0.9,
              createdAt: new Date(),
              updatedAt: new Date(),
              conversationId: conversation.id,
              turnId: turn.id,
            };
            voiceMemories.push(memoryEntry);
          }
        });
      }
    });

    return voiceMemories;
  }

  // Analyze conversation for important facts
  static extractFactualInformation(conversation: ConversationMemory): AIMemoryEntry[] {
    const factMemories: AIMemoryEntry[] = [];
    const factPatterns = [
      { pattern: /my\s+salary\s+is\s+\$?([\d,]+)/i, key: 'income', category: 'fact' as const },
      { pattern: /I\s+have\s+\$?([\d,]+)\s+to\s+invest/i, key: 'investment_amount', category: 'fact' as const },
      { pattern: /I\s+own\s+(\d+)\s+shares?\s+of\s+(\w+)/i, key: 'current_holding', category: 'fact' as const },
      { pattern: /my\s+retirement\s+is\s+in\s+(\d+)\s+years?/i, key: 'retirement_timeline', category: 'fact' as const },
      { pattern: /I\s+work\s+(at|for)\s+([^,.]+)/i, key: 'employment', category: 'context' as const },
    ];

    conversation.turns.forEach(turn => {
      if (turn.role === 'user') {
        factPatterns.forEach(({ pattern, key, category }) => {
          const match = turn.content.match(pattern);
          if (match) {
            const memoryEntry: AIMemoryEntry = {
              id: `mem_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
              userId: conversation.userId,
              sessionId: conversation.sessionId,
              key: `user_${key}`,
              value: {
                fact: match[1],
                additionalInfo: match[2] || null,
                context: turn.content,
                extractedAt: Date.now(),
                verified: false,
              },
              category,
              confidence: 0.85,
              createdAt: new Date(),
              updatedAt: new Date(),
              conversationId: conversation.id,
              turnId: turn.id,
            };
            factMemories.push(memoryEntry);
          }
        });
      }
    });

    return factMemories;
  }

  // Create memory summary for context compression
  static createMemorySummary(memories: AIMemoryEntry[]): string {
    const categorized = memories.reduce((acc, memory) => {
      if (!acc[memory.category]) acc[memory.category] = [];
      acc[memory.category].push(memory);
      return acc;
    }, {} as Record<string, AIMemoryEntry[]>);

    const summaryParts: string[] = [];

    if (categorized.preference) {
      const prefs = categorized.preference.map(m => `${m.key}: ${JSON.stringify(m.value)}`);
      summaryParts.push(`User Preferences: ${prefs.join(', ')}`);
    }

    if (categorized.fact) {
      const facts = categorized.fact.map(m => `${m.key}: ${JSON.stringify(m.value)}`);
      summaryParts.push(`Known Facts: ${facts.join(', ')}`);
    }

    if (categorized.context) {
      const contexts = categorized.context.slice(0, 3).map(m => m.key);
      summaryParts.push(`Recent Context: ${contexts.join(', ')}`);
    }

    if (categorized.interaction) {
      const interactions = categorized.interaction.slice(0, 2).map(m => m.key);
      summaryParts.push(`Recent Actions: ${interactions.join(', ')}`);
    }

    return summaryParts.join(' | ');
  }

  // Score memory relevance for current context
  static scoreMemoryRelevance(
    memory: AIMemoryEntry,
    currentContext: {
      recentTurns?: ConversationTurn[];
      portfolioContext?: PortfolioMemoryContext;
      currentQuery?: string;
    }
  ): number {
    let score = memory.confidence;

    // Boost score for recent memories
    const age = Date.now() - memory.updatedAt.getTime();
    const ageInDays = age / (1000 * 60 * 60 * 24);
    if (ageInDays < 1) score += 0.2;
    else if (ageInDays < 7) score += 0.1;
    else if (ageInDays > 30) score -= 0.2;

    // Boost score for preferences and facts
    if (memory.category === 'preference') score += 0.15;
    if (memory.category === 'fact') score += 0.1;

    // Context-specific scoring
    if (currentContext.currentQuery) {
      const queryLower = currentContext.currentQuery.toLowerCase();
      const memoryText = `${memory.key} ${JSON.stringify(memory.value)}`.toLowerCase();
      
      // Simple keyword matching
      const queryWords = queryLower.split(' ');
      const matches = queryWords.filter(word => 
        word.length > 2 && memoryText.includes(word)
      ).length;
      
      score += (matches / queryWords.length) * 0.3;
    }

    // Portfolio context relevance
    if (currentContext.portfolioContext && memory.key.includes('portfolio')) {
      score += 0.2;
    }

    return Math.max(0, Math.min(1, score));
  }

  // Generate contextual user preferences from memories
  static generateUserPreferences(memories: AIMemoryEntry[]): UserPreferences {
    const preferences: UserPreferences = {
      trading: {},
      ai: {},
      voice: {},
      portfolio: {},
    };

    memories.forEach(memory => {
      if (memory.category === 'preference' && memory.value) {
        const { key, value } = memory;

        // Voice preferences
        if (key.startsWith('voice_')) {
          const voiceKey = key.replace('voice_', '');
          switch (voiceKey) {
            case 'speech_adjustment':
              if (value.preference?.includes('faster')) {
                preferences.voice!.speechRate = 1.2;
              } else if (value.preference?.includes('slower')) {
                preferences.voice!.speechRate = 0.8;
              }
              break;
            case 'response_length':
              preferences.ai!.responseLength = value.preference as any;
              break;
            case 'communication_style':
              preferences.ai!.personalityStyle = value.preference as any;
              break;
          }
        }

        // Portfolio preferences
        if (key.startsWith('portfolio_')) {
          const portfolioKey = key.replace('portfolio_', '');
          switch (portfolioKey) {
            case 'risk_profile':
              // Store in memory for AI processing
              break;
            case 'investment_style':
              // Store in memory for AI processing
              break;
          }
        }

        // Trading preferences
        if (key.includes('confirmation') || key.includes('transaction')) {
          if (value.preference?.includes('confirm')) {
            preferences.trading!.confirmationRequired = true;
          }
        }
      }
    });

    return preferences;
  }

  // Calculate action priority (private helper)
  private static calculateActionPriority(action: string, content: string): 'high' | 'medium' | 'low' {
    const urgentWords = ['now', 'immediately', 'urgent', 'asap', 'today'];
    const importantActions = ['buy', 'sell', 'alert', 'notify'];

    if (urgentWords.some(word => content.toLowerCase().includes(word))) {
      return 'high';
    }

    if (importantActions.includes(action.toLowerCase())) {
      return 'medium';
    }

    return 'low';
  }

  // Calculate confidence score (private helper)
  private static calculateConfidence(keyword: string, content: string): number {
    let confidence = 0.6; // Base confidence

    // Boost confidence for explicit statements
    const explicitPhrases = ['I want to', 'I need to', 'please', 'can you'];
    if (explicitPhrases.some(phrase => content.toLowerCase().includes(phrase))) {
      confidence += 0.2;
    }

    // Boost confidence for specific keywords
    const specificKeywords = ['buy', 'sell', 'set', 'remind'];
    if (specificKeywords.includes(keyword)) {
      confidence += 0.15;
    }

    // Reduce confidence for questions
    if (content.includes('?') || content.toLowerCase().startsWith('what') || 
        content.toLowerCase().startsWith('how') || content.toLowerCase().startsWith('when')) {
      confidence -= 0.1;
    }

    return Math.max(0.1, Math.min(1.0, confidence));
  }
}

// Conversation analysis utilities
export class ConversationAnalyzer {
  // Analyze conversation sentiment
  static analyzeSentiment(conversation: ConversationMemory): {
    overall: 'positive' | 'neutral' | 'negative';
    confidence: number;
    details: { turn: string; sentiment: string; score: number }[];
  } {
    const sentimentWords = {
      positive: ['good', 'great', 'excellent', 'love', 'like', 'happy', 'satisfied', 'perfect'],
      negative: ['bad', 'terrible', 'hate', 'dislike', 'angry', 'frustrated', 'awful', 'disappointed'],
    };

    const details = conversation.turns.map(turn => {
      const content = turn.content.toLowerCase();
      let score = 0;

      sentimentWords.positive.forEach(word => {
        if (content.includes(word)) score += 1;
      });

      sentimentWords.negative.forEach(word => {
        if (content.includes(word)) score -= 1;
      });

      const sentiment = score > 0 ? 'positive' : score < 0 ? 'negative' : 'neutral';
      return { turn: turn.id, sentiment, score: Math.abs(score) };
    });

    const totalScore = details.reduce((sum, detail) => sum + detail.score, 0);
    const positiveScore = details.filter(d => d.sentiment === 'positive').reduce((sum, d) => sum + d.score, 0);
    const negativeScore = details.filter(d => d.sentiment === 'negative').reduce((sum, d) => sum + d.score, 0);

    let overall: 'positive' | 'neutral' | 'negative' = 'neutral';
    if (positiveScore > negativeScore) overall = 'positive';
    else if (negativeScore > positiveScore) overall = 'negative';

    const confidence = totalScore > 0 ? Math.min(1, totalScore / 10) : 0;

    return { overall, confidence, details };
  }

  // Extract key topics from conversation
  static extractKeyTopics(conversation: ConversationMemory, maxTopics = 5): string[] {
    const text = conversation.turns
      .map(turn => turn.content)
      .join(' ')
      .toLowerCase();

    // Simple keyword extraction
    const words = text.split(/\s+/)
      .filter(word => word.length > 3)
      .filter(word => !/^(the|and|or|but|in|on|at|to|for|of|with|by)$/.test(word));

    const wordCounts = words.reduce((acc, word) => {
      acc[word] = (acc[word] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(wordCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, maxTopics)
      .map(([word]) => word);
  }

  // Calculate conversation complexity
  static calculateComplexity(conversation: ConversationMemory): 'low' | 'medium' | 'high' {
    const avgTurnLength = conversation.turns.reduce((sum, turn) => sum + turn.content.length, 0) / conversation.turns.length;
    const uniqueWords = new Set(
      conversation.turns
        .flatMap(turn => turn.content.toLowerCase().split(/\s+/))
        .filter(word => word.length > 2)
    ).size;

    const complexityIndicators = [
      conversation.turns.length > 20,
      avgTurnLength > 100,
      uniqueWords > 100,
      conversation.turns.some(turn => turn.content.includes('?')),
    ].filter(Boolean).length;

    if (complexityIndicators >= 3) return 'high';
    if (complexityIndicators >= 2) return 'medium';
    return 'low';
  }
}

// Export utility instances
export const memoryUtils = MemoryUtils;
export const conversationAnalyzer = ConversationAnalyzer;
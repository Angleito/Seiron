/**
 * Context Manager for LangChain Integration
 * 
 * This module manages conversation context, user state, and session information
 * across multiple LangChain tool interactions, providing persistence and
 * intelligent context awareness for DeFi operations.
 */

import { ToolContext } from '../tools/BaseTool';
import { EventEmitter } from 'events';
import { z } from 'zod';

/**
 * User profile information
 */
export interface UserProfile {
  userId: string;
  walletAddress?: string;
  preferredProtocols?: string[];
  riskTolerance?: 'low' | 'medium' | 'high';
  defaultAssets?: string[];
  tradingExperience?: 'beginner' | 'intermediate' | 'advanced';
  notifications?: {
    priceAlerts: boolean;
    positionAlerts: boolean;
    yieldUpdates: boolean;
  };
  createdAt: Date;
  lastActive: Date;
}

/**
 * Conversation session state
 */
export interface ConversationSession {
  sessionId: string;
  userId: string;
  startTime: Date;
  lastActivity: Date;
  messageCount: number;
  toolUsageCount: number;
  activeProtocols: Set<string>;
  recentOperations: OperationHistory[];
  context: Record<string, any>;
  metadata: Record<string, any>;
}

/**
 * Operation history entry
 */
export interface OperationHistory {
  id: string;
  type: 'deposit' | 'withdraw' | 'borrow' | 'repay' | 'swap' | 'liquidity' | 'analysis';
  asset: string;
  amount?: string;
  protocol: string;
  timestamp: Date;
  status: 'pending' | 'completed' | 'failed';
  transactionHash?: string;
  details: Record<string, any>;
}

/**
 * Context memory for maintaining conversation flow
 */
export interface ContextMemory {
  lastMentionedAsset?: string;
  lastMentionedAmount?: string;
  lastMentionedProtocol?: string;
  currentOperation?: string;
  recentQueries: string[];
  userIntentHistory: string[];
  suggestedActions: string[];
}

/**
 * Context persistence interface
 */
export interface ContextPersistence {
  saveUserProfile(profile: UserProfile): Promise<void>;
  loadUserProfile(userId: string): Promise<UserProfile | null>;
  saveSession(session: ConversationSession): Promise<void>;
  loadSession(sessionId: string): Promise<ConversationSession | null>;
  deleteSession(sessionId: string): Promise<void>;
  getUserSessions(userId: string): Promise<ConversationSession[]>;
}

/**
 * Context manager configuration
 */
export interface ContextManagerConfig {
  persistence?: ContextPersistence;
  sessionTimeout?: number; // in milliseconds
  maxRecentOperations?: number;
  maxRecentQueries?: number;
  enableAutoSuggestions?: boolean;
}

/**
 * Context Manager Events
 */
export interface ContextManagerEvents {
  'session:created': { sessionId: string; userId: string };
  'session:updated': { sessionId: string; changes: Partial<ConversationSession> };
  'session:expired': { sessionId: string; userId: string };
  'user:profile:updated': { userId: string; changes: Partial<UserProfile> };
  'operation:recorded': { sessionId: string; operation: OperationHistory };
  'context:suggestion': { sessionId: string; suggestions: string[] };
}

/**
 * Main Context Manager class
 */
export class ContextManager extends EventEmitter {
  private config: ContextManagerConfig;
  private sessions: Map<string, ConversationSession> = new Map();
  private userProfiles: Map<string, UserProfile> = new Map();
  private contextMemory: Map<string, ContextMemory> = new Map();
  private sessionTimeouts: Map<string, NodeJS.Timeout> = new Map();

  constructor(config: ContextManagerConfig = {}) {
    super();
    this.config = {
      sessionTimeout: 30 * 60 * 1000, // 30 minutes
      maxRecentOperations: 50,
      maxRecentQueries: 20,
      enableAutoSuggestions: true,
      ...config
    };
  }

  /**
   * Create or retrieve a conversation session
   */
  public async getOrCreateSession(userId: string, sessionId?: string): Promise<ConversationSession> {
    // Generate session ID if not provided
    if (!sessionId) {
      sessionId = `session_${userId}_${Date.now()}`;
    }

    // Check if session exists
    let session = this.sessions.get(sessionId);
    if (session) {
      // Update last activity
      session.lastActivity = new Date();
      this.resetSessionTimeout(sessionId);
      return session;
    }

    // Load session from persistence if available
    if (this.config.persistence) {
      session = await this.config.persistence.loadSession(sessionId);
      if (session) {
        this.sessions.set(sessionId, session);
        this.resetSessionTimeout(sessionId);
        return session;
      }
    }

    // Create new session
    session = {
      sessionId,
      userId,
      startTime: new Date(),
      lastActivity: new Date(),
      messageCount: 0,
      toolUsageCount: 0,
      activeProtocols: new Set(),
      recentOperations: [],
      context: {},
      metadata: {}
    };

    this.sessions.set(sessionId, session);
    this.initializeContextMemory(sessionId);
    this.resetSessionTimeout(sessionId);

    // Save to persistence
    if (this.config.persistence) {
      await this.config.persistence.saveSession(session);
    }

    this.emit('session:created', { sessionId, userId });
    return session;
  }

  /**
   * Get or create user profile
   */
  public async getOrCreateUserProfile(userId: string): Promise<UserProfile> {
    // Check memory first
    let profile = this.userProfiles.get(userId);
    if (profile) {
      return profile;
    }

    // Load from persistence
    if (this.config.persistence) {
      profile = await this.config.persistence.loadUserProfile(userId);
      if (profile) {
        this.userProfiles.set(userId, profile);
        return profile;
      }
    }

    // Create new profile
    profile = {
      userId,
      riskTolerance: 'medium',
      tradingExperience: 'intermediate',
      notifications: {
        priceAlerts: true,
        positionAlerts: true,
        yieldUpdates: true
      },
      createdAt: new Date(),
      lastActive: new Date()
    };

    this.userProfiles.set(userId, profile);

    // Save to persistence
    if (this.config.persistence) {
      await this.config.persistence.saveUserProfile(profile);
    }

    return profile;
  }

  /**
   * Update user profile
   */
  public async updateUserProfile(userId: string, updates: Partial<UserProfile>): Promise<void> {
    let profile = await this.getOrCreateUserProfile(userId);
    
    profile = {
      ...profile,
      ...updates,
      lastActive: new Date()
    };

    this.userProfiles.set(userId, profile);

    // Save to persistence
    if (this.config.persistence) {
      await this.config.persistence.saveUserProfile(profile);
    }

    this.emit('user:profile:updated', { userId, changes: updates });
  }

  /**
   * Build tool context from session and user data
   */
  public async buildToolContext(sessionId: string): Promise<ToolContext> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    const profile = await this.getOrCreateUserProfile(session.userId);
    const memory = this.contextMemory.get(sessionId);

    return {
      userId: session.userId,
      sessionId,
      conversationHistory: memory?.recentQueries || [],
      walletAddress: profile.walletAddress,
      agentState: {
        preferredProtocols: profile.preferredProtocols,
        riskTolerance: profile.riskTolerance,
        tradingExperience: profile.tradingExperience,
        lastMentionedAsset: memory?.lastMentionedAsset,
        lastMentionedProtocol: memory?.lastMentionedProtocol,
        recentOperations: session.recentOperations
      },
      metadata: {
        sessionStartTime: session.startTime,
        messageCount: session.messageCount,
        toolUsageCount: session.toolUsageCount,
        activeProtocols: Array.from(session.activeProtocols)
      }
    };
  }

  /**
   * Update session context based on tool usage
   */
  public async updateSessionContext(
    sessionId: string,
    toolName: string,
    input: string,
    result: any
  ): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return;
    }

    // Update session stats
    session.toolUsageCount++;
    session.lastActivity = new Date();

    // Update context memory
    this.updateContextMemory(sessionId, toolName, input, result);

    // Extract and store operation if applicable
    const operation = this.extractOperationFromToolUsage(toolName, input, result);
    if (operation) {
      this.recordOperation(sessionId, operation);
    }

    // Generate suggestions if enabled
    if (this.config.enableAutoSuggestions) {
      const suggestions = this.generateSuggestions(sessionId, toolName, result);
      if (suggestions.length > 0) {
        this.emit('context:suggestion', { sessionId, suggestions });
      }
    }

    // Save session
    if (this.config.persistence) {
      await this.config.persistence.saveSession(session);
    }

    this.emit('session:updated', { sessionId, changes: { toolUsageCount: session.toolUsageCount } });
  }

  /**
   * Record user message in context
   */
  public async recordUserMessage(sessionId: string, message: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return;
    }

    session.messageCount++;
    session.lastActivity = new Date();

    // Update context memory
    const memory = this.contextMemory.get(sessionId);
    if (memory) {
      memory.recentQueries.push(message);
      if (memory.recentQueries.length > (this.config.maxRecentQueries || 20)) {
        memory.recentQueries = memory.recentQueries.slice(-20);
      }

      // Extract context from message
      this.extractContextFromMessage(sessionId, message);
    }

    // Save session
    if (this.config.persistence) {
      await this.config.persistence.saveSession(session);
    }
  }

  /**
   * Record operation history
   */
  public recordOperation(sessionId: string, operation: OperationHistory): void {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return;
    }

    session.recentOperations.push(operation);
    session.activeProtocols.add(operation.protocol);

    // Limit recent operations
    if (session.recentOperations.length > (this.config.maxRecentOperations || 50)) {
      session.recentOperations = session.recentOperations.slice(-50);
    }

    this.emit('operation:recorded', { sessionId, operation });
  }

  /**
   * Get session context memory
   */
  public getContextMemory(sessionId: string): ContextMemory | null {
    return this.contextMemory.get(sessionId) || null;
  }

  /**
   * Clean up expired sessions
   */
  public cleanupExpiredSessions(): void {
    const now = Date.now();
    const timeout = this.config.sessionTimeout || 30 * 60 * 1000;

    for (const [sessionId, session] of this.sessions) {
      if (now - session.lastActivity.getTime() > timeout) {
        this.expireSession(sessionId);
      }
    }
  }

  /**
   * Expire a session
   */
  private async expireSession(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return;
    }

    // Clear timeout
    const timeout = this.sessionTimeouts.get(sessionId);
    if (timeout) {
      clearTimeout(timeout);
      this.sessionTimeouts.delete(sessionId);
    }

    // Remove from memory
    this.sessions.delete(sessionId);
    this.contextMemory.delete(sessionId);

    // Delete from persistence
    if (this.config.persistence) {
      await this.config.persistence.deleteSession(sessionId);
    }

    this.emit('session:expired', { sessionId, userId: session.userId });
  }

  /**
   * Initialize context memory for a session
   */
  private initializeContextMemory(sessionId: string): void {
    this.contextMemory.set(sessionId, {
      recentQueries: [],
      userIntentHistory: [],
      suggestedActions: []
    });
  }

  /**
   * Reset session timeout
   */
  private resetSessionTimeout(sessionId: string): void {
    // Clear existing timeout
    const existingTimeout = this.sessionTimeouts.get(sessionId);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    // Set new timeout
    const timeout = setTimeout(() => {
      this.expireSession(sessionId);
    }, this.config.sessionTimeout);

    this.sessionTimeouts.set(sessionId, timeout);
  }

  /**
   * Update context memory based on tool usage
   */
  private updateContextMemory(sessionId: string, toolName: string, input: string, result: any): void {
    const memory = this.contextMemory.get(sessionId);
    if (!memory) {
      return;
    }

    // Extract asset mentions
    const assetMatch = input.match(/(USD[CT]?|ETH|BTC|SEI|WETH|WBTC|ATOM|OSMO)/i);
    if (assetMatch) {
      memory.lastMentionedAsset = assetMatch[1].toUpperCase();
    }

    // Extract protocol mentions
    const protocolMatch = input.match(/(yei|takara|dragon|symphony|citrex)/i);
    if (protocolMatch) {
      memory.lastMentionedProtocol = protocolMatch[1];
    }

    // Update current operation
    if (toolName.includes('deposit')) memory.currentOperation = 'deposit';
    else if (toolName.includes('withdraw')) memory.currentOperation = 'withdraw';
    else if (toolName.includes('borrow')) memory.currentOperation = 'borrow';
    else if (toolName.includes('repay')) memory.currentOperation = 'repay';
    else if (toolName.includes('swap')) memory.currentOperation = 'swap';
  }

  /**
   * Extract context from user message
   */
  private extractContextFromMessage(sessionId: string, message: string): void {
    const memory = this.contextMemory.get(sessionId);
    if (!memory) {
      return;
    }

    // Extract user intent
    let intent = 'unknown';
    if (message.includes('deposit') || message.includes('supply')) intent = 'deposit';
    else if (message.includes('withdraw') || message.includes('remove')) intent = 'withdraw';
    else if (message.includes('borrow') || message.includes('loan')) intent = 'borrow';
    else if (message.includes('repay') || message.includes('pay back')) intent = 'repay';
    else if (message.includes('swap') || message.includes('trade')) intent = 'swap';
    else if (message.includes('analyze') || message.includes('check')) intent = 'analyze';

    memory.userIntentHistory.push(intent);
    if (memory.userIntentHistory.length > 10) {
      memory.userIntentHistory = memory.userIntentHistory.slice(-10);
    }
  }

  /**
   * Extract operation from tool usage
   */
  private extractOperationFromToolUsage(toolName: string, input: string, result: any): OperationHistory | null {
    if (!result || !result.success) {
      return null;
    }

    const operationType = this.getOperationType(toolName);
    if (!operationType) {
      return null;
    }

    // Extract asset and amount from input
    const assetMatch = input.match(/(USD[CT]?|ETH|BTC|SEI|WETH|WBTC|ATOM|OSMO)/i);
    const amountMatch = input.match(/(\d+(?:\.\d+)?)/);
    const protocolMatch = input.match(/(yei|takara|dragon|symphony|citrex)/i);

    return {
      id: `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: operationType,
      asset: assetMatch ? assetMatch[1].toUpperCase() : 'UNKNOWN',
      amount: amountMatch ? amountMatch[1] : undefined,
      protocol: protocolMatch ? protocolMatch[1] : 'UNKNOWN',
      timestamp: new Date(),
      status: 'completed',
      transactionHash: result.transactionHash,
      details: result.data || {}
    };
  }

  /**
   * Get operation type from tool name
   */
  private getOperationType(toolName: string): OperationHistory['type'] | null {
    if (toolName.includes('deposit')) return 'deposit';
    if (toolName.includes('withdraw')) return 'withdraw';
    if (toolName.includes('borrow')) return 'borrow';
    if (toolName.includes('repay')) return 'repay';
    if (toolName.includes('swap')) return 'swap';
    if (toolName.includes('liquidity')) return 'liquidity';
    if (toolName.includes('analyz')) return 'analysis';
    return null;
  }

  /**
   * Generate contextual suggestions
   */
  private generateSuggestions(sessionId: string, toolName: string, result: any): string[] {
    const suggestions: string[] = [];
    const memory = this.contextMemory.get(sessionId);
    
    if (!memory) {
      return suggestions;
    }

    // Generate suggestions based on tool usage
    if (toolName.includes('deposit') && result.success) {
      suggestions.push('Consider borrowing against your collateral for yield farming');
      suggestions.push('Monitor your health factor regularly');
    }
    
    if (toolName.includes('borrow') && result.success) {
      suggestions.push('Set up price alerts for liquidation protection');
      suggestions.push('Consider using borrowed funds for liquidity provision');
    }
    
    if (toolName.includes('swap') && result.success) {
      suggestions.push('Check if providing liquidity would give better returns');
      suggestions.push('Consider setting up recurring swaps for DCA strategy');
    }

    return suggestions;
  }
}

/**
 * Memory-based persistence implementation (for development)
 */
export class MemoryPersistence implements ContextPersistence {
  private profiles: Map<string, UserProfile> = new Map();
  private sessions: Map<string, ConversationSession> = new Map();

  async saveUserProfile(profile: UserProfile): Promise<void> {
    this.profiles.set(profile.userId, { ...profile });
  }

  async loadUserProfile(userId: string): Promise<UserProfile | null> {
    const profile = this.profiles.get(userId);
    return profile ? { ...profile } : null;
  }

  async saveSession(session: ConversationSession): Promise<void> {
    this.sessions.set(session.sessionId, { 
      ...session,
      activeProtocols: new Set(session.activeProtocols)
    });
  }

  async loadSession(sessionId: string): Promise<ConversationSession | null> {
    const session = this.sessions.get(sessionId);
    return session ? { 
      ...session,
      activeProtocols: new Set(session.activeProtocols)
    } : null;
  }

  async deleteSession(sessionId: string): Promise<void> {
    this.sessions.delete(sessionId);
  }

  async getUserSessions(userId: string): Promise<ConversationSession[]> {
    return Array.from(this.sessions.values())
      .filter(session => session.userId === userId)
      .map(session => ({
        ...session,
        activeProtocols: new Set(session.activeProtocols)
      }));
  }
}

/**
 * Helper function to create context manager
 */
export function createContextManager(config: ContextManagerConfig = {}): ContextManager {
  return new ContextManager(config);
}

/**
 * Helper function to create context manager with memory persistence
 */
export function createMemoryContextManager(): ContextManager {
  return new ContextManager({
    persistence: new MemoryPersistence(),
    enableAutoSuggestions: true
  });
}

/**
 * Export default context manager instance
 */
export const defaultContextManager = createMemoryContextManager();
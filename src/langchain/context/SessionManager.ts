/**
 * @fileoverview Session Manager for LangChain Sei Agent Kit
 * Manages session lifecycle, context preservation, and cross-session coordination
 */

import { TaskEither } from 'fp-ts/TaskEither';
import { Either, left, right } from 'fp-ts/Either';
import * as TE from 'fp-ts/TaskEither';
import { pipe } from 'fp-ts/function';
import { EventEmitter } from 'events';

import type {
  ConversationMemoryEntry,
  UserProfileMemoryEntry,
  PortfolioContext,
  Intent,
  PendingOperation,
  OperationContext,
  MemoryConfig
} from '../memory/types.js';

import { MemoryManager } from '../memory/MemoryManager.js';
import { SmartCacheManager } from '../../core/cache/SmartCacheManager.js';

/**
 * Session configuration
 */
export interface SessionConfig {
  sessionTimeout: number;
  maxConcurrentSessions: number;
  contextPreservationEnabled: boolean;
  crossSessionLearningEnabled: boolean;
  automaticResumption: boolean;
  sessionMerging: boolean;
}

/**
 * Session context data
 */
export interface SessionContext {
  sessionId: string;
  userId: string;
  startTime: Date;
  lastActivity: Date;
  isActive: boolean;
  deviceInfo?: DeviceInfo;
  location?: LocationInfo;
  preferences: SessionPreferences;
  conversationContext: ConversationContext;
  operationContext: OperationContext;
  portfolioSnapshot?: PortfolioContext;
  metadata: Record<string, any>;
}

/**
 * Device information
 */
export interface DeviceInfo {
  userAgent: string;
  platform: string;
  screen: {
    width: number;
    height: number;
  };
  timezone: string;
}

/**
 * Location information
 */
export interface LocationInfo {
  country: string;
  timezone: string;
  language: string;
}

/**
 * Session preferences
 */
export interface SessionPreferences {
  language: string;
  theme: 'light' | 'dark' | 'auto';
  verbosity: 'minimal' | 'normal' | 'detailed';
  confirmations: boolean;
  notifications: boolean;
  autoSave: boolean;
}

/**
 * Conversation context
 */
export interface ConversationContext {
  messageCount: number;
  lastIntent?: Intent;
  conversationFlow: ConversationFlow;
  topicHistory: string[];
  sentiment: number;
  engagement: number;
}

/**
 * Conversation flow tracking
 */
export interface ConversationFlow {
  currentTopic: string;
  flowState: FlowState;
  branchPoints: BranchPoint[];
  completionStatus: Record<string, boolean>;
}

/**
 * Flow state tracking
 */
export interface FlowState {
  stage: 'introduction' | 'exploration' | 'execution' | 'completion' | 'follow_up';
  substage?: string;
  progress: number;
  milestones: Milestone[];
}

/**
 * Branch points in conversation
 */
export interface BranchPoint {
  id: string;
  timestamp: Date;
  trigger: string;
  options: string[];
  chosenPath?: string;
}

/**
 * Milestone tracking
 */
export interface Milestone {
  id: string;
  name: string;
  completed: boolean;
  timestamp?: Date;
  data?: any;
}

/**
 * Session transition data
 */
export interface SessionTransition {
  fromSessionId?: string;
  toSessionId: string;
  transitionType: 'new' | 'resume' | 'merge' | 'branch';
  preservedContext: string[];
  reason: string;
}

/**
 * Session analytics
 */
export interface SessionAnalytics {
  totalSessions: number;
  activeSessions: number;
  avgSessionDuration: number;
  completionRate: number;
  topTopics: string[];
  userEngagement: number;
  deviceDistribution: Record<string, number>;
  timeDistribution: Record<string, number>;
}

/**
 * Session Manager
 * 
 * Manages session lifecycle and context preservation:
 * - Session creation, resumption, and termination
 * - Context preservation across sessions
 * - Cross-session learning and pattern recognition
 * - Session analytics and optimization
 * - Multi-device session coordination
 */
export class SessionManager extends EventEmitter {
  private config: SessionConfig;
  private sessions: Map<string, SessionContext> = new Map();
  private userSessions: Map<string, Set<string>> = new Map();
  private sessionTimeouts: Map<string, NodeJS.Timeout> = new Map();
  private memoryManager: MemoryManager;
  private cache: SmartCacheManager;
  private initialized = false;

  constructor(config: SessionConfig, memoryManager: MemoryManager) {
    super();
    this.config = config;
    this.memoryManager = memoryManager;
    this.initializeCache();
  }

  /**
   * Initialize cache
   */
  private initializeCache(): void {
    this.cache = new SmartCacheManager({
      maxSize: 100, // 100 MB for session data
      ttl: this.config.sessionTimeout,
      algorithm: 'lru'
    });
  }

  /**
   * Initialize session manager
   */
  public async initialize(): Promise<void> {
    if (this.initialized) {
      throw new Error('Session manager already initialized');
    }

    await this.cache.initialize();
    this.initialized = true;
    this.emit('initialized');
  }

  /**
   * Shutdown session manager
   */
  public async shutdown(): Promise<void> {
    if (!this.initialized) {
      throw new Error('Session manager not initialized');
    }

    // Save all active sessions
    await this.saveAllSessions();

    // Clear all timeouts
    for (const timeout of this.sessionTimeouts.values()) {
      clearTimeout(timeout);
    }
    this.sessionTimeouts.clear();

    // Shutdown cache
    await this.cache.shutdown();

    this.sessions.clear();
    this.userSessions.clear();
    this.initialized = false;
    this.emit('shutdown');
  }

  /**
   * Create new session
   */
  public createSession(userId: string, deviceInfo?: DeviceInfo, location?: LocationInfo): TaskEither<Error, SessionContext> {
    return pipe(
      TE.tryCatch(
        async () => {
          // Check concurrent session limit
          const userSessionCount = this.userSessions.get(userId)?.size || 0;
          if (userSessionCount >= this.config.maxConcurrentSessions) {
            throw new Error('Maximum concurrent sessions exceeded');
          }

          const sessionId = this.generateSessionId();
          const now = new Date();

          // Get user profile for preferences
          const userProfile = await this.memoryManager.getUserProfileMemory(userId)();
          const preferences = this.getSessionPreferences(userProfile, deviceInfo);

          const sessionContext: SessionContext = {
            sessionId,
            userId,
            startTime: now,
            lastActivity: now,
            isActive: true,
            deviceInfo,
            location,
            preferences,
            conversationContext: {
              messageCount: 0,
              conversationFlow: {
                currentTopic: 'introduction',
                flowState: {
                  stage: 'introduction',
                  progress: 0,
                  milestones: []
                },
                branchPoints: [],
                completionStatus: {}
              },
              topicHistory: [],
              sentiment: 0,
              engagement: 0
            },
            operationContext: {
              step: 0,
              totalSteps: 0,
              parameters: {},
              requirements: [],
              validationErrors: []
            },
            metadata: {}
          };

          // Store session
          this.sessions.set(sessionId, sessionContext);

          // Track user sessions
          if (!this.userSessions.has(userId)) {
            this.userSessions.set(userId, new Set());
          }
          this.userSessions.get(userId)!.add(sessionId);

          // Cache session
          await this.cache.set(sessionId, sessionContext);

          // Set session timeout
          this.setSessionTimeout(sessionId);

          // Create conversation memory entry
          await this.memoryManager.getConversationMemory(sessionId)();

          this.emit('session:created', { sessionId, userId });

          return sessionContext;
        },
        (error) => new Error(`Failed to create session: ${error}`)
      )
    );
  }

  /**
   * Resume existing session
   */
  public resumeSession(sessionId: string): TaskEither<Error, SessionContext> {
    return pipe(
      TE.tryCatch(
        async () => {
          // Try to get from cache first
          let sessionContext = await this.cache.get(sessionId) as SessionContext;
          
          if (!sessionContext) {
            // Try to get from memory
            sessionContext = this.sessions.get(sessionId);
            if (!sessionContext) {
              throw new Error(`Session not found: ${sessionId}`);
            }
          }

          // Update activity and mark as active
          sessionContext.lastActivity = new Date();
          sessionContext.isActive = true;

          // Update cache
          await this.cache.set(sessionId, sessionContext);

          // Reset timeout
          this.setSessionTimeout(sessionId);

          // Load conversation memory if enabled
          if (this.config.contextPreservationEnabled) {
            await this.loadSessionContext(sessionContext);
          }

          this.emit('session:resumed', { sessionId, userId: sessionContext.userId });

          return sessionContext;
        },
        (error) => new Error(`Failed to resume session: ${error}`)
      )
    );
  }

  /**
   * Update session activity
   */
  public updateActivity(sessionId: string): TaskEither<Error, SessionContext> {
    return pipe(
      TE.tryCatch(
        async () => {
          const sessionContext = this.sessions.get(sessionId);
          if (!sessionContext) {
            throw new Error(`Session not found: ${sessionId}`);
          }

          sessionContext.lastActivity = new Date();
          sessionContext.conversationContext.messageCount++;

          // Update cache
          await this.cache.set(sessionId, sessionContext);

          // Reset timeout
          this.setSessionTimeout(sessionId);

          return sessionContext;
        },
        (error) => new Error(`Failed to update session activity: ${error}`)
      )
    );
  }

  /**
   * Update conversation context
   */
  public updateConversationContext(sessionId: string, updates: Partial<ConversationContext>): TaskEither<Error, SessionContext> {
    return pipe(
      TE.tryCatch(
        async () => {
          const sessionContext = this.sessions.get(sessionId);
          if (!sessionContext) {
            throw new Error(`Session not found: ${sessionId}`);
          }

          // Apply updates
          sessionContext.conversationContext = {
            ...sessionContext.conversationContext,
            ...updates
          };

          // Update flow state if needed
          await this.updateFlowState(sessionContext);

          // Update cache
          await this.cache.set(sessionId, sessionContext);

          this.emit('context:updated', { sessionId, type: 'conversation' });

          return sessionContext;
        },
        (error) => new Error(`Failed to update conversation context: ${error}`)
      )
    );
  }

  /**
   * Update operation context
   */
  public updateOperationContext(sessionId: string, updates: Partial<OperationContext>): TaskEither<Error, SessionContext> {
    return pipe(
      TE.tryCatch(
        async () => {
          const sessionContext = this.sessions.get(sessionId);
          if (!sessionContext) {
            throw new Error(`Session not found: ${sessionId}`);
          }

          // Apply updates
          sessionContext.operationContext = {
            ...sessionContext.operationContext,
            ...updates
          };

          // Update cache
          await this.cache.set(sessionId, sessionContext);

          this.emit('context:updated', { sessionId, type: 'operation' });

          return sessionContext;
        },
        (error) => new Error(`Failed to update operation context: ${error}`)
      )
    );
  }

  /**
   * End session
   */
  public endSession(sessionId: string, reason: string = 'user_initiated'): TaskEither<Error, void> {
    return pipe(
      TE.tryCatch(
        async () => {
          const sessionContext = this.sessions.get(sessionId);
          if (!sessionContext) {
            throw new Error(`Session not found: ${sessionId}`);
          }

          // Mark as inactive
          sessionContext.isActive = false;

          // Save session context if enabled
          if (this.config.contextPreservationEnabled) {
            await this.saveSessionContext(sessionContext);
          }

          // Remove from active sessions
          this.sessions.delete(sessionId);

          // Remove from user sessions
          const userSessions = this.userSessions.get(sessionContext.userId);
          if (userSessions) {
            userSessions.delete(sessionId);
          }

          // Clear timeout
          const timeout = this.sessionTimeouts.get(sessionId);
          if (timeout) {
            clearTimeout(timeout);
            this.sessionTimeouts.delete(sessionId);
          }

          // Remove from cache
          await this.cache.delete(sessionId);

          this.emit('session:ended', { sessionId, userId: sessionContext.userId, reason });
        },
        (error) => new Error(`Failed to end session: ${error}`)
      )
    );
  }

  /**
   * Get session context
   */
  public getSessionContext(sessionId: string): TaskEither<Error, SessionContext | null> {
    return pipe(
      TE.tryCatch(
        async () => {
          // Check cache first
          const cached = await this.cache.get(sessionId) as SessionContext;
          if (cached) {
            return cached;
          }

          // Check in-memory sessions
          const session = this.sessions.get(sessionId);
          if (session) {
            await this.cache.set(sessionId, session);
            return session;
          }

          return null;
        },
        (error) => new Error(`Failed to get session context: ${error}`)
      )
    );
  }

  /**
   * Get user sessions
   */
  public getUserSessions(userId: string): TaskEither<Error, SessionContext[]> {
    return pipe(
      TE.tryCatch(
        async () => {
          const userSessionIds = this.userSessions.get(userId);
          if (!userSessionIds) {
            return [];
          }

          const sessions: SessionContext[] = [];
          for (const sessionId of userSessionIds) {
            const session = this.sessions.get(sessionId);
            if (session) {
              sessions.push(session);
            }
          }

          return sessions.sort((a, b) => b.lastActivity.getTime() - a.lastActivity.getTime());
        },
        (error) => new Error(`Failed to get user sessions: ${error}`)
      )
    );
  }

  /**
   * Merge sessions
   */
  public mergeSessions(primarySessionId: string, secondarySessionId: string): TaskEither<Error, SessionContext> {
    return pipe(
      TE.tryCatch(
        async () => {
          if (!this.config.sessionMerging) {
            throw new Error('Session merging not enabled');
          }

          const primarySession = this.sessions.get(primarySessionId);
          const secondarySession = this.sessions.get(secondarySessionId);

          if (!primarySession || !secondarySession) {
            throw new Error('One or both sessions not found');
          }

          if (primarySession.userId !== secondarySession.userId) {
            throw new Error('Cannot merge sessions from different users');
          }

          // Merge conversation contexts
          await this.mergeConversationContexts(primarySession, secondarySession);

          // Merge operation contexts
          await this.mergeOperationContexts(primarySession, secondarySession);

          // End secondary session
          await this.endSession(secondarySessionId, 'merged');

          // Update primary session
          await this.cache.set(primarySessionId, primarySession);

          this.emit('sessions:merged', { primarySessionId, secondarySessionId });

          return primarySession;
        },
        (error) => new Error(`Failed to merge sessions: ${error}`)
      )
    );
  }

  /**
   * Get session analytics
   */
  public getAnalytics(userId?: string): TaskEither<Error, SessionAnalytics> {
    return pipe(
      TE.tryCatch(
        async () => {
          let sessions = Array.from(this.sessions.values());
          
          if (userId) {
            sessions = sessions.filter(s => s.userId === userId);
          }

          const analytics: SessionAnalytics = {
            totalSessions: sessions.length,
            activeSessions: sessions.filter(s => s.isActive).length,
            avgSessionDuration: this.calculateAvgSessionDuration(sessions),
            completionRate: this.calculateCompletionRate(sessions),
            topTopics: this.getTopTopics(sessions),
            userEngagement: this.calculateUserEngagement(sessions),
            deviceDistribution: this.getDeviceDistribution(sessions),
            timeDistribution: this.getTimeDistribution(sessions)
          };

          return analytics;
        },
        (error) => new Error(`Failed to get session analytics: ${error}`)
      )
    );
  }

  // Private helper methods

  private generateSessionId(): string {
    return `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private getSessionPreferences(userProfile: UserProfileMemoryEntry | null, deviceInfo?: DeviceInfo): SessionPreferences {
    // Default preferences
    const defaults: SessionPreferences = {
      language: 'en',
      theme: 'auto',
      verbosity: 'normal',
      confirmations: true,
      notifications: true,
      autoSave: true
    };

    // Apply user profile preferences if available
    if (userProfile?.portfolioPreferences?.notifications) {
      defaults.notifications = Object.values(userProfile.portfolioPreferences.notifications).some(v => v);
    }

    // Apply device-specific preferences
    if (deviceInfo) {
      if (deviceInfo.screen.width < 768) {
        defaults.verbosity = 'minimal';
      }
    }

    return defaults;
  }

  private setSessionTimeout(sessionId: string): void {
    // Clear existing timeout
    const existingTimeout = this.sessionTimeouts.get(sessionId);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    // Set new timeout
    const timeout = setTimeout(async () => {
      await this.endSession(sessionId, 'timeout')();
    }, this.config.sessionTimeout);

    this.sessionTimeouts.set(sessionId, timeout);
  }

  private async loadSessionContext(sessionContext: SessionContext): Promise<void> {
    try {
      // Load conversation memory
      const conversationMemory = await this.memoryManager.getConversationMemory(sessionContext.sessionId)();
      if (conversationMemory) {
        // Update conversation context with persisted data
        sessionContext.conversationContext.messageCount = conversationMemory.messages.length;
        sessionContext.operationContext = conversationMemory.operationContext;
      }

      // Load portfolio context
      const portfolioContext = await this.memoryManager.getUserProfileMemory(sessionContext.userId)();
      if (portfolioContext) {
        sessionContext.portfolioSnapshot = await this.memoryManager.getPortfolioContext(sessionContext.userId)() || undefined;
      }
    } catch (error) {
      this.emit('error', new Error(`Failed to load session context: ${error}`));
    }
  }

  private async saveSessionContext(sessionContext: SessionContext): Promise<void> {
    try {
      // Update conversation memory
      const conversationMemory = await this.memoryManager.getConversationMemory(sessionContext.sessionId)();
      if (conversationMemory) {
        conversationMemory.operationContext = sessionContext.operationContext;
        await this.memoryManager.update(conversationMemory.id, conversationMemory)();
      }

      // Save session metadata
      sessionContext.metadata.sessionEnd = new Date();
      sessionContext.metadata.totalDuration = Date.now() - sessionContext.startTime.getTime();
    } catch (error) {
      this.emit('error', new Error(`Failed to save session context: ${error}`));
    }
  }

  private async saveAllSessions(): Promise<void> {
    const saveTasks = Array.from(this.sessions.values()).map(session => 
      this.saveSessionContext(session)
    );
    await Promise.all(saveTasks);
  }

  private async updateFlowState(sessionContext: SessionContext): Promise<void> {
    const flowState = sessionContext.conversationContext.conversationFlow.flowState;
    
    // Update stage based on conversation progress
    if (sessionContext.conversationContext.messageCount > 20 && flowState.stage === 'introduction') {
      flowState.stage = 'exploration';
      flowState.progress = 0.3;
    } else if (sessionContext.operationContext.currentOperation && flowState.stage === 'exploration') {
      flowState.stage = 'execution';
      flowState.progress = 0.6;
    } else if (sessionContext.operationContext.step === sessionContext.operationContext.totalSteps && flowState.stage === 'execution') {
      flowState.stage = 'completion';
      flowState.progress = 0.9;
    }
  }

  private async mergeConversationContexts(primary: SessionContext, secondary: SessionContext): Promise<void> {
    // Merge message counts
    primary.conversationContext.messageCount += secondary.conversationContext.messageCount;

    // Merge topic history
    primary.conversationContext.topicHistory.push(...secondary.conversationContext.topicHistory);
    primary.conversationContext.topicHistory = Array.from(new Set(primary.conversationContext.topicHistory));

    // Use the latest conversation flow
    if (secondary.lastActivity > primary.lastActivity) {
      primary.conversationContext.conversationFlow = secondary.conversationContext.conversationFlow;
    }

    // Average sentiment and engagement
    primary.conversationContext.sentiment = (primary.conversationContext.sentiment + secondary.conversationContext.sentiment) / 2;
    primary.conversationContext.engagement = (primary.conversationContext.engagement + secondary.conversationContext.engagement) / 2;
  }

  private async mergeOperationContexts(primary: SessionContext, secondary: SessionContext): Promise<void> {
    // Use the most recent operation context
    if (secondary.lastActivity > primary.lastActivity) {
      primary.operationContext = secondary.operationContext;
    }

    // Merge parameters
    primary.operationContext.parameters = {
      ...primary.operationContext.parameters,
      ...secondary.operationContext.parameters
    };
  }

  private calculateAvgSessionDuration(sessions: SessionContext[]): number {
    if (sessions.length === 0) return 0;

    const totalDuration = sessions.reduce((sum, session) => {
      const duration = session.lastActivity.getTime() - session.startTime.getTime();
      return sum + duration;
    }, 0);

    return totalDuration / sessions.length;
  }

  private calculateCompletionRate(sessions: SessionContext[]): number {
    if (sessions.length === 0) return 1;

    const completedSessions = sessions.filter(session => 
      session.conversationContext.conversationFlow.flowState.stage === 'completion'
    );

    return completedSessions.length / sessions.length;
  }

  private getTopTopics(sessions: SessionContext[]): string[] {
    const topicCounts = new Map<string, number>();

    sessions.forEach(session => {
      session.conversationContext.topicHistory.forEach(topic => {
        topicCounts.set(topic, (topicCounts.get(topic) || 0) + 1);
      });
    });

    return Array.from(topicCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([topic]) => topic)
      .slice(0, 10);
  }

  private calculateUserEngagement(sessions: SessionContext[]): number {
    if (sessions.length === 0) return 0;

    const totalEngagement = sessions.reduce((sum, session) => {
      return sum + session.conversationContext.engagement;
    }, 0);

    return totalEngagement / sessions.length;
  }

  private getDeviceDistribution(sessions: SessionContext[]): Record<string, number> {
    const distribution: Record<string, number> = {};

    sessions.forEach(session => {
      const platform = session.deviceInfo?.platform || 'unknown';
      distribution[platform] = (distribution[platform] || 0) + 1;
    });

    return distribution;
  }

  private getTimeDistribution(sessions: SessionContext[]): Record<string, number> {
    const distribution: Record<string, number> = {};

    sessions.forEach(session => {
      const hour = session.startTime.getHours();
      const timeSlot = `${hour}:00`;
      distribution[timeSlot] = (distribution[timeSlot] || 0) + 1;
    });

    return distribution;
  }
}

export default SessionManager;
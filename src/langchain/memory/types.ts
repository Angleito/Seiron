/**
 * @fileoverview Core memory types for LangChain Sei Agent Kit
 * Defines interfaces for multi-layered memory management system
 */

import { Either } from 'fp-ts/Either';
import { TaskEither } from 'fp-ts/TaskEither';

/**
 * Memory layer types for hierarchical memory management
 */
export type MemoryLayer = 'short_term' | 'long_term' | 'contextual' | 'semantic';

/**
 * Memory entry priorities for retention policies
 */
export type MemoryPriority = 'low' | 'medium' | 'high' | 'critical';

/**
 * Memory access patterns for optimization
 */
export type AccessPattern = 'frequent' | 'recent' | 'rare' | 'archived';

/**
 * Base memory entry interface
 */
export interface MemoryEntry {
  id: string;
  userId: string;
  sessionId?: string;
  timestamp: Date;
  lastAccessed: Date;
  accessCount: number;
  priority: MemoryPriority;
  layer: MemoryLayer;
  pattern: AccessPattern;
  ttl?: number; // Time to live in milliseconds
  metadata: Record<string, any>;
}

/**
 * Message interface for conversation memory
 */
export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  metadata?: MessageMetadata;
}

/**
 * Enhanced message metadata
 */
export interface MessageMetadata {
  intent?: string;
  entities?: Entity[];
  sentiment?: number;
  confidence?: number;
  operationId?: string;
  references?: string[];
  embeddings?: number[];
}

/**
 * Entity extraction for context understanding
 */
export interface Entity {
  type: EntityType;
  value: string;
  confidence: number;
  start: number;
  end: number;
}

export type EntityType = 
  | 'token'
  | 'amount'
  | 'protocol'
  | 'operation'
  | 'position'
  | 'time'
  | 'percentage'
  | 'address';

/**
 * Conversation memory entry
 */
export interface ConversationMemoryEntry extends MemoryEntry {
  type: 'conversation';
  messages: Message[];
  operationContext: OperationContext;
  unresolvedIntents: Intent[];
  pendingOperations: PendingOperation[];
  conversationSummary?: string;
}

/**
 * Operation context for tracking multi-step workflows
 */
export interface OperationContext {
  currentOperation?: string;
  step: number;
  totalSteps: number;
  parameters: Record<string, any>;
  requirements: OperationRequirement[];
  validationErrors: string[];
}

/**
 * Operation requirements for validation
 */
export interface OperationRequirement {
  type: 'parameter' | 'balance' | 'approval' | 'collateral' | 'signature';
  field: string;
  value?: any;
  satisfied: boolean;
  error?: string;
}

/**
 * User intent classification
 */
export interface Intent {
  id: string;
  type: IntentType;
  confidence: number;
  parameters: Record<string, any>;
  resolved: boolean;
  timestamp: Date;
}

export type IntentType = 
  | 'supply'
  | 'borrow'
  | 'repay'
  | 'withdraw'
  | 'swap'
  | 'add_liquidity'
  | 'remove_liquidity'
  | 'check_balance'
  | 'check_rates'
  | 'portfolio_status'
  | 'risk_assessment'
  | 'yield_optimization';

/**
 * Pending operations for multi-step workflows
 */
export interface PendingOperation {
  id: string;
  type: IntentType;
  status: 'pending' | 'in_progress' | 'awaiting_confirmation' | 'completed' | 'failed';
  parameters: Record<string, any>;
  requirements: OperationRequirement[];
  estimatedGas?: string;
  slippageTolerance?: number;
  deadline?: Date;
  txHash?: string;
  error?: string;
}

/**
 * User profile memory entry
 */
export interface UserProfileMemoryEntry extends MemoryEntry {
  type: 'user_profile';
  riskTolerance: RiskTolerance;
  preferredProtocols: Protocol[];
  tradingStrategies: Strategy[];
  portfolioPreferences: PortfolioPreferences;
  operationHistory: OperationSummary[];
  behaviorPatterns: BehaviorPattern[];
  learningProfile: LearningProfile;
}

/**
 * Risk tolerance configuration
 */
export interface RiskTolerance {
  level: 'conservative' | 'moderate' | 'aggressive';
  maxSlippage: number;
  maxGasPrice: number;
  maxPositionSize: number;
  healthFactorThreshold: number;
  leverageLimit: number;
  portfolioConcentration: number;
}

/**
 * Protocol preferences
 */
export interface Protocol {
  name: string;
  category: 'lending' | 'dex' | 'yield' | 'derivatives';
  preference: number; // 0-1 scale
  lastUsed: Date;
  successRate: number;
  avgGasUsed: number;
  totalVolume: number;
}

/**
 * Trading strategies
 */
export interface Strategy {
  id: string;
  name: string;
  type: 'dca' | 'arbitrage' | 'yield_farming' | 'lending' | 'grid_trading';
  parameters: Record<string, any>;
  performance: StrategyPerformance;
  active: boolean;
  lastUpdated: Date;
}

/**
 * Strategy performance metrics
 */
export interface StrategyPerformance {
  totalReturn: number;
  sharpeRatio: number;
  maxDrawdown: number;
  winRate: number;
  avgProfit: number;
  avgLoss: number;
  totalTrades: number;
}

/**
 * Portfolio preferences
 */
export interface PortfolioPreferences {
  targetAllocations: Record<string, number>;
  rebalanceThreshold: number;
  autoRebalance: boolean;
  preferredStables: string[];
  maxPositions: number;
  notifications: NotificationPreferences;
}

/**
 * Notification preferences
 */
export interface NotificationPreferences {
  priceAlerts: boolean;
  healthFactorAlerts: boolean;
  liquidationRisk: boolean;
  yieldOpportunities: boolean;
  strategyUpdates: boolean;
  transactionConfirmations: boolean;
}

/**
 * Operation summary for history tracking
 */
export interface OperationSummary {
  id: string;
  type: IntentType;
  timestamp: Date;
  protocol: string;
  tokens: string[];
  amounts: string[];
  gasUsed: string;
  gasPrice: string;
  txHash: string;
  success: boolean;
  error?: string;
  profitLoss?: number;
  impact: MarketImpact;
}

/**
 * Market impact metrics
 */
export interface MarketImpact {
  priceImpact: number;
  slippage: number;
  fees: number;
  totalCost: number;
}

/**
 * Behavior pattern analysis
 */
export interface BehaviorPattern {
  pattern: string;
  frequency: number;
  confidence: number;
  timeframe: string;
  parameters: Record<string, any>;
  lastOccurrence: Date;
}

/**
 * Learning profile for personalization
 */
export interface LearningProfile {
  experienceLevel: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  preferredComplexity: 'simple' | 'detailed' | 'technical';
  learningStyle: 'visual' | 'text' | 'interactive' | 'guided';
  commonMistakes: string[];
  successPatterns: string[];
  adaptationRate: number;
}

/**
 * Operation memory entry
 */
export interface OperationMemoryEntry extends MemoryEntry {
  type: 'operation';
  operationId: string;
  operationType: IntentType;
  protocol: string;
  status: 'pending' | 'executing' | 'completed' | 'failed';
  startTime: Date;
  endTime?: Date;
  parameters: Record<string, any>;
  results: OperationResult;
  gasMetrics: GasMetrics;
  failureAnalysis?: FailureAnalysis;
}

/**
 * Operation execution results
 */
export interface OperationResult {
  success: boolean;
  txHash?: string;
  blockNumber?: number;
  gasUsed?: string;
  effectiveGasPrice?: string;
  outputs: Record<string, any>;
  stateChanges: StateChange[];
  logs: OperationLog[];
}

/**
 * State changes tracking
 */
export interface StateChange {
  type: 'balance' | 'allowance' | 'position' | 'debt' | 'collateral';
  token: string;
  from: string;
  to: string;
  amount: string;
  timestamp: Date;
}

/**
 * Operation logs for debugging
 */
export interface OperationLog {
  level: 'info' | 'warn' | 'error';
  message: string;
  timestamp: Date;
  data?: any;
}

/**
 * Gas usage metrics
 */
export interface GasMetrics {
  estimated: string;
  actual: string;
  price: string;
  cost: string;
  efficiency: number;
  comparison: GasComparison;
}

/**
 * Gas comparison with market
 */
export interface GasComparison {
  percentile: number;
  avgMarketPrice: string;
  savings: string;
  recommendation: string;
}

/**
 * Failure analysis for learning
 */
export interface FailureAnalysis {
  category: 'user_error' | 'system_error' | 'market_conditions' | 'gas_issues';
  rootCause: string;
  resolution: string;
  prevention: string;
  impactLevel: 'low' | 'medium' | 'high' | 'critical';
}

/**
 * Portfolio context entry
 */
export interface PortfolioContext {
  positions: Position[];
  healthFactors: HealthFactor[];
  activeOperations: ActiveOperation[];
  riskMetrics: RiskMetrics;
  performanceHistory: PerformanceData[];
  alerts: Alert[];
}

/**
 * Position information
 */
export interface Position {
  id: string;
  protocol: string;
  type: 'supply' | 'borrow' | 'liquidity' | 'farming' | 'staking';
  token: string;
  amount: string;
  value: number;
  apy: number;
  health?: number;
  maturity?: Date;
  autoCompound?: boolean;
}

/**
 * Health factor tracking
 */
export interface HealthFactor {
  protocol: string;
  factor: number;
  threshold: number;
  risk: 'safe' | 'medium' | 'high' | 'critical';
  liquidationPrice?: number;
  timeToLiquidation?: number;
}

/**
 * Active operation tracking
 */
export interface ActiveOperation {
  id: string;
  type: IntentType;
  status: 'pending' | 'executing' | 'confirming';
  startTime: Date;
  estimatedCompletion: Date;
  progress: number;
  currentStep: string;
}

/**
 * Risk metrics calculation
 */
export interface RiskMetrics {
  totalRisk: number;
  concentrationRisk: number;
  liquidityRisk: number;
  counterpartyRisk: number;
  marketRisk: number;
  var: number; // Value at Risk
  sharpeRatio: number;
  maxDrawdown: number;
}

/**
 * Performance data tracking
 */
export interface PerformanceData {
  timestamp: Date;
  totalValue: number;
  pnl: number;
  apy: number;
  fees: number;
  gasSpent: number;
  benchmark: number;
  alpha: number;
  beta: number;
}

/**
 * Alert system
 */
export interface Alert {
  id: string;
  type: 'price' | 'health' | 'liquidation' | 'opportunity' | 'system';
  severity: 'info' | 'warning' | 'error' | 'critical';
  message: string;
  timestamp: Date;
  acknowledged: boolean;
  actions: AlertAction[];
}

/**
 * Alert actions
 */
export interface AlertAction {
  id: string;
  name: string;
  type: 'notification' | 'transaction' | 'strategy_adjustment';
  parameters: Record<string, any>;
  automated: boolean;
}

/**
 * Memory query interface
 */
export interface MemoryQuery {
  userId: string;
  sessionId?: string;
  layer?: MemoryLayer;
  type?: string;
  timeRange?: {
    start: Date;
    end: Date;
  };
  limit?: number;
  offset?: number;
  filters?: Record<string, any>;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * Memory search interface
 */
export interface MemorySearch {
  query: string;
  userId: string;
  sessionId?: string;
  type?: string;
  limit?: number;
  threshold?: number;
  includeEmbeddings?: boolean;
}

/**
 * Memory statistics
 */
export interface MemoryStats {
  totalEntries: number;
  entriesByType: Record<string, number>;
  entriesByLayer: Record<string, number>;
  memoryUsage: number;
  avgAccessTime: number;
  hitRate: number;
  oldestEntry: Date;
  newestEntry: Date;
}

/**
 * Memory configuration
 */
export interface MemoryConfig {
  maxEntries: number;
  maxMemoryMB: number;
  defaultTTL: number;
  cleanupInterval: number;
  encryptionKey: string;
  backupEnabled: boolean;
  backupInterval: number;
  compressionEnabled: boolean;
  indexingEnabled: boolean;
}

/**
 * Memory operation result
 */
export interface MemoryOperationResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  metrics?: {
    executionTime: number;
    memoryUsed: number;
    entriesAffected: number;
  };
}

/**
 * Memory manager interface
 */
export interface IMemoryManager {
  // Core operations
  store<T extends MemoryEntry>(entry: T): TaskEither<Error, MemoryOperationResult<T>>;
  retrieve<T extends MemoryEntry>(id: string): TaskEither<Error, MemoryOperationResult<T>>;
  update<T extends MemoryEntry>(id: string, updates: Partial<T>): TaskEither<Error, MemoryOperationResult<T>>;
  delete(id: string): TaskEither<Error, MemoryOperationResult<void>>;
  
  // Query operations
  query<T extends MemoryEntry>(query: MemoryQuery): TaskEither<Error, MemoryOperationResult<T[]>>;
  search<T extends MemoryEntry>(search: MemorySearch): TaskEither<Error, MemoryOperationResult<T[]>>;
  
  // Maintenance operations
  cleanup(): TaskEither<Error, MemoryOperationResult<void>>;
  optimize(): TaskEither<Error, MemoryOperationResult<void>>;
  getStats(): TaskEither<Error, MemoryOperationResult<MemoryStats>>;
  
  // Lifecycle operations
  initialize(): TaskEither<Error, void>;
  shutdown(): TaskEither<Error, void>;
}

/**
 * Memory encryption interface
 */
export interface IMemoryEncryption {
  encrypt(data: string): Either<Error, string>;
  decrypt(encryptedData: string): Either<Error, string>;
  generateKey(): string;
  rotateKey(newKey: string): Either<Error, void>;
}

/**
 * Memory persistence interface
 */
export interface IMemoryPersistence {
  save<T extends MemoryEntry>(entry: T): TaskEither<Error, void>;
  load<T extends MemoryEntry>(id: string): TaskEither<Error, T>;
  delete(id: string): TaskEither<Error, void>;
  backup(): TaskEither<Error, void>;
  restore(backupPath: string): TaskEither<Error, void>;
}

/**
 * Memory analytics interface
 */
export interface IMemoryAnalytics {
  trackAccess(entryId: string, userId: string): void;
  trackOperation(operation: string, duration: number, success: boolean): void;
  generateReport(timeRange: { start: Date; end: Date }): TaskEither<Error, MemoryReport>;
  getInsights(userId: string): TaskEither<Error, MemoryInsights>;
}

/**
 * Memory report
 */
export interface MemoryReport {
  timeRange: { start: Date; end: Date };
  totalOperations: number;
  successRate: number;
  avgResponseTime: number;
  memoryUsage: MemoryUsageReport;
  topQueries: QueryStats[];
  userActivity: UserActivityStats[];
}

/**
 * Memory usage report
 */
export interface MemoryUsageReport {
  total: number;
  byType: Record<string, number>;
  byLayer: Record<string, number>;
  byUser: Record<string, number>;
  growth: number;
  projectedUsage: number;
}

/**
 * Query statistics
 */
export interface QueryStats {
  query: string;
  count: number;
  avgResponseTime: number;
  successRate: number;
  lastExecuted: Date;
}

/**
 * User activity statistics
 */
export interface UserActivityStats {
  userId: string;
  totalQueries: number;
  uniqueSessions: number;
  avgSessionLength: number;
  topOperations: string[];
  lastActivity: Date;
}

/**
 * Memory insights
 */
export interface MemoryInsights {
  userId: string;
  behaviorProfile: BehaviorProfile;
  recommendations: Recommendation[];
  patterns: Pattern[];
  anomalies: Anomaly[];
}

/**
 * Behavior profile
 */
export interface BehaviorProfile {
  activityLevel: 'low' | 'medium' | 'high';
  sessionFrequency: number;
  avgSessionLength: number;
  preferredOperations: string[];
  riskProfile: string;
  expertiseLevel: string;
}

/**
 * Recommendation system
 */
export interface Recommendation {
  id: string;
  type: 'optimization' | 'strategy' | 'risk_management' | 'education';
  title: string;
  description: string;
  confidence: number;
  priority: number;
  action: string;
  parameters: Record<string, any>;
}

/**
 * Pattern recognition
 */
export interface Pattern {
  id: string;
  type: 'behavioral' | 'operational' | 'temporal' | 'risk';
  description: string;
  frequency: number;
  confidence: number;
  impact: 'positive' | 'negative' | 'neutral';
  suggestion: string;
}

/**
 * Anomaly detection
 */
export interface Anomaly {
  id: string;
  type: 'usage' | 'performance' | 'security' | 'financial';
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: Date;
  details: Record<string, any>;
  resolved: boolean;
}

/**
 * Export all types
 */
export type {
  MemoryEntry,
  Message,
  MessageMetadata,
  Entity,
  EntityType,
  ConversationMemoryEntry,
  OperationContext,
  OperationRequirement,
  Intent,
  IntentType,
  PendingOperation,
  UserProfileMemoryEntry,
  RiskTolerance,
  Protocol,
  Strategy,
  StrategyPerformance,
  PortfolioPreferences,
  NotificationPreferences,
  OperationSummary,
  MarketImpact,
  BehaviorPattern,
  LearningProfile,
  OperationMemoryEntry,
  OperationResult,
  StateChange,
  OperationLog,
  GasMetrics,
  GasComparison,
  FailureAnalysis,
  PortfolioContext,
  Position,
  HealthFactor,
  ActiveOperation,
  RiskMetrics,
  PerformanceData,
  Alert,
  AlertAction,
  MemoryQuery,
  MemorySearch,
  MemoryStats,
  MemoryConfig,
  MemoryOperationResult,
  IMemoryManager,
  IMemoryEncryption,
  IMemoryPersistence,
  IMemoryAnalytics,
  MemoryReport,
  MemoryUsageReport,
  QueryStats,
  UserActivityStats,
  MemoryInsights,
  BehaviorProfile,
  Recommendation,
  Pattern,
  Anomaly
};
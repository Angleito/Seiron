/**
 * @fileoverview Financial Domain Types
 * Types for domain-specific financial processing
 */

import { z } from 'zod';
import type { Option, Result, ReadonlyRecord } from '../../types/index.js';
import { DefiIntent, FinancialEntity } from '../nlp/types.js';

/**
 * Asset Information
 */
export interface AssetInfo {
  readonly symbol: string;
  readonly name: string;
  readonly decimals: number;
  readonly contractAddress?: string;
  readonly chainId: number;
  readonly logoUrl?: string;
  readonly isStablecoin: boolean;
  readonly isWrapped: boolean;
  readonly underlyingAsset?: string;
  readonly marketCap?: number;
  readonly dailyVolume?: number;
  readonly priceUsd?: number;
}

/**
 * Protocol Information
 */
export interface ProtocolInfo {
  readonly id: string;
  readonly name: string;
  readonly displayName: string;
  readonly category: ProtocolCategory;
  readonly tvl: number;
  readonly fees24h?: number;
  readonly volume24h?: number;
  readonly apy?: number;
  readonly riskLevel: 'low' | 'medium' | 'high';
  readonly auditStatus: AuditStatus;
  readonly supportedChains: ReadonlyArray<number>;
  readonly website?: string;
  readonly documentation?: string;
}

/**
 * Protocol Category
 */
export enum ProtocolCategory {
  LENDING = 'lending',
  DEX = 'dex',
  PERPETUALS = 'perpetuals',
  YIELD_FARMING = 'yield_farming',
  LIQUID_STAKING = 'liquid_staking',
  DERIVATIVES = 'derivatives',
  INSURANCE = 'insurance',
  BRIDGE = 'bridge'
}

/**
 * Audit Status
 */
export interface AuditStatus {
  readonly isAudited: boolean;
  readonly auditors: ReadonlyArray<string>;
  readonly auditDate?: string;
  readonly reportUrl?: string;
  readonly score?: number;
}

/**
 * Market Data
 */
export interface MarketData {
  readonly symbol: string;
  readonly price: number;
  readonly priceChange24h: number;
  readonly priceChangePercentage24h: number;
  readonly volume24h: number;
  readonly marketCap: number;
  readonly circulatingSupply: number;
  readonly totalSupply?: number;
  readonly ath?: number;
  readonly atl?: number;
  readonly lastUpdated: number;
}

/**
 * Pool Information
 */
export interface PoolInfo {
  readonly id: string;
  readonly protocol: string;
  readonly tokens: ReadonlyArray<string>;
  readonly reserves: ReadonlyArray<number>;
  readonly totalLiquidity: number;
  readonly volume24h: number;
  readonly fees24h: number;
  readonly apr: number;
  readonly apy: number;
  readonly feeRate: number;
  readonly lastUpdated: number;
}

/**
 * Risk Assessment
 */
export interface RiskAssessment {
  readonly overall: RiskLevel;
  readonly factors: ReadonlyArray<RiskFactor>;
  readonly score: number;
  readonly recommendations: ReadonlyArray<string>;
  readonly warnings: ReadonlyArray<string>;
}

/**
 * Risk Level
 */
export enum RiskLevel {
  VERY_LOW = 'very_low',
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  VERY_HIGH = 'very_high'
}

/**
 * Risk Factor
 */
export interface RiskFactor {
  readonly type: RiskFactorType;
  readonly level: RiskLevel;
  readonly impact: number;
  readonly description: string;
  readonly mitigation?: string;
}

/**
 * Risk Factor Type
 */
export enum RiskFactorType {
  SMART_CONTRACT = 'smart_contract',
  LIQUIDITY = 'liquidity',
  MARKET = 'market',
  REGULATORY = 'regulatory',
  OPERATIONAL = 'operational',
  COUNTERPARTY = 'counterparty',
  ORACLE = 'oracle'
}

/**
 * Strategy Information
 */
export interface StrategyInfo {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly category: StrategyCategory;
  readonly riskLevel: RiskLevel;
  readonly expectedApy: number;
  readonly minAmount: number;
  readonly maxAmount?: number;
  readonly duration?: number;
  readonly protocols: ReadonlyArray<string>;
  readonly steps: ReadonlyArray<StrategyStep>;
  readonly advantages: ReadonlyArray<string>;
  readonly disadvantages: ReadonlyArray<string>;
}

/**
 * Strategy Category
 */
export enum StrategyCategory {
  YIELD_FARMING = 'yield_farming',
  ARBITRAGE = 'arbitrage',
  DELTA_NEUTRAL = 'delta_neutral',
  LENDING = 'lending',
  STAKING = 'staking',
  LEVERAGED_FARMING = 'leveraged_farming'
}

/**
 * Strategy Step
 */
export interface StrategyStep {
  readonly id: string;
  readonly description: string;
  readonly protocol: string;
  readonly action: string;
  readonly estimatedGas: number;
  readonly required: boolean;
}

/**
 * Amount Parsing Result
 */
export interface AmountParsingResult {
  readonly value: number;
  readonly normalized: string;
  readonly unit?: string;
  readonly confidence: number;
  readonly alternatives: ReadonlyArray<{
    readonly value: number;
    readonly interpretation: string;
  }>;
}

/**
 * Asset Resolution Result
 */
export interface AssetResolutionResult {
  readonly resolved: AssetInfo;
  readonly confidence: number;
  readonly alternatives: ReadonlyArray<AssetInfo>;
  readonly suggestions: ReadonlyArray<string>;
}

/**
 * Risk Profile
 */
export interface RiskProfile {
  readonly tolerance: RiskLevel;
  readonly capacity: number;
  readonly timeHorizon: TimeHorizon;
  readonly experience: ExperienceLevel;
  readonly preferences: RiskPreferences;
}

/**
 * Time Horizon
 */
export enum TimeHorizon {
  SHORT_TERM = 'short_term', // < 1 month
  MEDIUM_TERM = 'medium_term', // 1-12 months
  LONG_TERM = 'long_term' // > 12 months
}

/**
 * Experience Level
 */
export enum ExperienceLevel {
  BEGINNER = 'beginner',
  INTERMEDIATE = 'intermediate',
  ADVANCED = 'advanced',
  EXPERT = 'expert'
}

/**
 * Risk Preferences
 */
export interface RiskPreferences {
  readonly maxSinglePosition: number;
  readonly maxProtocolExposure: number;
  readonly allowLeverage: boolean;
  readonly maxLeverage?: number;
  readonly allowExperimental: boolean;
  readonly preferAudited: boolean;
}

/**
 * Strategy Matching Criteria
 */
export interface StrategyMatchingCriteria {
  readonly amount: number;
  readonly duration?: number;
  readonly riskTolerance: RiskLevel;
  readonly preferredProtocols: ReadonlyArray<string>;
  readonly excludedProtocols: ReadonlyArray<string>;
  readonly minApy?: number;
  readonly maxGas?: number;
  readonly allowLeverage: boolean;
}

/**
 * Optimization Suggestion
 */
export interface OptimizationSuggestion {
  readonly type: OptimizationType;
  readonly title: string;
  readonly description: string;
  readonly potentialBenefit: string;
  readonly estimatedImpact: number;
  readonly difficulty: 'easy' | 'medium' | 'hard';
  readonly requirements: ReadonlyArray<string>;
  readonly steps: ReadonlyArray<string>;
}

/**
 * Optimization Type
 */
export enum OptimizationType {
  YIELD_INCREASE = 'yield_increase',
  RISK_REDUCTION = 'risk_reduction',
  GAS_OPTIMIZATION = 'gas_optimization',
  DIVERSIFICATION = 'diversification',
  REBALANCING = 'rebalancing',
  COMPOUNDING = 'compounding'
}

/**
 * Market Condition
 */
export interface MarketCondition {
  readonly trend: MarketTrend;
  readonly volatility: VolatilityLevel;
  readonly sentiment: MarketSentiment;
  readonly indicators: ReadonlyArray<MarketIndicator>;
  readonly recommendations: ReadonlyArray<string>;
}

/**
 * Market Trend
 */
export enum MarketTrend {
  BULLISH = 'bullish',
  BEARISH = 'bearish',
  SIDEWAYS = 'sideways',
  UNCERTAIN = 'uncertain'
}

/**
 * Volatility Level
 */
export enum VolatilityLevel {
  VERY_LOW = 'very_low',
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  VERY_HIGH = 'very_high'
}

/**
 * Market Sentiment
 */
export enum MarketSentiment {
  EXTREMELY_FEARFUL = 'extremely_fearful',
  FEARFUL = 'fearful',
  NEUTRAL = 'neutral',
  GREEDY = 'greedy',
  EXTREMELY_GREEDY = 'extremely_greedy'
}

/**
 * Market Indicator
 */
export interface MarketIndicator {
  readonly name: string;
  readonly value: number;
  readonly signal: 'buy' | 'sell' | 'hold';
  readonly strength: number;
  readonly description: string;
}

/**
 * Zod Schemas
 */
export const AssetInfoSchema = z.object({
  symbol: z.string(),
  name: z.string(),
  decimals: z.number(),
  contractAddress: z.string().optional(),
  chainId: z.number(),
  logoUrl: z.string().optional(),
  isStablecoin: z.boolean(),
  isWrapped: z.boolean(),
  underlyingAsset: z.string().optional(),
  marketCap: z.number().optional(),
  dailyVolume: z.number().optional(),
  priceUsd: z.number().optional()
});

export const ProtocolInfoSchema = z.object({
  id: z.string(),
  name: z.string(),
  displayName: z.string(),
  category: z.nativeEnum(ProtocolCategory),
  tvl: z.number(),
  fees24h: z.number().optional(),
  volume24h: z.number().optional(),
  apy: z.number().optional(),
  riskLevel: z.enum(['low', 'medium', 'high']),
  auditStatus: z.object({
    isAudited: z.boolean(),
    auditors: z.array(z.string()),
    auditDate: z.string().optional(),
    reportUrl: z.string().optional(),
    score: z.number().optional()
  }),
  supportedChains: z.array(z.number()),
  website: z.string().optional(),
  documentation: z.string().optional()
});

export const RiskAssessmentSchema = z.object({
  overall: z.nativeEnum(RiskLevel),
  factors: z.array(z.object({
    type: z.nativeEnum(RiskFactorType),
    level: z.nativeEnum(RiskLevel),
    impact: z.number(),
    description: z.string(),
    mitigation: z.string().optional()
  })),
  score: z.number(),
  recommendations: z.array(z.string()),
  warnings: z.array(z.string())
});

/**
 * Type Guards
 */
export function isAssetInfo(asset: any): asset is AssetInfo {
  return AssetInfoSchema.safeParse(asset).success;
}

export function isProtocolInfo(protocol: any): protocol is ProtocolInfo {
  return ProtocolInfoSchema.safeParse(protocol).success;
}

export function isRiskAssessment(assessment: any): assessment is RiskAssessment {
  return RiskAssessmentSchema.safeParse(assessment).success;
}

/**
 * Error Types
 */
export class DomainError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly details?: ReadonlyRecord<string, any>
  ) {
    super(message);
    this.name = 'DomainError';
  }
}

export class AssetResolutionError extends DomainError {
  constructor(message: string, details?: ReadonlyRecord<string, any>) {
    super(message, 'ASSET_RESOLUTION_ERROR', details);
    this.name = 'AssetResolutionError';
  }
}

export class ProtocolResolutionError extends DomainError {
  constructor(message: string, details?: ReadonlyRecord<string, any>) {
    super(message, 'PROTOCOL_RESOLUTION_ERROR', details);
    this.name = 'ProtocolResolutionError';
  }
}

export class RiskAnalysisError extends DomainError {
  constructor(message: string, details?: ReadonlyRecord<string, any>) {
    super(message, 'RISK_ANALYSIS_ERROR', details);
    this.name = 'RiskAnalysisError';
  }
}

/**
 * Utility Types
 */
export type AssetResult = Result<AssetInfo, AssetResolutionError>;
export type ProtocolResult = Result<ProtocolInfo, ProtocolResolutionError>;
export type RiskResult = Result<RiskAssessment, RiskAnalysisError>;
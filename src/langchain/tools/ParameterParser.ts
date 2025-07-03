/**
 * Parameter Parser for Natural Language Processing
 * 
 * This module provides sophisticated natural language parsing capabilities
 * for extracting structured parameters from user inputs, with specific
 * focus on DeFi operations and asset management.
 */

import { z } from 'zod';

/**
 * Supported asset types in the Sei ecosystem
 */
export const SUPPORTED_ASSETS = [
  'SEI', 'USDC', 'USDT', 'ETH', 'BTC', 'WETH', 'WBTC', 'ATOM', 'OSMO'
] as const;

/**
 * Protocol names for fuzzy matching
 */
export const PROTOCOL_NAMES = {
  'yei': 'YeiFinance',
  'yei finance': 'YeiFinance',
  'yeifinance': 'YeiFinance',
  'takara': 'Takara',
  'dragon': 'DragonSwap',
  'dragonswap': 'DragonSwap',
  'dragon swap': 'DragonSwap',
  'symphony': 'Symphony',
  'citrex': 'Citrex',
  'silo': 'Silo'
} as const;

/**
 * Common operation keywords
 */
export const OPERATION_KEYWORDS = {
  deposit: ['deposit', 'supply', 'lend', 'put', 'add', 'stake'],
  withdraw: ['withdraw', 'remove', 'take out', 'unstake', 'redeem'],
  borrow: ['borrow', 'loan', 'take loan', 'leverage'],
  repay: ['repay', 'pay back', 'return', 'payback'],
  swap: ['swap', 'trade', 'exchange', 'convert'],
  addLiquidity: ['add liquidity', 'provide liquidity', 'lp'],
  removeLiquidity: ['remove liquidity', 'withdraw liquidity', 'unlp'],
  analyze: ['analyze', 'check', 'look at', 'examine', 'review'],
  monitor: ['monitor', 'watch', 'track', 'observe']
} as const;

/**
 * Parsing context for better parameter extraction
 */
export interface ParsingContext {
  userId?: string;
  walletAddress?: string;
  previousParameters?: Record<string, any>;
  sessionHistory?: string[];
  defaultAsset?: string;
  defaultProtocol?: string;
}

/**
 * Parsed parameter result
 */
export interface ParsedParameters {
  operation?: string;
  asset?: string;
  amount?: string;
  targetAsset?: string;
  protocol?: string;
  slippage?: number;
  interestRateMode?: 'stable' | 'variable';
  walletAddress?: string;
  confidence: number;
  rawText: string;
  metadata: Record<string, any>;
}

/**
 * Parameter extraction patterns
 */
interface ExtractionPattern {
  name: string;
  regex: RegExp;
  extractor: (match: RegExpMatchArray) => Partial<ParsedParameters>;
  priority: number;
}

/**
 * Natural Language Parameter Parser
 */
export class ParameterParser {
  private patterns: ExtractionPattern[] = [];
  private context: ParsingContext = {};

  constructor(context: ParsingContext = {}) {
    this.context = context;
    this.initializePatterns();
  }

  /**
   * Parse natural language input into structured parameters
   */
  public parse(input: string): ParsedParameters {
    const normalizedInput = this.normalizeInput(input);
    
    const baseResult: ParsedParameters = {
      confidence: 0,
      rawText: input,
      metadata: {}
    };

    // Apply all patterns and merge results
    const results: Partial<ParsedParameters>[] = [];
    
    this.patterns.forEach(pattern => {
      const matches = normalizedInput.match(pattern.regex);
      if (matches) {
        const extracted = pattern.extractor(matches);
        extracted.metadata = { ...extracted.metadata, pattern: pattern.name };
        results.push(extracted);
      }
    });

    // Merge results with priority
    const mergedResult = this.mergeResults(baseResult, results);
    
    // Apply context defaults
    this.applyContextDefaults(mergedResult);
    
    // Calculate confidence score
    mergedResult.confidence = this.calculateConfidence(mergedResult);
    
    return mergedResult;
  }

  /**
   * Update parsing context
   */
  public updateContext(updates: Partial<ParsingContext>): void {
    this.context = { ...this.context, ...updates };
  }

  /**
   * Extract asset mentions from text
   */
  public extractAssets(text: string): string[] {
    const assets: string[] = [];
    const normalizedText = text.toUpperCase();
    
    SUPPORTED_ASSETS.forEach(asset => {
      if (normalizedText.includes(asset)) {
        assets.push(asset);
      }
    });
    
    return assets;
  }

  /**
   * Extract amount with asset
   */
  public extractAmountWithAsset(text: string): { amount: string; asset: string } | null {
    const amountPattern = /(\d+(?:\.\d+)?)\s*(USD[CT]?|ETH|BTC|SEI|WETH|WBTC|ATOM|OSMO)/i;
    const match = text.match(amountPattern);
    
    if (match) {
      return {
        amount: match[1],
        asset: match[2].toUpperCase()
      };
    }
    
    return null;
  }

  /**
   * Fuzzy match asset names
   */
  public fuzzyMatchAsset(input: string): string | null {
    const normalized = input.toLowerCase().trim();
    
    // Exact match first
    for (const asset of SUPPORTED_ASSETS) {
      if (asset.toLowerCase() === normalized) {
        return asset;
      }
    }
    
    // Partial match
    for (const asset of SUPPORTED_ASSETS) {
      if (asset.toLowerCase().includes(normalized) || normalized.includes(asset.toLowerCase())) {
        return asset;
      }
    }
    
    return null;
  }

  /**
   * Initialize extraction patterns
   */
  private initializePatterns(): void {
    this.patterns = [
      // Amount and asset patterns
      {
        name: 'amount_asset',
        regex: /(\d+(?:\.\d+)?)\s*(USD[CT]?|ETH|BTC|SEI|WETH|WBTC|ATOM|OSMO)/i,
        extractor: (match) => ({
          amount: match[1],
          asset: match[2].toUpperCase()
        }),
        priority: 10
      },
      
      // Deposit operations
      {
        name: 'deposit_operation',
        regex: /(?:deposit|supply|lend|put|add|stake)\s+(\d+(?:\.\d+)?)\s*(USD[CT]?|ETH|BTC|SEI|WETH|WBTC|ATOM|OSMO)/i,
        extractor: (match) => ({
          operation: 'deposit',
          amount: match[1],
          asset: match[2].toUpperCase()
        }),
        priority: 15
      },
      
      // Withdraw operations
      {
        name: 'withdraw_operation',
        regex: /(?:withdraw|remove|take out|unstake|redeem)\s+(\d+(?:\.\d+)?|all|max)\s*(USD[CT]?|ETH|BTC|SEI|WETH|WBTC|ATOM|OSMO)?/i,
        extractor: (match) => ({
          operation: 'withdraw',
          amount: match[1],
          asset: match[2]?.toUpperCase()
        }),
        priority: 15
      },
      
      // Borrow operations
      {
        name: 'borrow_operation',
        regex: /(?:borrow|loan|take loan|leverage)\s+(\d+(?:\.\d+)?)\s*(USD[CT]?|ETH|BTC|SEI|WETH|WBTC|ATOM|OSMO)/i,
        extractor: (match) => ({
          operation: 'borrow',
          amount: match[1],
          asset: match[2].toUpperCase()
        }),
        priority: 15
      },
      
      // Repay operations
      {
        name: 'repay_operation',
        regex: /(?:repay|pay back|return|payback)\s+(\d+(?:\.\d+)?|all|max)\s*(USD[CT]?|ETH|BTC|SEI|WETH|WBTC|ATOM|OSMO)?/i,
        extractor: (match) => ({
          operation: 'repay',
          amount: match[1],
          asset: match[2]?.toUpperCase()
        }),
        priority: 15
      },
      
      // Swap operations
      {
        name: 'swap_operation',
        regex: /(?:swap|trade|exchange|convert)\s+(\d+(?:\.\d+)?)\s*(USD[CT]?|ETH|BTC|SEI|WETH|WBTC|ATOM|OSMO)\s+(?:for|to)\s+(USD[CT]?|ETH|BTC|SEI|WETH|WBTC|ATOM|OSMO)/i,
        extractor: (match) => ({
          operation: 'swap',
          amount: match[1],
          asset: match[2].toUpperCase(),
          targetAsset: match[3].toUpperCase()
        }),
        priority: 15
      },
      
      // Interest rate mode
      {
        name: 'interest_rate_mode',
        regex: /(?:with|using|at)\s+(stable|variable)\s+(?:rate|interest)/i,
        extractor: (match) => ({
          interestRateMode: match[1].toLowerCase() as 'stable' | 'variable'
        }),
        priority: 8
      },
      
      // Slippage tolerance
      {
        name: 'slippage_tolerance',
        regex: /(\d+(?:\.\d+)?)\s*%\s*slippage/i,
        extractor: (match) => ({
          slippage: parseFloat(match[1])
        }),
        priority: 8
      },
      
      // Protocol mentions
      {
        name: 'protocol_mention',
        regex: /(?:on|using|via|through)\s+(yei|takara|dragon|symphony|citrex|silo)/i,
        extractor: (match) => ({
          protocol: this.normalizeProtocol(match[1])
        }),
        priority: 5
      },
      
      // Wallet address
      {
        name: 'wallet_address',
        regex: /(0x[a-fA-F0-9]{40})/,
        extractor: (match) => ({
          walletAddress: match[1]
        }),
        priority: 12
      },
      
      // All/max amount indicators
      {
        name: 'max_amount',
        regex: /\b(all|max|maximum|everything)\b/i,
        extractor: () => ({
          amount: 'max'
        }),
        priority: 7
      }
    ];
    
    // Sort patterns by priority (highest first)
    this.patterns.sort((a, b) => b.priority - a.priority);
  }

  /**
   * Normalize input text
   */
  private normalizeInput(input: string): string {
    return input
      .toLowerCase()
      .trim()
      .replace(/\s+/g, ' ')
      .replace(/[^\w\s\.\-]/g, ' ');
  }

  /**
   * Merge multiple parsing results
   */
  private mergeResults(base: ParsedParameters, results: Partial<ParsedParameters>[]): ParsedParameters {
    const merged = { ...base };
    
    results.forEach(result => {
      Object.entries(result).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          if (key === 'metadata') {
            merged.metadata = { ...merged.metadata, ...value };
          } else {
            (merged as any)[key] = value;
          }
        }
      });
    });
    
    return merged;
  }

  /**
   * Apply context defaults
   */
  private applyContextDefaults(result: ParsedParameters): void {
    if (!result.walletAddress && this.context.walletAddress) {
      result.walletAddress = this.context.walletAddress;
    }
    
    if (!result.asset && this.context.defaultAsset) {
      result.asset = this.context.defaultAsset;
    }
    
    if (!result.protocol && this.context.defaultProtocol) {
      result.protocol = this.context.defaultProtocol;
    }
  }

  /**
   * Calculate confidence score
   */
  private calculateConfidence(result: ParsedParameters): number {
    let score = 0;
    
    // Base score for having an operation
    if (result.operation) score += 25;
    
    // Score for having amount and asset
    if (result.amount && result.asset) score += 30;
    
    // Score for having wallet address
    if (result.walletAddress) score += 15;
    
    // Score for having protocol
    if (result.protocol) score += 10;
    
    // Score for having additional parameters
    if (result.interestRateMode) score += 10;
    if (result.slippage) score += 5;
    if (result.targetAsset) score += 5;
    
    return Math.min(score, 100);
  }

  /**
   * Normalize protocol name
   */
  private normalizeProtocol(protocol: string): string {
    const normalized = protocol.toLowerCase();
    return PROTOCOL_NAMES[normalized as keyof typeof PROTOCOL_NAMES] || protocol;
  }
}

/**
 * Helper function to create a parameter parser with context
 */
export function createParameterParser(context: ParsingContext = {}): ParameterParser {
  return new ParameterParser(context);
}

/**
 * Helper function to parse a single input
 */
export function parseInput(input: string, context: ParsingContext = {}): ParsedParameters {
  const parser = new ParameterParser(context);
  return parser.parse(input);
}

/**
 * Validation schemas for parsed parameters
 */
export const ParameterSchemas = {
  LendingOperation: z.object({
    operation: z.enum(['deposit', 'withdraw', 'borrow', 'repay']),
    asset: z.string(),
    amount: z.string(),
    interestRateMode: z.enum(['stable', 'variable']).optional(),
    walletAddress: z.string().optional()
  }),
  
  SwapOperation: z.object({
    operation: z.literal('swap'),
    asset: z.string(),
    targetAsset: z.string(),
    amount: z.string(),
    slippage: z.number().optional(),
    walletAddress: z.string().optional()
  }),
  
  LiquidityOperation: z.object({
    operation: z.enum(['addLiquidity', 'removeLiquidity']),
    asset: z.string().optional(),
    amount: z.string().optional(),
    walletAddress: z.string().optional()
  })
};

/**
 * Export default parser instance
 */
export const defaultParameterParser = new ParameterParser();
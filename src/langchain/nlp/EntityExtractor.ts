/**
 * @fileoverview Entity Extraction System
 * Extracts financial entities from natural language input with high precision
 */

import { pipe } from 'fp-ts/function';
import * as E from 'fp-ts/Either';
import * as O from 'fp-ts/Option';
import * as A from 'fp-ts/Array';
import { 
  FinancialEntity,
  EntityType,
  EntityExtractionRule,
  EntityExtractionError,
  NLPConfig
} from './types.js';

/**
 * Entity Extraction Engine
 */
export class EntityExtractor {
  private readonly config: NLPConfig;
  private readonly extractionRules: Map<EntityType, EntityExtractionRule[]>;
  private readonly tokenNormalizer: TokenNormalizer;
  private readonly amountParser: AmountParser;

  constructor(config: NLPConfig) {
    this.config = config;
    this.extractionRules = this.initializeExtractionRules();
    this.tokenNormalizer = new TokenNormalizer();
    this.amountParser = new AmountParser();
  }

  /**
   * Extract all financial entities from text
   */
  async extractEntities(text: string): Promise<E.Either<EntityExtractionError, ReadonlyArray<FinancialEntity>>> {
    try {
      const entities: FinancialEntity[] = [];
      const processedText = this.preprocessText(text);

      // Extract entities by type
      for (const [entityType, rules] of this.extractionRules) {
        const typeEntities = await this.extractEntitiesByType(processedText, entityType, rules);
        entities.push(...typeEntities);
      }

      // Remove duplicates and overlapping entities
      const dedupedEntities = this.deduplicateEntities(entities);

      // Validate extracted entities
      const validEntities = this.validateEntities(dedupedEntities);

      // Sort by position
      const sortedEntities = validEntities.sort((a, b) => a.position[0] - b.position[0]);

      return E.right(sortedEntities);

    } catch (error) {
      return E.left(new EntityExtractionError(
        'Failed to extract entities',
        { originalError: error, text }
      ));
    }
  }

  /**
   * Extract entities of specific type
   */
  private async extractEntitiesByType(
    text: string,
    entityType: EntityType,
    rules: EntityExtractionRule[]
  ): Promise<FinancialEntity[]> {
    const entities: FinancialEntity[] = [];

    for (const rule of rules) {
      const matches = this.findMatches(text, rule.pattern);
      
      for (const match of matches) {
        if (rule.validator(match.value)) {
          const normalized = rule.normalizer(match.value);
          const confidence = this.calculateConfidence(match.value, normalized, rule);

          entities.push({
            type: entityType,
            value: match.value,
            normalized,
            confidence,
            position: match.position,
            metadata: { rule: rule.pattern.source }
          });
        }
      }
    }

    return entities;
  }

  /**
   * Find pattern matches in text
   */
  private findMatches(text: string, pattern: RegExp): Array<{ value: string; position: [number, number] }> {
    const matches: Array<{ value: string; position: [number, number] }> = [];
    const globalPattern = new RegExp(pattern.source, pattern.flags.includes('g') ? pattern.flags : pattern.flags + 'g');
    let match;

    while ((match = globalPattern.exec(text)) !== null) {
      matches.push({
        value: match[0],
        position: [match.index, match.index + match[0].length]
      });
    }

    return matches;
  }

  /**
   * Calculate extraction confidence
   */
  private calculateConfidence(value: string, normalized: string, rule: EntityExtractionRule): number {
    let confidence = rule.confidence;

    // Boost confidence for exact matches
    if (value === normalized) {
      confidence *= 1.1;
    }

    // Reduce confidence for very short matches
    if (value.length < 3) {
      confidence *= 0.8;
    }

    // Boost confidence for common patterns
    if (this.isCommonPattern(value, rule.type)) {
      confidence *= 1.2;
    }

    return Math.min(confidence, 1.0);
  }

  /**
   * Check if value matches common patterns
   */
  private isCommonPattern(value: string, type: EntityType): boolean {
    switch (type) {
      case EntityType.TOKEN:
        return /^[A-Z]{3,5}$/.test(value);
      case EntityType.AMOUNT:
        return /^\d+(\.\d+)?$/.test(value);
      case EntityType.PERCENTAGE:
        return /^\d+(\.\d+)?%$/.test(value);
      default:
        return false;
    }
  }

  /**
   * Remove duplicate and overlapping entities
   */
  private deduplicateEntities(entities: FinancialEntity[]): FinancialEntity[] {
    const sorted = [...entities].sort((a, b) => a.position[0] - b.position[0]);
    const deduplicated: FinancialEntity[] = [];

    for (let i = 0; i < sorted.length; i++) {
      const current = sorted[i];
      let shouldAdd = true;

      // Check for overlaps with already added entities
      for (const existing of deduplicated) {
        if (this.entitiesOverlap(current, existing)) {
          // Keep the one with higher confidence
          if (current.confidence <= existing.confidence) {
            shouldAdd = false;
            break;
          } else {
            // Remove the existing one
            const index = deduplicated.indexOf(existing);
            deduplicated.splice(index, 1);
          }
        }
      }

      if (shouldAdd) {
        deduplicated.push(current);
      }
    }

    return deduplicated;
  }

  /**
   * Check if two entities overlap
   */
  private entitiesOverlap(entity1: FinancialEntity, entity2: FinancialEntity): boolean {
    return !(
      entity1.position[1] <= entity2.position[0] ||
      entity2.position[1] <= entity1.position[0]
    );
  }

  /**
   * Validate extracted entities
   */
  private validateEntities(entities: FinancialEntity[]): FinancialEntity[] {
    return entities.filter(entity => {
      // Check minimum confidence
      if (entity.confidence < this.config.minConfidence) {
        return false;
      }

      // Type-specific validation
      switch (entity.type) {
        case EntityType.AMOUNT:
          return this.validateAmount(entity);
        case EntityType.TOKEN:
          return this.validateToken(entity);
        case EntityType.PROTOCOL:
          return this.validateProtocol(entity);
        case EntityType.PERCENTAGE:
          return this.validatePercentage(entity);
        default:
          return true;
      }
    });
  }

  /**
   * Validate amount entity
   */
  private validateAmount(entity: FinancialEntity): boolean {
    const amount = parseFloat(entity.normalized);
    return !isNaN(amount) && amount > 0 && amount < 1e15; // Reasonable bounds
  }

  /**
   * Validate token entity
   */
  private validateToken(entity: FinancialEntity): boolean {
    return this.tokenNormalizer.isKnownToken(entity.normalized);
  }

  /**
   * Validate protocol entity
   */
  private validateProtocol(entity: FinancialEntity): boolean {
    const knownProtocols = ['dragonswap', 'symphony', 'citrex', 'silo', 'takara'];
    return knownProtocols.includes(entity.normalized.toLowerCase());
  }

  /**
   * Validate percentage entity
   */
  private validatePercentage(entity: FinancialEntity): boolean {
    const percentage = parseFloat(entity.normalized);
    return !isNaN(percentage) && percentage >= 0 && percentage <= 100;
  }

  /**
   * Preprocess text for entity extraction
   */
  private preprocessText(text: string): string {
    return text
      .replace(/(\d),(\d)/g, '$1$2') // Remove commas from numbers
      .replace(/\$(\d)/g, '$1 USD') // Normalize dollar signs
      .replace(/(\d)k\b/gi, '$1000') // Convert k notation
      .replace(/(\d)m\b/gi, '$1000000') // Convert m notation
      .trim();
  }

  /**
   * Initialize extraction rules
   */
  private initializeExtractionRules(): Map<EntityType, EntityExtractionRule[]> {
    const rules = new Map<EntityType, EntityExtractionRule[]>();

    // Amount rules
    rules.set(EntityType.AMOUNT, [
      {
        type: EntityType.AMOUNT,
        pattern: /\b\d+(?:\.\d+)?\b/g,
        normalizer: (value: string) => parseFloat(value).toString(),
        validator: (value: string) => !isNaN(parseFloat(value)) && parseFloat(value) > 0,
        confidence: 0.9
      },
      {
        type: EntityType.AMOUNT,
        pattern: /\$\d+(?:\.\d+)?/g,
        normalizer: (value: string) => parseFloat(value.replace('$', '')).toString(),
        validator: (value: string) => !isNaN(parseFloat(value.replace('$', ''))),
        confidence: 0.95
      }
    ]);

    // Token rules
    rules.set(EntityType.TOKEN, [
      {
        type: EntityType.TOKEN,
        pattern: /\b(?:USDC|USDT|SEI|WSEI|ETH|WETH|BTC|WBTC|ATOM|OSMO)\b/gi,
        normalizer: (value: string) => this.tokenNormalizer.normalize(value),
        validator: (value: string) => this.tokenNormalizer.isKnownToken(value),
        confidence: 0.95
      },
      {
        type: EntityType.TOKEN,
        pattern: /\b[A-Z]{3,5}\b/g,
        normalizer: (value: string) => this.tokenNormalizer.normalize(value),
        validator: (value: string) => this.tokenNormalizer.isKnownToken(value),
        confidence: 0.7
      }
    ]);

    // Protocol rules
    rules.set(EntityType.PROTOCOL, [
      {
        type: EntityType.PROTOCOL,
        pattern: /\b(?:dragonswap|dragon|symphony|citrex|silo|takara|yei|finance)\b/gi,
        normalizer: (value: string) => this.normalizeProtocol(value),
        validator: (value: string) => true,
        confidence: 0.9
      }
    ]);

    // Percentage rules
    rules.set(EntityType.PERCENTAGE, [
      {
        type: EntityType.PERCENTAGE,
        pattern: /\b\d+(?:\.\d+)?%/g,
        normalizer: (value: string) => parseFloat(value.replace('%', '')).toString(),
        validator: (value: string) => !isNaN(parseFloat(value.replace('%', ''))),
        confidence: 0.95
      }
    ]);

    // Leverage rules
    rules.set(EntityType.LEVERAGE, [
      {
        type: EntityType.LEVERAGE,
        pattern: /\b\d+x\b/gi,
        normalizer: (value: string) => parseFloat(value.replace('x', '')).toString(),
        validator: (value: string) => {
          const num = parseFloat(value.replace('x', ''));
          return !isNaN(num) && num >= 1 && num <= 100;
        },
        confidence: 0.9
      }
    ]);

    // Slippage rules
    rules.set(EntityType.SLIPPAGE, [
      {
        type: EntityType.SLIPPAGE,
        pattern: /\b(?:slippage|slip)\s+\d+(?:\.\d+)?%/gi,
        normalizer: (value: string) => {
          const match = value.match(/\d+(?:\.\d+)?/);
          return match ? match[0] : value;
        },
        validator: (value: string) => {
          const match = value.match(/\d+(?:\.\d+)?/);
          if (!match) return false;
          const num = parseFloat(match[0]);
          return !isNaN(num) && num >= 0 && num <= 50;
        },
        confidence: 0.95
      }
    ]);

    // Risk level rules
    rules.set(EntityType.RISK_LEVEL, [
      {
        type: EntityType.RISK_LEVEL,
        pattern: /\b(?:low|medium|high|conservative|aggressive|risky|safe)\s+risk\b/gi,
        normalizer: (value: string) => {
          const normalized = value.toLowerCase();
          if (normalized.includes('low') || normalized.includes('conservative') || normalized.includes('safe')) {
            return 'low';
          }
          if (normalized.includes('high') || normalized.includes('aggressive') || normalized.includes('risky')) {
            return 'high';
          }
          return 'medium';
        },
        validator: (value: string) => ['low', 'medium', 'high'].includes(value.toLowerCase()),
        confidence: 0.9
      }
    ]);

    // Timeframe rules
    rules.set(EntityType.TIMEFRAME, [
      {
        type: EntityType.TIMEFRAME,
        pattern: /\b(?:\d+\s+)?(?:day|week|month|year|hour|minute)s?\b/gi,
        normalizer: (value: string) => value.toLowerCase().replace(/s$/, ''),
        validator: (value: string) => true,
        confidence: 0.8
      }
    ]);

    return rules;
  }

  /**
   * Normalize protocol names
   */
  private normalizeProtocol(value: string): string {
    const normalized = value.toLowerCase();
    const mappings: Record<string, string> = {
      'dragon': 'dragonswap',
      'yei': 'yei-finance',
      'finance': 'yei-finance'
    };
    return mappings[normalized] || normalized;
  }

  /**
   * Extract specific entity types
   */
  async extractAmounts(text: string): Promise<FinancialEntity[]> {
    return this.amountParser.parseAmounts(text);
  }

  async extractTokens(text: string): Promise<FinancialEntity[]> {
    return this.tokenNormalizer.extractTokens(text);
  }

  /**
   * Get entity suggestions for partial matches
   */
  getEntitySuggestions(text: string, entityType: EntityType): string[] {
    switch (entityType) {
      case EntityType.TOKEN:
        return this.tokenNormalizer.getSuggestions(text);
      case EntityType.PROTOCOL:
        return this.getProtocolSuggestions(text);
      default:
        return [];
    }
  }

  /**
   * Get protocol suggestions
   */
  private getProtocolSuggestions(text: string): string[] {
    const protocols = ['DragonSwap', 'Symphony', 'Citrex', 'Silo', 'Takara', 'YEI Finance'];
    return protocols.filter(p => 
      p.toLowerCase().includes(text.toLowerCase())
    );
  }
}

/**
 * Token Normalizer
 */
class TokenNormalizer {
  private readonly tokenMappings: Map<string, string>;
  private readonly knownTokens: Set<string>;

  constructor() {
    this.tokenMappings = new Map([
      ['usdc', 'USDC'],
      ['usdt', 'USDT'],
      ['sei', 'SEI'],
      ['wsei', 'WSEI'],
      ['eth', 'ETH'],
      ['weth', 'WETH'],
      ['btc', 'BTC'],
      ['wbtc', 'WBTC'],
      ['atom', 'ATOM'],
      ['osmo', 'OSMO'],
      ['stablecoin', 'USDC'],
      ['stable', 'USDC'],
      ['dollar', 'USDC'],
      ['dollars', 'USDC']
    ]);

    this.knownTokens = new Set([
      'USDC', 'USDT', 'SEI', 'WSEI', 'ETH', 'WETH', 
      'BTC', 'WBTC', 'ATOM', 'OSMO'
    ]);
  }

  normalize(token: string): string {
    const normalized = token.toLowerCase();
    return this.tokenMappings.get(normalized) || token.toUpperCase();
  }

  isKnownToken(token: string): boolean {
    return this.knownTokens.has(token.toUpperCase());
  }

  async extractTokens(text: string): Promise<FinancialEntity[]> {
    const entities: FinancialEntity[] = [];
    const tokenPattern = /\b[A-Z]{3,5}\b/g;
    let match;

    while ((match = tokenPattern.exec(text)) !== null) {
      const token = match[0];
      const normalized = this.normalize(token);
      
      if (this.isKnownToken(normalized)) {
        entities.push({
          type: EntityType.TOKEN,
          value: token,
          normalized,
          confidence: 0.9,
          position: [match.index, match.index + token.length]
        });
      }
    }

    return entities;
  }

  getSuggestions(partial: string): string[] {
    const suggestions: string[] = [];
    const partialLower = partial.toLowerCase();

    for (const token of this.knownTokens) {
      if (token.toLowerCase().startsWith(partialLower)) {
        suggestions.push(token);
      }
    }

    return suggestions;
  }
}

/**
 * Amount Parser
 */
class AmountParser {
  async parseAmounts(text: string): Promise<FinancialEntity[]> {
    const entities: FinancialEntity[] = [];
    const patterns = [
      /\$\d+(?:\.\d+)?(?:k|m|b)?/gi,
      /\d+(?:\.\d+)?(?:k|m|b)?\s+(?:USDC|USDT|SEI|ETH|BTC|ATOM|OSMO)/gi,
      /\d+(?:\.\d+)?/g
    ];

    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        const value = match[0];
        const normalized = this.normalizeAmount(value);
        
        if (normalized !== null) {
          entities.push({
            type: EntityType.AMOUNT,
            value,
            normalized: normalized.toString(),
            confidence: 0.9,
            position: [match.index, match.index + value.length]
          });
        }
      }
    }

    return entities;
  }

  private normalizeAmount(value: string): number | null {
    let amount = value.replace(/[$,]/g, '');
    
    // Handle k, m, b notation
    if (amount.endsWith('k')) {
      amount = amount.replace('k', '');
      return parseFloat(amount) * 1000;
    }
    if (amount.endsWith('m')) {
      amount = amount.replace('m', '');
      return parseFloat(amount) * 1000000;
    }
    if (amount.endsWith('b')) {
      amount = amount.replace('b', '');
      return parseFloat(amount) * 1000000000;
    }

    const parsed = parseFloat(amount);
    return isNaN(parsed) ? null : parsed;
  }
}
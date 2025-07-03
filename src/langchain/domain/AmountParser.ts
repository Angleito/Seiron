/**
 * @fileoverview Amount Parser
 * Parses amounts with units, percentages, and natural language expressions
 */

import { pipe } from 'fp-ts/function';
import * as E from 'fp-ts/Either';
import * as O from 'fp-ts/Option';

import { AmountParsingResult, DomainError } from './types.js';

/**
 * Amount Parser Configuration
 */
export interface AmountParserConfig {
  readonly minAmount: number;
  readonly maxAmount: number;
  readonly defaultDecimals: number;
  readonly allowPercentages: boolean;
  readonly allowRelativeAmounts: boolean;
}

/**
 * Parsing Context
 */
export interface AmountParsingContext {
  readonly userBalance?: number;
  readonly portfolioValue?: number;
  readonly positionSize?: number;
  readonly currency?: string;
}

/**
 * Amount Parser
 */
export class AmountParser {
  private readonly config: AmountParserConfig;
  private readonly unitMultipliers: Map<string, number>;
  private readonly percentageKeywords: ReadonlyArray<string>;
  private readonly relativeKeywords: Map<string, number>;

  constructor(config: AmountParserConfig) {
    this.config = config;
    this.unitMultipliers = this.initializeUnitMultipliers();
    this.percentageKeywords = ['percent', '%', 'pct', 'percentage'];
    this.relativeKeywords = this.initializeRelativeKeywords();
  }

  /**
   * Parse amount from string input
   */
  async parseAmount(
    input: string,
    context?: AmountParsingContext
  ): Promise<E.Either<DomainError, AmountParsingResult>> {
    try {
      const cleanInput = this.normalizeInput(input);
      
      if (!cleanInput) {
        return E.left(new DomainError(
          'Empty or invalid amount input',
          'INVALID_AMOUNT_INPUT',
          { input }
        ));
      }

      // Try different parsing strategies
      const strategies = [
        () => this.parseExactAmount(cleanInput),
        () => this.parseAmountWithUnit(cleanInput),
        () => this.parsePercentageAmount(cleanInput, context),
        () => this.parseRelativeAmount(cleanInput, context),
        () => this.parseNaturalLanguageAmount(cleanInput, context)
      ];

      for (const strategy of strategies) {
        const result = strategy();
        if (O.isSome(result)) {
          const parsed = result.value;
          
          // Validate the parsed amount
          const validationResult = this.validateAmount(parsed.value);
          if (E.isLeft(validationResult)) {
            continue; // Try next strategy
          }

          return E.right(parsed);
        }
      }

      // No strategy succeeded
      const suggestions = this.generateSuggestions(cleanInput, context);
      
      return E.left(new DomainError(
        `Could not parse amount: ${input}`,
        'AMOUNT_PARSING_FAILED',
        { input: cleanInput, suggestions }
      ));

    } catch (error) {
      return E.left(new DomainError(
        'Unexpected error during amount parsing',
        'PARSING_ERROR',
        { originalError: error, input }
      ));
    }
  }

  /**
   * Parse exact numeric amount
   */
  private parseExactAmount(input: string): O.Option<AmountParsingResult> {
    const match = input.match(/^(\d+(?:\.\d+)?)$/);
    if (!match) return O.none;

    const value = parseFloat(match[1]);
    if (isNaN(value)) return O.none;

    return O.some({
      value,
      normalized: value.toString(),
      confidence: 1.0,
      alternatives: []
    });
  }

  /**
   * Parse amount with unit (k, m, b, etc.)
   */
  private parseAmountWithUnit(input: string): O.Option<AmountParsingResult> {
    const match = input.match(/^(\d+(?:\.\d+)?)\s*([kmbt]?)$/i);
    if (!match) return O.none;

    const baseAmount = parseFloat(match[1]);
    const unit = match[2].toLowerCase();
    
    if (isNaN(baseAmount)) return O.none;

    const multiplier = this.unitMultipliers.get(unit) || 1;
    const value = baseAmount * multiplier;

    return O.some({
      value,
      normalized: value.toString(),
      unit: unit || undefined,
      confidence: 0.95,
      alternatives: []
    });
  }

  /**
   * Parse percentage amount
   */
  private parsePercentageAmount(
    input: string,
    context?: AmountParsingContext
  ): O.Option<AmountParsingResult> {
    if (!this.config.allowPercentages || !context) return O.none;

    // Match percentage patterns
    const patterns = [
      /^(\d+(?:\.\d+)?)\s*(?:%|percent|pct|percentage)$/i,
      /^(\d+(?:\.\d+)?)\s*percent\s+of/i
    ];

    for (const pattern of patterns) {
      const match = input.match(pattern);
      if (match) {
        const percentage = parseFloat(match[1]);
        if (isNaN(percentage) || percentage < 0 || percentage > 100) continue;

        // Calculate amount based on context
        const baseAmount = this.getBaseAmountForPercentage(context);
        if (!baseAmount) continue;

        const value = (baseAmount * percentage) / 100;
        
        return O.some({
          value,
          normalized: value.toString(),
          unit: '%',
          confidence: 0.9,
          alternatives: this.generatePercentageAlternatives(percentage, context)
        });
      }
    }

    return O.none;
  }

  /**
   * Parse relative amount (all, half, quarter, etc.)
   */
  private parseRelativeAmount(
    input: string,
    context?: AmountParsingContext
  ): O.Option<AmountParsingResult> {
    if (!this.config.allowRelativeAmounts || !context) return O.none;

    for (const [keyword, fraction] of this.relativeKeywords) {
      if (input.includes(keyword)) {
        const baseAmount = this.getBaseAmountForRelative(keyword, context);
        if (!baseAmount) continue;

        const value = baseAmount * fraction;
        
        return O.some({
          value,
          normalized: value.toString(),
          confidence: 0.85,
          alternatives: this.generateRelativeAlternatives(keyword, context)
        });
      }
    }

    return O.none;
  }

  /**
   * Parse natural language amount expressions
   */
  private parseNaturalLanguageAmount(
    input: string,
    context?: AmountParsingContext
  ): O.Option<AmountParsingResult> {
    // Handle written numbers
    const writtenNumbers = this.parseWrittenNumbers(input);
    if (O.isSome(writtenNumbers)) {
      return O.some({
        value: writtenNumbers.value,
        normalized: writtenNumbers.value.toString(),
        confidence: 0.8,
        alternatives: []
      });
    }

    // Handle expressions like "a thousand", "few hundred"
    const expressions = this.parseAmountExpressions(input);
    if (O.isSome(expressions)) {
      return expressions;
    }

    return O.none;
  }

  /**
   * Parse written numbers (one, two, hundred, etc.)
   */
  private parseWrittenNumbers(input: string): O.Option<number> {
    const numberWords: Record<string, number> = {
      'zero': 0, 'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5,
      'six': 6, 'seven': 7, 'eight': 8, 'nine': 9, 'ten': 10,
      'eleven': 11, 'twelve': 12, 'thirteen': 13, 'fourteen': 14, 'fifteen': 15,
      'sixteen': 16, 'seventeen': 17, 'eighteen': 18, 'nineteen': 19, 'twenty': 20,
      'thirty': 30, 'forty': 40, 'fifty': 50, 'sixty': 60, 'seventy': 70,
      'eighty': 80, 'ninety': 90, 'hundred': 100, 'thousand': 1000,
      'million': 1000000, 'billion': 1000000000
    };

    const words = input.toLowerCase().split(/\s+/);
    let total = 0;
    let current = 0;

    for (const word of words) {
      const value = numberWords[word];
      if (value === undefined) continue;

      if (value === 100) {
        current *= 100;
      } else if (value === 1000) {
        total += current * 1000;
        current = 0;
      } else if (value >= 1000000) {
        total += current * value;
        current = 0;
      } else {
        current += value;
      }
    }

    const result = total + current;
    return result > 0 ? O.some(result) : O.none;
  }

  /**
   * Parse amount expressions
   */
  private parseAmountExpressions(input: string): O.Option<AmountParsingResult> {
    const expressions: Array<{ pattern: RegExp; getValue: (match: RegExpMatchArray) => number }> = [
      {
        pattern: /a\s+thousand/i,
        getValue: () => 1000
      },
      {
        pattern: /few\s+hundred/i,
        getValue: () => 300
      },
      {
        pattern: /several\s+hundred/i,
        getValue: () => 500
      },
      {
        pattern: /couple\s+(?:of\s+)?hundred/i,
        getValue: () => 200
      },
      {
        pattern: /around\s+(\d+)/i,
        getValue: (match) => parseFloat(match[1])
      },
      {
        pattern: /about\s+(\d+)/i,
        getValue: (match) => parseFloat(match[1])
      },
      {
        pattern: /roughly\s+(\d+)/i,
        getValue: (match) => parseFloat(match[1])
      }
    ];

    for (const expr of expressions) {
      const match = input.match(expr.pattern);
      if (match) {
        const value = expr.getValue(match);
        if (!isNaN(value) && value > 0) {
          return O.some({
            value,
            normalized: value.toString(),
            confidence: 0.7,
            alternatives: [
              { value: value * 0.8, interpretation: 'Conservative estimate' },
              { value: value * 1.2, interpretation: 'Liberal estimate' }
            ]
          });
        }
      }
    }

    return O.none;
  }

  /**
   * Validate parsed amount
   */
  private validateAmount(amount: number): E.Either<DomainError, number> {
    if (isNaN(amount) || amount <= 0) {
      return E.left(new DomainError(
        'Amount must be a positive number',
        'INVALID_AMOUNT'
      ));
    }

    if (amount < this.config.minAmount) {
      return E.left(new DomainError(
        `Amount too small. Minimum: ${this.config.minAmount}`,
        'AMOUNT_TOO_SMALL',
        { minAmount: this.config.minAmount }
      ));
    }

    if (amount > this.config.maxAmount) {
      return E.left(new DomainError(
        `Amount too large. Maximum: ${this.config.maxAmount}`,
        'AMOUNT_TOO_LARGE',
        { maxAmount: this.config.maxAmount }
      ));
    }

    return E.right(amount);
  }

  /**
   * Get base amount for percentage calculations
   */
  private getBaseAmountForPercentage(context: AmountParsingContext): number | null {
    // Prefer user balance, then portfolio value, then position size
    return context.userBalance || context.portfolioValue || context.positionSize || null;
  }

  /**
   * Get base amount for relative calculations
   */
  private getBaseAmountForRelative(keyword: string, context: AmountParsingContext): number | null {
    // Different base amounts for different keywords
    if (keyword.includes('balance') || keyword.includes('wallet')) {
      return context.userBalance || null;
    }
    
    if (keyword.includes('portfolio')) {
      return context.portfolioValue || null;
    }
    
    if (keyword.includes('position')) {
      return context.positionSize || null;
    }

    // Default to user balance
    return context.userBalance || context.portfolioValue || null;
  }

  /**
   * Generate percentage alternatives
   */
  private generatePercentageAlternatives(
    percentage: number,
    context: AmountParsingContext
  ): ReadonlyArray<{ value: number; interpretation: string }> {
    const alternatives: Array<{ value: number; interpretation: string }> = [];

    // Try different base amounts
    if (context.userBalance && context.portfolioValue && context.userBalance !== context.portfolioValue) {
      const portfolioAmount = (context.portfolioValue * percentage) / 100;
      alternatives.push({
        value: portfolioAmount,
        interpretation: `${percentage}% of total portfolio`
      });
    }

    if (context.positionSize) {
      const positionAmount = (context.positionSize * percentage) / 100;
      alternatives.push({
        value: positionAmount,
        interpretation: `${percentage}% of current position`
      });
    }

    return alternatives;
  }

  /**
   * Generate relative alternatives
   */
  private generateRelativeAlternatives(
    keyword: string,
    context: AmountParsingContext
  ): ReadonlyArray<{ value: number; interpretation: string }> {
    const alternatives: Array<{ value: number; interpretation: string }> = [];
    const fraction = this.relativeKeywords.get(keyword) || 0;

    // Generate alternatives with different base amounts
    if (context.userBalance) {
      alternatives.push({
        value: context.userBalance * fraction,
        interpretation: `${keyword} of wallet balance`
      });
    }

    if (context.portfolioValue && context.portfolioValue !== context.userBalance) {
      alternatives.push({
        value: context.portfolioValue * fraction,
        interpretation: `${keyword} of portfolio value`
      });
    }

    return alternatives;
  }

  /**
   * Generate parsing suggestions
   */
  private generateSuggestions(
    input: string,
    context?: AmountParsingContext
  ): ReadonlyArray<string> {
    const suggestions: string[] = [];

    // Suggest exact format
    suggestions.push('Try using exact numbers like "1000" or "0.5"');

    // Suggest units if applicable
    if (!/[kmbt]/i.test(input)) {
      suggestions.push('Use units like "1k" for 1,000 or "1m" for 1,000,000');
    }

    // Suggest percentages if context available
    if (this.config.allowPercentages && context) {
      suggestions.push('Use percentages like "50%" or "25 percent"');
    }

    // Suggest relative amounts if context available
    if (this.config.allowRelativeAmounts && context) {
      suggestions.push('Use relative amounts like "all", "half", or "quarter"');
    }

    return suggestions;
  }

  /**
   * Normalize input string
   */
  private normalizeInput(input: string): string {
    return input
      .trim()
      .toLowerCase()
      .replace(/,/g, '') // Remove commas
      .replace(/\s+/g, ' '); // Normalize whitespace
  }

  /**
   * Initialize unit multipliers
   */
  private initializeUnitMultipliers(): Map<string, number> {
    return new Map([
      ['', 1],
      ['k', 1000],
      ['m', 1000000],
      ['b', 1000000000],
      ['t', 1000000000000]
    ]);
  }

  /**
   * Initialize relative keywords
   */
  private initializeRelativeKeywords(): Map<string, number> {
    return new Map([
      ['all', 1.0],
      ['everything', 1.0],
      ['entire', 1.0],
      ['whole', 1.0],
      ['complete', 1.0],
      ['half', 0.5],
      ['quarter', 0.25],
      ['third', 0.333],
      ['most', 0.8],
      ['majority', 0.6],
      ['some', 0.3],
      ['little', 0.1],
      ['small', 0.1]
    ]);
  }

  /**
   * Format amount for display
   */
  formatAmount(amount: number, currency?: string): string {
    const formatted = this.formatNumber(amount);
    return currency ? `${formatted} ${currency}` : formatted;
  }

  /**
   * Format number with appropriate units
   */
  private formatNumber(num: number): string {
    if (num >= 1000000000) {
      return `${(num / 1000000000).toFixed(2)}B`;
    } else if (num >= 1000000) {
      return `${(num / 1000000).toFixed(2)}M`;
    } else if (num >= 1000) {
      return `${(num / 1000).toFixed(2)}K`;
    } else {
      return num.toFixed(this.config.defaultDecimals);
    }
  }
}
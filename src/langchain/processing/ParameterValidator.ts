/**
 * @fileoverview Parameter Validator
 * Validates and suggests parameters for DeFi commands
 */

import { pipe } from 'fp-ts/function';
import * as E from 'fp-ts/Either';
import * as O from 'fp-ts/Option';
import * as A from 'fp-ts/Array';

import { DefiIntent } from '../nlp/types.js';
import {
  CommandParameters,
  CommandValidationError,
  CommandTemplate,
  ParameterValidationRule,
  ParsingContext,
  ParameterValidationError,
  ValidationResult,
  DisambiguationOptions,
  DisambiguationOption
} from './types.js';

/**
 * Parameter Validation Result
 */
export interface ParameterValidationResult {
  readonly errors: ReadonlyArray<CommandValidationError>;
  readonly warnings: ReadonlyArray<CommandValidationError>;
  readonly isValid: boolean;
  readonly requiresDisambiguation: boolean;
  readonly disambiguationOptions?: DisambiguationOptions;
  readonly suggestions: ReadonlyArray<string>;
}

/**
 * Parameter Validator Engine
 */
export class ParameterValidator {
  private readonly tokenValidator: TokenValidator;
  private readonly protocolValidator: ProtocolValidator;
  private readonly amountValidator: AmountValidator;
  private readonly riskValidator: RiskValidator;

  constructor() {
    this.tokenValidator = new TokenValidator();
    this.protocolValidator = new ProtocolValidator();
    this.amountValidator = new AmountValidator();
    this.riskValidator = new RiskValidator();
  }

  /**
   * Validate complete command
   */
  async validateCommand(
    intent: DefiIntent,
    parameters: CommandParameters,
    template: CommandTemplate,
    context?: ParsingContext
  ): Promise<ParameterValidationResult> {
    const errors: CommandValidationError[] = [];
    const warnings: CommandValidationError[] = [];
    const suggestions: string[] = [];

    try {
      // Validate required parameters
      const requiredValidation = await this.validateRequiredParameters(
        parameters,
        template,
        context
      );
      errors.push(...requiredValidation.errors);
      warnings.push(...requiredValidation.warnings);

      // Validate parameter types and constraints
      const typeValidation = await this.validateParameterTypes(
        parameters,
        template,
        context
      );
      errors.push(...typeValidation.errors);
      warnings.push(...typeValidation.warnings);

      // Validate business logic
      const businessValidation = await this.validateBusinessLogic(
        intent,
        parameters,
        context
      );
      errors.push(...businessValidation.errors);
      warnings.push(...businessValidation.warnings);

      // Check for disambiguations needed
      const disambiguationResult = await this.checkDisambiguation(
        intent,
        parameters,
        context
      );

      // Generate suggestions
      const generatedSuggestions = await this.generateParameterSuggestions(
        intent,
        parameters,
        errors,
        context
      );
      suggestions.push(...generatedSuggestions);

      return {
        errors,
        warnings,
        isValid: errors.filter(e => e.severity === 'error').length === 0,
        requiresDisambiguation: disambiguationResult.required,
        disambiguationOptions: disambiguationResult.options,
        suggestions
      };

    } catch (error) {
      errors.push({
        field: 'general',
        code: 'VALIDATION_ERROR',
        message: 'Unexpected validation error',
        severity: 'error'
      });

      return {
        errors,
        warnings: [],
        isValid: false,
        requiresDisambiguation: false,
        suggestions: []
      };
    }
  }

  /**
   * Validate required parameters
   */
  private async validateRequiredParameters(
    parameters: CommandParameters,
    template: CommandTemplate,
    context?: ParsingContext
  ): Promise<{ errors: CommandValidationError[]; warnings: CommandValidationError[] }> {
    const errors: CommandValidationError[] = [];
    const warnings: CommandValidationError[] = [];

    for (const paramName of template.requiredParameters) {
      const value = parameters.primary[paramName as keyof typeof parameters.primary];
      
      if (value === undefined || value === null || value === '') {
        // Check if we can infer from context
        const inferredValue = await this.inferParameterFromContext(paramName, context);
        
        if (O.isNone(inferredValue)) {
          errors.push({
            field: paramName,
            code: 'REQUIRED_PARAMETER_MISSING',
            message: `Required parameter '${paramName}' is missing`,
            severity: 'error',
            suggestion: this.getParameterSuggestion(paramName, template.intent)
          });
        } else {
          warnings.push({
            field: paramName,
            code: 'PARAMETER_INFERRED',
            message: `Parameter '${paramName}' inferred from context: ${inferredValue.value}`,
            severity: 'info'
          });
        }
      }
    }

    return { errors, warnings };
  }

  /**
   * Validate parameter types and constraints
   */
  private async validateParameterTypes(
    parameters: CommandParameters,
    template: CommandTemplate,
    context?: ParsingContext
  ): Promise<{ errors: CommandValidationError[]; warnings: CommandValidationError[] }> {
    const errors: CommandValidationError[] = [];
    const warnings: CommandValidationError[] = [];

    for (const rule of template.validationRules) {
      const value = this.getParameterValue(parameters, rule.field);
      
      if (value !== undefined && value !== null) {
        const validationResult = await this.validateSingleParameter(rule, value, context);
        
        if (E.isLeft(validationResult)) {
          errors.push(validationResult.left);
        } else if (validationResult.right.warnings) {
          warnings.push(...validationResult.right.warnings);
        }
      }
    }

    return { errors, warnings };
  }

  /**
   * Validate business logic
   */
  private async validateBusinessLogic(
    intent: DefiIntent,
    parameters: CommandParameters,
    context?: ParsingContext
  ): Promise<{ errors: CommandValidationError[]; warnings: CommandValidationError[] }> {
    const errors: CommandValidationError[] = [];
    const warnings: CommandValidationError[] = [];

    switch (intent) {
      case DefiIntent.LEND:
        const lendValidation = await this.validateLendingLogic(parameters, context);
        errors.push(...lendValidation.errors);
        warnings.push(...lendValidation.warnings);
        break;

      case DefiIntent.BORROW:
        const borrowValidation = await this.validateBorrowingLogic(parameters, context);
        errors.push(...borrowValidation.errors);
        warnings.push(...borrowValidation.warnings);
        break;

      case DefiIntent.SWAP:
        const swapValidation = await this.validateSwapLogic(parameters, context);
        errors.push(...swapValidation.errors);
        warnings.push(...swapValidation.warnings);
        break;

      case DefiIntent.ADD_LIQUIDITY:
        const liquidityValidation = await this.validateLiquidityLogic(parameters, context);
        errors.push(...liquidityValidation.errors);
        warnings.push(...liquidityValidation.warnings);
        break;
    }

    return { errors, warnings };
  }

  /**
   * Validate lending business logic
   */
  private async validateLendingLogic(
    parameters: CommandParameters,
    context?: ParsingContext
  ): Promise<{ errors: CommandValidationError[]; warnings: CommandValidationError[] }> {
    const errors: CommandValidationError[] = [];
    const warnings: CommandValidationError[] = [];

    const amount = parameters.primary.amount;
    const token = parameters.primary.token;

    if (amount && token && context?.balances) {
      const balance = context.balances[token];
      
      if (balance && parseFloat(amount) > parseFloat(balance)) {
        errors.push({
          field: 'amount',
          code: 'INSUFFICIENT_BALANCE',
          message: `Insufficient ${token} balance. Available: ${balance}, Required: ${amount}`,
          severity: 'error',
          suggestion: `Use amount less than or equal to ${balance}`
        });
      }

      // Warn about lending all balance
      if (balance && parseFloat(amount) > parseFloat(balance) * 0.9) {
        warnings.push({
          field: 'amount',
          code: 'HIGH_PERCENTAGE_OF_BALANCE',
          message: `You are lending ${((parseFloat(amount) / parseFloat(balance)) * 100).toFixed(1)}% of your ${token} balance`,
          severity: 'warning',
          suggestion: 'Consider keeping some tokens for gas fees and emergencies'
        });
      }
    }

    return { errors, warnings };
  }

  /**
   * Validate borrowing business logic
   */
  private async validateBorrowingLogic(
    parameters: CommandParameters,
    context?: ParsingContext
  ): Promise<{ errors: CommandValidationError[]; warnings: CommandValidationError[] }> {
    const errors: CommandValidationError[] = [];
    const warnings: CommandValidationError[] = [];

    const amount = parameters.primary.amount;
    const token = parameters.primary.token;

    if (amount && token && context?.positions) {
      // Calculate borrowing capacity
      const collateralValue = this.calculateCollateralValue(context.positions);
      const borrowAmount = parseFloat(amount);
      
      // Assume 75% LTV ratio
      const maxBorrowAmount = collateralValue * 0.75;
      
      if (borrowAmount > maxBorrowAmount) {
        errors.push({
          field: 'amount',
          code: 'INSUFFICIENT_COLLATERAL',
          message: `Insufficient collateral. Max borrow: ${maxBorrowAmount.toFixed(2)}, Requested: ${amount}`,
          severity: 'error',
          suggestion: `Reduce amount to ${maxBorrowAmount.toFixed(2)} or add more collateral`
        });
      }

      // Warn about high utilization
      if (borrowAmount > maxBorrowAmount * 0.8) {
        warnings.push({
          field: 'amount',
          code: 'HIGH_UTILIZATION',
          message: 'High borrowing utilization increases liquidation risk',
          severity: 'warning',
          suggestion: 'Consider borrowing less to maintain a healthy position'
        });
      }
    }

    return { errors, warnings };
  }

  /**
   * Validate swap business logic
   */
  private async validateSwapLogic(
    parameters: CommandParameters,
    context?: ParsingContext
  ): Promise<{ errors: CommandValidationError[]; warnings: CommandValidationError[] }> {
    const errors: CommandValidationError[] = [];
    const warnings: CommandValidationError[] = [];

    const amount = parameters.primary.amount;
    const fromToken = parameters.primary.fromToken;
    const toToken = parameters.primary.toToken;

    if (fromToken === toToken) {
      errors.push({
        field: 'toToken',
        code: 'SAME_TOKEN_SWAP',
        message: 'Cannot swap a token to itself',
        severity: 'error',
        suggestion: 'Choose a different token to swap to'
      });
    }

    if (amount && fromToken && context?.balances) {
      const balance = context.balances[fromToken];
      
      if (balance && parseFloat(amount) > parseFloat(balance)) {
        errors.push({
          field: 'amount',
          code: 'INSUFFICIENT_BALANCE',
          message: `Insufficient ${fromToken} balance. Available: ${balance}, Required: ${amount}`,
          severity: 'error',
          suggestion: `Use amount less than or equal to ${balance}`
        });
      }
    }

    // Check for high price impact
    if (parameters.derived?.priceImpact && parameters.derived.priceImpact > 5) {
      warnings.push({
        field: 'amount',
        code: 'HIGH_PRICE_IMPACT',
        message: `High price impact: ${parameters.derived.priceImpact.toFixed(2)}%`,
        severity: 'warning',
        suggestion: 'Consider splitting the trade or using a different route'
      });
    }

    return { errors, warnings };
  }

  /**
   * Validate liquidity business logic
   */
  private async validateLiquidityLogic(
    parameters: CommandParameters,
    context?: ParsingContext
  ): Promise<{ errors: CommandValidationError[]; warnings: CommandValidationError[] }> {
    const errors: CommandValidationError[] = [];
    const warnings: CommandValidationError[] = [];

    // Validate token pair for liquidity provision
    const token = parameters.primary.token;
    
    if (token && !this.isValidLiquidityToken(token)) {
      warnings.push({
        field: 'token',
        code: 'LOW_LIQUIDITY_TOKEN',
        message: `${token} may have low liquidity in pools`,
        severity: 'warning',
        suggestion: 'Consider using more liquid tokens like USDC or ETH'
      });
    }

    return { errors, warnings };
  }

  /**
   * Check if disambiguation is needed
   */
  private async checkDisambiguation(
    intent: DefiIntent,
    parameters: CommandParameters,
    context?: ParsingContext
  ): Promise<{ required: boolean; options?: DisambiguationOptions }> {
    const ambiguities: DisambiguationOption[] = [];

    // Check protocol ambiguity
    if (!parameters.primary.protocol && intent !== DefiIntent.PORTFOLIO_STATUS) {
      const availableProtocols = this.getAvailableProtocols(intent);
      
      if (availableProtocols.length > 1) {
        availableProtocols.forEach((protocol, index) => {
          ambiguities.push({
            id: `protocol_${index}`,
            label: protocol,
            description: `Use ${protocol} protocol`,
            parameters: { primary: { ...parameters.primary, protocol } },
            confidence: 0.8
          });
        });
      }
    }

    // Check token ambiguity for swaps
    if (intent === DefiIntent.SWAP && parameters.primary.token && !parameters.primary.fromToken) {
      // User specified one token but unclear if it's from or to
      ambiguities.push(
        {
          id: 'from_token',
          label: `Swap FROM ${parameters.primary.token}`,
          description: `Sell ${parameters.primary.token} for another token`,
          parameters: { 
            primary: { 
              ...parameters.primary, 
              fromToken: parameters.primary.token, 
              token: undefined 
            } 
          },
          confidence: 0.7
        },
        {
          id: 'to_token',
          label: `Swap TO ${parameters.primary.token}`,
          description: `Buy ${parameters.primary.token} with another token`,
          parameters: { 
            primary: { 
              ...parameters.primary, 
              toToken: parameters.primary.token, 
              token: undefined 
            } 
          },
          confidence: 0.7
        }
      );
    }

    if (ambiguities.length > 0) {
      return {
        required: true,
        options: {
          question: 'I need clarification:',
          options: ambiguities,
          defaultOption: ambiguities[0].id,
          timeout: 30000 // 30 seconds
        }
      };
    }

    return { required: false };
  }

  /**
   * Generate parameter suggestions
   */
  private async generateParameterSuggestions(
    intent: DefiIntent,
    parameters: CommandParameters,
    errors: CommandValidationError[],
    context?: ParsingContext
  ): Promise<string[]> {
    const suggestions: string[] = [];

    // Suggest protocols if missing
    if (!parameters.primary.protocol) {
      const protocols = this.getAvailableProtocols(intent);
      if (protocols.length > 0) {
        suggestions.push(`Try specifying a protocol: ${protocols.join(', ')}`);
      }
    }

    // Suggest optimal amounts
    if (parameters.primary.amount && context?.balances) {
      const token = parameters.primary.token || parameters.primary.fromToken;
      if (token && context.balances[token]) {
        const balance = parseFloat(context.balances[token]);
        const amount = parseFloat(parameters.primary.amount);
        
        if (amount > balance * 0.95) {
          suggestions.push(`Consider leaving some ${token} for gas fees`);
        }
      }
    }

    // Risk-based suggestions
    if (intent === DefiIntent.BORROW && parameters.primary.leverage && parameters.primary.leverage > 3) {
      suggestions.push('Consider lower leverage to reduce liquidation risk');
    }

    return suggestions;
  }

  /**
   * Validate single parameter
   */
  private async validateSingleParameter(
    rule: ParameterValidationRule,
    value: any,
    context?: ParsingContext
  ): Promise<E.Either<CommandValidationError, { warnings?: CommandValidationError[] }>> {
    try {
      // Type validation
      if (!this.validateParameterType(rule.type, value)) {
        return E.left({
          field: rule.field,
          code: 'INVALID_TYPE',
          message: `Parameter '${rule.field}' must be of type ${rule.type}`,
          severity: 'error'
        });
      }

      // Custom validator
      if (!rule.validator(value)) {
        return E.left({
          field: rule.field,
          code: 'VALIDATION_FAILED',
          message: `Parameter '${rule.field}' failed validation`,
          severity: 'error'
        });
      }

      // Constraint validation
      if (rule.constraints) {
        const constraintResult = this.validateConstraints(rule.constraints, value);
        if (E.isLeft(constraintResult)) {
          return E.left({
            field: rule.field,
            code: 'CONSTRAINT_VIOLATION',
            message: constraintResult.left,
            severity: 'error'
          });
        }
      }

      // Dependency validation
      if (rule.dependsOn) {
        // Would validate dependencies here
      }

      return E.right({});

    } catch (error) {
      return E.left({
        field: rule.field,
        code: 'VALIDATION_ERROR',
        message: `Validation error for '${rule.field}'`,
        severity: 'error'
      });
    }
  }

  /**
   * Validate parameter type
   */
  private validateParameterType(type: string, value: any): boolean {
    switch (type) {
      case 'string':
        return typeof value === 'string';
      case 'number':
        return !isNaN(parseFloat(value));
      case 'boolean':
        return typeof value === 'boolean';
      case 'token':
        return this.tokenValidator.isValidToken(value);
      case 'protocol':
        return this.protocolValidator.isValidProtocol(value);
      case 'address':
        return this.isValidAddress(value);
      default:
        return true;
    }
  }

  /**
   * Validate constraints
   */
  private validateConstraints(constraints: any, value: any): E.Either<string, boolean> {
    if (constraints.min !== undefined && parseFloat(value) < constraints.min) {
      return E.left(`Value must be at least ${constraints.min}`);
    }

    if (constraints.max !== undefined && parseFloat(value) > constraints.max) {
      return E.left(`Value must be at most ${constraints.max}`);
    }

    if (constraints.pattern && !constraints.pattern.test(value)) {
      return E.left('Value does not match required pattern');
    }

    if (constraints.enum && !constraints.enum.includes(value)) {
      return E.left(`Value must be one of: ${constraints.enum.join(', ')}`);
    }

    if (constraints.custom && !constraints.custom(value, {})) {
      return E.left('Value failed custom validation');
    }

    return E.right(true);
  }

  /**
   * Infer parameter from context
   */
  private async inferParameterFromContext(
    paramName: string,
    context?: ParsingContext
  ): Promise<O.Option<any>> {
    if (!context) return O.none;

    switch (paramName) {
      case 'protocol':
        // Infer most used protocol
        if (context.positions && context.positions.length > 0) {
          const protocolCounts = new Map();
          context.positions.forEach((pos: any) => {
            const count = protocolCounts.get(pos.protocol) || 0;
            protocolCounts.set(pos.protocol, count + 1);
          });
          const mostUsed = Array.from(protocolCounts.entries())
            .sort((a, b) => b[1] - a[1])[0];
          return mostUsed ? O.some(mostUsed[0]) : O.none;
        }
        break;

      case 'token':
        // Infer from balances (highest balance)
        if (context.balances) {
          const balances = Object.entries(context.balances)
            .map(([token, balance]) => ({ token, balance: parseFloat(balance) }))
            .sort((a, b) => b.balance - a.balance);
          return balances.length > 0 ? O.some(balances[0].token) : O.none;
        }
        break;
    }

    return O.none;
  }

  /**
   * Get parameter value from command parameters
   */
  private getParameterValue(parameters: CommandParameters, field: string): any {
    return (
      parameters.primary[field as keyof typeof parameters.primary] ||
      parameters.optional[field as keyof typeof parameters.optional] ||
      parameters.derived[field as keyof typeof parameters.derived]
    );
  }

  /**
   * Get parameter suggestion
   */
  private getParameterSuggestion(paramName: string, intent: DefiIntent): string {
    const suggestions: Record<string, Record<string, string>> = {
      [DefiIntent.LEND]: {
        amount: 'Specify amount like "1000" or "500.5"',
        token: 'Specify token like "USDC" or "ETH"',
        protocol: 'Specify protocol like "Silo" or "Takara"'
      },
      [DefiIntent.SWAP]: {
        amount: 'Specify amount to swap',
        fromToken: 'Specify token to swap from',
        toToken: 'Specify token to swap to',
        protocol: 'Specify DEX like "DragonSwap" or "Symphony"'
      }
    };

    return suggestions[intent]?.[paramName] || `Please specify ${paramName}`;
  }

  /**
   * Get available protocols for intent
   */
  private getAvailableProtocols(intent: DefiIntent): string[] {
    const protocolMap: Record<string, string[]> = {
      [DefiIntent.LEND]: ['Silo', 'Takara'],
      [DefiIntent.BORROW]: ['Silo', 'Takara'],
      [DefiIntent.SWAP]: ['DragonSwap', 'Symphony'],
      [DefiIntent.ADD_LIQUIDITY]: ['DragonSwap', 'Symphony'],
      [DefiIntent.OPEN_POSITION]: ['Citrex']
    };

    return protocolMap[intent] || [];
  }

  /**
   * Calculate collateral value
   */
  private calculateCollateralValue(positions: any[]): number {
    return positions
      .filter(pos => pos.type === 'lending')
      .reduce((sum, pos) => sum + pos.value, 0);
  }

  /**
   * Check if token is valid for liquidity
   */
  private isValidLiquidityToken(token: string): boolean {
    const liquidTokens = ['USDC', 'USDT', 'ETH', 'SEI', 'WSEI'];
    return liquidTokens.includes(token);
  }

  /**
   * Check if address is valid
   */
  private isValidAddress(address: string): boolean {
    return /^0x[a-fA-F0-9]{40}$/.test(address) || /^[a-zA-Z0-9]{39,59}$/.test(address);
  }
}

/**
 * Token Validator
 */
class TokenValidator {
  private readonly validTokens = new Set(['USDC', 'USDT', 'SEI', 'WSEI', 'ETH', 'WETH', 'BTC', 'WBTC', 'ATOM', 'OSMO']);

  isValidToken(token: string): boolean {
    return this.validTokens.has(token.toUpperCase());
  }

  getSupportedTokens(): string[] {
    return Array.from(this.validTokens);
  }
}

/**
 * Protocol Validator
 */
class ProtocolValidator {
  private readonly validProtocols = new Set(['dragonswap', 'symphony', 'citrex', 'silo', 'takara']);

  isValidProtocol(protocol: string): boolean {
    return this.validProtocols.has(protocol.toLowerCase());
  }

  getSupportedProtocols(): string[] {
    return Array.from(this.validProtocols);
  }
}

/**
 * Amount Validator
 */
class AmountValidator {
  validateAmount(amount: string, token: string): { valid: boolean; message?: string } {
    const numAmount = parseFloat(amount);
    
    if (isNaN(numAmount)) {
      return { valid: false, message: 'Amount must be a number' };
    }

    if (numAmount <= 0) {
      return { valid: false, message: 'Amount must be greater than 0' };
    }

    if (numAmount > 1e18) {
      return { valid: false, message: 'Amount is too large' };
    }

    return { valid: true };
  }
}

/**
 * Risk Validator
 */
class RiskValidator {
  assessRisk(intent: DefiIntent, parameters: CommandParameters): 'low' | 'medium' | 'high' {
    switch (intent) {
      case DefiIntent.LEND:
        return 'low';
      case DefiIntent.BORROW:
        const leverage = parameters.primary.leverage || 1;
        return leverage > 3 ? 'high' : leverage > 1.5 ? 'medium' : 'low';
      case DefiIntent.SWAP:
        const amount = parseFloat(parameters.primary.amount || '0');
        return amount > 10000 ? 'medium' : 'low';
      case DefiIntent.OPEN_POSITION:
        return 'high';
      default:
        return 'low';
    }
  }
}
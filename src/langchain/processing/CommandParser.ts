/**
 * @fileoverview Command Parser
 * Converts natural language to structured, executable commands
 */

import { pipe } from 'fp-ts/function';
import * as E from 'fp-ts/Either';
import * as O from 'fp-ts/Option';
import * as A from 'fp-ts/Array';
import { v4 as uuidv4 } from 'uuid';

import { 
  DefiIntent, 
  IntentClassification, 
  FinancialEntity,
  EntityType 
} from '../nlp/types.js';

import {
  CommandProcessingResult,
  ExecutableCommand,
  CommandParameters,
  CommandMetadata,
  PrimaryParameters,
  OptionalParameters,
  DerivedParameters,
  CommandProcessingError,
  ParsingContext,
  CommandTemplate
} from './types.js';

import { ParameterValidator } from './ParameterValidator.js';
import { CommandBuilder } from './CommandBuilder.js';

/**
 * Command Parser Engine
 */
export class CommandParser {
  private readonly parameterValidator: ParameterValidator;
  private readonly commandBuilder: CommandBuilder;
  private readonly commandTemplates: Map<DefiIntent, CommandTemplate>;

  constructor() {
    this.parameterValidator = new ParameterValidator();
    this.commandBuilder = new CommandBuilder();
    this.commandTemplates = this.initializeCommandTemplates();
  }

  /**
   * Parse intent and entities into executable command
   */
  async parseCommand(
    classification: IntentClassification,
    originalInput: string,
    context?: ParsingContext
  ): Promise<E.Either<CommandProcessingError, CommandProcessingResult>> {
    try {
      const startTime = Date.now();

      // Get command template for the intent
      const template = this.commandTemplates.get(classification.intent);
      if (!template) {
        return E.left(new CommandProcessingError(
          `No command template found for intent: ${classification.intent}`,
          'TEMPLATE_NOT_FOUND'
        ));
      }

      // Extract and validate parameters
      const parametersResult = await this.extractParameters(
        classification.entities,
        template,
        context
      );

      if (E.isLeft(parametersResult)) {
        return E.left(parametersResult.left);
      }

      const parameters = parametersResult.right;

      // Validate the complete command
      const validationResult = await this.parameterValidator.validateCommand(
        classification.intent,
        parameters,
        template,
        context
      );

      // Build executable command
      const commandResult = await this.commandBuilder.buildCommand(
        classification.intent,
        parameters,
        template,
        context
      );

      if (E.isLeft(commandResult)) {
        return E.left(commandResult.left);
      }

      const command = commandResult.right;
      const processingTime = Date.now() - startTime;

      // Create metadata
      const metadata: CommandMetadata = {
        timestamp: Date.now(),
        source: 'nlp',
        confidence: classification.confidence,
        processingTime,
        requiredApprovals: await this.calculateRequiredApprovals(command, context),
        protocolsInvolved: this.extractProtocolsInvolved(command),
        estimatedDuration: this.estimateExecutionDuration(command)
      };

      // Update command with metadata
      const finalCommand: ExecutableCommand = {
        ...command,
        metadata
      };

      // Generate suggestions
      const suggestions = await this.generateSuggestions(
        finalCommand,
        validationResult.errors,
        context
      );

      return E.right({
        command: validationResult.errors.filter(e => e.severity === 'error').length === 0 
          ? finalCommand 
          : null,
        validationErrors: validationResult.errors,
        suggestions,
        requiresDisambiguation: validationResult.requiresDisambiguation,
        disambiguationOptions: validationResult.disambiguationOptions,
        estimatedGas: finalCommand.estimatedGas,
        riskLevel: finalCommand.riskLevel
      });

    } catch (error) {
      return E.left(new CommandProcessingError(
        'Unexpected error during command parsing',
        'PARSING_ERROR',
        { originalError: error }
      ));
    }
  }

  /**
   * Extract parameters from entities
   */
  private async extractParameters(
    entities: ReadonlyArray<FinancialEntity>,
    template: CommandTemplate,
    context?: ParsingContext
  ): Promise<E.Either<CommandProcessingError, CommandParameters>> {
    try {
      const primary = await this.extractPrimaryParameters(entities, template);
      const optional = await this.extractOptionalParameters(entities, template, context);
      const derived = await this.calculateDerivedParameters(primary, optional, template, context);

      return E.right({
        primary,
        optional,
        derived
      });

    } catch (error) {
      return E.left(new CommandProcessingError(
        'Failed to extract parameters',
        'PARAMETER_EXTRACTION_ERROR',
        { originalError: error }
      ));
    }
  }

  /**
   * Extract primary parameters
   */
  private async extractPrimaryParameters(
    entities: ReadonlyArray<FinancialEntity>,
    template: CommandTemplate
  ): Promise<PrimaryParameters> {
    const parameters: Partial<PrimaryParameters> = {};

    // Extract amounts
    const amountEntities = entities.filter(e => e.type === EntityType.AMOUNT);
    if (amountEntities.length > 0) {
      parameters.amount = amountEntities[0].normalized;
    }

    // Extract tokens
    const tokenEntities = entities.filter(e => e.type === EntityType.TOKEN);
    if (tokenEntities.length === 1) {
      parameters.token = tokenEntities[0].normalized;
    } else if (tokenEntities.length === 2) {
      // For swaps, first token is 'from', second is 'to'
      parameters.fromToken = tokenEntities[0].normalized;
      parameters.toToken = tokenEntities[1].normalized;
    }

    // Extract protocols
    const protocolEntities = entities.filter(e => e.type === EntityType.PROTOCOL);
    if (protocolEntities.length > 0) {
      parameters.protocol = protocolEntities[0].normalized;
    }

    // Extract leverage
    const leverageEntities = entities.filter(e => e.type === EntityType.LEVERAGE);
    if (leverageEntities.length > 0) {
      parameters.leverage = parseFloat(leverageEntities[0].normalized);
    }

    // Extract slippage
    const slippageEntities = entities.filter(e => e.type === EntityType.SLIPPAGE);
    if (slippageEntities.length > 0) {
      parameters.slippage = parseFloat(slippageEntities[0].normalized);
    }

    return parameters as PrimaryParameters;
  }

  /**
   * Extract optional parameters
   */
  private async extractOptionalParameters(
    entities: ReadonlyArray<FinancialEntity>,
    template: CommandTemplate,
    context?: ParsingContext
  ): Promise<OptionalParameters> {
    const parameters: Partial<OptionalParameters> = {};

    // Set defaults
    parameters.maxSlippage = 0.5; // 0.5%
    parameters.deadline = Math.floor(Date.now() / 1000) + 1800; // 30 minutes

    // Extract from entities if present
    const slippageEntities = entities.filter(e => e.type === EntityType.SLIPPAGE);
    if (slippageEntities.length > 0) {
      parameters.maxSlippage = parseFloat(slippageEntities[0].normalized);
    }

    // Use context for additional parameters
    if (context?.gasPrice) {
      parameters.gasPrice = context.gasPrice;
    }

    return parameters as OptionalParameters;
  }

  /**
   * Calculate derived parameters
   */
  private async calculateDerivedParameters(
    primary: PrimaryParameters,
    optional: OptionalParameters,
    template: CommandTemplate,
    context?: ParsingContext
  ): Promise<DerivedParameters> {
    const parameters: Partial<DerivedParameters> = {};

    // Calculate output amount for swaps
    if (primary.fromToken && primary.toToken && primary.amount) {
      parameters.outputAmount = await this.calculateOutputAmount(
        primary.fromToken,
        primary.toToken,
        primary.amount,
        optional.maxSlippage || 0.5
      );
    }

    // Calculate price impact
    if (primary.amount && primary.token) {
      parameters.priceImpact = await this.calculatePriceImpact(
        primary.token,
        primary.amount
      );
    }

    // Calculate fees
    parameters.fees = await this.calculateFees(primary, template);

    // Calculate health factor after operation
    if (template.intent === DefiIntent.BORROW && context?.positions) {
      parameters.healthFactorAfter = await this.calculateHealthFactorAfter(
        primary,
        context
      );
    }

    // Calculate liquidation price
    if (primary.leverage && primary.token) {
      parameters.liquidationPrice = await this.calculateLiquidationPrice(
        primary.token,
        primary.leverage
      );
    }

    // Calculate total cost
    parameters.totalCost = await this.calculateTotalCost(primary, parameters.fees);

    return parameters as DerivedParameters;
  }

  /**
   * Calculate output amount for swaps
   */
  private async calculateOutputAmount(
    fromToken: string,
    toToken: string,
    amount: string,
    slippage: number
  ): Promise<string> {
    // This would integrate with actual DEX APIs
    // For now, return a mock calculation
    const mockRate = 1.0; // 1:1 ratio for simplicity
    const outputAmount = parseFloat(amount) * mockRate;
    const withSlippage = outputAmount * (1 - slippage / 100);
    return withSlippage.toString();
  }

  /**
   * Calculate price impact
   */
  private async calculatePriceImpact(token: string, amount: string): Promise<number> {
    // Mock calculation - would use real pool data
    const amountNumber = parseFloat(amount);
    if (amountNumber > 10000) return 0.5; // 0.5% impact for large trades
    if (amountNumber > 1000) return 0.1; // 0.1% impact for medium trades
    return 0.01; // 0.01% impact for small trades
  }

  /**
   * Calculate fees
   */
  private async calculateFees(
    primary: PrimaryParameters,
    template: CommandTemplate
  ): Promise<any[]> {
    const fees = [];

    // Protocol fees
    fees.push({
      type: 'protocol',
      amount: '0.3',
      token: primary.token || 'USDC',
      percentage: 0.3
    });

    // Gas fees
    fees.push({
      type: 'gas',
      amount: (template.gasEstimate * 0.000000001 * 1800).toString(), // Mock gas calculation
      token: 'SEI',
      percentage: 0
    });

    return fees;
  }

  /**
   * Calculate health factor after operation
   */
  private async calculateHealthFactorAfter(
    primary: PrimaryParameters,
    context: ParsingContext
  ): Promise<number> {
    // Mock calculation - would use real position data
    const currentHealthFactor = 2.5; // Assume current health factor
    const borrowAmount = parseFloat(primary.amount || '0');
    const impact = borrowAmount / 10000; // Simple linear impact
    return Math.max(1.0, currentHealthFactor - impact);
  }

  /**
   * Calculate liquidation price
   */
  private async calculateLiquidationPrice(
    token: string,
    leverage: number
  ): Promise<string> {
    // Mock calculation - would use real market data
    const currentPrice = 1800; // Assume current price
    const liquidationPrice = currentPrice * (1 - 1 / leverage);
    return liquidationPrice.toString();
  }

  /**
   * Calculate total cost
   */
  private async calculateTotalCost(
    primary: PrimaryParameters,
    fees: any[] = []
  ): Promise<string> {
    const amount = parseFloat(primary.amount || '0');
    const totalFees = fees.reduce((sum, fee) => sum + parseFloat(fee.amount), 0);
    return (amount + totalFees).toString();
  }

  /**
   * Calculate required approvals
   */
  private async calculateRequiredApprovals(
    command: ExecutableCommand,
    context?: ParsingContext
  ): Promise<any[]> {
    const approvals = [];

    // Check if token approval is needed
    if (command.parameters.primary.token && command.parameters.primary.amount) {
      const currentAllowance = context?.allowances?.[command.parameters.primary.token]?.['protocol'] || '0';
      const requiredAmount = command.parameters.primary.amount;

      if (parseFloat(currentAllowance) < parseFloat(requiredAmount)) {
        approvals.push({
          token: command.parameters.primary.token,
          spender: 'protocol_address',
          amount: requiredAmount,
          required: true,
          gasEstimate: 50000
        });
      }
    }

    return approvals;
  }

  /**
   * Extract protocols involved
   */
  private extractProtocolsInvolved(command: ExecutableCommand): string[] {
    const protocols = [];

    if (command.parameters.primary.protocol) {
      protocols.push(command.parameters.primary.protocol);
    }

    // Add derived protocols from route
    if (command.parameters.derived.route) {
      command.parameters.derived.route.forEach(step => {
        if (!protocols.includes(step.protocol)) {
          protocols.push(step.protocol);
        }
      });
    }

    return protocols;
  }

  /**
   * Estimate execution duration
   */
  private estimateExecutionDuration(command: ExecutableCommand): number {
    let duration = 60; // Base 60 seconds

    // Add time for approvals
    duration += command.metadata.requiredApprovals.length * 30;

    // Add time for complex operations
    if (command.intent === DefiIntent.ARBITRAGE) {
      duration += 120; // Additional 2 minutes for arbitrage
    }

    if (command.parameters.derived.route && command.parameters.derived.route.length > 1) {
      duration += command.parameters.derived.route.length * 30; // 30s per route step
    }

    return duration;
  }

  /**
   * Generate suggestions
   */
  private async generateSuggestions(
    command: ExecutableCommand,
    validationErrors: any[],
    context?: ParsingContext
  ): Promise<any[]> {
    const suggestions = [];

    // Optimization suggestions
    if (command.intent === DefiIntent.SWAP && command.parameters.derived.priceImpact && command.parameters.derived.priceImpact > 1) {
      suggestions.push({
        type: 'optimization',
        title: 'High Price Impact',
        description: 'Consider splitting the trade into smaller amounts',
        action: 'Split trade into multiple transactions',
        expectedBenefit: 'Reduced slippage and better price'
      });
    }

    // Risk warnings
    if (command.riskLevel === 'high') {
      suggestions.push({
        type: 'warning',
        title: 'High Risk Operation',
        description: 'This operation carries significant risk',
        action: 'Consider reducing the amount or leverage',
        riskLevel: 'high'
      });
    }

    // Alternative protocols
    if (command.parameters.primary.protocol === 'dragonswap') {
      suggestions.push({
        type: 'alternative',
        title: 'Alternative Protocol',
        description: 'Symphony might offer better rates',
        action: 'Compare rates on Symphony',
        expectedBenefit: 'Potentially better APY'
      });
    }

    return suggestions;
  }

  /**
   * Initialize command templates
   */
  private initializeCommandTemplates(): Map<DefiIntent, CommandTemplate> {
    const templates = new Map<DefiIntent, CommandTemplate>();

    // Lending template
    templates.set(DefiIntent.LEND, {
      intent: DefiIntent.LEND,
      action: 'supply',
      requiredParameters: ['amount', 'token'],
      optionalParameters: ['protocol', 'deadline'],
      validationRules: [
        {
          field: 'amount',
          required: true,
          type: 'number',
          validator: (value) => parseFloat(value) > 0,
          constraints: { min: 0.01 }
        },
        {
          field: 'token',
          required: true,
          type: 'token',
          validator: (value) => ['USDC', 'USDT', 'SEI', 'ETH'].includes(value)
        }
      ],
      riskLevel: 'low',
      gasEstimate: 150000,
      examples: ['Lend 1000 USDC', 'Supply 500 USDT to Silo']
    });

    // Borrowing template
    templates.set(DefiIntent.BORROW, {
      intent: DefiIntent.BORROW,
      action: 'borrow',
      requiredParameters: ['amount', 'token'],
      optionalParameters: ['protocol', 'leverage', 'deadline'],
      validationRules: [
        {
          field: 'amount',
          required: true,
          type: 'number',
          validator: (value) => parseFloat(value) > 0,
          constraints: { min: 0.01 }
        },
        {
          field: 'token',
          required: true,
          type: 'token',
          validator: (value) => ['USDC', 'USDT', 'SEI', 'ETH'].includes(value)
        }
      ],
      riskLevel: 'medium',
      gasEstimate: 200000,
      examples: ['Borrow 500 USDT', 'Take 1000 USDC loan']
    });

    // Swap template
    templates.set(DefiIntent.SWAP, {
      intent: DefiIntent.SWAP,
      action: 'swap',
      requiredParameters: ['amount', 'fromToken', 'toToken'],
      optionalParameters: ['protocol', 'slippage', 'deadline'],
      validationRules: [
        {
          field: 'amount',
          required: true,
          type: 'number',
          validator: (value) => parseFloat(value) > 0,
          constraints: { min: 0.01 }
        },
        {
          field: 'fromToken',
          required: true,
          type: 'token',
          validator: (value) => ['USDC', 'USDT', 'SEI', 'ETH'].includes(value)
        },
        {
          field: 'toToken',
          required: true,
          type: 'token',
          validator: (value) => ['USDC', 'USDT', 'SEI', 'ETH'].includes(value)
        }
      ],
      riskLevel: 'low',
      gasEstimate: 120000,
      examples: ['Swap 1000 USDC to SEI', 'Trade 500 USDT for ETH']
    });

    // Add more templates for other intents...

    return templates;
  }

  /**
   * Get supported intents
   */
  getSupportedIntents(): ReadonlyArray<DefiIntent> {
    return Array.from(this.commandTemplates.keys());
  }

  /**
   * Get template for intent
   */
  getTemplate(intent: DefiIntent): CommandTemplate | undefined {
    return this.commandTemplates.get(intent);
  }

  /**
   * Validate command syntax
   */
  validateCommandSyntax(command: ExecutableCommand): boolean {
    try {
      const template = this.commandTemplates.get(command.intent);
      if (!template) return false;

      // Check required parameters
      for (const param of template.requiredParameters) {
        if (!command.parameters.primary[param as keyof PrimaryParameters]) {
          return false;
        }
      }

      return true;
    } catch {
      return false;
    }
  }
}
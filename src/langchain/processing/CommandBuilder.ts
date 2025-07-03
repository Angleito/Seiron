/**
 * @fileoverview Command Builder
 * Builds executable commands from validated parameters
 */

import { pipe } from 'fp-ts/function';
import * as E from 'fp-ts/Either';
import * as O from 'fp-ts/Option';
import { v4 as uuidv4 } from 'uuid';

import { DefiIntent } from '../nlp/types.js';
import {
  ExecutableCommand,
  CommandParameters,
  CommandTemplate,
  ParsingContext,
  CommandBuildingError,
  CommandMetadata,
  PrimaryParameters
} from './types.js';

/**
 * Command Builder Engine
 */
export class CommandBuilder {
  private readonly gasEstimator: GasEstimator;
  private readonly riskAssessor: RiskAssessor;
  private readonly protocolMapper: ProtocolMapper;

  constructor() {
    this.gasEstimator = new GasEstimator();
    this.riskAssessor = new RiskAssessor();
    this.protocolMapper = new ProtocolMapper();
  }

  /**
   * Build executable command from parameters
   */
  async buildCommand(
    intent: DefiIntent,
    parameters: CommandParameters,
    template: CommandTemplate,
    context?: ParsingContext
  ): Promise<E.Either<CommandBuildingError, ExecutableCommand>> {
    try {
      // Generate unique command ID
      const commandId = uuidv4();

      // Determine the action based on intent and parameters
      const action = this.determineAction(intent, parameters);

      // Assess risk level
      const riskLevel = this.riskAssessor.assessRisk(intent, parameters, context);

      // Estimate gas
      const estimatedGas = await this.gasEstimator.estimateGas(intent, parameters, context);

      // Determine if confirmation is required
      const confirmationRequired = this.requiresConfirmation(intent, parameters, riskLevel);

      // Create base command
      const command: ExecutableCommand = {
        id: commandId,
        intent,
        action,
        parameters,
        metadata: {} as CommandMetadata, // Will be filled by CommandParser
        validationStatus: 'valid',
        confirmationRequired,
        estimatedGas,
        riskLevel
      };

      // Enhance parameters with protocol-specific data
      const enhancedCommand = await this.enhanceWithProtocolData(command, context);

      return E.right(enhancedCommand);

    } catch (error) {
      return E.left(new CommandBuildingError(
        'Failed to build command',
        { originalError: error, intent, parameters }
      ));
    }
  }

  /**
   * Determine action based on intent and parameters
   */
  private determineAction(intent: DefiIntent, parameters: CommandParameters): string {
    const actionMap: Record<DefiIntent, string> = {
      [DefiIntent.LEND]: 'supply',
      [DefiIntent.BORROW]: 'borrow',
      [DefiIntent.REPAY]: 'repay',
      [DefiIntent.WITHDRAW]: 'withdraw',
      [DefiIntent.SWAP]: 'swap',
      [DefiIntent.ADD_LIQUIDITY]: 'addLiquidity',
      [DefiIntent.REMOVE_LIQUIDITY]: 'removeLiquidity',
      [DefiIntent.OPEN_POSITION]: 'openPosition',
      [DefiIntent.CLOSE_POSITION]: 'closePosition',
      [DefiIntent.ARBITRAGE]: 'arbitrage',
      [DefiIntent.CROSS_PROTOCOL_ARBITRAGE]: 'crossProtocolArbitrage',
      [DefiIntent.PORTFOLIO_STATUS]: 'getPortfolioStatus',
      [DefiIntent.RISK_ASSESSMENT]: 'assessRisk',
      [DefiIntent.YIELD_OPTIMIZATION]: 'optimizeYield',
      [DefiIntent.REBALANCE]: 'rebalance',
      [DefiIntent.SHOW_RATES]: 'getRates',
      [DefiIntent.SHOW_POSITIONS]: 'getPositions',
      [DefiIntent.COMPARE_PROTOCOLS]: 'compareProtocols',
      [DefiIntent.MARKET_ANALYSIS]: 'analyzeMarket',
      [DefiIntent.HELP]: 'getHelp',
      [DefiIntent.EXPLAIN]: 'explain',
      [DefiIntent.UNKNOWN]: 'unknown'
    };

    const baseAction = actionMap[intent] || 'unknown';

    // Enhance action based on parameters
    return this.enhanceAction(baseAction, parameters);
  }

  /**
   * Enhance action with parameter-specific modifications
   */
  private enhanceAction(baseAction: string, parameters: CommandParameters): string {
    // Add protocol prefix if specified
    if (parameters.primary.protocol) {
      const protocolPrefix = this.protocolMapper.getActionPrefix(parameters.primary.protocol);
      if (protocolPrefix) {
        return `${protocolPrefix}_${baseAction}`;
      }
    }

    // Add modifiers based on parameters
    const modifiers = [];

    if (parameters.primary.leverage && parameters.primary.leverage > 1) {
      modifiers.push('leveraged');
    }

    if (parameters.optional.maxSlippage && parameters.optional.maxSlippage < 0.1) {
      modifiers.push('precise');
    }

    if (parameters.derived?.route && parameters.derived.route.length > 1) {
      modifiers.push('multiHop');
    }

    if (modifiers.length > 0) {
      return `${modifiers.join('_')}_${baseAction}`;
    }

    return baseAction;
  }

  /**
   * Determine if command requires confirmation
   */
  private requiresConfirmation(
    intent: DefiIntent,
    parameters: CommandParameters,
    riskLevel: 'low' | 'medium' | 'high'
  ): boolean {
    // High risk operations always require confirmation
    if (riskLevel === 'high') {
      return true;
    }

    // Large amounts require confirmation
    const amount = parseFloat(parameters.primary.amount || '0');
    if (amount > 10000) {
      return true;
    }

    // Leveraged operations require confirmation
    if (parameters.primary.leverage && parameters.primary.leverage > 2) {
      return true;
    }

    // Borrowing operations require confirmation
    if (intent === DefiIntent.BORROW) {
      return true;
    }

    // Position opening/closing requires confirmation
    if (intent === DefiIntent.OPEN_POSITION || intent === DefiIntent.CLOSE_POSITION) {
      return true;
    }

    // Arbitrage operations require confirmation
    if (intent === DefiIntent.ARBITRAGE || intent === DefiIntent.CROSS_PROTOCOL_ARBITRAGE) {
      return true;
    }

    return false;
  }

  /**
   * Enhance command with protocol-specific data
   */
  private async enhanceWithProtocolData(
    command: ExecutableCommand,
    context?: ParsingContext
  ): Promise<ExecutableCommand> {
    const protocol = command.parameters.primary.protocol;
    
    if (!protocol) {
      return command;
    }

    // Get protocol-specific enhancements
    const enhancements = await this.protocolMapper.getEnhancements(
      protocol,
      command.intent,
      command.parameters,
      context
    );

    // Apply enhancements
    return {
      ...command,
      parameters: {
        ...command.parameters,
        derived: {
          ...command.parameters.derived,
          ...enhancements.derivedParameters
        },
        optional: {
          ...command.parameters.optional,
          ...enhancements.optionalParameters
        }
      },
      estimatedGas: enhancements.gasAdjustment 
        ? command.estimatedGas! * enhancements.gasAdjustment 
        : command.estimatedGas,
      riskLevel: enhancements.riskAdjustment || command.riskLevel
    };
  }

  /**
   * Build batch command from multiple intents
   */
  async buildBatchCommand(
    commands: Array<{
      intent: DefiIntent;
      parameters: CommandParameters;
      template: CommandTemplate;
    }>,
    context?: ParsingContext
  ): Promise<E.Either<CommandBuildingError, ExecutableCommand>> {
    try {
      // Build individual commands
      const individualCommands = await Promise.all(
        commands.map(cmd => this.buildCommand(cmd.intent, cmd.parameters, cmd.template, context))
      );

      // Check if all commands built successfully
      const errors = individualCommands.filter(E.isLeft);
      if (errors.length > 0) {
        return E.left(new CommandBuildingError(
          'Failed to build some commands in batch',
          { errors: errors.map(e => e.left) }
        ));
      }

      const builtCommands = individualCommands.map(cmd => (cmd as E.Right<ExecutableCommand>).right);

      // Create batch command
      const batchCommand: ExecutableCommand = {
        id: uuidv4(),
        intent: DefiIntent.UNKNOWN, // Special intent for batch
        action: 'batch',
        parameters: {
          primary: {
            batch: builtCommands.map(cmd => cmd.id)
          } as any,
          optional: {},
          derived: {
            commands: builtCommands,
            totalGas: builtCommands.reduce((sum, cmd) => sum + (cmd.estimatedGas || 0), 0)
          }
        },
        metadata: {} as CommandMetadata,
        validationStatus: 'valid',
        confirmationRequired: builtCommands.some(cmd => cmd.confirmationRequired),
        estimatedGas: builtCommands.reduce((sum, cmd) => sum + (cmd.estimatedGas || 0), 0),
        riskLevel: this.calculateBatchRiskLevel(builtCommands)
      };

      return E.right(batchCommand);

    } catch (error) {
      return E.left(new CommandBuildingError(
        'Failed to build batch command',
        { originalError: error }
      ));
    }
  }

  /**
   * Calculate risk level for batch commands
   */
  private calculateBatchRiskLevel(commands: ExecutableCommand[]): 'low' | 'medium' | 'high' {
    const riskLevels = commands.map(cmd => cmd.riskLevel);
    
    if (riskLevels.includes('high')) {
      return 'high';
    }
    
    if (riskLevels.includes('medium')) {
      return 'medium';
    }
    
    return 'low';
  }

  /**
   * Optimize command parameters
   */
  async optimizeCommand(
    command: ExecutableCommand,
    context?: ParsingContext
  ): Promise<ExecutableCommand> {
    // Clone command for optimization
    const optimizedCommand = { ...command };

    // Optimize slippage based on market conditions
    if (command.intent === DefiIntent.SWAP) {
      const optimizedSlippage = await this.optimizeSlippage(
        command.parameters.primary.fromToken!,
        command.parameters.primary.toToken!,
        command.parameters.primary.amount!,
        context
      );
      
      optimizedCommand.parameters = {
        ...optimizedCommand.parameters,
        optional: {
          ...optimizedCommand.parameters.optional,
          maxSlippage: optimizedSlippage
        }
      };
    }

    // Optimize gas settings
    const optimizedGas = await this.optimizeGasSettings(command, context);
    optimizedCommand.parameters.optional = {
      ...optimizedCommand.parameters.optional,
      ...optimizedGas
    };

    // Optimize routing for swaps and liquidity
    if (command.intent === DefiIntent.SWAP || command.intent === DefiIntent.ADD_LIQUIDITY) {
      const optimizedRoute = await this.optimizeRoute(command, context);
      optimizedCommand.parameters.derived = {
        ...optimizedCommand.parameters.derived,
        route: optimizedRoute
      };
    }

    return optimizedCommand;
  }

  /**
   * Optimize slippage settings
   */
  private async optimizeSlippage(
    fromToken: string,
    toToken: string,
    amount: string,
    context?: ParsingContext
  ): Promise<number> {
    // Mock optimization - would use real market data
    const baseSlippage = 0.5; // 0.5%
    const amountNumber = parseFloat(amount);
    
    // Increase slippage for larger amounts
    if (amountNumber > 100000) {
      return baseSlippage * 2;
    }
    
    if (amountNumber > 10000) {
      return baseSlippage * 1.5;
    }
    
    return baseSlippage;
  }

  /**
   * Optimize gas settings
   */
  private async optimizeGasSettings(
    command: ExecutableCommand,
    context?: ParsingContext
  ): Promise<{ gasPrice?: string; gasLimit?: number }> {
    // Mock optimization - would use real network data
    const baseGasPrice = context?.gasPrice || '20000000000'; // 20 gwei
    const gasMultiplier = command.confirmationRequired ? 1.2 : 1.0; // Boost for important txs
    
    return {
      gasPrice: (parseFloat(baseGasPrice) * gasMultiplier).toString(),
      gasLimit: command.estimatedGas ? Math.floor(command.estimatedGas * 1.1) : undefined
    };
  }

  /**
   * Optimize routing
   */
  private async optimizeRoute(
    command: ExecutableCommand,
    context?: ParsingContext
  ): Promise<any[]> {
    // Mock route optimization - would use real DEX aggregation
    const route = [];
    
    if (command.intent === DefiIntent.SWAP) {
      const fromToken = command.parameters.primary.fromToken;
      const toToken = command.parameters.primary.toToken;
      const protocol = command.parameters.primary.protocol || 'dragonswap';
      
      route.push({
        protocol,
        pool: `${fromToken}/${toToken}`,
        fromToken,
        toToken,
        percentage: 100
      });
    }
    
    return route;
  }

  /**
   * Validate command execution readiness
   */
  validateExecutionReadiness(
    command: ExecutableCommand,
    context?: ParsingContext
  ): { ready: boolean; issues: string[] } {
    const issues: string[] = [];

    // Check required parameters
    if (command.parameters.primary.amount && context?.balances) {
      const token = command.parameters.primary.token || command.parameters.primary.fromToken;
      if (token) {
        const balance = context.balances[token];
        if (!balance || parseFloat(balance) < parseFloat(command.parameters.primary.amount)) {
          issues.push(`Insufficient ${token} balance`);
        }
      }
    }

    // Check approvals
    if (command.metadata.requiredApprovals && command.metadata.requiredApprovals.length > 0) {
      issues.push('Token approvals required before execution');
    }

    // Check gas
    if (context?.balances?.['SEI']) {
      const seiBalance = parseFloat(context.balances['SEI']);
      const estimatedGasCost = (command.estimatedGas || 0) * 0.000000001 * 20; // Rough estimate
      
      if (seiBalance < estimatedGasCost) {
        issues.push('Insufficient SEI for gas fees');
      }
    }

    // Check network conditions
    if (command.riskLevel === 'high') {
      issues.push('High risk operation - review carefully before execution');
    }

    return {
      ready: issues.length === 0,
      issues
    };
  }
}

/**
 * Gas Estimator
 */
class GasEstimator {
  private readonly baseGasEstimates: Record<string, number> = {
    supply: 150000,
    borrow: 200000,
    repay: 120000,
    withdraw: 120000,
    swap: 180000,
    addLiquidity: 250000,
    removeLiquidity: 200000,
    openPosition: 300000,
    closePosition: 200000,
    arbitrage: 400000
  };

  async estimateGas(
    intent: DefiIntent,
    parameters: CommandParameters,
    context?: ParsingContext
  ): Promise<number> {
    const actionKey = intent.toLowerCase().replace('_', '');
    let baseGas = this.baseGasEstimates[actionKey] || 100000;

    // Adjust for complexity
    if (parameters.derived?.route && parameters.derived.route.length > 1) {
      baseGas *= 1.5; // Multi-hop operations cost more
    }

    if (parameters.primary.leverage && parameters.primary.leverage > 1) {
      baseGas *= 1.3; // Leveraged operations cost more
    }

    // Network congestion adjustment (mock)
    const congestionMultiplier = 1.0; // Would be based on real network data
    
    return Math.floor(baseGas * congestionMultiplier);
  }
}

/**
 * Risk Assessor
 */
class RiskAssessor {
  assessRisk(
    intent: DefiIntent,
    parameters: CommandParameters,
    context?: ParsingContext
  ): 'low' | 'medium' | 'high' {
    let riskScore = 0;

    // Base risk by intent
    const intentRiskMap: Record<DefiIntent, number> = {
      [DefiIntent.LEND]: 1,
      [DefiIntent.BORROW]: 3,
      [DefiIntent.SWAP]: 2,
      [DefiIntent.OPEN_POSITION]: 4,
      [DefiIntent.ARBITRAGE]: 4,
      [DefiIntent.CROSS_PROTOCOL_ARBITRAGE]: 5,
      [DefiIntent.ADD_LIQUIDITY]: 2,
      [DefiIntent.PORTFOLIO_STATUS]: 0,
      [DefiIntent.SHOW_RATES]: 0
    };

    riskScore += intentRiskMap[intent] || 1;

    // Amount-based risk
    const amount = parseFloat(parameters.primary.amount || '0');
    if (amount > 100000) riskScore += 2;
    else if (amount > 10000) riskScore += 1;

    // Leverage-based risk
    const leverage = parameters.primary.leverage || 1;
    if (leverage > 5) riskScore += 3;
    else if (leverage > 2) riskScore += 2;
    else if (leverage > 1) riskScore += 1;

    // Protocol risk (some protocols might be riskier)
    const protocol = parameters.primary.protocol?.toLowerCase();
    if (protocol === 'experimental_protocol') riskScore += 2;

    // Market conditions risk
    if (parameters.derived?.priceImpact && parameters.derived.priceImpact > 5) {
      riskScore += 2;
    }

    // Convert score to level
    if (riskScore >= 6) return 'high';
    if (riskScore >= 3) return 'medium';
    return 'low';
  }
}

/**
 * Protocol Mapper
 */
class ProtocolMapper {
  private readonly protocolPrefixes: Record<string, string> = {
    'dragonswap': 'ds',
    'symphony': 'sym',
    'citrex': 'ctx',
    'silo': 'silo',
    'takara': 'tkr'
  };

  getActionPrefix(protocol: string): string | null {
    return this.protocolPrefixes[protocol.toLowerCase()] || null;
  }

  async getEnhancements(
    protocol: string,
    intent: DefiIntent,
    parameters: CommandParameters,
    context?: ParsingContext
  ): Promise<{
    derivedParameters?: any;
    optionalParameters?: any;
    gasAdjustment?: number;
    riskAdjustment?: 'low' | 'medium' | 'high';
  }> {
    const enhancements: any = {};

    switch (protocol.toLowerCase()) {
      case 'dragonswap':
        enhancements.derivedParameters = {
          dexVersion: 'v2',
          feesTier: 0.3
        };
        enhancements.gasAdjustment = 1.0;
        break;

      case 'symphony':
        enhancements.derivedParameters = {
          dexVersion: 'v3',
          feesTier: 0.05
        };
        enhancements.gasAdjustment = 1.2; // V3 costs more gas
        break;

      case 'citrex':
        enhancements.derivedParameters = {
          perpVersion: 'v1',
          marginRequirement: 0.1
        };
        enhancements.gasAdjustment = 1.5;
        enhancements.riskAdjustment = 'high';
        break;

      case 'silo':
        enhancements.derivedParameters = {
          isolatedMarkets: true,
          riskTier: 'conservative'
        };
        enhancements.gasAdjustment = 0.9; // More efficient
        break;
    }

    return enhancements;
  }
}
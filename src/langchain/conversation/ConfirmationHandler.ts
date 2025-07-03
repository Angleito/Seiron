/**
 * @fileoverview Confirmation Handler
 * Handles operation confirmations with risk assessment and user safety
 */

import { pipe } from 'fp-ts/function';
import * as E from 'fp-ts/Either';
import * as O from 'fp-ts/Option';
import { v4 as uuidv4 } from 'uuid';

import { ExecutableCommand } from '../processing/types.js';
import {
  ConfirmationRequest,
  ConfirmationType,
  ConfirmationConfig,
  ConfirmationOption,
  RiskWarning,
  OperationSummary,
  ConversationSession,
  ConversationError
} from './types.js';

/**
 * Confirmation Result
 */
export interface ConfirmationResult {
  readonly confirmed: boolean;
  readonly selectedOption: string;
  readonly modifiedCommand?: ExecutableCommand;
  readonly userNotes?: string;
  readonly timestamp: number;
}

/**
 * Pending Confirmation
 */
interface PendingConfirmation {
  readonly request: ConfirmationRequest;
  readonly expiresAt: number;
  readonly retryCount: number;
}

/**
 * Confirmation Handler
 */
export class ConfirmationHandler {
  private readonly config: ConfirmationConfig;
  private readonly pendingConfirmations: Map<string, PendingConfirmation>;
  private readonly riskAnalyzer: RiskAnalyzer;
  private readonly summaryGenerator: SummaryGenerator;

  constructor(config: ConfirmationConfig) {
    this.config = config;
    this.pendingConfirmations = new Map();
    this.riskAnalyzer = new RiskAnalyzer();
    this.summaryGenerator = new SummaryGenerator();
  }

  /**
   * Create confirmation request
   */
  async createConfirmationRequest(
    command: ExecutableCommand,
    session: ConversationSession
  ): Promise<E.Either<ConversationError, ConfirmationRequest>> {
    try {
      // Determine confirmation type
      const confirmationType = this.determineConfirmationType(command);

      // Analyze risks
      const risks = await this.riskAnalyzer.analyzeRisks(command, session);

      // Generate operation summary
      const summary = await this.summaryGenerator.generateSummary(command, session);

      // Create confirmation options
      const options = this.generateConfirmationOptions(confirmationType, command, risks);

      const request: ConfirmationRequest = {
        id: uuidv4(),
        type: confirmationType,
        command,
        risks,
        summary,
        options,
        timeout: this.config.timeout,
        createdAt: Date.now()
      };

      // Store pending confirmation
      this.pendingConfirmations.set(request.id, {
        request,
        expiresAt: Date.now() + this.config.timeout,
        retryCount: 0
      });

      return E.right(request);

    } catch (error) {
      return E.left(new ConversationError(
        'Failed to create confirmation request',
        'CONFIRMATION_ERROR',
        { originalError: error, command: command.id }
      ));
    }
  }

  /**
   * Process confirmation response
   */
  async processConfirmationResponse(
    requestId: string,
    response: string,
    session: ConversationSession
  ): Promise<E.Either<ConversationError, ConfirmationResult>> {
    try {
      const pending = this.pendingConfirmations.get(requestId);
      if (!pending) {
        return E.left(new ConversationError(
          'Confirmation request not found or expired',
          'REQUEST_NOT_FOUND',
          { requestId }
        ));
      }

      // Check if expired
      if (Date.now() > pending.expiresAt) {
        this.pendingConfirmations.delete(requestId);
        return E.left(new ConversationError(
          'Confirmation request has expired',
          'REQUEST_EXPIRED',
          { requestId, expiresAt: pending.expiresAt }
        ));
      }

      // Parse user response
      const selectedOption = this.parseUserResponse(response, pending.request.options);
      
      if (O.isNone(selectedOption)) {
        // Retry if response is unclear
        const updatedPending = {
          ...pending,
          retryCount: pending.retryCount + 1
        };

        if (updatedPending.retryCount >= this.config.retryCount) {
          this.pendingConfirmations.delete(requestId);
          return E.left(new ConversationError(
            'Too many unclear responses, confirmation cancelled',
            'MAX_RETRIES_REACHED',
            { requestId, retryCount: updatedPending.retryCount }
          ));
        }

        this.pendingConfirmations.set(requestId, updatedPending);
        return E.left(new ConversationError(
          'Response unclear, please clarify your choice',
          'UNCLEAR_RESPONSE',
          { requestId, availableOptions: pending.request.options.map(o => o.label) }
        ));
      }

      const option = selectedOption.value;
      
      // Process the confirmation
      const result = await this.processConfirmationOption(
        option,
        pending.request,
        response,
        session
      );

      // Clean up
      this.pendingConfirmations.delete(requestId);

      return E.right(result);

    } catch (error) {
      return E.left(new ConversationError(
        'Failed to process confirmation response',
        'PROCESSING_ERROR',
        { originalError: error, requestId, response }
      ));
    }
  }

  /**
   * Get confirmation status
   */
  getConfirmationStatus(requestId: string): O.Option<{
    request: ConfirmationRequest;
    timeRemaining: number;
    retryCount: number;
  }> {
    const pending = this.pendingConfirmations.get(requestId);
    if (!pending) {
      return O.none;
    }

    const timeRemaining = Math.max(0, pending.expiresAt - Date.now());
    
    return O.some({
      request: pending.request,
      timeRemaining,
      retryCount: pending.retryCount
    });
  }

  /**
   * Cancel confirmation
   */
  async cancelConfirmation(
    requestId: string,
    reason: string
  ): Promise<E.Either<ConversationError, boolean>> {
    try {
      const pending = this.pendingConfirmations.get(requestId);
      if (!pending) {
        return E.left(new ConversationError(
          'Confirmation request not found',
          'REQUEST_NOT_FOUND',
          { requestId }
        ));
      }

      this.pendingConfirmations.delete(requestId);
      return E.right(true);

    } catch (error) {
      return E.left(new ConversationError(
        'Failed to cancel confirmation',
        'CANCELLATION_ERROR',
        { originalError: error, requestId, reason }
      ));
    }
  }

  /**
   * Clean up expired confirmations
   */
  async cleanupExpiredConfirmations(): Promise<number> {
    let cleanedCount = 0;
    const now = Date.now();

    for (const [requestId, pending] of this.pendingConfirmations.entries()) {
      if (now > pending.expiresAt) {
        this.pendingConfirmations.delete(requestId);
        cleanedCount++;
      }
    }

    return cleanedCount;
  }

  /**
   * Determine confirmation type
   */
  private determineConfirmationType(command: ExecutableCommand): ConfirmationType {
    // High risk operations
    if (command.riskLevel === 'high') {
      return ConfirmationType.HIGH_RISK;
    }

    // Large amounts
    const amount = parseFloat(command.parameters.primary.amount || '0');
    if (amount > 50000) {
      return ConfirmationType.LARGE_AMOUNT;
    }

    // Leveraged operations
    if (command.parameters.primary.leverage && command.parameters.primary.leverage > 2) {
      return ConfirmationType.LEVERAGE;
    }

    // Batch operations
    if (command.action === 'batch') {
      return ConfirmationType.BATCH_OPERATION;
    }

    // New protocol (would check user history)
    // For now, assume all protocols are known
    
    return ConfirmationType.TRANSACTION;
  }

  /**
   * Generate confirmation options
   */
  private generateConfirmationOptions(
    type: ConfirmationType,
    command: ExecutableCommand,
    risks: ReadonlyArray<RiskWarning>
  ): ReadonlyArray<ConfirmationOption> {
    const baseOptions: ConfirmationOption[] = [
      {
        id: 'confirm',
        label: 'Confirm',
        description: 'Proceed with the operation as specified',
        action: 'confirm',
        isDefault: false
      },
      {
        id: 'cancel',
        label: 'Cancel',
        description: 'Cancel this operation',
        action: 'cancel',
        isDefault: false
      }
    ];

    // Add type-specific options
    switch (type) {
      case ConfirmationType.HIGH_RISK:
        baseOptions.splice(1, 0, {
          id: 'reduce_risk',
          label: 'Reduce Risk',
          description: 'Modify the operation to reduce risk',
          action: 'modify',
          isDefault: true
        });
        break;

      case ConfirmationType.LARGE_AMOUNT:
        baseOptions.splice(1, 0, {
          id: 'reduce_amount',
          label: 'Use Smaller Amount',
          description: 'Proceed with a smaller amount',
          action: 'modify',
          isDefault: true
        });
        break;

      case ConfirmationType.LEVERAGE:
        baseOptions.splice(1, 0, {
          id: 'reduce_leverage',
          label: 'Lower Leverage',
          description: 'Use lower leverage for safety',
          action: 'modify',
          isDefault: true
        });
        break;

      case ConfirmationType.BATCH_OPERATION:
        baseOptions.splice(1, 0, {
          id: 'review_individually',
          label: 'Review Each Step',
          description: 'Review each operation individually',
          action: 'modify',
          isDefault: false
        });
        break;
    }

    // Set default based on risk level
    const hasHighRisk = risks.some(risk => risk.severity === 'high' || risk.severity === 'critical');
    if (hasHighRisk) {
      // Default to cancel for high-risk operations
      baseOptions.forEach(option => {
        option.isDefault = option.action === 'cancel';
      });
    } else {
      // Default to confirm for low-risk operations
      baseOptions.forEach(option => {
        option.isDefault = option.action === 'confirm';
      });
    }

    return baseOptions;
  }

  /**
   * Parse user response
   */
  private parseUserResponse(
    response: string,
    options: ReadonlyArray<ConfirmationOption>
  ): O.Option<ConfirmationOption> {
    const lowerResponse = response.toLowerCase().trim();

    // Direct option matching
    for (const option of options) {
      if (lowerResponse === option.id.toLowerCase() ||
          lowerResponse === option.label.toLowerCase()) {
        return O.some(option);
      }
    }

    // Keyword matching
    const keywordMap: Record<string, string> = {
      'yes': 'confirm',
      'y': 'confirm',
      'ok': 'confirm',
      'proceed': 'confirm',
      'go ahead': 'confirm',
      'no': 'cancel',
      'n': 'cancel',
      'cancel': 'cancel',
      'stop': 'cancel',
      'abort': 'cancel',
      'modify': 'reduce_risk',
      'change': 'reduce_risk',
      'adjust': 'reduce_risk'
    };

    for (const [keyword, optionId] of Object.entries(keywordMap)) {
      if (lowerResponse.includes(keyword)) {
        const option = options.find(o => o.id === optionId);
        if (option) {
          return O.some(option);
        }
      }
    }

    return O.none;
  }

  /**
   * Process confirmation option
   */
  private async processConfirmationOption(
    option: ConfirmationOption,
    request: ConfirmationRequest,
    userResponse: string,
    session: ConversationSession
  ): Promise<ConfirmationResult> {
    const timestamp = Date.now();

    switch (option.action) {
      case 'confirm':
        return {
          confirmed: true,
          selectedOption: option.id,
          timestamp
        };

      case 'cancel':
        return {
          confirmed: false,
          selectedOption: option.id,
          timestamp
        };

      case 'modify':
        const modifiedCommand = await this.generateModifiedCommand(
          request.command,
          option.id,
          session
        );
        
        return {
          confirmed: false, // Will need new confirmation for modified command
          selectedOption: option.id,
          modifiedCommand,
          userNotes: userResponse,
          timestamp
        };

      default:
        return {
          confirmed: false,
          selectedOption: option.id,
          timestamp
        };
    }
  }

  /**
   * Generate modified command based on user choice
   */
  private async generateModifiedCommand(
    originalCommand: ExecutableCommand,
    modificationId: string,
    session: ConversationSession
  ): Promise<ExecutableCommand> {
    const modified = { ...originalCommand };

    switch (modificationId) {
      case 'reduce_risk':
        // Reduce leverage if applicable
        if (modified.parameters.primary.leverage && modified.parameters.primary.leverage > 1) {
          modified.parameters.primary.leverage = Math.max(1, modified.parameters.primary.leverage / 2);
        }
        
        // Increase slippage tolerance for safer execution
        if (modified.parameters.optional.maxSlippage) {
          modified.parameters.optional.maxSlippage *= 1.5;
        }
        
        modified.riskLevel = modified.riskLevel === 'high' ? 'medium' : 'low';
        break;

      case 'reduce_amount':
        const currentAmount = parseFloat(modified.parameters.primary.amount || '0');
        const reducedAmount = currentAmount * 0.5; // Reduce by 50%
        modified.parameters.primary.amount = reducedAmount.toString();
        break;

      case 'reduce_leverage':
        if (modified.parameters.primary.leverage) {
          modified.parameters.primary.leverage = Math.max(1, modified.parameters.primary.leverage / 2);
          modified.riskLevel = 'medium';
        }
        break;
    }

    // Update command ID to reflect modification
    modified.id = `${originalCommand.id}_modified_${Date.now()}`;
    
    return modified;
  }

  /**
   * Format confirmation request for display
   */
  formatConfirmationRequest(request: ConfirmationRequest): string {
    const lines: string[] = [
      `🔍 **Operation Confirmation Required**`,
      '',
      `**Summary:**`,
      `Action: ${request.summary.action}`,
      `Amount: ${request.summary.amount || 'N/A'} ${request.summary.token || ''}`,
      `Protocol: ${request.summary.protocol}`,
      `Estimated Gas: ${request.summary.estimatedGas}`,
      `Estimated Cost: ${request.summary.estimatedCost}`,
      '',
      `**Expected Outcome:**`,
      request.summary.expectedOutcome
    ];

    // Add risk warnings if present
    if (request.risks.length > 0) {
      lines.push('', '⚠️ **Risk Warnings:**');
      request.risks.forEach(risk => {
        const icon = this.getRiskIcon(risk.severity);
        lines.push(`${icon} ${risk.message}`);
        if (risk.mitigation) {
          lines.push(`   💡 ${risk.mitigation}`);
        }
      });
    }

    // Add options
    lines.push('', '**Options:**');
    request.options.forEach((option, index) => {
      const prefix = option.isDefault ? '👉' : `${index + 1}.`;
      lines.push(`${prefix} **${option.label}** - ${option.description}`);
    });

    lines.push('', `⏱️ You have ${Math.floor(request.timeout / 1000)} seconds to respond.`);

    return lines.join('\n');
  }

  /**
   * Get risk icon based on severity
   */
  private getRiskIcon(severity: string): string {
    switch (severity) {
      case 'critical':
        return '🚨';
      case 'high':
        return '⚠️';
      case 'medium':
        return '⚡';
      case 'low':
        return 'ℹ️';
      default:
        return '•';
    }
  }
}

/**
 * Risk Analyzer
 */
class RiskAnalyzer {
  async analyzeRisks(
    command: ExecutableCommand,
    session: ConversationSession
  ): Promise<ReadonlyArray<RiskWarning>> {
    const risks: RiskWarning[] = [];

    // Amount-based risks
    const amount = parseFloat(command.parameters.primary.amount || '0');
    if (amount > 100000) {
      risks.push({
        severity: 'high',
        type: 'large_amount',
        message: 'Very large transaction amount',
        impact: 'High financial exposure',
        mitigation: 'Consider splitting into smaller transactions'
      });
    } else if (amount > 10000) {
      risks.push({
        severity: 'medium',
        type: 'medium_amount',
        message: 'Significant transaction amount',
        impact: 'Notable financial exposure'
      });
    }

    // Leverage-based risks
    const leverage = command.parameters.primary.leverage;
    if (leverage && leverage > 5) {
      risks.push({
        severity: 'critical',
        type: 'high_leverage',
        message: 'Very high leverage ratio',
        impact: 'High liquidation risk',
        mitigation: 'Use lower leverage or add more collateral'
      });
    } else if (leverage && leverage > 2) {
      risks.push({
        severity: 'high',
        type: 'medium_leverage',
        message: 'High leverage ratio',
        impact: 'Increased liquidation risk',
        mitigation: 'Monitor position closely and consider lower leverage'
      });
    }

    // Protocol-specific risks
    const protocol = command.parameters.primary.protocol;
    if (protocol === 'experimental_protocol') {
      risks.push({
        severity: 'high',
        type: 'experimental_protocol',
        message: 'Using experimental protocol',
        impact: 'Unaudited smart contract risks'
      });
    }

    // Market condition risks
    if (command.parameters.derived?.priceImpact && command.parameters.derived.priceImpact > 5) {
      risks.push({
        severity: 'medium',
        type: 'high_price_impact',
        message: 'High price impact detected',
        impact: 'Unfavorable execution price',
        mitigation: 'Consider smaller amount or different timing'
      });
    }

    // Gas-related risks
    if (command.estimatedGas && command.estimatedGas > 1000000) {
      risks.push({
        severity: 'medium',
        type: 'high_gas',
        message: 'High gas consumption expected',
        impact: 'Expensive transaction fees'
      });
    }

    return risks;
  }
}

/**
 * Summary Generator
 */
class SummaryGenerator {
  async generateSummary(
    command: ExecutableCommand,
    session: ConversationSession
  ): Promise<OperationSummary> {
    const amount = command.parameters.primary.amount || 'N/A';
    const token = command.parameters.primary.token || 
                  command.parameters.primary.fromToken || 'N/A';
    const protocol = command.parameters.primary.protocol || 'Default';

    // Generate human-readable action
    const action = this.generateActionDescription(command);

    // Calculate estimated cost
    const estimatedCost = this.calculateEstimatedCost(command);

    // Generate expected outcome
    const expectedOutcome = this.generateExpectedOutcome(command);

    // Extract risk summary
    const risks = this.extractRiskSummary(command);

    return {
      action,
      amount,
      token,
      protocol,
      estimatedGas: command.estimatedGas || 0,
      estimatedCost,
      expectedOutcome,
      risks
    };
  }

  private generateActionDescription(command: ExecutableCommand): string {
    switch (command.intent) {
      case 'lend':
        return `Supply ${command.parameters.primary.amount} ${command.parameters.primary.token} for lending`;
      case 'borrow':
        return `Borrow ${command.parameters.primary.amount} ${command.parameters.primary.token}`;
      case 'swap':
        return `Swap ${command.parameters.primary.amount} ${command.parameters.primary.fromToken} to ${command.parameters.primary.toToken}`;
      default:
        return `Execute ${command.action} operation`;
    }
  }

  private calculateEstimatedCost(command: ExecutableCommand): string {
    // Mock calculation - would use real gas prices and amounts
    const gasPrice = 20; // gwei
    const gasCost = (command.estimatedGas || 0) * gasPrice * 0.000000001;
    
    // Add protocol fees if applicable
    const protocolFee = parseFloat(command.parameters.primary.amount || '0') * 0.003; // 0.3% fee
    
    const totalCost = gasCost + protocolFee;
    return `$${totalCost.toFixed(2)}`;
  }

  private generateExpectedOutcome(command: ExecutableCommand): string {
    switch (command.intent) {
      case 'lend':
        return `Start earning interest on your ${command.parameters.primary.token}`;
      case 'borrow':
        return `Receive ${command.parameters.primary.amount} ${command.parameters.primary.token} in your wallet`;
      case 'swap':
        return `Receive approximately ${command.parameters.derived?.outputAmount || 'calculated'} ${command.parameters.primary.toToken}`;
      default:
        return 'Operation will be executed as specified';
    }
  }

  private extractRiskSummary(command: ExecutableCommand): ReadonlyArray<string> {
    const risks: string[] = [];

    if (command.riskLevel === 'high') {
      risks.push('High risk operation');
    }

    if (command.parameters.primary.leverage && command.parameters.primary.leverage > 2) {
      risks.push('Leveraged position');
    }

    if (command.parameters.derived?.priceImpact && command.parameters.derived.priceImpact > 3) {
      risks.push('High price impact');
    }

    return risks;
  }
}
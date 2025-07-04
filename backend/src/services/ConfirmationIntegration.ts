import { pipe } from 'fp-ts/function';
import * as TE from 'fp-ts/TaskEither';
import * as E from 'fp-ts/Either';
import { ConfirmationHandler } from '../../../src/langchain/conversation/ConfirmationHandler';
import { ConfirmationService, PendingTransaction } from './ConfirmationService';
import { ExecutableCommand } from '../../../src/langchain/processing/types';
import { ConversationSession } from '../../../src/langchain/conversation/types';
import logger from '../utils/logger';

/**
 * Integration service that bridges the core ConfirmationHandler with backend services
 */
export class ConfirmationIntegration {
  private confirmationHandler: ConfirmationHandler;
  private confirmationService: ConfirmationService;

  constructor(confirmationService: ConfirmationService) {
    this.confirmationService = confirmationService;
    this.confirmationHandler = new ConfirmationHandler({
      timeout: 300000, // 5 minutes
      retryCount: 3,
      defaultRiskThreshold: 'medium'
    });
  }

  /**
   * Process an executable command that requires confirmation
   */
  public async processCommandWithConfirmation(
    command: ExecutableCommand,
    session: ConversationSession,
    walletAddress: string
  ): Promise<E.Either<Error, { transactionId: string; confirmationRequest: any }>> {
    try {
      // Create confirmation request using core handler
      const confirmationResult = await this.confirmationHandler.createConfirmationRequest(
        command,
        session
      );

      if (E.isLeft(confirmationResult)) {
        return E.left(new Error(confirmationResult.left.message));
      }

      const confirmationRequest = confirmationResult.right;

      // Map command to transaction parameters
      const transactionParams = this.mapCommandToTransactionParams(command);

      // Create pending transaction in backend
      const pendingResult = await pipe(
        this.confirmationService.createPendingTransaction(
          walletAddress,
          transactionParams.type,
          transactionParams.action,
          transactionParams.parameters
        )
      )();

      if (E.isLeft(pendingResult)) {
        return E.left(pendingResult.left);
      }

      const pendingTransaction = pendingResult.right;

      logger.info(`Created confirmation request ${confirmationRequest.id} mapped to transaction ${pendingTransaction.id}`);

      return E.right({
        transactionId: pendingTransaction.id,
        confirmationRequest: {
          ...confirmationRequest,
          transactionId: pendingTransaction.id,
          formattedMessage: this.confirmationHandler.formatConfirmationRequest(confirmationRequest)
        }
      });

    } catch (error) {
      logger.error('Failed to process command with confirmation:', error);
      return E.left(new Error(`Failed to process command: ${error}`));
    }
  }

  /**
   * Map ExecutableCommand to transaction parameters
   */
  private mapCommandToTransactionParams(command: ExecutableCommand): {
    type: PendingTransaction['type'];
    action: string;
    parameters: any;
  } {
    // Map intent to transaction type
    let type: PendingTransaction['type'] = 'swap';
    let action = command.action;

    switch (command.intent) {
      case 'lend':
        type = 'lending';
        action = 'supply';
        break;
      case 'borrow':
        type = 'lending';
        action = 'borrow';
        break;
      case 'withdraw':
        type = 'lending';
        action = 'withdraw';
        break;
      case 'repay':
        type = 'lending';
        action = 'repay';
        break;
      case 'provide_liquidity':
        type = 'liquidity';
        action = 'addLiquidity';
        break;
      case 'remove_liquidity':
        type = 'liquidity';
        action = 'removeLiquidity';
        break;
      case 'swap':
        type = 'swap';
        action = 'swap';
        break;
      case 'batch':
        type = 'batch';
        action = 'batch';
        break;
    }

    // Map command parameters to transaction parameters
    const parameters: any = {
      ...command.parameters.primary,
      ...command.parameters.optional,
      estimatedGas: command.estimatedGas,
      protocol: command.parameters.primary.protocol || 'default'
    };

    // Handle specific parameter mappings
    if (type === 'lending') {
      parameters.asset = parameters.token || parameters.asset;
    }

    if (type === 'liquidity') {
      parameters.token0 = parameters.fromToken || parameters.token0;
      parameters.token1 = parameters.toToken || parameters.token1;
    }

    if (type === 'swap') {
      parameters.tokenIn = parameters.fromToken || parameters.tokenIn;
      parameters.tokenOut = parameters.toToken || parameters.tokenOut;
      parameters.amountIn = parameters.amount || parameters.amountIn;
    }

    return { type, action, parameters };
  }

  /**
   * Process confirmation response from user
   */
  public async processUserConfirmationResponse(
    confirmationRequestId: string,
    userResponse: string,
    session: ConversationSession
  ): Promise<E.Either<Error, any>> {
    try {
      const result = await this.confirmationHandler.processConfirmationResponse(
        confirmationRequestId,
        userResponse,
        session
      );

      if (E.isLeft(result)) {
        return E.left(new Error(result.left.message));
      }

      return E.right(result.right);

    } catch (error) {
      logger.error('Failed to process confirmation response:', error);
      return E.left(new Error(`Failed to process response: ${error}`));
    }
  }

  /**
   * Get confirmation status with formatting
   */
  public getFormattedConfirmationStatus(confirmationRequestId: string): {
    status: 'active' | 'expired' | 'not_found';
    details?: any;
    formattedMessage?: string;
  } {
    const statusOption = this.confirmationHandler.getConfirmationStatus(confirmationRequestId);

    if (statusOption._tag === 'None') {
      return { status: 'not_found' };
    }

    const status = statusOption.value;
    
    if (status.timeRemaining <= 0) {
      return { status: 'expired' };
    }

    return {
      status: 'active',
      details: status,
      formattedMessage: this.confirmationHandler.formatConfirmationRequest(status.request)
    };
  }

  /**
   * Cancel a confirmation request
   */
  public async cancelConfirmation(
    confirmationRequestId: string,
    reason: string
  ): Promise<E.Either<Error, boolean>> {
    const result = await this.confirmationHandler.cancelConfirmation(
      confirmationRequestId,
      reason
    );

    return result;
  }
}
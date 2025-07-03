/**
 * @fileoverview Progress Tracker
 * Tracks long-running operations and provides real-time progress updates
 */

import { pipe } from 'fp-ts/function';
import * as E from 'fp-ts/Either';
import * as O from 'fp-ts/Option';
import { v4 as uuidv4 } from 'uuid';

import { ExecutableCommand } from '../processing/types.js';
import {
  ProgressTracker,
  TrackedOperation,
  OperationStep,
  OperationStatus,
  ConversationError
} from './types.js';

/**
 * Progress Update
 */
export interface ProgressUpdate {
  readonly operationId: string;
  readonly stepId?: string;
  readonly status: OperationStatus;
  readonly progress: number;
  readonly message: string;
  readonly timestamp: number;
  readonly metadata?: any;
}

/**
 * Progress Subscription
 */
export interface ProgressSubscription {
  readonly id: string;
  readonly operationId: string;
  readonly callback: (update: ProgressUpdate) => void;
  readonly filter?: (update: ProgressUpdate) => boolean;
}

/**
 * Operation Template
 */
interface OperationTemplate {
  readonly type: string;
  readonly steps: ReadonlyArray<{
    readonly id: string;
    readonly name: string;
    readonly description: string;
    readonly estimatedDuration: number;
    readonly required: boolean;
  }>;
  readonly estimatedTotalDuration: number;
}

/**
 * Progress Tracker Implementation
 */
export class ProgressTrackerImpl {
  private readonly operations: Map<string, TrackedOperation>;
  private readonly subscriptions: Map<string, ProgressSubscription>;
  private readonly operationTemplates: Map<string, OperationTemplate>;

  constructor() {
    this.operations = new Map();
    this.subscriptions = new Map();
    this.operationTemplates = this.initializeOperationTemplates();
  }

  /**
   * Start tracking an operation
   */
  async startOperation(
    command: ExecutableCommand,
    description?: string
  ): Promise<E.Either<ConversationError, TrackedOperation>> {
    try {
      const operationType = this.determineOperationType(command);
      const template = this.operationTemplates.get(operationType);
      
      if (!template) {
        return E.left(new ConversationError(
          `No template found for operation type: ${operationType}`,
          'TEMPLATE_NOT_FOUND',
          { operationType, commandId: command.id }
        ));
      }

      const operationId = uuidv4();
      const startTime = Date.now();

      // Create initial steps from template
      const steps: OperationStep[] = template.steps.map(stepTemplate => ({
        id: stepTemplate.id,
        name: stepTemplate.name,
        description: stepTemplate.description,
        status: OperationStatus.PENDING,
        progress: 0,
        timestamp: startTime,
        metadata: { required: stepTemplate.required }
      }));

      const operation: TrackedOperation = {
        id: operationId,
        type: operationType,
        description: description || this.generateOperationDescription(command),
        status: OperationStatus.PENDING,
        progress: 0,
        startTime,
        steps
      };

      this.operations.set(operationId, operation);

      // Start the first step
      const updatedOperation = await this.startNextStep(operation);
      if (E.isRight(updatedOperation)) {
        this.operations.set(operationId, updatedOperation.right);
        return E.right(updatedOperation.right);
      }

      return E.right(operation);

    } catch (error) {
      return E.left(new ConversationError(
        'Failed to start operation tracking',
        'TRACKING_ERROR',
        { originalError: error, commandId: command.id }
      ));
    }
  }

  /**
   * Update operation progress
   */
  async updateProgress(
    operationId: string,
    progress: number,
    message?: string,
    metadata?: any
  ): Promise<E.Either<ConversationError, TrackedOperation>> {
    try {
      const operation = this.operations.get(operationId);
      if (!operation) {
        return E.left(new ConversationError(
          'Operation not found',
          'OPERATION_NOT_FOUND',
          { operationId }
        ));
      }

      const updatedOperation: TrackedOperation = {
        ...operation,
        progress: Math.min(100, Math.max(0, progress)),
        status: progress >= 100 ? OperationStatus.COMPLETED : OperationStatus.IN_PROGRESS
      };

      this.operations.set(operationId, updatedOperation);

      // Notify subscribers
      await this.notifySubscribers({
        operationId,
        status: updatedOperation.status,
        progress: updatedOperation.progress,
        message: message || `Progress: ${progress}%`,
        timestamp: Date.now(),
        metadata
      });

      return E.right(updatedOperation);

    } catch (error) {
      return E.left(new ConversationError(
        'Failed to update progress',
        'UPDATE_ERROR',
        { originalError: error, operationId }
      ));
    }
  }

  /**
   * Update step progress
   */
  async updateStepProgress(
    operationId: string,
    stepId: string,
    progress: number,
    status?: OperationStatus,
    message?: string
  ): Promise<E.Either<ConversationError, TrackedOperation>> {
    try {
      const operation = this.operations.get(operationId);
      if (!operation) {
        return E.left(new ConversationError(
          'Operation not found',
          'OPERATION_NOT_FOUND',
          { operationId }
        ));
      }

      const stepIndex = operation.steps.findIndex(step => step.id === stepId);
      if (stepIndex === -1) {
        return E.left(new ConversationError(
          'Step not found',
          'STEP_NOT_FOUND',
          { operationId, stepId }
        ));
      }

      // Update the step
      const updatedSteps = [...operation.steps];
      updatedSteps[stepIndex] = {
        ...updatedSteps[stepIndex],
        progress: Math.min(100, Math.max(0, progress)),
        status: status || (progress >= 100 ? OperationStatus.COMPLETED : OperationStatus.IN_PROGRESS),
        timestamp: Date.now()
      };

      // Calculate overall operation progress
      const overallProgress = this.calculateOverallProgress(updatedSteps);
      
      const updatedOperation: TrackedOperation = {
        ...operation,
        steps: updatedSteps,
        progress: overallProgress,
        status: this.calculateOperationStatus(updatedSteps)
      };

      this.operations.set(operationId, updatedOperation);

      // Notify subscribers
      await this.notifySubscribers({
        operationId,
        stepId,
        status: updatedSteps[stepIndex].status,
        progress: updatedSteps[stepIndex].progress,
        message: message || `${updatedSteps[stepIndex].name}: ${progress}%`,
        timestamp: Date.now()
      });

      // Auto-advance to next step if current step is completed
      if (updatedSteps[stepIndex].status === OperationStatus.COMPLETED) {
        const nextStepResult = await this.startNextStep(updatedOperation);
        if (E.isRight(nextStepResult)) {
          this.operations.set(operationId, nextStepResult.right);
          return E.right(nextStepResult.right);
        }
      }

      return E.right(updatedOperation);

    } catch (error) {
      return E.left(new ConversationError(
        'Failed to update step progress',
        'STEP_UPDATE_ERROR',
        { originalError: error, operationId, stepId }
      ));
    }
  }

  /**
   * Complete operation
   */
  async completeOperation(
    operationId: string,
    result?: any,
    message?: string
  ): Promise<E.Either<ConversationError, TrackedOperation>> {
    try {
      const operation = this.operations.get(operationId);
      if (!operation) {
        return E.left(new ConversationError(
          'Operation not found',
          'OPERATION_NOT_FOUND',
          { operationId }
        ));
      }

      const updatedOperation: TrackedOperation = {
        ...operation,
        status: OperationStatus.COMPLETED,
        progress: 100,
        endTime: Date.now(),
        result
      };

      this.operations.set(operationId, updatedOperation);

      // Notify subscribers
      await this.notifySubscribers({
        operationId,
        status: OperationStatus.COMPLETED,
        progress: 100,
        message: message || 'Operation completed successfully',
        timestamp: Date.now(),
        metadata: { result }
      });

      return E.right(updatedOperation);

    } catch (error) {
      return E.left(new ConversationError(
        'Failed to complete operation',
        'COMPLETION_ERROR',
        { originalError: error, operationId }
      ));
    }
  }

  /**
   * Fail operation
   */
  async failOperation(
    operationId: string,
    error: string,
    message?: string
  ): Promise<E.Either<ConversationError, TrackedOperation>> {
    try {
      const operation = this.operations.get(operationId);
      if (!operation) {
        return E.left(new ConversationError(
          'Operation not found',
          'OPERATION_NOT_FOUND',
          { operationId }
        ));
      }

      const updatedOperation: TrackedOperation = {
        ...operation,
        status: OperationStatus.FAILED,
        endTime: Date.now(),
        error
      };

      this.operations.set(operationId, updatedOperation);

      // Notify subscribers
      await this.notifySubscribers({
        operationId,
        status: OperationStatus.FAILED,
        progress: operation.progress,
        message: message || `Operation failed: ${error}`,
        timestamp: Date.now(),
        metadata: { error }
      });

      return E.right(updatedOperation);

    } catch (error) {
      return E.left(new ConversationError(
        'Failed to mark operation as failed',
        'FAILURE_ERROR',
        { originalError: error, operationId }
      ));
    }
  }

  /**
   * Get operation status
   */
  getOperation(operationId: string): O.Option<TrackedOperation> {
    const operation = this.operations.get(operationId);
    return operation ? O.some(operation) : O.none;
  }

  /**
   * Get all operations
   */
  getAllOperations(): ReadonlyArray<TrackedOperation> {
    return Array.from(this.operations.values());
  }

  /**
   * Get active operations
   */
  getActiveOperations(): ReadonlyArray<TrackedOperation> {
    return Array.from(this.operations.values()).filter(op =>
      op.status === OperationStatus.PENDING || op.status === OperationStatus.IN_PROGRESS
    );
  }

  /**
   * Subscribe to progress updates
   */
  subscribe(
    operationId: string,
    callback: (update: ProgressUpdate) => void,
    filter?: (update: ProgressUpdate) => boolean
  ): string {
    const subscriptionId = uuidv4();
    
    this.subscriptions.set(subscriptionId, {
      id: subscriptionId,
      operationId,
      callback,
      filter
    });

    return subscriptionId;
  }

  /**
   * Unsubscribe from progress updates
   */
  unsubscribe(subscriptionId: string): boolean {
    return this.subscriptions.delete(subscriptionId);
  }

  /**
   * Cancel operation
   */
  async cancelOperation(
    operationId: string,
    reason?: string
  ): Promise<E.Either<ConversationError, TrackedOperation>> {
    try {
      const operation = this.operations.get(operationId);
      if (!operation) {
        return E.left(new ConversationError(
          'Operation not found',
          'OPERATION_NOT_FOUND',
          { operationId }
        ));
      }

      const updatedOperation: TrackedOperation = {
        ...operation,
        status: OperationStatus.CANCELLED,
        endTime: Date.now(),
        error: reason || 'Operation cancelled by user'
      };

      this.operations.set(operationId, updatedOperation);

      // Notify subscribers
      await this.notifySubscribers({
        operationId,
        status: OperationStatus.CANCELLED,
        progress: operation.progress,
        message: `Operation cancelled: ${reason || 'User request'}`,
        timestamp: Date.now(),
        metadata: { reason }
      });

      return E.right(updatedOperation);

    } catch (error) {
      return E.left(new ConversationError(
        'Failed to cancel operation',
        'CANCELLATION_ERROR',
        { originalError: error, operationId, reason }
      ));
    }
  }

  /**
   * Clean up completed operations
   */
  async cleanupCompletedOperations(maxAge: number = 3600000): Promise<number> {
    let cleanedCount = 0;
    const now = Date.now();

    for (const [operationId, operation] of this.operations.entries()) {
      const isCompleted = operation.status === OperationStatus.COMPLETED ||
                         operation.status === OperationStatus.FAILED ||
                         operation.status === OperationStatus.CANCELLED;
      
      if (isCompleted && operation.endTime && (now - operation.endTime) > maxAge) {
        this.operations.delete(operationId);
        cleanedCount++;
      }
    }

    return cleanedCount;
  }

  /**
   * Start next step in operation
   */
  private async startNextStep(
    operation: TrackedOperation
  ): Promise<E.Either<ConversationError, TrackedOperation>> {
    try {
      // Find the next pending step
      const nextStepIndex = operation.steps.findIndex(step =>
        step.status === OperationStatus.PENDING
      );

      if (nextStepIndex === -1) {
        // No more steps, operation should be completed
        return E.right({
          ...operation,
          status: OperationStatus.COMPLETED,
          progress: 100,
          endTime: Date.now()
        });
      }

      // Start the next step
      const updatedSteps = [...operation.steps];
      updatedSteps[nextStepIndex] = {
        ...updatedSteps[nextStepIndex],
        status: OperationStatus.IN_PROGRESS,
        timestamp: Date.now()
      };

      const updatedOperation: TrackedOperation = {
        ...operation,
        steps: updatedSteps,
        status: OperationStatus.IN_PROGRESS
      };

      // Notify subscribers
      await this.notifySubscribers({
        operationId: operation.id,
        stepId: updatedSteps[nextStepIndex].id,
        status: OperationStatus.IN_PROGRESS,
        progress: 0,
        message: `Starting: ${updatedSteps[nextStepIndex].name}`,
        timestamp: Date.now()
      });

      return E.right(updatedOperation);

    } catch (error) {
      return E.left(new ConversationError(
        'Failed to start next step',
        'STEP_START_ERROR',
        { originalError: error, operationId: operation.id }
      ));
    }
  }

  /**
   * Calculate overall progress from steps
   */
  private calculateOverallProgress(steps: ReadonlyArray<OperationStep>): number {
    if (steps.length === 0) return 0;

    const totalProgress = steps.reduce((sum, step) => sum + step.progress, 0);
    return Math.floor(totalProgress / steps.length);
  }

  /**
   * Calculate operation status from steps
   */
  private calculateOperationStatus(steps: ReadonlyArray<OperationStep>): OperationStatus {
    if (steps.every(step => step.status === OperationStatus.COMPLETED)) {
      return OperationStatus.COMPLETED;
    }
    
    if (steps.some(step => step.status === OperationStatus.FAILED)) {
      return OperationStatus.FAILED;
    }
    
    if (steps.some(step => step.status === OperationStatus.IN_PROGRESS)) {
      return OperationStatus.IN_PROGRESS;
    }
    
    return OperationStatus.PENDING;
  }

  /**
   * Notify subscribers of progress updates
   */
  private async notifySubscribers(update: ProgressUpdate): Promise<void> {
    for (const subscription of this.subscriptions.values()) {
      if (subscription.operationId === update.operationId) {
        try {
          // Apply filter if present
          if (subscription.filter && !subscription.filter(update)) {
            continue;
          }
          
          subscription.callback(update);
        } catch (error) {
          // Log error but don't fail the entire notification process
          console.error('Error in progress subscription callback:', error);
        }
      }
    }
  }

  /**
   * Determine operation type from command
   */
  private determineOperationType(command: ExecutableCommand): string {
    switch (command.intent) {
      case 'lend':
        return 'lending';
      case 'borrow':
        return 'borrowing';
      case 'swap':
        return 'swap';
      case 'add_liquidity':
        return 'add_liquidity';
      case 'remove_liquidity':
        return 'remove_liquidity';
      case 'open_position':
        return 'open_position';
      case 'arbitrage':
        return 'arbitrage';
      default:
        return 'generic';
    }
  }

  /**
   * Generate operation description
   */
  private generateOperationDescription(command: ExecutableCommand): string {
    switch (command.intent) {
      case 'lend':
        return `Lending ${command.parameters.primary.amount} ${command.parameters.primary.token}`;
      case 'borrow':
        return `Borrowing ${command.parameters.primary.amount} ${command.parameters.primary.token}`;
      case 'swap':
        return `Swapping ${command.parameters.primary.amount} ${command.parameters.primary.fromToken} to ${command.parameters.primary.toToken}`;
      default:
        return `Executing ${command.action}`;
    }
  }

  /**
   * Initialize operation templates
   */
  private initializeOperationTemplates(): Map<string, OperationTemplate> {
    const templates = new Map<string, OperationTemplate>();

    // Lending operation template
    templates.set('lending', {
      type: 'lending',
      steps: [
        {
          id: 'validation',
          name: 'Validation',
          description: 'Validating parameters and checking balances',
          estimatedDuration: 5000,
          required: true
        },
        {
          id: 'approval',
          name: 'Token Approval',
          description: 'Approving token spending',
          estimatedDuration: 30000,
          required: true
        },
        {
          id: 'transaction',
          name: 'Supply Transaction',
          description: 'Executing lending transaction',
          estimatedDuration: 45000,
          required: true
        },
        {
          id: 'confirmation',
          name: 'Confirmation',
          description: 'Waiting for transaction confirmation',
          estimatedDuration: 60000,
          required: true
        }
      ],
      estimatedTotalDuration: 140000
    });

    // Swap operation template
    templates.set('swap', {
      type: 'swap',
      steps: [
        {
          id: 'route_calculation',
          name: 'Route Calculation',
          description: 'Finding optimal swap route',
          estimatedDuration: 3000,
          required: true
        },
        {
          id: 'approval',
          name: 'Token Approval',
          description: 'Approving token spending',
          estimatedDuration: 30000,
          required: true
        },
        {
          id: 'swap_execution',
          name: 'Swap Execution',
          description: 'Executing swap transaction',
          estimatedDuration: 45000,
          required: true
        },
        {
          id: 'confirmation',
          name: 'Confirmation',
          description: 'Waiting for transaction confirmation',
          estimatedDuration: 60000,
          required: true
        }
      ],
      estimatedTotalDuration: 138000
    });

    // Arbitrage operation template
    templates.set('arbitrage', {
      type: 'arbitrage',
      steps: [
        {
          id: 'opportunity_scan',
          name: 'Opportunity Scan',
          description: 'Scanning for arbitrage opportunities',
          estimatedDuration: 10000,
          required: true
        },
        {
          id: 'route_optimization',
          name: 'Route Optimization',
          description: 'Optimizing arbitrage route',
          estimatedDuration: 5000,
          required: true
        },
        {
          id: 'flash_loan',
          name: 'Flash Loan',
          description: 'Initiating flash loan',
          estimatedDuration: 30000,
          required: true
        },
        {
          id: 'arbitrage_execution',
          name: 'Arbitrage Execution',
          description: 'Executing arbitrage trades',
          estimatedDuration: 60000,
          required: true
        },
        {
          id: 'profit_calculation',
          name: 'Profit Calculation',
          description: 'Calculating final profit',
          estimatedDuration: 5000,
          required: true
        }
      ],
      estimatedTotalDuration: 110000
    });

    // Generic operation template
    templates.set('generic', {
      type: 'generic',
      steps: [
        {
          id: 'preparation',
          name: 'Preparation',
          description: 'Preparing operation',
          estimatedDuration: 10000,
          required: true
        },
        {
          id: 'execution',
          name: 'Execution',
          description: 'Executing operation',
          estimatedDuration: 45000,
          required: true
        },
        {
          id: 'finalization',
          name: 'Finalization',
          description: 'Finalizing operation',
          estimatedDuration: 15000,
          required: true
        }
      ],
      estimatedTotalDuration: 70000
    });

    return templates;
  }

  /**
   * Format progress for display
   */
  formatProgress(operation: TrackedOperation): string {
    const lines: string[] = [
      `📈 **${operation.description}**`,
      `Status: ${this.getStatusIcon(operation.status)} ${operation.status}`,
      `Progress: ${operation.progress}%`,
      ''
    ];

    // Add progress bar
    const barLength = 20;
    const filledLength = Math.floor((operation.progress / 100) * barLength);
    const bar = '█'.repeat(filledLength) + '░'.repeat(barLength - filledLength);
    lines.push(`[${bar}] ${operation.progress}%`);
    lines.push('');

    // Add step details
    if (operation.steps.length > 0) {
      lines.push('**Steps:**');
      operation.steps.forEach((step, index) => {
        const icon = this.getStatusIcon(step.status);
        const progressText = step.status === OperationStatus.IN_PROGRESS 
          ? ` (${step.progress}%)` 
          : '';
        lines.push(`${index + 1}. ${icon} ${step.name}${progressText}`);
      });
    }

    // Add timing information
    if (operation.endTime) {
      const duration = operation.endTime - operation.startTime;
      lines.push('', `Duration: ${Math.floor(duration / 1000)}s`);
    } else {
      const elapsed = Date.now() - operation.startTime;
      lines.push('', `Elapsed: ${Math.floor(elapsed / 1000)}s`);
    }

    return lines.join('\n');
  }

  /**
   * Get status icon
   */
  private getStatusIcon(status: OperationStatus): string {
    switch (status) {
      case OperationStatus.PENDING:
        return '⏳';
      case OperationStatus.IN_PROGRESS:
        return '🔄';
      case OperationStatus.COMPLETED:
        return '✅';
      case OperationStatus.FAILED:
        return '❌';
      case OperationStatus.CANCELLED:
        return '🚫';
      default:
        return '❓';
    }
  }
}
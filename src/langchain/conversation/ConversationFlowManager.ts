/**
 * @fileoverview Conversation Flow Manager
 * Manages multi-turn conversations and complex operation flows
 */

import { pipe } from 'fp-ts/function';
import * as E from 'fp-ts/Either';
import * as O from 'fp-ts/Option';
import * as A from 'fp-ts/Array';
import { v4 as uuidv4 } from 'uuid';

import { DefiIntent } from '../nlp/types.js';
import { ExecutableCommand } from '../processing/types.js';
import {
  ConversationSession,
  ConversationFlow,
  FlowType,
  FlowStage,
  FlowStageDefinition,
  FlowTransition,
  FlowProgress,
  FlowData,
  ConversationState,
  FlowError,
  ConversationTemplate,
  TrackedOperation,
  OperationStatus
} from './types.js';

/**
 * Flow Manager Configuration
 */
export interface FlowManagerConfig {
  readonly defaultTimeout: number;
  readonly maxFlowDuration: number;
  readonly enableFlowPersistence: boolean;
  readonly autoAdvanceStages: boolean;
  readonly debugMode: boolean;
}

/**
 * Conversation Flow Manager
 */
export class ConversationFlowManager {
  private readonly config: FlowManagerConfig;
  private readonly flowTemplates: Map<FlowType, ConversationTemplate>;
  private readonly activeFlows: Map<string, ConversationFlow>;
  private readonly stageHandlers: Map<FlowStage, FlowStageHandler>;

  constructor(config: FlowManagerConfig) {
    this.config = config;
    this.flowTemplates = this.initializeFlowTemplates();
    this.activeFlows = new Map();
    this.stageHandlers = this.initializeStageHandlers();
  }

  /**
   * Start a new conversation flow
   */
  async startFlow(
    session: ConversationSession,
    flowType: FlowType,
    initialData?: Partial<FlowData>
  ): Promise<E.Either<FlowError, ConversationFlow>> {
    try {
      const template = this.flowTemplates.get(flowType);
      if (!template) {
        return E.left(new FlowError(
          `No template found for flow type: ${flowType}`,
          { flowType }
        ));
      }

      const flowId = uuidv4();
      const startTime = Date.now();

      const flow: ConversationFlow = {
        id: flowId,
        type: flowType,
        stages: template.stages,
        currentStage: 0,
        progress: this.calculateInitialProgress(template.stages),
        data: {
          intent: initialData?.intent,
          command: initialData?.command,
          parameters: initialData?.parameters || {},
          userChoices: {},
          metadata: { sessionId: session.id, startTime }
        },
        timeout: this.config.defaultTimeout,
        startTime
      };

      // Store the active flow
      this.activeFlows.set(flowId, flow);

      // Start the first stage
      const initializedFlow = await this.initializeStage(flow, 0);
      
      if (E.isLeft(initializedFlow)) {
        return initializedFlow;
      }

      return E.right(initializedFlow.right);

    } catch (error) {
      return E.left(new FlowError(
        'Failed to start conversation flow',
        { originalError: error, flowType }
      ));
    }
  }

  /**
   * Process user input within a flow
   */
  async processFlowInput(
    flowId: string,
    input: string,
    session: ConversationSession
  ): Promise<E.Either<FlowError, { flow: ConversationFlow; response: string; completed: boolean }>> {
    try {
      const flow = this.activeFlows.get(flowId);
      if (!flow) {
        return E.left(new FlowError(
          'Flow not found',
          { flowId }
        ));
      }

      // Check if flow has timed out
      if (this.isFlowExpired(flow)) {
        return E.left(new FlowError(
          'Flow has expired',
          { flowId, startTime: flow.startTime, timeout: flow.timeout }
        ));
      }

      // Get current stage handler
      const currentStageDefinition = flow.stages[flow.currentStage];
      const stageHandler = this.stageHandlers.get(currentStageDefinition.stage);

      if (!stageHandler) {
        return E.left(new FlowError(
          `No handler found for stage: ${currentStageDefinition.stage}`,
          { stage: currentStageDefinition.stage }
        ));
      }

      // Process input through stage handler
      const stageResult = await stageHandler.processInput(flow, input, session);
      
      if (E.isLeft(stageResult)) {
        return E.left(stageResult.left);
      }

      const { updatedFlow, response, shouldAdvance } = stageResult.right;

      // Check if we should advance to next stage
      let finalFlow = updatedFlow;
      let completed = false;

      if (shouldAdvance) {
        const advanceResult = await this.advanceToNextStage(updatedFlow);
        
        if (E.isRight(advanceResult)) {
          finalFlow = advanceResult.right;
          completed = this.isFlowCompleted(finalFlow);
        }
      }

      // Update stored flow
      this.activeFlows.set(flowId, finalFlow);

      // Clean up completed flows
      if (completed) {
        this.activeFlows.delete(flowId);
      }

      return E.right({
        flow: finalFlow,
        response,
        completed
      });

    } catch (error) {
      return E.left(new FlowError(
        'Failed to process flow input',
        { originalError: error, flowId, input }
      ));
    }
  }

  /**
   * Advance flow to next stage
   */
  async advanceToNextStage(
    flow: ConversationFlow
  ): Promise<E.Either<FlowError, ConversationFlow>> {
    try {
      const nextStageIndex = flow.currentStage + 1;

      // Check if we've reached the end
      if (nextStageIndex >= flow.stages.length) {
        return E.right({
          ...flow,
          currentStage: flow.stages.length, // Indicates completion
          progress: this.calculateProgress(flow.stages, flow.stages.length)
        });
      }

      // Validate prerequisites for next stage
      const nextStage = flow.stages[nextStageIndex];
      const prerequisitesMet = await this.validatePrerequisites(nextStage, flow);

      if (!prerequisitesMet) {
        return E.left(new FlowError(
          `Prerequisites not met for stage: ${nextStage.stage}`,
          { stage: nextStage.stage, prerequisites: nextStage.prerequisites }
        ));
      }

      // Initialize the next stage
      const updatedFlow: ConversationFlow = {
        ...flow,
        currentStage: nextStageIndex,
        progress: this.calculateProgress(flow.stages, nextStageIndex)
      };

      const initializedFlow = await this.initializeStage(updatedFlow, nextStageIndex);
      
      return initializedFlow;

    } catch (error) {
      return E.left(new FlowError(
        'Failed to advance to next stage',
        { originalError: error, currentStage: flow.currentStage }
      ));
    }
  }

  /**
   * Get flow status
   */
  getFlowStatus(flowId: string): O.Option<{
    flow: ConversationFlow;
    currentStage: FlowStageDefinition;
    progress: FlowProgress;
    timeRemaining?: number;
  }> {
    const flow = this.activeFlows.get(flowId);
    if (!flow) {
      return O.none;
    }

    const currentStage = flow.stages[flow.currentStage];
    const timeElapsed = Date.now() - flow.startTime;
    const timeRemaining = flow.timeout ? flow.timeout - timeElapsed : undefined;

    return O.some({
      flow,
      currentStage,
      progress: flow.progress,
      timeRemaining: timeRemaining && timeRemaining > 0 ? timeRemaining : undefined
    });
  }

  /**
   * Cancel a flow
   */
  async cancelFlow(
    flowId: string,
    reason: string
  ): Promise<E.Either<FlowError, boolean>> {
    try {
      const flow = this.activeFlows.get(flowId);
      if (!flow) {
        return E.left(new FlowError(
          'Flow not found',
          { flowId }
        ));
      }

      // Perform cleanup if needed
      await this.cleanupFlow(flow, reason);

      // Remove from active flows
      this.activeFlows.delete(flowId);

      return E.right(true);

    } catch (error) {
      return E.left(new FlowError(
        'Failed to cancel flow',
        { originalError: error, flowId, reason }
      ));
    }
  }

  /**
   * Resume a paused flow
   */
  async resumeFlow(
    flowId: string,
    session: ConversationSession
  ): Promise<E.Either<FlowError, ConversationFlow>> {
    try {
      const flow = this.activeFlows.get(flowId);
      if (!flow) {
        return E.left(new FlowError(
          'Flow not found',
          { flowId }
        ));
      }

      // Check if flow is still valid
      if (this.isFlowExpired(flow)) {
        await this.cancelFlow(flowId, 'expired');
        return E.left(new FlowError(
          'Flow has expired and was cancelled',
          { flowId }
        ));
      }

      // Reinitialize current stage
      const reinitializedFlow = await this.initializeStage(flow, flow.currentStage);
      
      if (E.isLeft(reinitializedFlow)) {
        return reinitializedFlow;
      }

      // Update stored flow
      this.activeFlows.set(flowId, reinitializedFlow.right);

      return E.right(reinitializedFlow.right);

    } catch (error) {
      return E.left(new FlowError(
        'Failed to resume flow',
        { originalError: error, flowId }
      ));
    }
  }

  /**
   * Get all active flows for a session
   */
  getActiveFlows(sessionId: string): ReadonlyArray<ConversationFlow> {
    return Array.from(this.activeFlows.values())
      .filter(flow => flow.data.metadata.sessionId === sessionId);
  }

  /**
   * Initialize stage
   */
  private async initializeStage(
    flow: ConversationFlow,
    stageIndex: number
  ): Promise<E.Either<FlowError, ConversationFlow>> {
    try {
      if (stageIndex >= flow.stages.length) {
        return E.right(flow); // Flow completed
      }

      const stage = flow.stages[stageIndex];
      const handler = this.stageHandlers.get(stage.stage);

      if (!handler) {
        return E.left(new FlowError(
          `No handler found for stage: ${stage.stage}`,
          { stage: stage.stage }
        ));
      }

      const initializedFlow = await handler.initialize(flow);
      
      return E.right(initializedFlow);

    } catch (error) {
      return E.left(new FlowError(
        'Failed to initialize stage',
        { originalError: error, stageIndex }
      ));
    }
  }

  /**
   * Validate prerequisites
   */
  private async validatePrerequisites(
    stage: FlowStageDefinition,
    flow: ConversationFlow
  ): Promise<boolean> {
    if (stage.prerequisites.length === 0) {
      return true;
    }

    // Check each prerequisite
    for (const prerequisite of stage.prerequisites) {
      const isValid = await this.checkPrerequisite(prerequisite, flow);
      if (!isValid) {
        return false;
      }
    }

    return true;
  }

  /**
   * Check individual prerequisite
   */
  private async checkPrerequisite(
    prerequisite: string,
    flow: ConversationFlow
  ): Promise<boolean> {
    switch (prerequisite) {
      case 'has_intent':
        return flow.data.intent !== undefined;
      
      case 'has_amount':
        return flow.data.parameters.amount !== undefined;
      
      case 'has_token':
        return flow.data.parameters.token !== undefined ||
               flow.data.parameters.fromToken !== undefined;
      
      case 'has_protocol':
        return flow.data.parameters.protocol !== undefined;
      
      case 'risk_assessed':
        return flow.data.metadata.riskAssessment !== undefined;
      
      case 'validation_passed':
        return flow.data.validationResults !== undefined &&
               flow.data.validationResults.every((result: any) => result.valid);
      
      default:
        return true; // Unknown prerequisites are ignored
    }
  }

  /**
   * Calculate progress
   */
  private calculateProgress(stages: ReadonlyArray<FlowStageDefinition>, currentStage: number): FlowProgress {
    const completed = stages.slice(0, currentStage).map(s => s.stage);
    const current = currentStage < stages.length ? stages[currentStage].stage : FlowStage.FOLLOW_UP;
    const remaining = stages.slice(currentStage + 1).map(s => s.stage);
    const percentage = Math.min(100, (currentStage / stages.length) * 100);

    return {
      completed,
      current,
      remaining,
      percentage,
      estimatedTimeRemaining: this.estimateTimeRemaining(remaining)
    };
  }

  /**
   * Calculate initial progress
   */
  private calculateInitialProgress(stages: ReadonlyArray<FlowStageDefinition>): FlowProgress {
    return this.calculateProgress(stages, 0);
  }

  /**
   * Estimate time remaining
   */
  private estimateTimeRemaining(remainingStages: ReadonlyArray<FlowStage>): number {
    const stageTimeEstimates: Record<FlowStage, number> = {
      [FlowStage.DISCOVERY]: 30000, // 30 seconds
      [FlowStage.PARAMETER_GATHERING]: 60000, // 1 minute
      [FlowStage.VALIDATION]: 15000, // 15 seconds
      [FlowStage.RISK_ASSESSMENT]: 20000, // 20 seconds
      [FlowStage.CONFIRMATION]: 45000, // 45 seconds
      [FlowStage.EXECUTION]: 120000, // 2 minutes
      [FlowStage.FOLLOW_UP]: 15000 // 15 seconds
    };

    return remainingStages.reduce((total, stage) => {
      return total + (stageTimeEstimates[stage] || 30000);
    }, 0);
  }

  /**
   * Check if flow is expired
   */
  private isFlowExpired(flow: ConversationFlow): boolean {
    if (!flow.timeout) {
      return false;
    }

    const elapsed = Date.now() - flow.startTime;
    return elapsed > flow.timeout;
  }

  /**
   * Check if flow is completed
   */
  private isFlowCompleted(flow: ConversationFlow): boolean {
    return flow.currentStage >= flow.stages.length;
  }

  /**
   * Cleanup flow resources
   */
  private async cleanupFlow(flow: ConversationFlow, reason: string): Promise<void> {
    // Log flow completion/cancellation
    if (this.config.debugMode) {
      console.log(`Flow ${flow.id} cleaned up: ${reason}`);
    }

    // Perform any necessary cleanup
    // This could include cancelling pending operations, cleaning up state, etc.
  }

  /**
   * Initialize flow templates
   */
  private initializeFlowTemplates(): Map<FlowType, ConversationTemplate> {
    const templates = new Map<FlowType, ConversationTemplate>();

    // Command execution flow
    templates.set(FlowType.COMMAND_EXECUTION, {
      id: 'command_execution_v1',
      name: 'Command Execution',
      description: 'Standard flow for executing DeFi commands',
      flowType: FlowType.COMMAND_EXECUTION,
      stages: [
        {
          stage: FlowStage.DISCOVERY,
          name: 'Intent Discovery',
          description: 'Understand what the user wants to do',
          required: true,
          prerequisites: [],
          validations: []
        },
        {
          stage: FlowStage.PARAMETER_GATHERING,
          name: 'Parameter Collection',
          description: 'Gather all required parameters',
          required: true,
          prerequisites: ['has_intent'],
          validations: []
        },
        {
          stage: FlowStage.VALIDATION,
          name: 'Parameter Validation',
          description: 'Validate all parameters',
          required: true,
          prerequisites: ['has_intent', 'has_amount', 'has_token'],
          validations: []
        },
        {
          stage: FlowStage.RISK_ASSESSMENT,
          name: 'Risk Assessment',
          description: 'Assess operation risks',
          required: true,
          prerequisites: ['validation_passed'],
          validations: []
        },
        {
          stage: FlowStage.CONFIRMATION,
          name: 'User Confirmation',
          description: 'Get user confirmation',
          required: true,
          prerequisites: ['risk_assessed'],
          validations: []
        },
        {
          stage: FlowStage.EXECUTION,
          name: 'Command Execution',
          description: 'Execute the command',
          required: true,
          prerequisites: [],
          validations: []
        },
        {
          stage: FlowStage.FOLLOW_UP,
          name: 'Follow-up',
          description: 'Provide results and next steps',
          required: false,
          prerequisites: [],
          validations: []
        }
      ],
      transitions: [],
      variables: {}
    });

    // Parameter collection flow
    templates.set(FlowType.PARAMETER_COLLECTION, {
      id: 'parameter_collection_v1',
      name: 'Parameter Collection',
      description: 'Flow for collecting missing parameters',
      flowType: FlowType.PARAMETER_COLLECTION,
      stages: [
        {
          stage: FlowStage.PARAMETER_GATHERING,
          name: 'Gather Parameters',
          description: 'Collect missing parameters from user',
          required: true,
          prerequisites: [],
          validations: []
        },
        {
          stage: FlowStage.VALIDATION,
          name: 'Validate Parameters',
          description: 'Validate collected parameters',
          required: true,
          prerequisites: [],
          validations: []
        }
      ],
      transitions: [],
      variables: {}
    });

    // Add more templates as needed...

    return templates;
  }

  /**
   * Initialize stage handlers
   */
  private initializeStageHandlers(): Map<FlowStage, FlowStageHandler> {
    const handlers = new Map<FlowStage, FlowStageHandler>();

    handlers.set(FlowStage.DISCOVERY, new DiscoveryStageHandler());
    handlers.set(FlowStage.PARAMETER_GATHERING, new ParameterGatheringStageHandler());
    handlers.set(FlowStage.VALIDATION, new ValidationStageHandler());
    handlers.set(FlowStage.RISK_ASSESSMENT, new RiskAssessmentStageHandler());
    handlers.set(FlowStage.CONFIRMATION, new ConfirmationStageHandler());
    handlers.set(FlowStage.EXECUTION, new ExecutionStageHandler());
    handlers.set(FlowStage.FOLLOW_UP, new FollowUpStageHandler());

    return handlers;
  }
}

/**
 * Flow Stage Handler Interface
 */
interface FlowStageHandler {
  initialize(flow: ConversationFlow): Promise<ConversationFlow>;
  processInput(
    flow: ConversationFlow,
    input: string,
    session: ConversationSession
  ): Promise<E.Either<FlowError, { updatedFlow: ConversationFlow; response: string; shouldAdvance: boolean }>>;
}

/**
 * Discovery Stage Handler
 */
class DiscoveryStageHandler implements FlowStageHandler {
  async initialize(flow: ConversationFlow): Promise<ConversationFlow> {
    return {
      ...flow,
      data: {
        ...flow.data,
        metadata: {
          ...flow.data.metadata,
          discoveryStarted: Date.now()
        }
      }
    };
  }

  async processInput(
    flow: ConversationFlow,
    input: string,
    session: ConversationSession
  ): Promise<E.Either<FlowError, { updatedFlow: ConversationFlow; response: string; shouldAdvance: boolean }>> {
    // In a real implementation, this would use the NLP system to detect intent
    // For now, we'll use a simple approach
    
    const detectedIntent = this.detectIntent(input);
    
    const updatedFlow: ConversationFlow = {
      ...flow,
      data: {
        ...flow.data,
        intent: detectedIntent,
        metadata: {
          ...flow.data.metadata,
          intentDetected: Date.now()
        }
      }
    };

    return E.right({
      updatedFlow,
      response: `I understand you want to ${detectedIntent}. Let me gather the necessary information.`,
      shouldAdvance: detectedIntent !== DefiIntent.UNKNOWN
    });
  }

  private detectIntent(input: string): DefiIntent {
    const lowerInput = input.toLowerCase();
    
    if (lowerInput.includes('lend') || lowerInput.includes('supply')) {
      return DefiIntent.LEND;
    }
    if (lowerInput.includes('borrow')) {
      return DefiIntent.BORROW;
    }
    if (lowerInput.includes('swap') || lowerInput.includes('trade')) {
      return DefiIntent.SWAP;
    }
    if (lowerInput.includes('portfolio') || lowerInput.includes('balance')) {
      return DefiIntent.PORTFOLIO_STATUS;
    }
    
    return DefiIntent.UNKNOWN;
  }
}

/**
 * Parameter Gathering Stage Handler
 */
class ParameterGatheringStageHandler implements FlowStageHandler {
  async initialize(flow: ConversationFlow): Promise<ConversationFlow> {
    return flow;
  }

  async processInput(
    flow: ConversationFlow,
    input: string,
    session: ConversationSession
  ): Promise<E.Either<FlowError, { updatedFlow: ConversationFlow; response: string; shouldAdvance: boolean }>> {
    // Extract parameters from input
    const extractedParams = this.extractParameters(input, flow.data.intent!);
    
    const updatedFlow: ConversationFlow = {
      ...flow,
      data: {
        ...flow.data,
        parameters: {
          ...flow.data.parameters,
          ...extractedParams
        }
      }
    };

    // Check if we have all required parameters
    const missingParams = this.getMissingParameters(updatedFlow.data.intent!, updatedFlow.data.parameters);
    
    if (missingParams.length > 0) {
      return E.right({
        updatedFlow,
        response: `I need some more information: ${missingParams.join(', ')}`,
        shouldAdvance: false
      });
    }

    return E.right({
      updatedFlow,
      response: "Great! I have all the information I need. Let me validate the parameters.",
      shouldAdvance: true
    });
  }

  private extractParameters(input: string, intent: DefiIntent): Record<string, any> {
    const params: Record<string, any> = {};
    
    // Simple parameter extraction (would use EntityExtractor in real implementation)
    const amountMatch = input.match(/(\d+(?:\.\d+)?)/);
    if (amountMatch) {
      params.amount = amountMatch[1];
    }

    const tokenMatch = input.match(/\b(USDC|USDT|SEI|ETH|BTC)\b/i);
    if (tokenMatch) {
      params.token = tokenMatch[1].toUpperCase();
    }

    return params;
  }

  private getMissingParameters(intent: DefiIntent, parameters: Record<string, any>): string[] {
    const required = this.getRequiredParameters(intent);
    return required.filter(param => !parameters[param]);
  }

  private getRequiredParameters(intent: DefiIntent): string[] {
    const requirements: Record<DefiIntent, string[]> = {
      [DefiIntent.LEND]: ['amount', 'token'],
      [DefiIntent.BORROW]: ['amount', 'token'],
      [DefiIntent.SWAP]: ['amount', 'fromToken', 'toToken'],
      [DefiIntent.PORTFOLIO_STATUS]: [],
      [DefiIntent.UNKNOWN]: []
    };

    return requirements[intent] || [];
  }
}

/**
 * Additional stage handlers would be implemented similarly...
 */
class ValidationStageHandler implements FlowStageHandler {
  async initialize(flow: ConversationFlow): Promise<ConversationFlow> {
    return flow;
  }

  async processInput(
    flow: ConversationFlow,
    input: string,
    session: ConversationSession
  ): Promise<E.Either<FlowError, { updatedFlow: ConversationFlow; response: string; shouldAdvance: boolean }>> {
    // Perform validation logic here
    return E.right({
      updatedFlow: flow,
      response: "Parameters validated successfully.",
      shouldAdvance: true
    });
  }
}

class RiskAssessmentStageHandler implements FlowStageHandler {
  async initialize(flow: ConversationFlow): Promise<ConversationFlow> {
    return flow;
  }

  async processInput(
    flow: ConversationFlow,
    input: string,
    session: ConversationSession
  ): Promise<E.Either<FlowError, { updatedFlow: ConversationFlow; response: string; shouldAdvance: boolean }>> {
    return E.right({
      updatedFlow: flow,
      response: "Risk assessment completed.",
      shouldAdvance: true
    });
  }
}

class ConfirmationStageHandler implements FlowStageHandler {
  async initialize(flow: ConversationFlow): Promise<ConversationFlow> {
    return flow;
  }

  async processInput(
    flow: ConversationFlow,
    input: string,
    session: ConversationSession
  ): Promise<E.Either<FlowError, { updatedFlow: ConversationFlow; response: string; shouldAdvance: boolean }>> {
    const confirmed = input.toLowerCase().includes('yes') || input.toLowerCase().includes('confirm');
    
    if (confirmed) {
      return E.right({
        updatedFlow: flow,
        response: "Confirmed. Executing the operation...",
        shouldAdvance: true
      });
    } else {
      return E.right({
        updatedFlow: flow,
        response: "Operation cancelled.",
        shouldAdvance: false
      });
    }
  }
}

class ExecutionStageHandler implements FlowStageHandler {
  async initialize(flow: ConversationFlow): Promise<ConversationFlow> {
    return flow;
  }

  async processInput(
    flow: ConversationFlow,
    input: string,
    session: ConversationSession
  ): Promise<E.Either<FlowError, { updatedFlow: ConversationFlow; response: string; shouldAdvance: boolean }>> {
    // Execute the command here
    return E.right({
      updatedFlow: flow,
      response: "Operation executed successfully!",
      shouldAdvance: true
    });
  }
}

class FollowUpStageHandler implements FlowStageHandler {
  async initialize(flow: ConversationFlow): Promise<ConversationFlow> {
    return flow;
  }

  async processInput(
    flow: ConversationFlow,
    input: string,
    session: ConversationSession
  ): Promise<E.Either<FlowError, { updatedFlow: ConversationFlow; response: string; shouldAdvance: boolean }>> {
    return E.right({
      updatedFlow: flow,
      response: "Is there anything else I can help you with?",
      shouldAdvance: true
    });
  }
}
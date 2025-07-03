/**
 * @fileoverview Conversation Management Module Exports
 * Multi-turn conversation handling and flow management
 */

// Types
export * from './types.js';

// Core Conversation Components
export { ConversationFlowManager } from './ConversationFlowManager.js';
export { ContextPreservation } from './ContextPreservation.js';
export { ConfirmationHandler } from './ConfirmationHandler.js';
export { ProgressTrackerImpl as ProgressTracker } from './ProgressTracker.js';

// Re-export commonly used types
export type {
  ConversationSession,
  ConversationFlow,
  ConversationState,
  FlowStage,
  ConfirmationRequest,
  ProgressTracker as IProgressTracker,
  TrackedOperation
} from './types.js';
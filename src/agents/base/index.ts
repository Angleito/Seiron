/**
 * Base Agent Framework Exports
 * 
 * Core components for ElizaOS agent integration
 */

export {
  BaseAgent,
  type AgentConfig,
  type AgentState,
  type AgentMetrics,
  type AgentAction,
  type ActionHandler,
  type ActionContext,
  type ActionResult,
  type ValidationRule,
  type RateLimit,
  type AgentPlugin,
  type AgentError,
  type CommunicationProtocol,
  type AgentMessage,
  type MessageHandler
} from './BaseAgent';

export { AgentRegistry } from './AgentRegistry';
export { ElizaIntegration } from './ElizaIntegration';
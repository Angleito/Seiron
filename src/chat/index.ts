/**
 * @fileoverview Chat interface module exports
 * Provides the main API for the natural language DeFi interface
 */

// Export main chat interface
export { 
  ChatInterface,
  createChatSession,
  processMessage,
  getHelpText,
  formatResponse,
  type ChatInterfaceConfig
} from './ChatInterface.js';

// Export types
export type {
  // Message types
  ChatMessage,
  MessageRole,
  ChatSession,
  SessionContext,
  UserPreferences,
  
  // Command types
  Command,
  CommandType,
  CommandCategory,
  LendingCommand,
  LiquidityCommand,
  InfoCommand,
  ParsedCommand,
  ParseError,
  
  // Response types
  ChatResponse,
  ResponseType,
  ResponseData,
  ExecutionResult,
  PositionData,
  RateData,
  TransactionData,
  PortfolioData,
  
  // Intent types
  UserIntent,
  Entity,
  IntentContext,
  NLPPattern
} from './types.js';

// Export parser utilities
export {
  parseMessage,
  validateCommand,
  detectIntent,
  extractEntities,
  getSuggestions
} from './parser.js';

// Export command handlers
export { 
  executeLendingCommand,
  getLendingHelp,
  getLendingRates
} from './commands/LendingCommands.js';

export { 
  executeLiquidityCommand,
  getLiquidityHelp,
  getLiquidityPositions
} from './commands/LiquidityCommands.js';

export { 
  executeInfoCommand,
  getInfoHelp,
  getRateComparison
} from './commands/InfoCommands.js';

// Export type guards
export {
  isLendingCommand,
  isLiquidityCommand,
  isInfoCommand,
  hasPositionData,
  hasRateData,
  hasTransactionData,
  hasPortfolioData
} from './types.js';

/**
 * Example usage:
 * 
 * ```typescript
 * import { ChatInterface } from './chat';
 * 
 * // Create a new chat session
 * const session = ChatInterface.createSession({
 *   walletAddress: '0x...',
 *   defaultProtocol: 'dragonswap'
 * });
 * 
 * // Process a user message
 * const { session: updatedSession, response } = await ChatInterface.processMessage(
 *   session,
 *   'Supply 1000 USDC'
 * );
 * 
 * // Format and display the response
 * console.log(ChatInterface.formatResponse(response));
 * ```
 */
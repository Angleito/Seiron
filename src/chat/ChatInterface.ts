/**
 * @fileoverview Core chat interface logic
 * Handles message processing, command execution, and response formatting
 */

import type {
  Option,
  Result,
  ReadonlyRecord,
  Either
} from '../types/index.js';
import { pipe, compose, EitherM, Maybe } from '../types/index.js';
import type {
  ChatMessage,
  ChatSession,
  ChatResponse,
  Command,
  ParsedCommand,
  ExecutionResult,
  SessionContext,
  UserPreferences,
  ResponseData
} from './types.js';
import { 
  parseMessage, 
  validateCommand,
  getSuggestions 
} from './parser.js';
import { 
  executeLendingCommand,
  getLendingHelp 
} from './commands/LendingCommands.js';
import { 
  executeLiquidityCommand,
  getLiquidityHelp 
} from './commands/LiquidityCommands.js';
import { 
  executeInfoCommand,
  getInfoHelp 
} from './commands/InfoCommands.js';

/**
 * Chat interface configuration
 */
export interface ChatInterfaceConfig {
  readonly walletAddress?: string;
  readonly defaultProtocol?: string;
  readonly confirmTransactions?: boolean;
  readonly maxMessageHistory?: number;
}

/**
 * Create a new chat session
 */
export function createChatSession(
  config: ChatInterfaceConfig = {}
): ChatSession {
  const now = Date.now();
  
  return {
    id: generateSessionId(),
    messages: [],
    context: {
      walletAddress: config.walletAddress,
      activeProtocols: [],
      preferences: {
        defaultProtocol: config.defaultProtocol,
        confirmTransactions: config.confirmTransactions ?? true,
        slippageTolerance: 0.005, // 0.5%
        gasPreference: 'medium'
      }
    },
    startTime: now,
    lastActivity: now
  };
}

/**
 * Process a user message
 */
export async function processMessage(
  session: ChatSession,
  message: string
): Promise<{ session: ChatSession; response: ChatResponse }> {
  // Add user message to session
  const userMessage: ChatMessage = {
    id: generateMessageId(),
    role: 'user',
    content: message,
    timestamp: Date.now()
  };
  
  const updatedSession: ChatSession = {
    ...session,
    messages: [...session.messages, userMessage],
    lastActivity: Date.now()
  };
  
  // Parse and validate command
  const parsedCommand = pipe(
    parseMessage(message),
    EitherM.chain(validateCommand)
  );
  
  // Generate response based on parsing result
  const response = await pipe(
    parsedCommand,
    EitherM.fold(
      // Handle parse error
      async (error) => generateErrorResponse(error, message),
      // Execute valid command
      async (command) => executeCommand(command, updatedSession.context)
    )
  );
  
  // Add assistant response to session
  const assistantMessage: ChatMessage = {
    id: generateMessageId(),
    role: 'assistant',
    content: response.content,
    timestamp: Date.now(),
    metadata: response.data ? { data: response.data } : undefined
  };
  
  const finalSession: ChatSession = {
    ...updatedSession,
    messages: [...updatedSession.messages, assistantMessage],
    context: {
      ...updatedSession.context,
      lastCommand: parsedCommand._tag === 'Right' ? parsedCommand.right : undefined
    }
  };
  
  return { session: finalSession, response };
}

/**
 * Execute a parsed command
 */
async function executeCommand(
  command: Command,
  context: SessionContext
): Promise<ChatResponse> {
  try {
    let result: ExecutionResult;
    
    switch (command.category) {
      case 'lending':
        result = await executeLendingCommand(command as any, context);
        break;
        
      case 'liquidity':
        result = await executeLiquidityCommand(command as any, context);
        break;
        
      case 'info':
        result = await executeInfoCommand(command as any, context);
        break;
        
      default:
        result = {
          success: false,
          message: 'Unknown command category',
          error: new Error('Invalid command')
        };
    }
    
    return formatExecutionResult(result, command);
    
  } catch (error) {
    return {
      type: 'error',
      content: `Failed to execute command: ${error instanceof Error ? error.message : 'Unknown error'}`,
      suggestions: ['Try checking your command syntax', 'Use "help" for examples']
    };
  }
}

/**
 * Format execution result into chat response
 */
function formatExecutionResult(
  result: ExecutionResult,
  command: Command
): ChatResponse {
  if (!result.success) {
    return {
      type: 'error',
      content: result.message,
      suggestions: getErrorSuggestions(result.error, command)
    };
  }
  
  // Format based on command type
  switch (command.type) {
    case 'supply':
    case 'withdraw':
    case 'borrow':
    case 'repay':
    case 'add_liquidity':
    case 'remove_liquidity':
      return {
        type: 'transaction',
        content: result.message,
        data: result.data ? {
          type: 'transaction',
          txHash: result.txHash || '',
          status: 'success',
          action: command.type,
          details: result.data
        } as ResponseData : undefined
      };
      
    case 'show_positions':
    case 'check_rates':
    case 'portfolio_status':
      return {
        type: 'data',
        content: result.message,
        data: result.data as ResponseData
      };
      
    default:
      return {
        type: 'text',
        content: result.message
      };
  }
}

/**
 * Generate error response for parse errors
 */
async function generateErrorResponse(
  error: { code: string; message: string },
  originalMessage: string
): Promise<ChatResponse> {
  const suggestions = getSuggestions(originalMessage);
  
  let helpText = '';
  if (error.code === 'PARSE_ERROR') {
    helpText = `\n\nHere are some example commands:\n${getExampleCommands().join('\n')}`;
  }
  
  return {
    type: 'error',
    content: `${error.message}${helpText}`,
    suggestions: suggestions.length > 0 ? suggestions : getExampleCommands().slice(0, 3)
  };
}

/**
 * Get error suggestions based on error type
 */
function getErrorSuggestions(
  error: Error | undefined,
  command: Command
): ReadonlyArray<string> {
  if (!error) return [];
  
  const errorMessage = error.message.toLowerCase();
  
  if (errorMessage.includes('insufficient')) {
    return ['Check your balance', 'Try a smaller amount'];
  }
  
  if (errorMessage.includes('token')) {
    return ['Check supported tokens', 'Use USDC, SEI, or ETH'];
  }
  
  if (errorMessage.includes('connect')) {
    return ['Check your wallet connection', 'Ensure you are on the correct network'];
  }
  
  return ['Try "help" for command examples'];
}

/**
 * Get example commands
 */
function getExampleCommands(): ReadonlyArray<string> {
  return [
    'supply 1000 USDC',
    'borrow 500 SEI',
    'show my positions',
    'check rates for USDC',
    'portfolio status',
    'add liquidity 1000 USDC and 0.5 ETH',
    'what\'s the best APY for USDC?'
  ];
}

/**
 * Get help text
 */
export function getHelpText(): string {
  const sections = [
    '📊 **DeFi Assistant Help**\n',
    '**Lending Commands:**',
    getLendingHelp(),
    '\n**Liquidity Commands:**',
    getLiquidityHelp(),
    '\n**Information Commands:**',
    getInfoHelp(),
    '\n**Tips:**',
    '• Amounts can be specified with or without token symbols',
    '• Use protocol names to target specific platforms',
    '• Natural language variations are supported',
    '• Type partial commands for suggestions'
  ];
  
  return sections.join('\n');
}

/**
 * Format response for display
 */
export function formatResponse(response: ChatResponse): string {
  let formatted = response.content;
  
  // Add data visualization if present
  if (response.data) {
    switch (response.data.type) {
      case 'position':
        formatted += '\n\n' + formatPositionData(response.data);
        break;
      case 'rates':
        formatted += '\n\n' + formatRateData(response.data);
        break;
      case 'portfolio':
        formatted += '\n\n' + formatPortfolioData(response.data);
        break;
    }
  }
  
  // Add suggestions if present
  if (response.suggestions && response.suggestions.length > 0) {
    formatted += '\n\n💡 Suggestions:\n' + response.suggestions.map(s => `• ${s}`).join('\n');
  }
  
  return formatted;
}

/**
 * Format position data for display
 */
function formatPositionData(data: any): string {
  const lines = ['📈 Positions:'];
  
  data.positions.forEach((pos: any) => {
    lines.push(`• ${pos.protocol} - ${pos.type}: ${pos.amount} ${pos.token} ($${pos.value})`);
    if (pos.apy) {
      lines.push(`  APY: ${(pos.apy * 100).toFixed(2)}%`);
    }
    if (pos.health) {
      lines.push(`  Health: ${(pos.health * 100).toFixed(0)}%`);
    }
  });
  
  return lines.join('\n');
}

/**
 * Format rate data for display
 */
function formatRateData(data: any): string {
  const lines = ['💰 Current Rates:'];
  
  data.rates.forEach((rate: any) => {
    lines.push(`\n${rate.protocol} - ${rate.token}:`);
    lines.push(`• Supply APY: ${(rate.supplyAPY * 100).toFixed(2)}%`);
    lines.push(`• Borrow APY: ${(rate.borrowAPY * 100).toFixed(2)}%`);
    lines.push(`• Utilization: ${(rate.utilization * 100).toFixed(0)}%`);
  });
  
  return lines.join('\n');
}

/**
 * Format portfolio data for display
 */
function formatPortfolioData(data: any): string {
  const lines = [
    '💼 Portfolio Summary:',
    `Total Value: $${data.totalValue}`,
    `Supplied: $${data.suppliedValue}`,
    `Borrowed: $${data.borrowedValue}`,
    `Liquidity: $${data.liquidityValue}`,
    `Net APY: ${(data.netAPY * 100).toFixed(2)}%`
  ];
  
  if (data.healthFactor) {
    lines.push(`Health Factor: ${data.healthFactor.toFixed(2)}`);
  }
  
  return lines.join('\n');
}

/**
 * Generate unique session ID
 */
function generateSessionId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Generate unique message ID
 */
function generateMessageId(): string {
  return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Export chat interface API
 */
export const ChatInterface = {
  createSession: createChatSession,
  processMessage,
  getHelp: getHelpText,
  formatResponse,
  getSuggestions
};
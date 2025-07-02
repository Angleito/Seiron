/**
 * @fileoverview Natural language parsing utilities
 * Provides functional parsing combinators for extracting user intents
 */

import type { 
  Option, 
  Result,
  ReadonlyRecord,
  NonEmptyArray
} from '../types/index.js';
import { Maybe, EitherM, pipe } from '../types/index.js';
import type {
  Command,
  CommandType,
  UserIntent,
  Entity,
  NLPPattern,
  ParsedCommand,
  ParseError,
  LendingCommand,
  LiquidityCommand,
  InfoCommand
} from './types.js';

/**
 * Token normalization mappings
 */
const TOKEN_ALIASES: ReadonlyRecord<string, string> = {
  'usdc': 'USDC',
  'usdt': 'USDT',
  'sei': 'SEI',
  'wsei': 'WSEI',
  'eth': 'ETH',
  'weth': 'WETH',
  'btc': 'BTC',
  'wbtc': 'WBTC',
  'atom': 'ATOM',
  'osmo': 'OSMO',
  'stablecoin': 'USDC',
  'stable': 'USDC',
  'dollar': 'USDC',
  'dollars': 'USDC'
};

/**
 * Protocol normalization mappings
 */
const PROTOCOL_ALIASES: ReadonlyRecord<string, string> = {
  'dragon': 'dragonswap',
  'dragonswap': 'dragonswap',
  'astro': 'astroport',
  'astroport': 'astroport',
  'levana': 'levana',
  'kujira': 'kujira',
  'orca': 'orca'
};

/**
 * Amount parsing patterns
 */
const AMOUNT_PATTERNS = [
  /(\d+(?:\.\d+)?)\s*([a-zA-Z]+)/i,  // "100 USDC", "0.5 ETH"
  /\$(\d+(?:\.\d+)?)/i,               // "$100"
  /(\d+(?:\.\d+)?)/i                  // "100"
];

/**
 * Intent patterns for command detection
 */
const INTENT_PATTERNS: ReadonlyArray<NLPPattern> = [
  // Lending patterns
  {
    pattern: /(?:supply|deposit|lend|provide)\s+(.+)/i,
    intent: 'supply',
    extractor: extractLendingParams
  },
  {
    pattern: /(?:withdraw|remove|take out)\s+(.+)/i,
    intent: 'withdraw',
    extractor: extractLendingParams
  },
  {
    pattern: /(?:borrow|loan|take)\s+(.+)/i,
    intent: 'borrow',
    extractor: extractLendingParams
  },
  {
    pattern: /(?:repay|pay back|return)\s+(.+)/i,
    intent: 'repay',
    extractor: extractLendingParams
  },
  
  // Liquidity patterns
  {
    pattern: /(?:add|provide)\s+liquidity\s+(.+)/i,
    intent: 'add_liquidity',
    extractor: extractLiquidityParams
  },
  {
    pattern: /(?:remove|withdraw)\s+liquidity\s+(.+)/i,
    intent: 'remove_liquidity',
    extractor: extractLiquidityParams
  },
  {
    pattern: /adjust\s+(?:range|position)\s+(.+)/i,
    intent: 'adjust_range',
    extractor: extractRangeParams
  },
  
  // Info patterns
  {
    pattern: /(?:show|list|display|what are)\s+(?:my\s+)?(?:positions?|holdings?|deposits?)/i,
    intent: 'show_positions',
    extractor: extractInfoParams
  },
  {
    pattern: /(?:check|show|what(?:'s| is))\s+(?:the\s+)?(?:rates?|apy|apr|yield)/i,
    intent: 'check_rates',
    extractor: extractInfoParams
  },
  {
    pattern: /(?:portfolio|status|summary|overview|balance)/i,
    intent: 'portfolio_status',
    extractor: () => Maybe.some({})
  },
  
  // Question patterns for rates
  {
    pattern: /what(?:'s| is)\s+(?:the\s+)?best\s+(?:apy|rate|yield)\s+(?:for\s+)?(.+)/i,
    intent: 'check_rates',
    extractor: extractRateQueryParams
  }
];

/**
 * Extract lending command parameters
 */
function extractLendingParams(match: RegExpMatchArray): Option<ReadonlyRecord<string, string>> {
  const input = match[1];
  if (!input) return Maybe.none();

  const amountMatch = input.match(/(\d+(?:\.\d+)?)\s*([a-zA-Z]+)?/);
  if (!amountMatch) return Maybe.none();

  const amount = amountMatch[1];
  const token = normalizeToken(amountMatch[2] || 'USDC');
  
  // Check for protocol mention
  const protocolMatch = input.match(/(?:on|from|at)\s+(\w+)/i);
  const protocol = protocolMatch ? normalizeProtocol(protocolMatch[1]) : undefined;

  return Maybe.some({
    amount,
    token,
    ...(protocol && { protocol })
  });
}

/**
 * Extract liquidity parameters
 */
function extractLiquidityParams(match: RegExpMatchArray): Option<ReadonlyRecord<string, string>> {
  const input = match[1];
  if (!input) return Maybe.none();

  // Handle "100 USDC and 0.1 ETH" pattern
  const pairMatch = input.match(/(\d+(?:\.\d+)?)\s*([a-zA-Z]+)\s+and\s+(\d+(?:\.\d+)?)\s*([a-zA-Z]+)/i);
  if (pairMatch) {
    return Maybe.some({
      amount0: pairMatch[1],
      token0: normalizeToken(pairMatch[2]),
      amount1: pairMatch[3],
      token1: normalizeToken(pairMatch[4])
    });
  }

  // Handle single amount with pair "100 USDC to ETH/USDC"
  const singleMatch = input.match(/(\d+(?:\.\d+)?)\s*([a-zA-Z]+)(?:\s+to\s+([a-zA-Z]+)\/([a-zA-Z]+))?/i);
  if (singleMatch) {
    return Maybe.some({
      amount0: singleMatch[1],
      token0: normalizeToken(singleMatch[2]),
      ...(singleMatch[3] && { token1: normalizeToken(singleMatch[4]) })
    });
  }

  return Maybe.none();
}

/**
 * Extract range adjustment parameters
 */
function extractRangeParams(match: RegExpMatchArray): Option<ReadonlyRecord<string, string>> {
  const input = match[1];
  if (!input) return Maybe.none();

  const rangeMatch = input.match(/(\d+(?:\.\d+)?)\s*-\s*(\d+(?:\.\d+)?)/);
  if (rangeMatch) {
    return Maybe.some({
      rangeMin: rangeMatch[1],
      rangeMax: rangeMatch[2]
    });
  }

  return Maybe.none();
}

/**
 * Extract info command parameters
 */
function extractInfoParams(match: RegExpMatchArray): Option<ReadonlyRecord<string, string>> {
  const input = match[0];
  
  // Check for token filter
  const tokenMatch = input.match(/(?:for|in)\s+([a-zA-Z]+)/i);
  const token = tokenMatch ? normalizeToken(tokenMatch[1]) : undefined;
  
  // Check for protocol filter
  const protocolMatch = input.match(/(?:on|at)\s+(\w+)/i);
  const protocol = protocolMatch ? normalizeProtocol(protocolMatch[1]) : undefined;

  return Maybe.some({
    ...(token && { token }),
    ...(protocol && { protocol })
  });
}

/**
 * Extract rate query parameters
 */
function extractRateQueryParams(match: RegExpMatchArray): Option<ReadonlyRecord<string, string>> {
  const token = match[1] ? normalizeToken(match[1]) : undefined;
  return Maybe.some({
    ...(token && { token })
  });
}

/**
 * Normalize token symbols
 */
function normalizeToken(token: string): string {
  const normalized = token.toLowerCase().trim();
  return TOKEN_ALIASES[normalized] || token.toUpperCase();
}

/**
 * Normalize protocol names
 */
function normalizeProtocol(protocol: string): string {
  const normalized = protocol.toLowerCase().trim();
  return PROTOCOL_ALIASES[normalized] || protocol;
}

/**
 * Extract entities from text
 */
export function extractEntities(text: string): ReadonlyArray<Entity> {
  const entities: Entity[] = [];
  
  // Extract amounts
  AMOUNT_PATTERNS.forEach(pattern => {
    const matches = Array.from(text.matchAll(new RegExp(pattern, 'gi')));
    matches.forEach(match => {
      if (match.index !== undefined) {
        entities.push({
          type: 'amount',
          value: match[0],
          normalized: match[1],
          position: [match.index, match.index + match[0].length]
        });
      }
    });
  });
  
  // Extract tokens
  const tokenPattern = /\b([A-Z]{2,6})\b/g;
  const tokenMatches = Array.from(text.matchAll(tokenPattern));
  tokenMatches.forEach(match => {
    if (match.index !== undefined) {
      const normalized = normalizeToken(match[1]);
      if (TOKEN_ALIASES[match[1].toLowerCase()] || match[1] === normalized) {
        entities.push({
          type: 'token',
          value: match[1],
          normalized,
          position: [match.index, match.index + match[1].length]
        });
      }
    }
  });
  
  // Extract protocols
  Object.keys(PROTOCOL_ALIASES).forEach(alias => {
    const index = text.toLowerCase().indexOf(alias);
    if (index !== -1) {
      entities.push({
        type: 'protocol',
        value: text.substr(index, alias.length),
        normalized: PROTOCOL_ALIASES[alias],
        position: [index, index + alias.length]
      });
    }
  });
  
  return entities;
}

/**
 * Detect user intent from message
 */
export function detectIntent(message: string): UserIntent {
  const normalizedMessage = message.toLowerCase().trim();
  
  // Try to match against patterns
  for (const pattern of INTENT_PATTERNS) {
    const match = normalizedMessage.match(pattern.pattern);
    if (match) {
      return {
        primary: pattern.intent,
        confidence: 0.9,
        entities: extractEntities(message)
      };
    }
  }
  
  // Fallback: check for keywords
  const keywordIntents: ReadonlyRecord<string, CommandType> = {
    'supply': 'supply',
    'deposit': 'supply',
    'withdraw': 'withdraw',
    'borrow': 'borrow',
    'repay': 'repay',
    'liquidity': 'add_liquidity',
    'position': 'show_positions',
    'rate': 'check_rates',
    'apy': 'check_rates',
    'portfolio': 'portfolio_status',
    'balance': 'portfolio_status'
  };
  
  for (const [keyword, intent] of Object.entries(keywordIntents)) {
    if (normalizedMessage.includes(keyword)) {
      return {
        primary: intent,
        confidence: 0.6,
        entities: extractEntities(message)
      };
    }
  }
  
  return {
    primary: 'unknown',
    confidence: 0.0,
    entities: extractEntities(message)
  };
}

/**
 * Parse message to command
 */
export function parseMessage(message: string): ParsedCommand {
  const intent = detectIntent(message);
  
  if (intent.primary === 'unknown') {
    return EitherM.left({
      code: 'PARSE_ERROR',
      message: 'Could not understand the command. Try "help" for examples.'
    });
  }
  
  // Find matching pattern
  const pattern = INTENT_PATTERNS.find(p => p.intent === intent.primary);
  if (!pattern) {
    return EitherM.left({
      code: 'PARSE_ERROR',
      message: 'Internal error: no pattern for intent'
    });
  }
  
  const match = message.match(pattern.pattern);
  if (!match) {
    return EitherM.left({
      code: 'PARSE_ERROR',
      message: 'Could not parse command parameters'
    });
  }
  
  const paramsOption = pattern.extractor(match);
  
  return pipe(
    paramsOption,
    Maybe.fold(
      () => EitherM.left<ParseError, Command>({
        code: 'MISSING_PARAMS',
        message: 'Missing required parameters for command'
      }),
      params => {
        // Build command based on intent
        const baseCommand = {
          type: intent.primary,
          raw: message,
          confidence: intent.confidence
        };
        
        switch (intent.primary) {
          case 'supply':
          case 'withdraw':
          case 'borrow':
          case 'repay':
            return EitherM.right<ParseError, Command>({
              ...baseCommand,
              category: 'lending',
              type: intent.primary,
              params: params as any
            } as LendingCommand);
            
          case 'add_liquidity':
          case 'remove_liquidity':
          case 'adjust_range':
            return EitherM.right<ParseError, Command>({
              ...baseCommand,
              category: 'liquidity',
              type: intent.primary,
              params: params as any
            } as LiquidityCommand);
            
          case 'show_positions':
          case 'check_rates':
          case 'portfolio_status':
            return EitherM.right<ParseError, Command>({
              ...baseCommand,
              category: 'info',
              type: intent.primary,
              params: params as any
            } as InfoCommand);
            
          default:
            return EitherM.left<ParseError, Command>({
              code: 'PARSE_ERROR',
              message: 'Unknown command type'
            });
        }
      }
    )
  );
}

/**
 * Validate parsed command
 */
export function validateCommand(command: Command): Result<Command, ParseError> {
  // Validate lending commands
  if (command.category === 'lending') {
    const lendingCmd = command as LendingCommand;
    
    // Check amount is valid
    const amount = parseFloat(lendingCmd.params.amount);
    if (isNaN(amount) || amount <= 0) {
      return EitherM.left({
        code: 'INVALID_AMOUNT',
        message: 'Amount must be a positive number'
      });
    }
    
    // Check token is known
    const knownTokens = Object.values(TOKEN_ALIASES);
    if (!knownTokens.includes(lendingCmd.params.token)) {
      return EitherM.left({
        code: 'UNKNOWN_TOKEN',
        message: `Unknown token: ${lendingCmd.params.token}`
      });
    }
  }
  
  // Validate liquidity commands
  if (command.category === 'liquidity') {
    const liquidityCmd = command as LiquidityCommand;
    
    if (liquidityCmd.type === 'add_liquidity' || liquidityCmd.type === 'remove_liquidity') {
      if (!liquidityCmd.params.amount0 && !liquidityCmd.params.amount1) {
        return EitherM.left({
          code: 'MISSING_PARAMS',
          message: 'At least one amount must be specified'
        });
      }
    }
  }
  
  return EitherM.right(command);
}

/**
 * Get command suggestions based on partial input
 */
export function getSuggestions(partial: string): ReadonlyArray<string> {
  const suggestions: string[] = [];
  const normalized = partial.toLowerCase().trim();
  
  // Command suggestions
  const commands = [
    'supply 1000 USDC',
    'withdraw 500 USDC',
    'borrow 100 SEI',
    'repay 50 SEI',
    'add liquidity 1000 USDC and 0.5 ETH',
    'remove liquidity from USDC/ETH',
    'show my positions',
    'check rates for USDC',
    'portfolio status'
  ];
  
  commands.forEach(cmd => {
    if (cmd.toLowerCase().startsWith(normalized)) {
      suggestions.push(cmd);
    }
  });
  
  return suggestions.slice(0, 5); // Return top 5 suggestions
}
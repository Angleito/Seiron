import { openai } from '@ai-sdk/openai';
import { generateObject } from 'ai';
import { z } from 'zod';
import { performance } from 'perf_hooks';
import { createClient } from '@supabase/supabase-js';

// Set maximum duration for the function (30 seconds)
export const maxDuration = 30;

// Configure runtime for Vercel Edge Functions
export const runtime = 'nodejs';

// Rate limiting configuration (shared with chat.js)
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 15; // 15 requests per minute for orchestrate
const requestTracker = new Map();

// Supabase client configuration
let supabaseClient = null;

function initializeSupabaseClient() {
  if (!supabaseClient) {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
    
    if (supabaseUrl && supabaseAnonKey) {
      supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      });
      console.log('Supabase client initialized successfully');
    } else {
      console.warn('Supabase configuration not found - chat history will not be saved');
    }
  }
  return supabaseClient;
}

function isRateLimited(identifier) {
  const now = Date.now();
  const windowStart = now - RATE_LIMIT_WINDOW;
  
  // Clean old entries
  for (const [key, timestamps] of requestTracker.entries()) {
    const filtered = timestamps.filter(t => t > windowStart);
    if (filtered.length === 0) {
      requestTracker.delete(key);
    } else {
      requestTracker.set(key, filtered);
    }
  }
  
  // Check current rate
  const requests = requestTracker.get(identifier) || [];
  const recentRequests = requests.filter(t => t > windowStart);
  
  if (recentRequests.length >= RATE_LIMIT_MAX_REQUESTS) {
    return true;
  }
  
  // Add current request
  recentRequests.push(now);
  requestTracker.set(identifier, recentRequests);
  return false;
}

// Request validation function
function validateRequest(body) {
  if (!body) {
    return { valid: false, error: 'Request body is required' };
  }
  
  const { message, sessionId } = body;
  
  if (!message || typeof message !== 'string' || !message.trim()) {
    return { valid: false, error: 'Message is required and must be a non-empty string' };
  }
  
  if (!sessionId || typeof sessionId !== 'string') {
    return { valid: false, error: 'Session ID is required' };
  }
  
  if (message.length > 4000) {
    return { valid: false, error: 'Message is too long (max 4000 characters)' };
  }
  
  return { valid: true };
}

// Extract crypto context from intent and response
function extractCryptoContext(intent, response, walletAddress) {
  const cryptoContext = {
    wallet_address: walletAddress || null,
    intent_type: intent.type,
    intent_action: intent.action,
    agent_type: response.agentType,
    risk_level: response.metadata.riskLevel,
    confidence: response.metadata.confidence,
    action_required: response.metadata.actionRequired,
    timestamp: new Date().toISOString(),
    portfolio_data: {},
    lending_info: {},
    swap_details: {},
    market_data: {},
    suggestions: response.metadata.suggestions || [],
  };

  // Add intent-specific context
  switch (intent.type) {
    case 'lending':
      cryptoContext.lending_info = {
        action: intent.action,
        parameters: intent.parameters,
        protocols: ['Compound', 'Aave', 'Silo'], // Common lending protocols
      };
      if (intent.parameters.amount) {
        cryptoContext.lending_info.amount = intent.parameters.amount;
        cryptoContext.lending_info.asset = intent.parameters.asset;
      }
      break;
    
    case 'liquidity':
      cryptoContext.swap_details = {
        action: intent.action,
        parameters: intent.parameters,
        protocols: ['Uniswap', 'SushiSwap', 'DragonSwap'], // Common DEX protocols
      };
      break;
    
    case 'portfolio':
      cryptoContext.portfolio_data = {
        action: intent.action,
        parameters: intent.parameters,
        analysis_requested: intent.action === 'show_positions',
        rebalance_requested: intent.action === 'rebalance',
      };
      break;
    
    case 'trading':
      cryptoContext.market_data = {
        action: intent.action,
        parameters: intent.parameters,
        trade_type: intent.action === 'buy' ? 'buy' : 'sell',
      };
      break;
    
    case 'analysis':
      cryptoContext.market_data = {
        action: intent.action,
        analysis_type: 'market_analysis',
        parameters: intent.parameters,
      };
      break;
    
    case 'risk':
      cryptoContext.portfolio_data = {
        action: intent.action,
        risk_assessment: true,
        health_check: true,
        parameters: intent.parameters,
      };
      break;
  }

  return cryptoContext;
}

// Enhanced intent parsing function
function parseUserIntent(message, sessionId, walletAddress) {
  const lowerMessage = message.toLowerCase();
  
  let type = 'info';
  let action = 'general_query';
  const parameters = {};

  // Lending intents
  if (lowerMessage.includes('lend') || lowerMessage.includes('supply')) {
    type = 'lending';
    action = 'supply';
    const amountMatch = lowerMessage.match(/(\d+\.?\d*)\s*(usdc|eth|sei)?/i);
    if (amountMatch) {
      parameters.amount = parseFloat(amountMatch[1]);
      parameters.asset = amountMatch[2]?.toUpperCase() || 'USDC';
    }
  } else if (lowerMessage.includes('borrow')) {
    type = 'lending';
    action = 'borrow';
  } else if (lowerMessage.includes('repay')) {
    type = 'lending';
    action = 'repay';
  }
  // Liquidity intents
  else if (lowerMessage.includes('liquidity') || lowerMessage.includes('pool')) {
    type = 'liquidity';
    action = lowerMessage.includes('remove') ? 'remove_liquidity' : 'add_liquidity';
  } else if (lowerMessage.includes('swap')) {
    type = 'liquidity';
    action = 'swap';
  }
  // Portfolio intents
  else if (lowerMessage.includes('portfolio') || lowerMessage.includes('positions')) {
    type = 'portfolio';
    action = 'show_positions';
  } else if (lowerMessage.includes('rebalance')) {
    type = 'portfolio';
    action = 'rebalance';
  }
  // Trading intents
  else if (lowerMessage.includes('buy')) {
    type = 'trading';
    action = 'buy';
  } else if (lowerMessage.includes('sell')) {
    type = 'trading';
    action = 'sell';
  }
  // Analysis intents
  else if (lowerMessage.includes('analyze') || lowerMessage.includes('analysis')) {
    type = 'analysis';
    action = 'analyze_market';
  }
  // Risk intents
  else if (lowerMessage.includes('risk') || lowerMessage.includes('health')) {
    type = 'risk';
    action = 'assess_risk';
  }

  return {
    id: `intent-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    userId: sessionId,
    walletAddress: walletAddress || '0x0000000000000000000000000000000000000000',
    type,
    action,
    parameters,
    priority: 'medium',
    context: {
      sessionId,
      timestamp: new Date(),
      source: 'chat',
    },
  };
}

// Response schema for structured output
const ResponseSchema = z.object({
  message: z.string().describe('The Dragon Ball Z themed response message'),
  agentType: z.string().describe('The type of agent handling the request'),
  confidence: z.number().min(0).max(1).describe('Confidence level of the response'),
  actionRequired: z.boolean().describe('Whether any action is required from the user'),
  riskLevel: z.enum(['low', 'medium', 'high']).describe('Risk level of the suggested action'),
  suggestions: z.array(z.string()).optional().describe('Additional suggestions for the user'),
});

// Format response to match expected API contract
function formatAgentResponse(result, intent, executionTime) {
  return {
    message: result.message,
    timestamp: new Date().toISOString(),
    agentType: result.agentType || 'dragon_advisor',
    intentId: intent.id,
    executionTime: executionTime,
    metadata: {
      intent: intent.type,
      action: intent.action,
      confidence: result.confidence,
      riskLevel: result.riskLevel,
      actionRequired: result.actionRequired,
      suggestions: result.suggestions,
    }
  };
}

// Get or create user in Supabase
async function getOrCreateUser(supabase, walletAddress, sessionId) {
  if (!supabase) return null;
  
  try {
    // First try to get existing user by wallet address
    if (walletAddress) {
      const { data: existingUser, error: getUserError } = await supabase
        .from('users')
        .select('id, wallet_address')
        .eq('wallet_address', walletAddress)
        .single();
      
      if (existingUser && !getUserError) {
        return existingUser.id;
      }
    }
    
    // If no user found or no wallet address, create a new user
    const { data: newUser, error: createError } = await supabase
      .from('users')
      .insert([{
        wallet_address: walletAddress || null,
        username: sessionId, // Use session ID as username fallback
      }])
      .select('id')
      .single();
    
    if (createError) {
      console.error('Error creating user:', createError);
      return null;
    }
    
    return newUser.id;
  } catch (error) {
    console.error('Error in getOrCreateUser:', error);
    return null;
  }
}

// Get or create chat session
async function getOrCreateSession(supabase, userId, sessionId) {
  if (!supabase || !userId) return null;
  
  try {
    // Try to get existing session
    const { data: existingSession, error: getSessionError } = await supabase
      .from('chat_sessions')
      .select('id')
      .eq('user_id', userId)
      .eq('session_name', sessionId)
      .single();
    
    if (existingSession && !getSessionError) {
      return existingSession.id;
    }
    
    // Create new session
    const { data: newSession, error: createError } = await supabase
      .from('chat_sessions')
      .insert([{
        user_id: userId,
        session_name: sessionId,
        is_active: true,
      }])
      .select('id')
      .single();
    
    if (createError) {
      console.error('Error creating session:', createError);
      return null;
    }
    
    return newSession.id;
  } catch (error) {
    console.error('Error in getOrCreateSession:', error);
    return null;
  }
}

// Save message to Supabase
async function saveMessage(supabase, sessionId, userId, role, content, cryptoContext = null, agentType = null) {
  if (!supabase || !sessionId || !userId) return null;
  
  try {
    const messageData = {
      session_id: sessionId,
      user_id: userId,
      role: role,
      content: content,
      crypto_context: cryptoContext || {},
      metadata: {
        agent_type: agentType,
        timestamp: new Date().toISOString(),
      },
    };
    
    const { data, error } = await supabase
      .from('messages')
      .insert([messageData])
      .select('id')
      .single();
    
    if (error) {
      console.error('Error saving message:', error);
      return null;
    }
    
    return data.id;
  } catch (error) {
    console.error('Error in saveMessage:', error);
    return null;
  }
}

// Generate system prompt for structured response
function generateSystemPrompt(intent, walletAddress) {
  const basePrompt = `You are Seiron, a powerful Dragon Ball Z-themed AI assistant for crypto portfolio management and DeFi operations. You speak with the wisdom and power of a mystical dragon while helping users with their crypto investments and DeFi strategies.

CRITICAL: You must respond in a structured format that includes:
1. A Dragon Ball Z themed message (refer to investments as "treasures", yields as "power levels", etc.)
2. Appropriate agent type for the request
3. Confidence level (0-1)
4. Whether action is required from the user
5. Risk level (low/medium/high)
6. Optional suggestions array

Current context:
- User Intent: ${intent.type} - ${intent.action}
- Wallet Address: ${walletAddress || 'Not connected'}
- Session ID: ${intent.context.sessionId}
- Intent Parameters: ${JSON.stringify(intent.parameters)}

Guidelines:
- Provide accurate, helpful crypto and DeFi advice
- Always include risk warnings for financial operations
- Be encouraging but realistic about market conditions
- Use dragon/mystical metaphors while staying professional
- If you need specific portfolio data, ask the user to connect their wallet`;

  // Add intent-specific context
  switch (intent.type) {
    case 'lending':
      return basePrompt + `\n\nThe user is interested in lending/borrowing operations. Focus on explaining yield farming, lending protocols like Compound, Aave, and the risks involved. Set agentType to "lending_agent".`;
    case 'liquidity':
      return basePrompt + `\n\nThe user wants to add/remove liquidity or swap tokens. Explain AMM mechanics, impermanent loss, and liquidity provider rewards. Set agentType to "liquidity_agent".`;
    case 'portfolio':
      return basePrompt + `\n\nThe user wants to view or manage their portfolio. Discuss diversification, rebalancing strategies, and position sizing. Set agentType to "portfolio_agent".`;
    case 'trading':
      return basePrompt + `\n\nThe user is interested in trading. Discuss market analysis, entry/exit strategies, and risk management. Set agentType to "trading_agent".`;
    case 'analysis':
      return basePrompt + `\n\nThe user wants market analysis. Provide insights on trends, technical analysis, and market conditions. Set agentType to "market_agent".`;
    case 'risk':
      return basePrompt + `\n\nThe user is asking about risk assessment. Focus on portfolio health, risk metrics, and safety measures. Set agentType to "risk_agent".`;
    default:
      return basePrompt + `\n\nProvide general guidance about crypto and DeFi, maintaining the mystical dragon persona. Set agentType to "dragon_advisor".`;
  }
}

export default async function handler(req, res) {
  const startTime = performance.now();
  const requestId = `orch-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Request-ID, X-Session-ID');
  
  // Handle OPTIONS request for CORS
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      error: 'Method not allowed',
      message: 'Only POST requests are allowed for this endpoint'
    });
  }
  
  // Initialize variables that need to be accessible in catch block
  let userId = null;
  let dbSessionId = null;
  let supabase = null;
  
  try {
    // Parse request body
    const body = req.body;
    
    // Rate limiting
    const clientId = req.headers['x-forwarded-for'] || req.connection?.remoteAddress || 'unknown';
    if (isRateLimited(clientId)) {
      return res.status(429).json({
        error: 'Rate limit exceeded',
        message: 'Too many requests. Please wait before trying again.',
        timestamp: new Date().toISOString()
      });
    }
    
    // Validate request
    const validation = validateRequest(body);
    if (!validation.valid) {
      return res.status(400).json({
        error: 'Invalid request',
        message: validation.error,
        timestamp: new Date().toISOString()
      });
    }
    
    const { message, sessionId, walletAddress, metadata } = body;
    
    // Check for API key
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      console.error('OpenAI API key not configured');
      return res.status(500).json({
        error: 'Service configuration error',
        message: 'AI service is not properly configured. Please contact support.',
        timestamp: new Date().toISOString()
      });
    }
    
    // Initialize Supabase client
    supabase = initializeSupabaseClient();
    
    // Parse user intent
    const intent = parseUserIntent(message, sessionId, walletAddress);
    
    // Generate system prompt based on intent
    const systemPrompt = generateSystemPrompt(intent, walletAddress);
    
    console.log(`[${requestId}] Processing orchestrate request`, {
      sessionId,
      walletAddress: walletAddress || 'none',
      intentType: intent.type,
      intentAction: intent.action,
      messageLength: message.length,
      timestamp: new Date().toISOString()
    });
    
    // Get or create user and session for Supabase persistence
    if (supabase) {
      try {
        userId = await getOrCreateUser(supabase, walletAddress, sessionId);
        if (userId) {
          dbSessionId = await getOrCreateSession(supabase, userId, sessionId);
          
          // Save user message to database
          await saveMessage(supabase, dbSessionId, userId, 'user', message, {
            intent_type: intent.type,
            intent_action: intent.action,
            wallet_address: walletAddress,
            timestamp: new Date().toISOString(),
          });
        }
      } catch (error) {
        console.error(`[${requestId}] Error with Supabase setup:`, error);
        // Continue without database persistence
      }
    }
    
    // Generate structured response using GPT-4o
    const result = await generateObject({
      model: openai('gpt-4o'), // Using GPT-4o as requested
      schema: ResponseSchema,
      prompt: `${systemPrompt}

User message: "${message}"

Respond as Seiron the mystical dragon with wisdom about crypto and DeFi. Make sure to:
- Use Dragon Ball Z terminology naturally
- Provide accurate financial advice
- Include appropriate risk warnings
- Set confidence based on how certain you are about the advice
- Mark actionRequired as true if the user needs to do something specific
- Set appropriate risk level for any suggested actions`,
      temperature: 0.7,
      maxTokens: 1000,
    });
    
    const executionTime = Math.round(performance.now() - startTime);
    
    // Format response to match API contract
    const response = formatAgentResponse(result.object, intent, executionTime);
    
    // Save AI response to database with crypto context
    if (supabase && userId && dbSessionId) {
      try {
        const cryptoContext = extractCryptoContext(intent, response, walletAddress);
        await saveMessage(
          supabase, 
          dbSessionId, 
          userId, 
          'assistant', 
          response.message, 
          cryptoContext,
          response.agentType
        );
        
        console.log(`[${requestId}] Messages saved to database successfully`, {
          sessionId,
          userId,
          dbSessionId,
          agentType: response.agentType,
          cryptoContextKeys: Object.keys(cryptoContext),
        });
      } catch (error) {
        console.error(`[${requestId}] Error saving AI response to database:`, error);
        // Continue without failing the request
      }
    }
    
    // Log successful request
    console.log(`[${requestId}] Orchestrate request processed successfully`, {
      sessionId,
      walletAddress: walletAddress || 'none',
      intentType: intent.type,
      intentAction: intent.action,
      agentType: response.agentType,
      confidence: response.metadata.confidence,
      executionTime,
      timestamp: new Date().toISOString(),
      persistedToDb: !!(supabase && userId && dbSessionId)
    });
    
    res.status(200).json(response);
    
  } catch (error) {
    const duration = performance.now() - startTime;
    
    console.error(`[${requestId}] Orchestrate API error:`, {
      error: error.message,
      stack: error.stack,
      duration: Math.round(duration),
      timestamp: new Date().toISOString()
    });
    
    // Try to save error to database for debugging
    if (supabase && userId && dbSessionId) {
      try {
        await saveMessage(
          supabase, 
          dbSessionId, 
          userId, 
          'system', 
          `Error: ${error.message}`, 
          {
            error_type: 'orchestrate_error',
            error_message: error.message,
            timestamp: new Date().toISOString(),
            duration: Math.round(duration),
          },
          'error_handler'
        );
      } catch (dbError) {
        console.error(`[${requestId}] Failed to save error to database:`, dbError);
      }
    }
    
    // Return error response in expected format
    res.status(500).json({
      message: 'Seiron could not understand your wish: The dragon encountered mystical interference. Please speak more clearly to the dragon.',
      timestamp: new Date().toISOString(),
      agentType: 'orchestrator',
      error: true,
      metadata: {
        intent: 'error',
        action: 'error_handling',
        confidence: 0
      }
    });
  }
}
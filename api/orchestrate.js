import { openai } from '@ai-sdk/openai';
import { generateObject } from 'ai';
import { z } from 'zod';
import { performance } from 'perf_hooks';

// Set maximum duration for the function (30 seconds)
export const maxDuration = 30;

// Configure runtime for Vercel Edge Functions
export const runtime = 'nodejs';

// Rate limiting configuration (shared with chat.js)
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 15; // 15 requests per minute for orchestrate
const requestTracker = new Map();

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
    
    // Log successful request
    console.log(`[${requestId}] Orchestrate request processed successfully`, {
      sessionId,
      walletAddress: walletAddress || 'none',
      intentType: intent.type,
      intentAction: intent.action,
      agentType: response.agentType,
      confidence: response.metadata.confidence,
      executionTime,
      timestamp: new Date().toISOString()
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
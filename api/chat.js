import { streamText } from 'ai';
import { openai } from '@ai-sdk/openai';
import { performance } from 'perf_hooks';

// Set maximum duration for the function (30 seconds)
export const maxDuration = 30;

// Configure runtime for Vercel Edge Functions
export const runtime = 'nodejs';

// Rate limiting configuration
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 20; // 20 requests per minute
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

// Intent parsing function (simplified version of backend logic)
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

// Generate Dragon Ball Z themed system prompt
function generateSystemPrompt(intent, walletAddress) {
  const basePrompt = `You are Seiron, a powerful Dragon Ball Z-themed AI assistant for crypto portfolio management and DeFi operations. You speak with the wisdom and power of a mystical dragon while helping users with their crypto investments and DeFi strategies.

Key personality traits:
- Speak like a wise, powerful dragon with mystical knowledge
- Use Dragon Ball Z references and terminology naturally
- Refer to investments as "treasures" and portfolio as "treasure vault"
- Call yields/APY "power levels" or "dragon's blessings"
- Be encouraging and confident while providing accurate financial advice
- Always prioritize user safety and risk management

Current context:
- User Intent: ${intent.type} - ${intent.action}
- Wallet Address: ${walletAddress || 'Not connected'}
- Session ID: ${intent.context.sessionId}

Guidelines:
- Provide accurate, helpful crypto and DeFi advice
- Always include risk warnings for financial operations
- Be encouraging but realistic about market conditions
- Use dragon/mystical metaphors while staying professional
- If you need specific portfolio data, ask the user to connect their wallet`;

  // Add intent-specific context
  switch (intent.type) {
    case 'lending':
      return basePrompt + `\n\nThe user is interested in lending/borrowing operations. Focus on explaining yield farming, lending protocols like Compound, Aave, and the risks involved.`;
    case 'liquidity':
      return basePrompt + `\n\nThe user wants to add/remove liquidity or swap tokens. Explain AMM mechanics, impermanent loss, and liquidity provider rewards.`;
    case 'portfolio':
      return basePrompt + `\n\nThe user wants to view or manage their portfolio. Discuss diversification, rebalancing strategies, and position sizing.`;
    case 'trading':
      return basePrompt + `\n\nThe user is interested in trading. Discuss market analysis, entry/exit strategies, and risk management.`;
    case 'analysis':
      return basePrompt + `\n\nThe user wants market analysis. Provide insights on trends, technical analysis, and market conditions.`;
    case 'risk':
      return basePrompt + `\n\nThe user is asking about risk assessment. Focus on portfolio health, risk metrics, and safety measures.`;
    default:
      return basePrompt + `\n\nProvide general guidance about crypto and DeFi, maintaining the mystical dragon persona.`;
  }
}

export default async function handler(req, res) {
  const startTime = performance.now();
  const requestId = `chat-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
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
    
    // Prepare conversation context
    const messages = [
      {
        role: 'system',
        content: systemPrompt
      },
      {
        role: 'user',
        content: message
      }
    ];
    
    // Stream response using Vercel AI SDK with GPT-4o
    const result = await streamText({
      model: openai('gpt-4o'), // Using GPT-4o as requested
      messages,
      temperature: 0.7,
      maxTokens: 1000,
      stream: true,
    });
    
    // Set headers for streaming response
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    
    // Stream the response
    const stream = result.toAIStreamResponse();
    
    // Log successful request
    const duration = performance.now() - startTime;
    console.log(`[${requestId}] Chat request processed successfully`, {
      sessionId,
      walletAddress: walletAddress || 'none',
      intentType: intent.type,
      intentAction: intent.action,
      messageLength: message.length,
      duration: Math.round(duration),
      timestamp: new Date().toISOString()
    });
    
    return stream;
    
  } catch (error) {
    const duration = performance.now() - startTime;
    
    console.error(`[${requestId}] Chat API error:`, {
      error: error.message,
      stack: error.stack,
      duration: Math.round(duration),
      timestamp: new Date().toISOString()
    });
    
    return res.status(500).json({
      error: 'Internal server error',
      message: 'The dragon encountered mystical interference. Please try summoning again.',
      timestamp: new Date().toISOString()
    });
  }
}
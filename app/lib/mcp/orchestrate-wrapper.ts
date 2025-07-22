/**
 * Orchestrate API Wrapper
 * Provides compatibility layer for existing orchestrate.ts to use the new MCP client
 */

import { handleMCPRequests } from './index';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import OpenAI from 'openai';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// CORS headers
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

/**
 * Handle chat orchestration with MCP integration
 */
export async function handleChatOrchestration(
  req: VercelRequest,
  res: VercelResponse
) {
  // Set CORS headers for all responses
  Object.entries(corsHeaders).forEach(([key, value]) => {
    res.setHeader(key, value);
  });

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Only allow POST
  if (req.method !== 'POST') {
    res.status(405).json({ 
      error: 'Method not allowed' 
    });
    return;
  }

  try {
    const { message, sessionId, walletAddress, messages = [] } = req.body;

    if (!message) {
      res.status(400).json({ 
        error: 'Message is required' 
      });
      return;
    }

    // Use the new MCP client to handle requests
    const mcpResponse = await handleMCPRequests({
      message,
      walletAddress,
      sessionId
    });
    
    // Prepare messages for OpenAI with MCP context
    const systemMessage = {
      role: 'system' as const,
      content: `You are Seiron, a powerful dragon AI assistant specializing in DeFi, portfolio management, and blockchain technology on the Sei Network. 
      You speak with wisdom and authority, occasionally making dragon-themed references.
      You are helpful, knowledgeable, and focused on providing valuable insights about cryptocurrency and DeFi.
      ${walletAddress ? `The user's wallet address is: ${walletAddress}` : ''}
      ${mcpResponse.context ? `\n\nCurrent context: ${mcpResponse.context}` : ''}`
    };

    const conversationMessages = [
      systemMessage,
      ...messages,
      { role: 'user' as const, content: message }
    ];

    // Call OpenAI API
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: conversationMessages,
      temperature: 0.7,
      max_tokens: 500,
    });

    const response = completion.choices[0]?.message?.content || 'I apologize, but I could not generate a response.';

    // Return response in the expected format
    res.status(200).json({
      success: true,
      data: {
        response,
        sessionId: sessionId || `session_${Date.now()}`,
        timestamp: new Date().toISOString(),
        model: 'gpt-4o-mini',
        usage: completion.usage || {},
        mcpData: mcpResponse.data,
        toolsUsed: mcpResponse.tools
      }
    });

  } catch (error) {
    console.error('Chat orchestration error:', error);
    
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    });
  }
}

/**
 * Direct replacement for the existing handler
 */
export default handleChatOrchestration;
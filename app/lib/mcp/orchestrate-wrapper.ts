/**
 * Orchestrate API Wrapper
 * Provides compatibility layer for existing orchestrate.ts to use the new MCP client
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';

// Backend URL from environment variable
const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';

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

    // Forward request to secure backend
    const backendUrl = `${BACKEND_URL}/api/chat/orchestrate-v2`;
    
    const backendResponse = await fetch(backendUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message,
        sessionId: sessionId || `session_${Date.now()}`,
        walletAddress,
        messages,
        requiresBlockchainData: true
      }),
    });

    if (!backendResponse.ok) {
      const errorData = await backendResponse.json().catch(() => ({}));
      throw new Error(errorData.error || `Backend request failed: ${backendResponse.status}`);
    }

    const backendData = await backendResponse.json();
    
    if (!backendData.success) {
      throw new Error(backendData.error || 'Backend processing failed');
    }

    // Return response in the expected format
    res.status(200).json({
      success: true,
      data: {
        response: backendData.data.message,
        sessionId: sessionId || `session_${Date.now()}`,
        timestamp: new Date().toISOString(),
        model: 'gpt-4o-mini',
        usage: {},
        mcpData: backendData.data.metadata || {},
        toolsUsed: backendData.data.actions || []
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
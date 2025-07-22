import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createApiHandler } from '@/app/lib/security/middleware';
import { createClient } from '@supabase/supabase-js';

// Backend URL from environment variable
const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';

// Initialize Supabase for usage logging
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

// Request schema
const chatRequestSchema = z.object({
  messages: z.array(z.object({
    role: z.enum(['user', 'assistant', 'system']),
    content: z.string().max(10000),
  })),
  model: z.enum(['gpt-4', 'gpt-4o', 'gpt-4o-mini', 'gpt-3.5-turbo', 'claude-3-opus', 'claude-3-sonnet', 'claude-3-haiku']).optional(),
  temperature: z.number().min(0).max(2).optional(),
  maxTokens: z.number().min(1).max(4000).optional(),
  stream: z.boolean().optional(),
  walletAddress: z.string().optional(),
  sessionId: z.string().optional(),
  includeMCP: z.boolean().optional().default(true),
});

// Security headers
const securityHeaders = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
};

export const POST = createApiHandler(
  async (req, { session, body }) => {
    try {
      const {
        messages,
        model = 'gpt-4o-mini',
        temperature = 0.7,
        maxTokens = 1000,
        stream = false,
        walletAddress,
        sessionId = `session-${Date.now()}`,
        includeMCP = true,
      } = body!;
      
      // Get the last user message for backend processing
      const lastUserMessage = messages.filter(m => m.role === 'user').pop();
      if (!lastUserMessage) {
        throw new Error('No user message found');
      }
      
      // Log AI usage for billing/monitoring
      await logAIUsage({
        userId: session!.userId,
        model,
        messageCount: messages.length,
        timestamp: new Date().toISOString(),
        sessionId,
        mcpUsed: includeMCP,
      });
      
      // Forward request to secure backend
      const backendUrl = `${BACKEND_URL}/api/chat/orchestrate-v2`;
      
      const backendResponse = await fetch(backendUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Forward any authentication headers if needed
          ...(req.headers.get('authorization') && {
            'authorization': req.headers.get('authorization')!
          }),
        },
        body: JSON.stringify({
          message: lastUserMessage.content,
          sessionId,
          walletAddress: walletAddress || session?.walletAddress,
          messages: messages.map(msg => ({
            role: msg.role,
            content: msg.content,
            timestamp: new Date().toISOString()
          })),
          requiresBlockchainData: includeMCP
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
      
      // Handle different response formats based on requested model
      if (model.startsWith('claude')) {
        // Map model names to Anthropic model IDs
        const anthropicModel = {
          'claude-3-opus': 'claude-3-opus-20240229',
          'claude-3-sonnet': 'claude-3-5-sonnet-20241022',
          'claude-3-haiku': 'claude-3-haiku-20240307'
        }[model] || 'claude-3-5-sonnet-20241022';
        
        // Use backend response data
        const content = backendData.data.message;
        
        // Log assistant response
        await logMessage(session!.userId, sessionId, 'assistant', content, {
          model: anthropicModel,
          backendProcessed: true
        });
        
        if (stream) {
          // Handle streaming response - not supported via backend proxy yet
          return NextResponse.json(
            { error: 'Streaming not supported for Claude models via backend proxy' },
            { status: 501, headers: securityHeaders }
          );
        } else {
          // Non-streaming response
          return NextResponse.json({
            content,
            model: anthropicModel,
            usage: {
              promptTokens: 0,
              completionTokens: 0,
              totalTokens: 0,
            },
            mcpData: backendData.data.metadata || {},
            toolsUsed: backendData.data.actions || [],
          }, { headers: securityHeaders });
        }
      } else {
        // Use OpenAI (processed by backend)
        const openaiModel = model === 'gpt-4o' ? 'gpt-4o' : model;
        
        const content = backendData.data.message;
        
        // Log assistant response
        await logMessage(session!.userId, sessionId, 'assistant', content || '', {
          model: openaiModel,
          backendProcessed: true
        });
        
        if (stream) {
          // Handle streaming response - not supported via backend proxy yet
          return NextResponse.json(
            { error: 'Streaming not supported for OpenAI models via backend proxy' },
            { status: 501, headers: securityHeaders }
          );
        } else {
          // Non-streaming response
          return NextResponse.json({
            content,
            model: openaiModel,
            usage: {
              promptTokens: 0,
              completionTokens: 0,
              totalTokens: 0,
            },
            mcpData: backendData.data.metadata || {},
            toolsUsed: backendData.data.actions || [],
          }, { headers: securityHeaders });
        }
      }
    } catch (error) {
      console.error('AI chat error:', error);
      
      // Don't expose API errors to client
      const message = error instanceof Error && error.message.includes('rate limit')
        ? 'AI service rate limit exceeded. Please try again later.'
        : 'Failed to process AI request';
        
      return NextResponse.json(
        { error: message },
        { status: 500, headers: securityHeaders }
      );
    }
  },
  {
    requireAuth: true,
    rateLimit: 'chat',
    schema: chatRequestSchema,
  }
);

// Helper to log AI usage
async function logAIUsage(usage: {
  userId: string;
  model: string;
  messageCount: number;
  timestamp: string;
  sessionId: string;
  mcpUsed: boolean;
}) {
  try {
    const { error } = await supabase
      .from('ai_usage')
      .insert({
        user_id: usage.userId,
        model: usage.model,
        message_count: usage.messageCount,
        session_id: usage.sessionId,
        mcp_used: usage.mcpUsed,
        created_at: usage.timestamp,
      });
    
    if (error) {
      console.error('Failed to log AI usage:', error);
    }
  } catch (error) {
    console.error('Error logging AI usage:', error);
  }
}

// Helper to log messages
async function logMessage(
  userId: string, 
  sessionId: string, 
  role: 'user' | 'assistant', 
  content: string, 
  metadata?: any
) {
  try {
    const { error } = await supabase
      .from('messages')
      .insert({
        user_id: userId,
        session_id: sessionId,
        role,
        content,
        metadata: metadata || {},
        created_at: new Date().toISOString(),
      });
    
    if (error) {
      console.error('Failed to log message:', error);
    }
  } catch (error) {
    console.error('Error logging message:', error);
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      ...securityHeaders,
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-CSRF-Token',
    },
  });
}
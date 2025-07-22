import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createApiHandler } from '@/app/lib/security/middleware';
import { OpenAI } from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { handleMCPRequests } from '@/app/lib/mcp';
import { createClient } from '@supabase/supabase-js';

// Initialize AI clients (server-side only)
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

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
      
      // Get MCP context if requested
      let mcpContext = null;
      if (includeMCP && messages.length > 0) {
        const lastUserMessage = messages.filter(m => m.role === 'user').pop();
        if (lastUserMessage) {
          mcpContext = await handleMCPRequests({
            message: lastUserMessage.content,
            walletAddress: walletAddress || session?.walletAddress,
            sessionId
          });
        }
      }
      
      // Enhance system message with MCP context
      let enhancedMessages = [...messages];
      if (mcpContext?.context) {
        const systemMessageIndex = enhancedMessages.findIndex(m => m.role === 'system');
        if (systemMessageIndex >= 0) {
          enhancedMessages[systemMessageIndex] = {
            ...enhancedMessages[systemMessageIndex],
            content: `${enhancedMessages[systemMessageIndex].content}\n\nAdditional context: ${mcpContext.context}`
          };
        } else {
          enhancedMessages.unshift({
            role: 'system',
            content: `You are Seiron, a powerful dragon AI assistant. Current context: ${mcpContext.context}`
          });
        }
      }
      
      // Log AI usage for billing/monitoring
      await logAIUsage({
        userId: session!.userId,
        model,
        messageCount: messages.length,
        timestamp: new Date().toISOString(),
        sessionId,
        mcpUsed: !!mcpContext,
      });
      
      // Route to appropriate AI provider
      if (model.startsWith('claude')) {
        // Map model names to Anthropic model IDs
        const anthropicModel = {
          'claude-3-opus': 'claude-3-opus-20240229',
          'claude-3-sonnet': 'claude-3-5-sonnet-20241022',
          'claude-3-haiku': 'claude-3-haiku-20240307'
        }[model] || 'claude-3-5-sonnet-20241022';
        
        // Extract system message for Claude
        const systemMessage = enhancedMessages.find(m => m.role === 'system');
        const conversationMessages = enhancedMessages.filter(m => m.role !== 'system');
        
        const response = await anthropic.messages.create({
          model: anthropicModel,
          messages: conversationMessages.map(msg => ({
            role: msg.role === 'user' ? 'user' : 'assistant',
            content: msg.content,
          })),
          system: systemMessage?.content,
          max_tokens: maxTokens,
          temperature,
          stream,
        });
        
        if (stream) {
          // Handle streaming response
          const encoder = new TextEncoder();
          const readableStream = new ReadableStream({
            async start(controller) {
              try {
                let fullContent = '';
                for await (const chunk of response) {
                  if (chunk.type === 'content_block_delta') {
                    const text = chunk.delta.text || '';
                    fullContent += text;
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
                      text,
                      type: 'content'
                    })}\n\n`));
                  }
                }
                
                // Send completion with metadata
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
                  type: 'done',
                  model: anthropicModel,
                  usage: response.usage,
                  mcpData: mcpContext?.data,
                  toolsUsed: mcpContext?.tools
                })}\n\n`));
                controller.enqueue(encoder.encode('data: [DONE]\n\n'));
                
                // Log completion
                await logMessage(session!.userId, sessionId, 'assistant', fullContent, {
                  model: anthropicModel,
                  usage: response.usage
                });
                
                controller.close();
              } catch (error) {
                console.error('Streaming error:', error);
                controller.error(error);
              }
            },
          });
          
          return new NextResponse(readableStream, {
            headers: {
              ...securityHeaders,
              'Content-Type': 'text/event-stream',
              'Cache-Control': 'no-cache',
              'Connection': 'keep-alive',
            },
          });
        } else {
          // Non-streaming response
          const content = response.content[0].text;
          
          // Log assistant response
          await logMessage(session!.userId, sessionId, 'assistant', content, {
            model: anthropicModel,
            usage: response.usage
          });
          
          return NextResponse.json({
            content,
            model: anthropicModel,
            usage: {
              promptTokens: response.usage?.input_tokens,
              completionTokens: response.usage?.output_tokens,
              totalTokens: (response.usage?.input_tokens || 0) + (response.usage?.output_tokens || 0),
            },
            mcpData: mcpContext?.data,
            toolsUsed: mcpContext?.tools,
          }, { headers: securityHeaders });
        }
      } else {
        // Use OpenAI
        const openaiModel = model === 'gpt-4o' ? 'gpt-4o' : model;
        
        const response = await openai.chat.completions.create({
          model: openaiModel,
          messages: enhancedMessages,
          temperature,
          max_tokens: maxTokens,
          stream,
        });
        
        if (stream) {
          // Handle streaming response
          const encoder = new TextEncoder();
          const readableStream = new ReadableStream({
            async start(controller) {
              try {
                let fullContent = '';
                for await (const chunk of response) {
                  const text = chunk.choices[0]?.delta?.content || '';
                  if (text) {
                    fullContent += text;
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
                      text,
                      type: 'content'
                    })}\n\n`));
                  }
                }
                
                // Send completion with metadata
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
                  type: 'done',
                  model: openaiModel,
                  mcpData: mcpContext?.data,
                  toolsUsed: mcpContext?.tools
                })}\n\n`));
                controller.enqueue(encoder.encode('data: [DONE]\n\n'));
                
                // Log completion
                await logMessage(session!.userId, sessionId, 'assistant', fullContent, {
                  model: openaiModel
                });
                
                controller.close();
              } catch (error) {
                console.error('Streaming error:', error);
                controller.error(error);
              }
            },
          });
          
          return new NextResponse(readableStream, {
            headers: {
              ...securityHeaders,
              'Content-Type': 'text/event-stream',
              'Cache-Control': 'no-cache',
              'Connection': 'keep-alive',
            },
          });
        } else {
          // Non-streaming response
          const content = response.choices[0].message.content;
          
          // Log assistant response
          await logMessage(session!.userId, sessionId, 'assistant', content || '', {
            model: openaiModel,
            usage: response.usage
          });
          
          return NextResponse.json({
            content,
            model: openaiModel,
            usage: {
              promptTokens: response.usage?.prompt_tokens,
              completionTokens: response.usage?.completion_tokens,
              totalTokens: response.usage?.total_tokens,
            },
            mcpData: mcpContext?.data,
            toolsUsed: mcpContext?.tools,
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
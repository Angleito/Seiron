import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { OpenAI } from 'openai';
import { handleMCPRequests } from '@/app/lib/mcp';
import { createPublicApiHandler } from '@/app/lib/security/middleware';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

// Request validation schema
const chatRequestSchema = z.object({
  message: z.string().min(1).max(4000),
  sessionId: z.string().optional(),
  walletAddress: z.string().optional(),
  messages: z.array(z.object({
    role: z.enum(['user', 'assistant', 'system']),
    content: z.string()
  })).optional(),
  stream: z.boolean().optional().default(false),
  temperature: z.number().min(0).max(2).optional().default(0.7),
  maxTokens: z.number().min(1).max(4000).optional().default(500),
});

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// Security headers
const securityHeaders = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
};

export const POST = createPublicApiHandler(
  async (req, { body }) => {
    try {
      const {
        message,
        sessionId = `session_${Date.now()}`,
        walletAddress,
        messages = [],
        stream,
        temperature,
        maxTokens,
      } = body!;

      // Use MCP client to gather context
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

      if (stream) {
        // Handle streaming response
        const encoder = new TextEncoder();
        const streamResponse = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: conversationMessages,
          temperature,
          max_tokens: maxTokens,
          stream: true,
        });

        const readableStream = new ReadableStream({
          async start(controller) {
            try {
              for await (const chunk of streamResponse) {
                const content = chunk.choices[0]?.delta?.content || '';
                if (content) {
                  const data = JSON.stringify({ 
                    content,
                    type: 'content'
                  });
                  controller.enqueue(encoder.encode(`data: ${data}\n\n`));
                }
              }
              
              // Send completion event
              const completionData = JSON.stringify({
                type: 'done',
                sessionId,
                timestamp: new Date().toISOString(),
                mcpData: mcpResponse.data,
                toolsUsed: mcpResponse.tools
              });
              controller.enqueue(encoder.encode(`data: ${completionData}\n\n`));
              controller.enqueue(encoder.encode('data: [DONE]\n\n'));
              controller.close();
            } catch (error) {
              console.error('Streaming error:', error);
              controller.error(error);
            }
          },
        });

        return new NextResponse(readableStream, {
          headers: {
            ...corsHeaders,
            ...securityHeaders,
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache, no-transform',
            'Connection': 'keep-alive',
          },
        });
      } else {
        // Non-streaming response
        const completion = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: conversationMessages,
          temperature,
          max_tokens: maxTokens,
        });

        const response = completion.choices[0]?.message?.content || 'I apologize, but I could not generate a response.';

        return NextResponse.json(
          { 
            message: response,
            timestamp: new Date().toISOString(),
            model: 'gpt-4o-mini',
            tokens: completion.usage?.total_tokens,
            sessionId,
            mcpData: mcpResponse.data,
            toolsUsed: mcpResponse.tools
          },
          { 
            headers: {
              ...corsHeaders,
              ...securityHeaders,
            }
          }
        );
      }
    } catch (error) {
      console.error('Chat API error:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Internal server error';
      const statusCode = error instanceof Error && error.message.includes('rate limit') ? 429 : 500;
      
      return NextResponse.json(
        {
          success: false,
          error: errorMessage,
          message: 'The dragon encountered mystical interference. Please try again.'
        },
        { 
          status: statusCode,
          headers: {
            ...corsHeaders,
            ...securityHeaders,
          }
        }
      );
    }
  },
  {
    requireAuth: false,
    rateLimit: 'api',
    validateCSRF: false,
    schema: chatRequestSchema,
  }
);

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      ...corsHeaders,
      ...securityHeaders,
    },
  });
}
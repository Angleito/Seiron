import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createApiHandler } from '@/app/lib/security/middleware';
import { OpenAI } from 'openai';
import Anthropic from '@anthropic-ai/sdk';

// Initialize AI clients (server-side only)
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

// Request schema
const chatRequestSchema = z.object({
  messages: z.array(z.object({
    role: z.enum(['user', 'assistant', 'system']),
    content: z.string().max(10000),
  })),
  model: z.enum(['gpt-4', 'gpt-3.5-turbo', 'claude-3-opus', 'claude-3-sonnet']).optional(),
  temperature: z.number().min(0).max(2).optional(),
  maxTokens: z.number().min(1).max(4000).optional(),
  stream: z.boolean().optional(),
});

export const POST = createApiHandler(
  async (req, { session, body }) => {
    try {
      const {
        messages,
        model = 'gpt-3.5-turbo',
        temperature = 0.7,
        maxTokens = 1000,
        stream = false,
      } = body!;
      
      // Log AI usage for billing/monitoring
      await logAIUsage({
        userId: session!.userId,
        model,
        messageCount: messages.length,
        timestamp: new Date().toISOString(),
      });
      
      // Route to appropriate AI provider
      if (model.startsWith('claude')) {
        // Use Anthropic
        const response = await anthropic.messages.create({
          model: model === 'claude-3-opus' ? 'claude-3-opus-20240229' : 'claude-3-sonnet-20240229',
          messages: messages.map(msg => ({
            role: msg.role === 'user' ? 'user' : 'assistant',
            content: msg.content,
          })),
          max_tokens: maxTokens,
          temperature,
          stream,
        });
        
        if (stream) {
          // Handle streaming response
          const encoder = new TextEncoder();
          const readableStream = new ReadableStream({
            async start(controller) {
              for await (const chunk of response) {
                const text = chunk.type === 'content_block_delta' 
                  ? chunk.delta.text 
                  : '';
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text })}\n\n`));
              }
              controller.enqueue(encoder.encode('data: [DONE]\n\n'));
              controller.close();
            },
          });
          
          return new NextResponse(readableStream, {
            headers: {
              'Content-Type': 'text/event-stream',
              'Cache-Control': 'no-cache',
              'Connection': 'keep-alive',
            },
          });
        } else {
          // Non-streaming response
          return NextResponse.json({
            content: response.content[0].text,
            model,
            usage: {
              promptTokens: response.usage?.input_tokens,
              completionTokens: response.usage?.output_tokens,
              totalTokens: (response.usage?.input_tokens || 0) + (response.usage?.output_tokens || 0),
            },
          });
        }
      } else {
        // Use OpenAI
        const response = await openai.chat.completions.create({
          model,
          messages,
          temperature,
          max_tokens: maxTokens,
          stream,
        });
        
        if (stream) {
          // Handle streaming response
          const encoder = new TextEncoder();
          const readableStream = new ReadableStream({
            async start(controller) {
              for await (const chunk of response) {
                const text = chunk.choices[0]?.delta?.content || '';
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text })}\n\n`));
              }
              controller.enqueue(encoder.encode('data: [DONE]\n\n'));
              controller.close();
            },
          });
          
          return new NextResponse(readableStream, {
            headers: {
              'Content-Type': 'text/event-stream',
              'Cache-Control': 'no-cache',
              'Connection': 'keep-alive',
            },
          });
        } else {
          // Non-streaming response
          return NextResponse.json({
            content: response.choices[0].message.content,
            model,
            usage: {
              promptTokens: response.usage?.prompt_tokens,
              completionTokens: response.usage?.completion_tokens,
              totalTokens: response.usage?.total_tokens,
            },
          });
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
        { status: 500 }
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
}) {
  // TODO: Implement actual logging to database or analytics service
  console.log('AI usage:', usage);
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-CSRF-Token',
    },
  });
}
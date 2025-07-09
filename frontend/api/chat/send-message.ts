import { NextRequest, NextResponse } from 'next/server'
import { OpenAI } from 'openai'
import { Anthropic } from '@anthropic-ai/sdk'
import { getToken } from 'next-auth/jwt'
import { Redis } from '@upstash/redis'
import { Ratelimit } from '@upstash/ratelimit'
import { createClient } from '@supabase/supabase-js'
import { z } from 'zod'

// Initialize services
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
})

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
})

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

// Rate limiting configuration
const ratelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, '1 m'), // 10 requests per minute
  analytics: true,
})

// Request validation schema
const sendMessageSchema = z.object({
  message: z.string().min(1).max(4000),
  model: z.enum(['gpt-4-turbo-preview', 'gpt-3.5-turbo', 'claude-3-opus-20240229', 'claude-3-sonnet-20240229']).optional().default('gpt-4-turbo-preview'),
  sessionId: z.string().optional(),
  stream: z.boolean().optional().default(true),
  temperature: z.number().min(0).max(2).optional().default(0.7),
  maxTokens: z.number().min(1).max(4000).optional().default(1000),
  systemPrompt: z.string().optional(),
  previousMessages: z.array(z.object({
    role: z.enum(['user', 'assistant', 'system']),
    content: z.string()
  })).optional(),
})

// Security headers
const securityHeaders = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline';",
}

// Helper to create SSE response
function createSSEResponse(stream: ReadableStream) {
  return new NextResponse(stream, {
    headers: {
      ...securityHeaders,
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
    },
  })
}

// Helper to save message to Supabase
async function saveMessage(userId: string, sessionId: string, role: 'user' | 'assistant', content: string, metadata?: any) {
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
      })
    
    if (error) {
      console.error('Failed to save message:', error)
    }
  } catch (error) {
    console.error('Error saving message:', error)
  }
}

// Helper to get AI response
async function getAIResponse(
  model: string,
  messages: Array<{ role: string; content: string }>,
  temperature: number,
  maxTokens: number,
  stream: boolean
) {
  if (model.startsWith('gpt')) {
    const completion = await openai.chat.completions.create({
      model,
      messages: messages as any,
      temperature,
      max_tokens: maxTokens,
      stream,
    })
    
    return completion
  } else if (model.startsWith('claude')) {
    // Convert messages format for Claude
    const systemMessage = messages.find(m => m.role === 'system')
    const userMessages = messages.filter(m => m.role !== 'system')
    
    const completion = await anthropic.messages.create({
      model,
      messages: userMessages.map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
      system: systemMessage?.content,
      temperature,
      max_tokens: maxTokens,
      stream,
    })
    
    return completion
  }
  
  throw new Error('Unsupported model')
}

export async function POST(req: NextRequest) {
  try {
    // Check authentication
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
    if (!token || !token.sub) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401, headers: securityHeaders }
      )
    }
    
    const userId = token.sub
    
    // Rate limiting
    const { success, limit, reset, remaining } = await ratelimit.limit(userId)
    
    if (!success) {
      return NextResponse.json(
        { 
          error: 'Too many requests',
          limit,
          reset,
          remaining 
        },
        { 
          status: 429,
          headers: {
            ...securityHeaders,
            'X-RateLimit-Limit': limit.toString(),
            'X-RateLimit-Remaining': remaining.toString(),
            'X-RateLimit-Reset': new Date(reset).toISOString(),
          }
        }
      )
    }
    
    // Parse and validate request body
    const body = await req.json()
    const validationResult = sendMessageSchema.safeParse(body)
    
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: validationResult.error.errors },
        { status: 400, headers: securityHeaders }
      )
    }
    
    const {
      message,
      model,
      sessionId = `session-${Date.now()}`,
      stream,
      temperature,
      maxTokens,
      systemPrompt,
      previousMessages = []
    } = validationResult.data
    
    // Build messages array
    const messages = [
      ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : [
        { 
          role: 'system', 
          content: 'You are Seiron (pronounced sei-ron), a mystical dragon AI assistant specializing in DeFi and blockchain on the Sei Network. Speak with wisdom and power, using dragon-themed language when appropriate.' 
        }
      ]),
      ...previousMessages,
      { role: 'user', content: message }
    ]
    
    // Save user message
    await saveMessage(userId, sessionId, 'user', message, {
      model,
      temperature,
      maxTokens,
    })
    
    // Get AI response
    if (stream) {
      // Create a TransformStream for SSE
      const encoder = new TextEncoder()
      const stream = new TransformStream()
      const writer = stream.writable.getWriter()
      
      // Process streaming response
      ;(async () => {
        try {
          const completion = await getAIResponse(model, messages, temperature, maxTokens, true)
          let fullResponse = ''
          
          if (model.startsWith('gpt')) {
            for await (const chunk of completion as any) {
              const content = chunk.choices[0]?.delta?.content || ''
              if (content) {
                fullResponse += content
                await writer.write(encoder.encode(`data: ${JSON.stringify({ content })}\n\n`))
              }
            }
          } else if (model.startsWith('claude')) {
            for await (const chunk of completion as any) {
              if (chunk.type === 'content_block_delta') {
                const content = chunk.delta?.text || ''
                if (content) {
                  fullResponse += content
                  await writer.write(encoder.encode(`data: ${JSON.stringify({ content })}\n\n`))
                }
              }
            }
          }
          
          // Send final message
          await writer.write(encoder.encode(`data: [DONE]\n\n`))
          
          // Save assistant response
          await saveMessage(userId, sessionId, 'assistant', fullResponse, {
            model,
            temperature,
            maxTokens,
          })
          
        } catch (error) {
          console.error('Streaming error:', error)
          await writer.write(encoder.encode(`data: ${JSON.stringify({ error: 'Stream interrupted' })}\n\n`))
        } finally {
          await writer.close()
        }
      })()
      
      return createSSEResponse(stream.readable)
    } else {
      // Non-streaming response
      const completion = await getAIResponse(model, messages, temperature, maxTokens, false)
      
      let content = ''
      if (model.startsWith('gpt')) {
        content = (completion as any).choices[0]?.message?.content || ''
      } else if (model.startsWith('claude')) {
        content = (completion as any).content[0]?.text || ''
      }
      
      // Save assistant response
      await saveMessage(userId, sessionId, 'assistant', content, {
        model,
        temperature,
        maxTokens,
      })
      
      return NextResponse.json(
        {
          success: true,
          data: {
            content,
            sessionId,
            model,
            timestamp: new Date().toISOString(),
          }
        },
        { headers: securityHeaders }
      )
    }
    
  } catch (error) {
    console.error('Chat API error:', error)
    
    // Don't expose internal errors
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: 'The dragon encountered mystical interference. Please try again.'
      },
      { status: 500, headers: securityHeaders }
    )
  }
}

// OPTIONS handler for CORS
export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      ...securityHeaders,
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  })
}
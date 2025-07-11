import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { createClient } from '@supabase/supabase-js'
import { z } from 'zod'
import * as E from 'fp-ts/Either'
import { Redis } from '@upstash/redis'
import { Ratelimit } from '@upstash/ratelimit'

// Initialize services
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})

// Rate limiting configuration
const ratelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(20, '1 m'), // 20 requests per minute for preferences
  analytics: true,
})

// Preferences schema
const preferencesSchema = z.object({
  // AI Interaction preferences
  aiInteraction: z.object({
    personalityStyle: z.enum(['professional', 'friendly', 'mystical', 'concise', 'detailed']).optional(),
    responseLength: z.enum(['brief', 'moderate', 'detailed']).optional(),
    useEmojis: z.boolean().optional(),
    dragonPersona: z.boolean().optional().default(true),
    technicalLevel: z.enum(['beginner', 'intermediate', 'expert']).optional(),
  }).optional(),
  
  // Voice preferences
  voice: z.object({
    enabled: z.boolean().optional(),
    autoPlayResponses: z.boolean().optional(),
    voiceId: z.string().optional(),
    speed: z.number().min(0.5).max(2.0).optional(),
    pitch: z.number().min(0.5).max(2.0).optional(),
    language: z.string().optional().default('en-US'),
  }).optional(),
  
  // DeFi preferences
  defi: z.object({
    riskTolerance: z.enum(['conservative', 'moderate', 'aggressive']).optional(),
    preferredProtocols: z.array(z.string()).optional(),
    autoCompound: z.boolean().optional(),
    minYield: z.number().min(0).max(100).optional(),
    maxSlippage: z.number().min(0).max(5).optional(),
    gasPreference: z.enum(['slow', 'standard', 'fast']).optional(),
  }).optional(),
  
  // Portfolio preferences
  portfolio: z.object({
    displayCurrency: z.string().optional().default('USD'),
    hideSmallBalances: z.boolean().optional(),
    smallBalanceThreshold: z.number().min(0).optional(),
    showTestnetAssets: z.boolean().optional(),
    groupByProtocol: z.boolean().optional(),
  }).optional(),
  
  // Notification preferences
  notifications: z.object({
    priceAlerts: z.boolean().optional(),
    transactionUpdates: z.boolean().optional(),
    portfolioChanges: z.boolean().optional(),
    securityAlerts: z.boolean().optional(),
    marketInsights: z.boolean().optional(),
    alertThresholds: z.object({
      priceChangePercent: z.number().min(0).max(100).optional(),
      portfolioChangePercent: z.number().min(0).max(100).optional(),
    }).optional(),
  }).optional(),
  
  // Privacy preferences
  privacy: z.object({
    shareAnalytics: z.boolean().optional(),
    saveConversationHistory: z.boolean().optional(),
    allowPersonalization: z.boolean().optional(),
    dataRetentionDays: z.number().min(1).max(365).optional(),
  }).optional(),
  
  // UI preferences
  ui: z.object({
    theme: z.enum(['light', 'dark', 'system']).optional(),
    compactMode: z.boolean().optional(),
    animations: z.boolean().optional(),
    dragonAnimations: z.enum(['full', 'reduced', 'disabled']).optional(),
    colorScheme: z.enum(['default', 'high-contrast', 'colorblind']).optional(),
  }).optional(),
})

// Security headers
const securityHeaders = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Content-Security-Policy': "default-src 'self';",
}

// Default preferences
const defaultPreferences = {
  aiInteraction: {
    personalityStyle: 'mystical',
    responseLength: 'moderate',
    useEmojis: true,
    dragonPersona: true,
    technicalLevel: 'intermediate',
  },
  voice: {
    enabled: true,
    autoPlayResponses: true,
    speed: 1.0,
    pitch: 1.0,
    language: 'en-US',
  },
  defi: {
    riskTolerance: 'moderate',
    preferredProtocols: [],
    autoCompound: false,
    minYield: 5,
    maxSlippage: 0.5,
    gasPreference: 'standard',
  },
  portfolio: {
    displayCurrency: 'USD',
    hideSmallBalances: false,
    smallBalanceThreshold: 1,
    showTestnetAssets: false,
    groupByProtocol: true,
  },
  notifications: {
    priceAlerts: true,
    transactionUpdates: true,
    portfolioChanges: true,
    securityAlerts: true,
    marketInsights: false,
    alertThresholds: {
      priceChangePercent: 10,
      portfolioChangePercent: 5,
    },
  },
  privacy: {
    shareAnalytics: false,
    saveConversationHistory: true,
    allowPersonalization: true,
    dataRetentionDays: 30,
  },
  ui: {
    theme: 'dark',
    compactMode: false,
    animations: true,
    dragonAnimations: 'full',
    colorScheme: 'default',
  },
}

// Helper to get user preferences
async function getUserPreferences(userId: string): Promise<E.Either<Error, any>> {
  try {
    // Try to get from cache first
    const cached = await redis.get(`preferences:${userId}`)
    if (cached) {
      return E.right(cached)
    }
    
    // Get from database
    const { data, error } = await supabase
      .from('user_preferences')
      .select('*')
      .eq('user_id', userId)
      .single()
    
    if (error && error.code !== 'PGRST116') { // Not found error
      return E.left(new Error(`Failed to fetch preferences: ${error.message}`))
    }
    
    const preferences = data?.preferences || defaultPreferences
    
    // Cache for 5 minutes
    await redis.set(`preferences:${userId}`, preferences, { ex: 300 })
    
    return E.right(preferences)
  } catch (error) {
    return E.left(error instanceof Error ? error : new Error('Unknown error'))
  }
}

// Helper to update user preferences
async function updateUserPreferences(userId: string, updates: any): Promise<E.Either<Error, any>> {
  try {
    // Get current preferences
    const currentResult = await getUserPreferences(userId)
    if (E.isLeft(currentResult)) {
      // If no preferences exist, start with defaults
      // const current = defaultPreferences
    }
    
    const current = E.isRight(currentResult) ? currentResult.right : defaultPreferences
    
    // Deep merge preferences
    const merged = deepMerge(current, updates)
    
    // Upsert to database
    const { error } = await supabase
      .from('user_preferences')
      .upsert({
        user_id: userId,
        preferences: merged,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id',
      })
      .select()
      .single()
    
    if (error) {
      return E.left(new Error(`Failed to update preferences: ${error.message}`))
    }
    
    // Update cache
    await redis.set(`preferences:${userId}`, merged, { ex: 300 })
    
    return E.right(merged)
  } catch (error) {
    return E.left(error instanceof Error ? error : new Error('Unknown error'))
  }
}

// Helper for deep merge
function deepMerge(target: any, source: any): any {
  const output = { ...target }
  
  for (const key in source) {
    if (source.hasOwnProperty(key)) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        output[key] = deepMerge(target[key] || {}, source[key])
      } else {
        output[key] = source[key]
      }
    }
  }
  
  return output
}

// GET handler - retrieve user preferences
export async function GET(req: NextRequest) {
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
    
    // Get preferences
    const result = await getUserPreferences(userId)
    
    if (E.isLeft(result)) {
      // If error is not found, return defaults
      if (result.left.message.includes('not found')) {
        return NextResponse.json(
          { success: true, data: defaultPreferences },
          { headers: securityHeaders }
        )
      }
      
      return NextResponse.json(
        { error: 'Failed to retrieve preferences', details: result.left.message },
        { status: 500, headers: securityHeaders }
      )
    }
    
    return NextResponse.json(
      { success: true, data: result.right },
      { headers: securityHeaders }
    )
    
  } catch (error) {
    console.error('Preferences GET error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: securityHeaders }
    )
  }
}

// PUT handler - update user preferences
export async function PUT(req: NextRequest) {
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
    const validationResult = preferencesSchema.safeParse(body)
    
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid preferences', details: validationResult.error.errors },
        { status: 400, headers: securityHeaders }
      )
    }
    
    // Update preferences
    const result = await updateUserPreferences(userId, validationResult.data)
    
    if (E.isLeft(result)) {
      return NextResponse.json(
        { error: 'Failed to update preferences', details: result.left.message },
        { status: 500, headers: securityHeaders }
      )
    }
    
    // Log preference update for analytics
    console.log('User preferences updated', {
      userId,
      updatedFields: Object.keys(validationResult.data),
      timestamp: new Date().toISOString(),
    })
    
    return NextResponse.json(
      {
        success: true,
        data: result.right,
        message: 'Preferences updated successfully',
      },
      { headers: securityHeaders }
    )
    
  } catch (error) {
    console.error('Preferences PUT error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: securityHeaders }
    )
  }
}

// DELETE handler - reset preferences to defaults
export async function DELETE(req: NextRequest) {
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
    
    // Reset to default preferences
    const result = await updateUserPreferences(userId, defaultPreferences)
    
    if (E.isLeft(result)) {
      return NextResponse.json(
        { error: 'Failed to reset preferences', details: result.left.message },
        { status: 500, headers: securityHeaders }
      )
    }
    
    // Clear cache
    await redis.del(`preferences:${userId}`)
    
    return NextResponse.json(
      {
        success: true,
        data: defaultPreferences,
        message: 'Preferences reset to defaults',
      },
      { headers: securityHeaders }
    )
    
  } catch (error) {
    console.error('Preferences DELETE error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: securityHeaders }
    )
  }
}

// OPTIONS handler for CORS
export async function OPTIONS(_req: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      ...securityHeaders,
      'Access-Control-Allow-Methods': 'GET, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  })
}
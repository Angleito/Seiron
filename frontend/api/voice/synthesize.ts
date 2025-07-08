import type { VercelRequest, VercelResponse } from '@vercel/node'
import { z } from 'zod'

// Rate limiting using in-memory store (for simple implementation)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>()

// Rate limiting configuration
const RATE_LIMIT_WINDOW = 15 * 60 * 1000 // 15 minutes
const RATE_LIMIT_MAX = 100 // 100 requests per window

// Validation schema
const synthesizeTextSchema = z.object({
  text: z.string().min(1).max(5000),
  modelId: z.string().optional(),
  voiceSettings: z.object({
    stability: z.number().min(0).max(1).optional(),
    similarityBoost: z.number().min(0).max(1).optional(),
    style: z.number().min(0).max(1).optional(),
    useSpeakerBoost: z.boolean().optional()
  }).optional()
})

// Helper function to get client IP
function getClientIp(req: VercelRequest): string {
  return (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || 
         req.headers['x-real-ip'] as string || 
         'unknown'
}

// Simple in-memory rate limiting
function checkRateLimit(ip: string): { allowed: boolean; remaining: number } {
  const now = Date.now()
  const record = rateLimitStore.get(ip)

  // Clean up old entries
  if (record && now > record.resetTime) {
    rateLimitStore.delete(ip)
  }

  // Check current rate limit
  const current = rateLimitStore.get(ip) || { count: 0, resetTime: now + RATE_LIMIT_WINDOW }
  
  if (current.count >= RATE_LIMIT_MAX) {
    return { allowed: false, remaining: 0 }
  }

  // Update count
  current.count++
  rateLimitStore.set(ip, current)

  return { allowed: true, remaining: RATE_LIMIT_MAX - current.count }
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  // Handle OPTIONS request
  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // Check rate limit
  const clientIp = getClientIp(req)
  const { allowed, remaining } = checkRateLimit(clientIp)
  
  res.setHeader('X-RateLimit-Limit', RATE_LIMIT_MAX.toString())
  res.setHeader('X-RateLimit-Remaining', remaining.toString())

  if (!allowed) {
    return res.status(429).json({
      success: false,
      error: 'Too many voice synthesis requests from this IP, please try again later.',
      code: 'RATE_LIMIT_EXCEEDED'
    })
  }

  // Validate request body
  const validation = synthesizeTextSchema.safeParse(req.body)
  if (!validation.success) {
    return res.status(400).json({
      success: false,
      error: 'Validation error',
      code: 'VALIDATION_ERROR'
    })
  }

  const { text, modelId, voiceSettings } = validation.data

  // Get configuration from environment variables
  const elevenLabsApiKey = process.env.ELEVENLABS_API_KEY
  const elevenLabsVoiceId = process.env.ELEVENLABS_VOICE_ID || process.env.VITE_ELEVENLABS_VOICE_ID

  if (!elevenLabsApiKey || !elevenLabsVoiceId) {
    console.error('ElevenLabs configuration missing')
    return res.status(500).json({
      success: false,
      error: 'Voice synthesis service is not properly configured',
      code: 'CONFIG_ERROR'
    })
  }

  try {
    // Convert camelCase to snake_case for ElevenLabs API
    const apiVoiceSettings = voiceSettings ? {
      stability: voiceSettings.stability ?? 0.5,
      similarity_boost: voiceSettings.similarityBoost ?? 0.75,
      style: voiceSettings.style ?? 0.5,
      use_speaker_boost: voiceSettings.useSpeakerBoost ?? true
    } : {
      stability: 0.5,
      similarity_boost: 0.75,
      style: 0.5,
      use_speaker_boost: true
    }

    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${elevenLabsVoiceId}`,
      {
        method: 'POST',
        headers: {
          'xi-api-key': elevenLabsApiKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          text,
          model_id: modelId || 'eleven_monolingual_v1',
          voice_settings: apiVoiceSettings
        })
      }
    )

    if (!response.ok) {
      if (response.status === 429) {
        console.warn('ElevenLabs API quota exceeded')
        return res.status(429).json({
          success: false,
          error: 'Voice synthesis quota exceeded. Please try again later.',
          code: 'QUOTA_EXCEEDED'
        })
      }

      const errorText = await response.text()
      console.error('ElevenLabs API error:', {
        status: response.status,
        statusText: response.statusText,
        body: errorText
      })

      return res.status(response.status).json({
        success: false,
        error: 'Failed to synthesize speech',
        code: 'API_ERROR'
      })
    }

    const audioBuffer = await response.arrayBuffer()
    const base64Audio = Buffer.from(audioBuffer).toString('base64')

    // Return base64 encoded audio for consistency with the frontend client
    res.status(200).json({
      success: true,
      data: {
        audioBuffer: base64Audio,
        contentType: 'audio/mpeg',
        characterCount: text.length
      }
    })

  } catch (error) {
    console.error('Voice synthesis error:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to process voice synthesis request',
      code: 'INTERNAL_ERROR'
    })
  }
}
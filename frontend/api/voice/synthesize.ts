import type { VercelRequest, VercelResponse } from '@vercel/node'
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

// Type definitions
interface RequestBody {
  text: string
  voiceId: string
  modelId?: string
  voiceSettings?: VoiceSettings
  outputFormat?: string
}

interface VoiceSettings {
  stability?: number
  similarity_boost?: number
  style?: number
  use_speaker_boost?: boolean
}

// Error response types
interface ErrorResponse {
  success: false
  error: string
  code?: string
}

interface SuccessResponse {
  success: true
  data: {
    audioBuffer: string // base64 encoded audio
    contentType: string
    duration?: number
    characterCount: number
  }
}

// Input validation constants
const MAX_TEXT_LENGTH = 5000 // Increased from 1000 to support longer content
const MIN_TEXT_LENGTH = 1

// ElevenLabs API constants
const ELEVENLABS_API_URL = 'https://api.elevenlabs.io/v1/text-to-speech'
const DEFAULT_MODEL_ID = 'eleven_multilingual_v2' // Updated to v2 for better language support
const DEFAULT_OUTPUT_FORMAT = 'mp3_44100_128'
const FETCH_TIMEOUT = 30000 // 30 seconds

// CORS configuration
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS?.split(',') || [
  process.env.FRONTEND_URL || 'http://localhost:3000',
  'https://seiron.vercel.app', // Add your production domain
]

// Initialize rate limiter
const redis = process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
  ? new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    })
  : null

const ratelimit = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(10, '1 m'), // 10 requests per minute
      analytics: true,
    })
  : null

// Helper function to set CORS headers
function setCorsHeaders(res: VercelResponse, origin: string | undefined) {
  const allowedOrigin = origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0]
  
  res.setHeader('Access-Control-Allow-Origin', allowedOrigin)
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  res.setHeader('Access-Control-Allow-Credentials', 'true')
}

// Parse client IP from headers
function getClientIp(req: VercelRequest): string {
  const forwardedFor = req.headers['x-forwarded-for']
  
  if (typeof forwardedFor === 'string') {
    // Parse first IP from comma-separated list
    return forwardedFor.split(',')[0].trim()
  }
  
  return (req.headers['x-real-ip'] as string) || 
         'unknown'
}

// Verify authentication
function verifyAuth(req: VercelRequest): boolean {
  const authHeader = req.headers.authorization
  const apiKey = process.env.API_SECRET_KEY
  
  if (!apiKey) {
    // If no API key is configured, allow all requests (for development)
    return true
  }
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return false
  }
  
  const token = authHeader.substring(7)
  return token === apiKey
}

// Input validation
function validateTextInput(text: unknown): string | null {
  if (typeof text !== 'string') {
    return 'Text must be a string'
  }
  
  if (text.length < MIN_TEXT_LENGTH) {
    return 'Text is too short'
  }
  
  if (text.length > MAX_TEXT_LENGTH) {
    return `Text is too long (max ${MAX_TEXT_LENGTH} characters)`
  }
  
  // Basic content filtering - prevent potentially harmful content
  const suspiciousPatterns = [
    /<script/i,
    /javascript:/i,
    /vbscript:/i,
    /on\w+\s*=/i,
    /data:text\/html/i
  ]
  
  for (const pattern of suspiciousPatterns) {
    if (pattern.test(text)) {
      return 'Text contains potentially harmful content'
    }
  }
  
  return null
}

// Voice settings validation
function validateVoiceSettings(settings: unknown): VoiceSettings {
  if (!settings || typeof settings !== 'object' || settings === null) {
    return {
      stability: 0.5,
      similarity_boost: 0.5,
      style: 0.0,
      use_speaker_boost: false
    }
  }
  
  const s = settings as Record<string, unknown>
  
  return {
    stability: typeof s.stability === 'number' && s.stability >= 0 && s.stability <= 1 
      ? s.stability : 0.5,
    similarity_boost: typeof s.similarity_boost === 'number' && s.similarity_boost >= 0 && s.similarity_boost <= 1 
      ? s.similarity_boost : 0.5,
    style: typeof s.style === 'number' && s.style >= 0 && s.style <= 1 
      ? s.style : 0.0,
    use_speaker_boost: typeof s.use_speaker_boost === 'boolean' 
      ? s.use_speaker_boost : false
  }
}

// Cache key generator
function getCacheKey(text: string, voiceId: string, modelId: string, outputFormat: string): string {
  return `voice:${voiceId}:${modelId}:${outputFormat}:${Buffer.from(text).toString('base64').substring(0, 50)}`
}

// ElevenLabs API call with timeout
async function synthesizeWithElevenLabs(
  text: string,
  voiceId: string,
  modelId: string,
  voiceSettings: VoiceSettings,
  outputFormat: string
): Promise<{ audioBuffer: ArrayBuffer; contentType: string }> {
  const apiKey = process.env.ELEVENLABS_API_KEY
  
  if (!apiKey) {
    throw new Error('ElevenLabs API key not configured')
  }
  
  // Create AbortController for timeout
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT)
  
  try {
    const url = `${ELEVENLABS_API_URL}/${voiceId}?output_format=${outputFormat}`
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': 'application/json',
        'Accept': 'audio/mpeg'
      },
      body: JSON.stringify({
        text,
        model_id: modelId,
        voice_settings: voiceSettings
      }),
      signal: controller.signal
    })
    
    if (!response.ok) {
      const errorText = await response.text()
      
      // Handle specific error cases
      if (response.status === 401) {
        throw new Error('Invalid API key')
      } else if (response.status === 422) {
        throw new Error('Unprocessable entity - invalid parameters or text normalization failed')
      } else if (response.status === 429) {
        throw new Error('Rate limit exceeded')
      } else if (response.status === 400) {
        throw new Error('Invalid request parameters')
      } else {
        throw new Error(`API error: ${response.status} - ${errorText}`)
      }
    }
    
    const audioBuffer = await response.arrayBuffer()
    const contentType = response.headers.get('Content-Type') || 'audio/mpeg'
    
    return { audioBuffer, contentType }
  } finally {
    clearTimeout(timeoutId)
  }
}

// Main handler
export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  const origin = req.headers.origin as string | undefined
  
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    setCorsHeaders(res, origin)
    res.status(200).end()
    return
  }
  
  // Only allow POST
  if (req.method !== 'POST') {
    const errorResponse: ErrorResponse = {
      success: false,
      error: 'Method not allowed',
      code: 'METHOD_NOT_ALLOWED'
    }
    setCorsHeaders(res, origin)
    res.status(405).json(errorResponse)
    return
  }
  
  try {
    // Verify authentication
    if (!verifyAuth(req)) {
      const errorResponse: ErrorResponse = {
        success: false,
        error: 'Unauthorized',
        code: 'UNAUTHORIZED'
      }
      setCorsHeaders(res, origin)
      res.status(401).json(errorResponse)
      return
    }
    
    // Rate limiting
    const clientId = getClientIp(req)
    
    if (ratelimit) {
      const { success, limit, reset, remaining } = await ratelimit.limit(clientId)
      
      res.setHeader('X-RateLimit-Limit', limit.toString())
      res.setHeader('X-RateLimit-Remaining', remaining.toString())
      res.setHeader('X-RateLimit-Reset', new Date(reset).toISOString())
      
      if (!success) {
        const errorResponse: ErrorResponse = {
          success: false,
          error: 'Rate limit exceeded. Please try again later.',
          code: 'RATE_LIMIT_EXCEEDED'
        }
        setCorsHeaders(res, origin)
        res.status(429).json(errorResponse)
        return
      }
    }
    
    // Type-safe request body parsing
    const body = req.body as RequestBody
    const { text, voiceId, modelId, voiceSettings, outputFormat } = body
    
    if (!text) {
      const errorResponse: ErrorResponse = {
        success: false,
        error: 'Text is required',
        code: 'MISSING_TEXT'
      }
      setCorsHeaders(res, origin)
      res.status(400).json(errorResponse)
      return
    }
    
    if (!voiceId) {
      const errorResponse: ErrorResponse = {
        success: false,
        error: 'Voice ID is required',
        code: 'MISSING_VOICE_ID'
      }
      setCorsHeaders(res, origin)
      res.status(400).json(errorResponse)
      return
    }
    
    // Validate text input
    const textValidationError = validateTextInput(text)
    if (textValidationError) {
      const errorResponse: ErrorResponse = {
        success: false,
        error: textValidationError,
        code: 'INVALID_TEXT'
      }
      setCorsHeaders(res, origin)
      res.status(400).json(errorResponse)
      return
    }
    
    // Validate and sanitize parameters
    const sanitizedVoiceSettings = validateVoiceSettings(voiceSettings)
    const sanitizedModelId = typeof modelId === 'string' && modelId.length > 0 
      ? modelId : DEFAULT_MODEL_ID
    const sanitizedOutputFormat = typeof outputFormat === 'string' && outputFormat.length > 0
      ? outputFormat : DEFAULT_OUTPUT_FORMAT
    
    // Check cache if Redis is available
    let cachedAudio: string | null = null
    const cacheKey = getCacheKey(text, voiceId, sanitizedModelId, sanitizedOutputFormat)
    
    if (redis) {
      try {
        cachedAudio = await redis.get(cacheKey)
      } catch (error) {
        console.error('Cache read error:', error)
      }
    }
    
    let base64Audio: string
    let contentType: string
    
    if (cachedAudio) {
      // Use cached audio
      base64Audio = cachedAudio
      contentType = 'audio/mpeg'
    } else {
      // Call ElevenLabs API
      const { audioBuffer, contentType: apiContentType } = await synthesizeWithElevenLabs(
        text,
        voiceId,
        sanitizedModelId,
        sanitizedVoiceSettings,
        sanitizedOutputFormat
      )
      
      // Convert to base64 for JSON response
      base64Audio = Buffer.from(audioBuffer).toString('base64')
      contentType = apiContentType
      
      // Cache the result if Redis is available
      if (redis && base64Audio.length < 1024 * 1024 * 4) { // Cache only if less than 4MB
        try {
          await redis.set(cacheKey, base64Audio, { ex: 3600 }) // Cache for 1 hour
        } catch (error) {
          console.error('Cache write error:', error)
        }
      }
    }
    
    const successResponse: SuccessResponse = {
      success: true,
      data: {
        audioBuffer: base64Audio,
        contentType,
        characterCount: text.length
      }
    }
    
    setCorsHeaders(res, origin)
    res.status(200).json(successResponse)
    
  } catch (error) {
    console.error('Voice synthesis error:', error)
    
    let errorMessage = 'Internal server error'
    let errorCode = 'INTERNAL_ERROR'
    
    if (error instanceof Error) {
      errorMessage = error.message
      
      // Map common error types to codes
      if (error.message.includes('API key')) {
        errorCode = 'API_KEY_ERROR'
      } else if (error.message.includes('Rate limit')) {
        errorCode = 'RATE_LIMIT_ERROR'
      } else if (error.message.includes('Invalid request')) {
        errorCode = 'INVALID_REQUEST'
      } else if (error.message.includes('Unprocessable entity')) {
        errorCode = 'UNPROCESSABLE_ENTITY'
      } else if (error.message.includes('network') || error.message.includes('fetch') || error.name === 'AbortError') {
        errorCode = 'NETWORK_ERROR'
        errorMessage = error.name === 'AbortError' ? 'Request timeout - ElevenLabs API took too long to respond' : errorMessage
      }
    }
    
    const errorResponse: ErrorResponse = {
      success: false,
      error: errorMessage,
      code: errorCode
    }
    
    setCorsHeaders(res, origin)
    res.status(500).json(errorResponse)
  }
}
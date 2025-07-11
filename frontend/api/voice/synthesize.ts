import type { VercelRequest, VercelResponse } from '@vercel/node'

// Rate limiting configuration
const RATE_LIMIT_WINDOW = 60 * 1000 // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 10
const requestCounts = new Map<string, { count: number; resetTime: number }>()

// Input validation constants
const MAX_TEXT_LENGTH = 1000
const MIN_TEXT_LENGTH = 1
// const ALLOWED_CONTENT_TYPES = ['text/plain', 'text/html']

// ElevenLabs API constants
const ELEVENLABS_API_URL = 'https://api.elevenlabs.io/v1/text-to-speech'
const DEFAULT_MODEL_ID = 'eleven_monolingual_v1'

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

// Helper function to set CORS headers
function setCorsHeaders(res: VercelResponse) {
  Object.entries(corsHeaders).forEach(([key, value]) => {
    res.setHeader(key, value)
  })
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

// type ApiResponse = ErrorResponse | SuccessResponse

// Rate limiting helper
function checkRateLimit(clientId: string): boolean {
  const now = Date.now()
  const clientData = requestCounts.get(clientId)
  
  if (!clientData || now > clientData.resetTime) {
    // Reset or create new window
    requestCounts.set(clientId, {
      count: 1,
      resetTime: now + RATE_LIMIT_WINDOW
    })
    return true
  }
  
  if (clientData.count >= RATE_LIMIT_MAX_REQUESTS) {
    return false
  }
  
  clientData.count++
  return true
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
function validateVoiceSettings(settings: any): any {
  if (!settings || typeof settings !== 'object') {
    return {
      stability: 0.5,
      similarity_boost: 0.5,
      style: 0.0,
      use_speaker_boost: false
    }
  }
  
  return {
    stability: typeof settings.stability === 'number' && settings.stability >= 0 && settings.stability <= 1 
      ? settings.stability : 0.5,
    similarity_boost: typeof settings.similarity_boost === 'number' && settings.similarity_boost >= 0 && settings.similarity_boost <= 1 
      ? settings.similarity_boost : 0.5,
    style: typeof settings.style === 'number' && settings.style >= 0 && settings.style <= 1 
      ? settings.style : 0.0,
    use_speaker_boost: typeof settings.use_speaker_boost === 'boolean' 
      ? settings.use_speaker_boost : false
  }
}

// ElevenLabs API call
async function synthesizeWithElevenLabs(
  text: string,
  voiceId: string,
  modelId: string,
  voiceSettings: any
): Promise<{ audioBuffer: ArrayBuffer; contentType: string }> {
  const apiKey = process.env.ELEVENLABS_API_KEY
  
  if (!apiKey) {
    throw new Error('ElevenLabs API key not configured')
  }
  
  const response = await fetch(`${ELEVENLABS_API_URL}/${voiceId}`, {
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
    })
  })
  
  if (!response.ok) {
    const errorText = await response.text()
    
    // Handle specific error cases
    if (response.status === 401) {
      throw new Error('Invalid API key')
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
}

// Main handler
export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    setCorsHeaders(res)
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
    setCorsHeaders(res)
    res.status(405).json(errorResponse)
    return
  }
  
  try {
    // Rate limiting
    const clientId = req.headers['x-forwarded-for'] as string || 
                     req.headers['x-real-ip'] as string || 
                     req.connection?.remoteAddress || 
                     'unknown'
    
    if (!checkRateLimit(clientId)) {
      const errorResponse: ErrorResponse = {
        success: false,
        error: 'Rate limit exceeded. Please try again later.',
        code: 'RATE_LIMIT_EXCEEDED'
      }
      setCorsHeaders(res)
      res.status(429).json(errorResponse)
      return
    }
    
    // Validate request body
    const { text, voiceId, modelId, voiceSettings } = req.body
    
    if (!text) {
      const errorResponse: ErrorResponse = {
        success: false,
        error: 'Text is required',
        code: 'MISSING_TEXT'
      }
      setCorsHeaders(res)
      res.status(400).json(errorResponse)
      return
    }
    
    if (!voiceId) {
      const errorResponse: ErrorResponse = {
        success: false,
        error: 'Voice ID is required',
        code: 'MISSING_VOICE_ID'
      }
      setCorsHeaders(res)
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
      setCorsHeaders(res)
      res.status(400).json(errorResponse)
      return
    }
    
    // Validate and sanitize voice settings
    const sanitizedVoiceSettings = validateVoiceSettings(voiceSettings)
    const sanitizedModelId = typeof modelId === 'string' && modelId.length > 0 
      ? modelId : DEFAULT_MODEL_ID
    
    // Call ElevenLabs API
    const { audioBuffer, contentType } = await synthesizeWithElevenLabs(
      text,
      voiceId,
      sanitizedModelId,
      sanitizedVoiceSettings
    )
    
    // Convert to base64 for JSON response
    const base64Audio = Buffer.from(audioBuffer).toString('base64')
    
    const successResponse: SuccessResponse = {
      success: true,
      data: {
        audioBuffer: base64Audio,
        contentType,
        characterCount: text.length
      }
    }
    
    setCorsHeaders(res)
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
      } else if (error.message.includes('network') || error.message.includes('fetch')) {
        errorCode = 'NETWORK_ERROR'
      }
    }
    
    const errorResponse: ErrorResponse = {
      success: false,
      error: errorMessage,
      code: errorCode
    }
    
    setCorsHeaders(res)
    res.status(500).json(errorResponse)
  }
}
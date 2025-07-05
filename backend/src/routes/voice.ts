import { Router } from 'express'
import { z } from 'zod'
import { asyncHandler } from '../middleware/asyncHandler'
import { validateRequest } from '../middleware/validateRequest'
import logger from '../utils/logger'
import { rateLimit } from 'express-rate-limit'

const router = Router()

// Rate limiting for voice synthesis
const voiceRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many voice synthesis requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false
})

// Validation schemas
const synthesizeTextSchema = z.object({
  text: z.string().min(1).max(5000), // Reasonable text length limits
  modelId: z.string().optional(),
  voiceSettings: z.object({
    stability: z.number().min(0).max(1).optional(),
    similarityBoost: z.number().min(0).max(1).optional(),
    style: z.number().min(0).max(1).optional(),
    useSpeakerBoost: z.boolean().optional()
  }).optional()
})

/**
 * POST /api/voice/synthesize
 * Proxy endpoint for ElevenLabs text-to-speech synthesis
 */
router.post(
  '/synthesize',
  voiceRateLimit,
  validateRequest({ body: synthesizeTextSchema }),
  asyncHandler(async (req, res) => {
    const { text, modelId, voiceSettings } = req.body
    
    // Get configuration from environment variables
    const elevenLabsApiKey = process.env.ELEVENLABS_API_KEY
    const elevenLabsVoiceId = process.env.ELEVENLABS_VOICE_ID
    
    if (!elevenLabsApiKey || !elevenLabsVoiceId) {
      logger.error('ElevenLabs configuration missing')
      return res.status(500).json({
        error: 'Voice service configuration error',
        message: 'Voice synthesis service is not properly configured'
      })
    }
    
    try {
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
            voice_settings: voiceSettings || {
              stability: 0.5,
              similarity_boost: 0.75,
              style: 0.5,
              use_speaker_boost: true
            }
          })
        }
      )
      
      if (!response.ok) {
        if (response.status === 429) {
          logger.warn('ElevenLabs API quota exceeded')
          return res.status(429).json({
            error: 'Quota exceeded',
            message: 'Voice synthesis quota exceeded. Please try again later.'
          })
        }
        
        const errorText = await response.text()
        logger.error('ElevenLabs API error:', {
          status: response.status,
          statusText: response.statusText,
          body: errorText
        })
        
        return res.status(response.status).json({
          error: 'Voice synthesis failed',
          message: 'Failed to synthesize speech'
        })
      }
      
      const audioBuffer = await response.arrayBuffer()
      
      // Set appropriate headers for audio response
      res.set({
        'Content-Type': 'audio/mpeg',
        'Content-Length': audioBuffer.byteLength.toString(),
        'Cache-Control': 'public, max-age=3600' // Cache for 1 hour
      })
      
      // Send the audio buffer
      res.send(Buffer.from(audioBuffer))
      
    } catch (error) {
      logger.error('Voice synthesis error:', error)
      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to process voice synthesis request'
      })
    }
  })
)

/**
 * GET /api/voice/config
 * Get voice configuration (without API keys)
 */
router.get('/config', asyncHandler(async (req, res) => {
  res.json({
    voiceEnabled: !!process.env.ELEVENLABS_API_KEY,
    voiceId: process.env.ELEVENLABS_VOICE_ID,
    defaultSettings: {
      stability: 0.5,
      similarityBoost: 0.75,
      style: 0.5,
      useSpeakerBoost: true
    }
  })
}))

export default router
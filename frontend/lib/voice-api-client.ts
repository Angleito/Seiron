import * as TE from 'fp-ts/TaskEither'
import * as O from 'fp-ts/Option'
import { pipe } from 'fp-ts/function'
import type { TTSError, VoiceSynthesisRequest } from '../types/api/elevenlabs'
import { logger } from './logger'

// API Response types
interface VoiceApiErrorResponse {
  success: false
  error: string
  code?: string
}

interface VoiceApiSuccessResponse {
  success: true
  data: {
    audioBuffer: string // base64 encoded audio
    contentType: string
    duration?: number
    characterCount: number
  }
}

type VoiceApiResponse = VoiceApiErrorResponse | VoiceApiSuccessResponse


// Configuration
export interface VoiceApiConfig {
  apiBaseUrl: string
  timeout?: number
}

// Error creation helper
const createTTSError = (
  type: TTSError['type'],
  message: string,
  statusCode?: number,
  originalError?: unknown
): TTSError => ({
  type,
  message,
  statusCode,
  originalError
})

// Map API error codes to TTS error types
const mapApiErrorToTTSError = (apiError: VoiceApiErrorResponse, statusCode: number): TTSError => {
  switch (apiError.code) {
    case 'RATE_LIMIT_EXCEEDED':
    case 'RATE_LIMIT_ERROR':
      return createTTSError('QUOTA_EXCEEDED', apiError.error, statusCode)
    case 'API_KEY_ERROR':
      return createTTSError('API_ERROR', apiError.error, statusCode)
    case 'NETWORK_ERROR':
      return createTTSError('NETWORK_ERROR', apiError.error, statusCode)
    case 'INVALID_TEXT':
    case 'INVALID_REQUEST':
      return createTTSError('API_ERROR', apiError.error, statusCode)
    default:
      return createTTSError('API_ERROR', apiError.error, statusCode)
  }
}

// Voice API client class
export class VoiceApiClient {
  private config: VoiceApiConfig
  private cache = new Map<string, ArrayBuffer>()
  private readonly CACHE_MAX_SIZE = 20
  private readonly CACHE_TTL = 3600000 // 1 hour
  
  constructor(config: VoiceApiConfig) {
    this.config = config
    logger.debug('🔊 VoiceApiClient initialized', {
      apiBaseUrl: config.apiBaseUrl,
      timeout: config.timeout || 30000
    })
  }
  
  // Generate cache key
  private getCacheKey(request: VoiceSynthesisRequest): string {
    return `${request.text}_${request.voiceId}_${request.modelId || 'default'}_${JSON.stringify(request.voiceSettings || {})}`
  }
  
  // Get cached audio
  private getCachedAudio(cacheKey: string): O.Option<ArrayBuffer> {
    const cached = this.cache.get(cacheKey)
    if (cached) {
      logger.debug('🔊 Cache hit for voice synthesis', { cacheKey })
      return O.some(cached)
    }
    logger.debug('🔊 Cache miss for voice synthesis', { cacheKey })
    return O.none
  }
  
  // Set cached audio
  private setCachedAudio(cacheKey: string, audioBuffer: ArrayBuffer): void {
    // Implement simple LRU by removing oldest if at capacity
    if (this.cache.size >= this.CACHE_MAX_SIZE) {
      const firstKey = this.cache.keys().next().value
      if (firstKey) {
        this.cache.delete(firstKey)
        logger.debug('🔊 Evicted oldest cache entry', { evictedKey: firstKey })
      }
    }
    
    this.cache.set(cacheKey, audioBuffer)
    logger.debug('🔊 Cached voice synthesis result', { 
      cacheKey, 
      bufferSize: audioBuffer.byteLength,
      cacheSize: this.cache.size
    })
  }
  
  // Synthesize speech via secure API
  synthesizeSpeech(request: VoiceSynthesisRequest): TE.TaskEither<TTSError, ArrayBuffer> {
    const cacheKey = this.getCacheKey(request)
    
    logger.debug('🔊 Voice synthesis request', {
      textLength: request.text.length,
      voiceId: request.voiceId,
      modelId: request.modelId,
      cacheKey
    })
    
    // Check cache first
    const cachedAudio = this.getCachedAudio(cacheKey)
    if (O.isSome(cachedAudio)) {
      return TE.right(cachedAudio.value)
    }
    
    // Make API request
    return pipe(
      TE.tryCatch(
        async (): Promise<ArrayBuffer> => {
          const url = `${this.config.apiBaseUrl}/api/voice/synthesize`
          const timeout = this.config.timeout || 30000
          
          logger.debug('🔊 Making voice synthesis API request', {
            url,
            timeout,
            requestBody: {
              ...request,
              text: request.text.substring(0, 100) + (request.text.length > 100 ? '...' : '')
            }
          })
          
          // Create abort controller for timeout
          const controller = new AbortController()
          const timeoutId = setTimeout(() => controller.abort(), timeout)
          
          try {
            const response = await fetch(url, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(request),
              signal: controller.signal
            })
            
            clearTimeout(timeoutId)
            
            logger.debug('🔊 API response received', {
              status: response.status,
              statusText: response.statusText,
              headers: Object.fromEntries(response.headers.entries())
            })
            
            const responseData: VoiceApiResponse = await response.json()
            
            if (!response.ok) {
              logger.error('🔊 API request failed', {
                status: response.status,
                statusText: response.statusText,
                responseData
              })
              
              if (responseData.success === false) {
                throw mapApiErrorToTTSError(responseData, response.status)
              } else {
                throw createTTSError('API_ERROR', `HTTP ${response.status}: ${response.statusText}`, response.status)
              }
            }
            
            if (responseData.success === false) {
              throw mapApiErrorToTTSError(responseData, response.status)
            }
            
            // Convert base64 to ArrayBuffer
            const binaryString = atob(responseData.data.audioBuffer)
            const bytes = new Uint8Array(binaryString.length)
            for (let i = 0; i < binaryString.length; i++) {
              bytes[i] = binaryString.charCodeAt(i)
            }
            const audioBuffer = bytes.buffer
            
            logger.debug('🔊 Audio buffer converted', {
              bufferSize: audioBuffer.byteLength,
              contentType: responseData.data.contentType,
              characterCount: responseData.data.characterCount
            })
            
            // Cache the result
            this.setCachedAudio(cacheKey, audioBuffer)
            
            return audioBuffer
            
          } catch (error) {
            clearTimeout(timeoutId)
            throw error
          }
        },
        (error): TTSError => {
          logger.error('🔊 Voice synthesis request failed', { error })
          
          if (error && typeof error === 'object' && 'type' in error) {
            return error as TTSError
          }
          
          if (error instanceof Error) {
            if (error.name === 'AbortError') {
              return createTTSError('NETWORK_ERROR', 'Request timeout', undefined, error)
            }
            return createTTSError('NETWORK_ERROR', error.message, undefined, error)
          }
          
          return createTTSError('NETWORK_ERROR', 'Unknown network error', undefined, error)
        }
      )
    )
  }
  
  // Clear cache
  clearCache(): void {
    this.cache.clear()
    logger.debug('🔊 Voice synthesis cache cleared')
  }
  
  // Get cache stats
  getCacheStats(): { size: number; maxSize: number } {
    return {
      size: this.cache.size,
      maxSize: this.CACHE_MAX_SIZE
    }
  }
}

// Default client instance
const getApiBaseUrl = (): string => {
  // Try to get from environment variable first
  if (typeof window !== 'undefined' && window.location) {
    return window.location.origin
  }
  
  // Fallback to localhost for development
  return 'http://localhost:3000'
}

export const defaultVoiceApiClient = new VoiceApiClient({
  apiBaseUrl: getApiBaseUrl(),
  timeout: 30000
})

// Convenience function for direct use
export const synthesizeSpeech = (request: VoiceSynthesisRequest): TE.TaskEither<TTSError, ArrayBuffer> => {
  return defaultVoiceApiClient.synthesizeSpeech(request)
}

// Export types for consumers
export type { VoiceApiResponse, VoiceApiConfig }
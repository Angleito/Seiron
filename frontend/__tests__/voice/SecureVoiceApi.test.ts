import { VoiceApiClient } from '../../lib/voice-api-client'
import type { VoiceSynthesisRequest } from '../../lib/voice-api-client'
import * as TE from 'fp-ts/TaskEither'

// Mock fetch globally
global.fetch = jest.fn()

const mockFetch = fetch as jest.MockedFunction<typeof fetch>

describe('VoiceApiClient', () => {
  let client: VoiceApiClient
  
  beforeEach(() => {
    client = new VoiceApiClient({
      apiBaseUrl: 'http://localhost:3000',
      timeout: 5000
    })
    mockFetch.mockClear()
  })

  describe('synthesizeSpeech', () => {
    const validRequest: VoiceSynthesisRequest = {
      text: 'Hello, world!',
      voiceId: 'test-voice-id',
      modelId: 'eleven_monolingual_v1',
      voiceSettings: {
        stability: 0.5,
        similarity_boost: 0.8
      }
    }

    it('should successfully synthesize speech', async () => {
      const mockAudioBuffer = new ArrayBuffer(1000)
      const base64Audio = Buffer.from(mockAudioBuffer).toString('base64')
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          data: {
            audioBuffer: base64Audio,
            contentType: 'audio/mpeg',
            characterCount: 13
          }
        }),
        headers: new Headers()
      } as Response)

      const result = await client.synthesizeSpeech(validRequest)()
      
      expect(TE.isRight(result)).toBe(true)
      if (TE.isRight(result)) {
        expect(result.right).toBeInstanceOf(ArrayBuffer)
        expect(result.right.byteLength).toBe(1000)
      }
    })

    it('should handle API errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({
          success: false,
          error: 'Invalid request',
          code: 'INVALID_REQUEST'
        }),
        headers: new Headers()
      } as Response)

      const result = await client.synthesizeSpeech(validRequest)()
      
      expect(TE.isLeft(result)).toBe(true)
      if (TE.isLeft(result)) {
        expect(result.left.type).toBe('API_ERROR')
        expect(result.left.message).toBe('Invalid request')
        expect(result.left.statusCode).toBe(400)
      }
    })

    it('should handle rate limiting', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        json: async () => ({
          success: false,
          error: 'Rate limit exceeded',
          code: 'RATE_LIMIT_EXCEEDED'
        }),
        headers: new Headers()
      } as Response)

      const result = await client.synthesizeSpeech(validRequest)()
      
      expect(TE.isLeft(result)).toBe(true)
      if (TE.isLeft(result)) {
        expect(result.left.type).toBe('QUOTA_EXCEEDED')
        expect(result.left.message).toBe('Rate limit exceeded')
      }
    })

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      const result = await client.synthesizeSpeech(validRequest)()
      
      expect(TE.isLeft(result)).toBe(true)
      if (TE.isLeft(result)) {
        expect(result.left.type).toBe('NETWORK_ERROR')
        expect(result.left.message).toBe('Network error')
      }
    })

    it('should handle timeout', async () => {
      const timeoutClient = new VoiceApiClient({
        apiBaseUrl: 'http://localhost:3000',
        timeout: 100
      })

      mockFetch.mockImplementationOnce(() => 
        new Promise(resolve => setTimeout(resolve, 200))
      )

      const result = await timeoutClient.synthesizeSpeech(validRequest)()
      
      expect(TE.isLeft(result)).toBe(true)
      if (TE.isLeft(result)) {
        expect(result.left.type).toBe('NETWORK_ERROR')
        expect(result.left.message).toBe('Request timeout')
      }
    })

    it('should cache successful responses', async () => {
      const mockAudioBuffer = new ArrayBuffer(1000)
      const base64Audio = Buffer.from(mockAudioBuffer).toString('base64')
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          data: {
            audioBuffer: base64Audio,
            contentType: 'audio/mpeg',
            characterCount: 13
          }
        }),
        headers: new Headers()
      } as Response)

      // First call
      const result1 = await client.synthesizeSpeech(validRequest)()
      expect(TE.isRight(result1)).toBe(true)
      expect(mockFetch).toHaveBeenCalledTimes(1)

      // Second call should use cache
      const result2 = await client.synthesizeSpeech(validRequest)()
      expect(TE.isRight(result2)).toBe(true)
      expect(mockFetch).toHaveBeenCalledTimes(1) // Still only called once
    })

    it('should make correct API request', async () => {
      const mockAudioBuffer = new ArrayBuffer(1000)
      const base64Audio = Buffer.from(mockAudioBuffer).toString('base64')
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          data: {
            audioBuffer: base64Audio,
            contentType: 'audio/mpeg',
            characterCount: 13
          }
        }),
        headers: new Headers()
      } as Response)

      await client.synthesizeSpeech(validRequest)()

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/voice/synthesize',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(validRequest),
          signal: expect.any(AbortSignal)
        }
      )
    })
  })

  describe('cache management', () => {
    it('should provide cache statistics', () => {
      const stats = client.getCacheStats()
      expect(stats).toEqual({
        size: 0,
        maxSize: 20
      })
    })

    it('should clear cache', () => {
      client.clearCache()
      const stats = client.getCacheStats()
      expect(stats.size).toBe(0)
    })
  })
})

describe('defaultVoiceApiClient', () => {
  it('should be configured with correct defaults', () => {
    const { defaultVoiceApiClient } = require('../../lib/voice-api-client')
    
    expect(defaultVoiceApiClient).toBeDefined()
    expect(defaultVoiceApiClient.getCacheStats()).toEqual({
      size: 0,
      maxSize: 20
    })
  })
})

describe('synthesizeSpeech convenience function', () => {
  it('should use the default client', async () => {
    const { synthesizeSpeech } = require('../../lib/voice-api-client')
    
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        data: {
          audioBuffer: 'dGVzdA==', // base64 for 'test'
          contentType: 'audio/mpeg',
          characterCount: 4
        }
      }),
      headers: new Headers()
    } as Response)

    const request: VoiceSynthesisRequest = {
      text: 'test',
      voiceId: 'test-voice'
    }

    const result = await synthesizeSpeech(request)()
    expect(TE.isRight(result)).toBe(true)
  })
})
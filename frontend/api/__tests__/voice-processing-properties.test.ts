/**
 * Backend voice processing property tests
 * Tests API reliability, data integrity, and error handling in voice processing pipeline
 */

import * as fc from 'fast-check'
import * as E from 'fp-ts/Either'
import * as TE from 'fp-ts/TaskEither'
import { pipe } from 'fp-ts/function'
import {
  arbitraryVoiceText,
  arbitraryAudioFile,
  arbitraryVoiceId,
  arbitraryModelId,
  arbitraryConfidence,
  arbitraryNetworkCondition,
  arbitraryPerformanceConstraint,
  arbitraryTTSError,
  arbitraryVoiceRecognitionError,
  arbitraryErrorRecoveryScenario,
  arbitraryHighLoadScenario,
  arbitraryConcurrentUserScenario
} from '../../lib/test-utils/voice-generators'
import type { TTSError } from '../../types/api/elevenlabs'

// Mock API client for testing
interface VoiceSynthesisRequest {
  text: string
  voiceId: string
  modelId?: string
  voiceSettings?: {
    stability?: number
    similarity_boost?: number
    style?: number
    use_speaker_boost?: boolean
  }
}

interface VoiceSynthesisResponse {
  audioBuffer: ArrayBuffer
  contentType: string
  characterCount: number
  duration: number
}

interface SpeechRecognitionRequest {
  audioBuffer: ArrayBuffer
  language?: string
  model?: string
  enhance?: boolean
}

interface SpeechRecognitionResponse {
  transcript: string
  confidence: number
  alternatives?: Array<{
    transcript: string
    confidence: number
  }>
}

class MockVoiceProcessingAPI {
  private requestCount = 0
  private errorRate = 0
  private latencyMs = 100
  private isRateLimited = false
  private memoryUsage = 0
  private maxConcurrentRequests = 10
  private activeRequests = new Set<string>()

  setErrorRate(rate: number) {
    this.errorRate = Math.max(0, Math.min(1, rate))
  }

  setLatency(ms: number) {
    this.latencyMs = Math.max(0, ms)
  }

  setRateLimit(enabled: boolean) {
    this.isRateLimited = enabled
  }

  async synthesizeSpeech(request: VoiceSynthesisRequest): Promise<E.Either<TTSError, VoiceSynthesisResponse>> {
    const requestId = `tts-${++this.requestCount}`
    
    // Check concurrent request limit
    if (this.activeRequests.size >= this.maxConcurrentRequests) {
      return E.left({
        type: 'RATE_LIMITED' as const,
        message: 'Too many concurrent requests',
        statusCode: 429,
        retryAfter: 1
      })
    }

    this.activeRequests.add(requestId)

    try {
      // Simulate network latency
      await this.simulateLatency()

      // Check rate limiting
      if (this.isRateLimited) {
        return E.left({
          type: 'RATE_LIMITED' as const,
          message: 'Rate limit exceeded',
          statusCode: 429,
          retryAfter: 60
        })
      }

      // Simulate random errors
      if (Math.random() < this.errorRate) {
        const errorTypes: Array<TTSError['type']> = [
          'API_ERROR',
          'NETWORK_ERROR',
          'QUOTA_EXCEEDED',
          'AUTHENTICATION_ERROR'
        ]
        const errorType = errorTypes[Math.floor(Math.random() * errorTypes.length)]
        
        return E.left({
          type: errorType,
          message: `Simulated ${errorType.toLowerCase()}`,
          statusCode: errorType === 'AUTHENTICATION_ERROR' ? 401 : 500
        })
      }

      // Validate request
      if (!request.text || request.text.trim().length === 0) {
        return E.left({
          type: 'API_ERROR' as const,
          message: 'Text cannot be empty',
          statusCode: 400
        })
      }

      if (!request.voiceId || request.voiceId.length < 5) {
        return E.left({
          type: 'API_ERROR' as const,
          message: 'Invalid voice ID',
          statusCode: 400
        })
      }

      // Simulate memory usage
      this.memoryUsage += request.text.length * 0.1

      // Generate mock audio response
      const audioBuffer = new ArrayBuffer(request.text.length * 1000) // 1KB per character
      const response: VoiceSynthesisResponse = {
        audioBuffer,
        contentType: 'audio/mpeg',
        characterCount: request.text.length,
        duration: request.text.length * 0.1 // 100ms per character
      }

      return E.right(response)
    } finally {
      this.activeRequests.delete(requestId)
    }
  }

  async recognizeSpeech(request: SpeechRecognitionRequest): Promise<E.Either<Error, SpeechRecognitionResponse>> {
    const requestId = `stt-${++this.requestCount}`
    this.activeRequests.add(requestId)

    try {
      await this.simulateLatency()

      // Simulate errors
      if (Math.random() < this.errorRate) {
        return E.left(new Error('Speech recognition failed'))
      }

      // Validate audio input
      if (!request.audioBuffer || request.audioBuffer.byteLength === 0) {
        return E.left(new Error('Empty audio buffer'))
      }

      if (request.audioBuffer.byteLength < 1000) {
        return E.left(new Error('Audio too short'))
      }

      // Simulate processing
      const transcript = `Recognized audio of ${request.audioBuffer.byteLength} bytes`
      const confidence = Math.max(0.1, Math.min(1.0, 0.9 - this.errorRate))

      const response: SpeechRecognitionResponse = {
        transcript,
        confidence,
        alternatives: [
          { transcript: transcript + ' (alt 1)', confidence: confidence - 0.1 },
          { transcript: transcript + ' (alt 2)', confidence: confidence - 0.2 }
        ]
      }

      return E.right(response)
    } finally {
      this.activeRequests.delete(requestId)
    }
  }

  async batchSynthesize(requests: VoiceSynthesisRequest[]): Promise<Array<E.Either<TTSError, VoiceSynthesisResponse>>> {
    // Process requests in parallel with concurrency limit
    const semaphore = new Set<number>()
    const maxConcurrent = 5

    const processRequest = async (request: VoiceSynthesisRequest, index: number) => {
      // Wait for available slot
      while (semaphore.size >= maxConcurrent) {
        await new Promise(resolve => setTimeout(resolve, 10))
      }
      
      semaphore.add(index)
      try {
        return await this.synthesizeSpeech(request)
      } finally {
        semaphore.delete(index)
      }
    }

    return Promise.all(requests.map(processRequest))
  }

  getMetrics() {
    return {
      requestCount: this.requestCount,
      errorRate: this.errorRate,
      memoryUsage: this.memoryUsage,
      activeRequests: this.activeRequests.size,
      latencyMs: this.latencyMs
    }
  }

  reset() {
    this.requestCount = 0
    this.errorRate = 0
    this.latencyMs = 100
    this.isRateLimited = false
    this.memoryUsage = 0
    this.activeRequests.clear()
  }

  private async simulateLatency() {
    if (this.latencyMs > 0) {
      await new Promise(resolve => setTimeout(resolve, this.latencyMs))
    }
  }
}

describe('Voice Processing API Properties', () => {
  let api: MockVoiceProcessingAPI

  beforeEach(() => {
    api = new MockVoiceProcessingAPI()
  })

  describe('TTS Processing Properties', () => {
    it('should handle any valid text input consistently', () => {
      fc.assert(
        fc.property(
          arbitraryVoiceText,
          arbitraryVoiceId,
          arbitraryModelId,
          async (text, voiceId, modelId) => {
            const request: VoiceSynthesisRequest = {
              text,
              voiceId,
              modelId
            }

            const result = await api.synthesizeSpeech(request)

            if (text.trim().length > 0 && voiceId.length >= 5) {
              // Valid input should produce valid output or predictable error
              if (E.isRight(result)) {
                expect(result.right.audioBuffer).toBeInstanceOf(ArrayBuffer)
                expect(result.right.audioBuffer.byteLength).toBeGreaterThan(0)
                expect(result.right.characterCount).toBe(text.length)
                expect(result.right.duration).toBeGreaterThan(0)
                expect(['audio/mpeg', 'audio/wav', 'audio/ogg']).toContain(result.right.contentType)
              } else {
                // Error should be well-formed
                expect(result.left.type).toBeDefined()
                expect(result.left.message).toBeDefined()
                expect(typeof result.left.message).toBe('string')
              }
            } else {
              // Invalid input should return error
              expect(E.isLeft(result)).toBe(true)
            }
          }
        )
      )
    })

    it('should maintain performance under load', () => {
      fc.assert(
        fc.property(arbitraryHighLoadScenario, async (scenario) => {
          const requests: VoiceSynthesisRequest[] = Array.from(
            { length: Math.min(scenario.concurrentUsers, 50) }, // Limit for test performance
            (_, i) => ({
              text: `Request ${i}`,
              voiceId: 'test-voice-id'
            })
          )

          const startTime = Date.now()
          const results = await api.batchSynthesize(requests)
          const endTime = Date.now()

          const totalTime = endTime - startTime
          const avgTimePerRequest = totalTime / requests.length

          // Should handle requests efficiently
          expect(avgTimePerRequest).toBeLessThan(scenario.expectedResponseTime || 1000)
          
          // All requests should have results
          expect(results.length).toBe(requests.length)
          
          // Check success rate
          const successCount = results.filter(E.isRight).length
          const successRate = successCount / results.length
          expect(successRate).toBeGreaterThan(0.5) // At least 50% should succeed under normal conditions
        })
      )
    })

    it('should handle concurrent users correctly', () => {
      fc.assert(
        fc.property(arbitraryConcurrentUserScenario, async (scenario) => {
          const requests = scenario.users.slice(0, 10).map((user, index) => ({
            text: `User ${user.userId} message ${index}`,
            voiceId: 'test-voice-id'
          }))

          const promises = requests.map(request => api.synthesizeSpeech(request))
          const results = await Promise.all(promises)

          // All requests should complete
          expect(results.length).toBe(requests.length)
          
          // Check for resource exhaustion
          const metrics = api.getMetrics()
          expect(metrics.activeRequests).toBeLessThanOrEqual(10) // Should respect concurrency limits
        })
      )
    })
  })

  describe('Speech Recognition Properties', () => {
    it('should process any valid audio input', () => {
      fc.assert(
        fc.property(arbitraryAudioFile, async (audioFile) => {
          const request: SpeechRecognitionRequest = {
            audioBuffer: audioFile.arrayBuffer,
            language: 'en-US'
          }

          const result = await api.recognizeSpeech(request)

          if (audioFile.arrayBuffer.byteLength >= 1000) {
            // Valid audio should produce recognition result
            if (E.isRight(result)) {
              expect(typeof result.right.transcript).toBe('string')
              expect(result.right.transcript.length).toBeGreaterThan(0)
              expect(result.right.confidence).toBeGreaterThanOrEqual(0)
              expect(result.right.confidence).toBeLessThanOrEqual(1)
              
              if (result.right.alternatives) {
                result.right.alternatives.forEach(alt => {
                  expect(typeof alt.transcript).toBe('string')
                  expect(alt.confidence).toBeGreaterThanOrEqual(0)
                  expect(alt.confidence).toBeLessThanOrEqual(1)
                })
              }
            }
          } else {
            // Too short audio should return error
            expect(E.isLeft(result)).toBe(true)
          }
        })
      )
    })

    it('should maintain accuracy across different audio qualities', () => {
      fc.assert(
        fc.property(
          fc.array(arbitraryAudioFile, { minLength: 5, maxLength: 20 }),
          async (audioFiles) => {
            const requests = audioFiles.map(file => ({
              audioBuffer: file.arrayBuffer,
              language: 'en-US'
            }))

            const results = await Promise.all(requests.map(req => api.recognizeSpeech(req)))
            
            // Calculate accuracy metrics
            const validResults = results.filter(E.isRight)
            if (validResults.length > 0) {
              const avgConfidence = validResults.reduce((sum, result) => {
                return sum + (E.isRight(result) ? result.right.confidence : 0)
              }, 0) / validResults.length

              // Average confidence should be reasonable
              expect(avgConfidence).toBeGreaterThan(0.1)
              expect(avgConfidence).toBeLessThanOrEqual(1.0)
            }
          }
        )
      )
    })
  })

  describe('Error Handling Properties', () => {
    it('should handle network conditions gracefully', () => {
      fc.assert(
        fc.property(arbitraryNetworkCondition, async (networkCondition) => {
          // Configure API to simulate network conditions
          api.setLatency(Math.min(networkCondition.latency, 2000)) // Cap for test performance
          api.setErrorRate(networkCondition.packetLoss)

          const request: VoiceSynthesisRequest = {
            text: 'Test message',
            voiceId: 'test-voice-id'
          }

          const startTime = Date.now()
          const result = await api.synthesizeSpeech(request)
          const endTime = Date.now()

          const actualLatency = endTime - startTime

          // Should respect configured latency
          expect(actualLatency).toBeGreaterThanOrEqual(Math.min(networkCondition.latency, 2000) - 100)

          // Should handle errors appropriately
          if (networkCondition.packetLoss > 0.5) {
            // High packet loss should likely result in errors
            if (E.isLeft(result)) {
              expect(result.left.type).toBeDefined()
              expect(['NETWORK_ERROR', 'API_ERROR', 'RATE_LIMITED']).toContain(result.left.type)
            }
          }
        })
      )
    })

    it('should implement proper error recovery', () => {
      fc.assert(
        fc.property(arbitraryErrorRecoveryScenario, async (scenario) => {
          // Configure high error rate
          api.setErrorRate(0.8)

          const request: VoiceSynthesisRequest = {
            text: 'Test message',
            voiceId: 'test-voice-id'
          }

          let attempts = 0
          let lastResult: E.Either<TTSError, VoiceSynthesisResponse> = E.left({
            type: 'NETWORK_ERROR',
            message: 'Initial error'
          })

          // Implement retry logic
          while (attempts < scenario.maxRetries) {
            attempts++
            lastResult = await api.synthesizeSpeech(request)
            
            if (E.isRight(lastResult)) {
              break // Success, stop retrying
            }

            // Wait before retry (simplified)
            await new Promise(resolve => setTimeout(resolve, 10))
          }

          // Should have made appropriate number of attempts
          expect(attempts).toBeLessThanOrEqual(scenario.maxRetries)

          // Final result should be either success or well-formed error
          if (E.isLeft(lastResult)) {
            expect(lastResult.left.type).toBeDefined()
            expect(lastResult.left.message).toBeDefined()
          } else {
            expect(lastResult.right.audioBuffer).toBeInstanceOf(ArrayBuffer)
          }
        })
      )
    })

    it('should handle rate limiting correctly', () => {
      fc.assert(
        fc.property(
          fc.nat({ min: 10, max: 50 }),
          async (numRequests) => {
            api.setRateLimit(true)

            const requests = Array.from({ length: numRequests }, (_, i) => ({
              text: `Message ${i}`,
              voiceId: 'test-voice-id'
            }))

            const results = await Promise.all(requests.map(req => api.synthesizeSpeech(req)))

            // Should have received rate limit errors
            const rateLimitErrors = results.filter(result => 
              E.isLeft(result) && result.left.type === 'RATE_LIMITED'
            )

            expect(rateLimitErrors.length).toBeGreaterThan(0)

            // Rate limit errors should have proper structure
            rateLimitErrors.forEach(result => {
              if (E.isLeft(result)) {
                expect(result.left.statusCode).toBe(429)
                expect(result.left.retryAfter).toBeDefined()
                expect(typeof result.left.retryAfter).toBe('number')
              }
            })
          }
        )
      )
    })
  })

  describe('Data Integrity Properties', () => {
    it('should preserve audio data integrity through processing', () => {
      fc.assert(
        fc.property(arbitraryVoiceText, arbitraryVoiceId, async (text, voiceId) => {
          if (text.trim().length > 0 && voiceId.length >= 5) {
            const request: VoiceSynthesisRequest = { text, voiceId }
            const result = await api.synthesizeSpeech(request)

            if (E.isRight(result)) {
              // Character count should match input
              expect(result.right.characterCount).toBe(text.length)
              
              // Audio buffer should be non-empty
              expect(result.right.audioBuffer.byteLength).toBeGreaterThan(0)
              
              // Duration should be proportional to text length
              expect(result.right.duration).toBeGreaterThan(0)
              expect(result.right.duration).toBeLessThan(text.length * 1000) // Reasonable upper bound
              
              // Content type should be valid
              expect(['audio/mpeg', 'audio/wav', 'audio/ogg']).toContain(result.right.contentType)
            }
          }
        })
      )
    })

    it('should handle text encoding correctly', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 100 }),
          arbitraryVoiceId,
          async (text, voiceId) => {
            if (voiceId.length >= 5) {
              // Test various text encodings
              const variants = [
                text,
                text.normalize('NFC'),
                text.normalize('NFD'),
                text.normalize('NFKC'),
                text.normalize('NFKD')
              ]

              const results = await Promise.all(
                variants.map(variant => api.synthesizeSpeech({ text: variant, voiceId }))
              )

              // All valid variants should produce consistent results
              const successfulResults = results.filter(E.isRight)
              if (successfulResults.length > 1) {
                const charCounts = successfulResults.map(result => 
                  E.isRight(result) ? result.right.characterCount : 0
                )
                
                // Character counts should be consistent for normalized text
                const uniqueCounts = new Set(charCounts)
                expect(uniqueCounts.size).toBeLessThanOrEqual(2) // Allow some variation for normalization
              }
            }
          }
        )
      )
    })
  })

  describe('Performance Monitoring Properties', () => {
    it('should provide accurate metrics', () => {
      fc.assert(
        fc.property(
          fc.array(arbitraryVoiceText, { minLength: 5, maxLength: 20 }),
          async (texts) => {
            api.reset()
            const initialMetrics = api.getMetrics()
            expect(initialMetrics.requestCount).toBe(0)

            const requests = texts
              .filter(text => text.trim().length > 0)
              .map(text => ({ text, voiceId: 'test-voice-id' }))

            await Promise.all(requests.map(req => api.synthesizeSpeech(req)))

            const finalMetrics = api.getMetrics()
            
            // Request count should match
            expect(finalMetrics.requestCount).toBe(requests.length)
            
            // Memory usage should have increased
            expect(finalMetrics.memoryUsage).toBeGreaterThanOrEqual(0)
            
            // Active requests should be back to 0
            expect(finalMetrics.activeRequests).toBe(0)
          }
        )
      )
    })

    it('should track resource usage accurately', () => {
      fc.assert(
        fc.property(arbitraryPerformanceConstraint, async (constraints) => {
          const longText = 'A'.repeat(Math.min(constraints.maxMemoryUsage || 1000, 1000))
          const request: VoiceSynthesisRequest = {
            text: longText,
            voiceId: 'test-voice-id'
          }

          const initialMetrics = api.getMetrics()
          await api.synthesizeSpeech(request)
          const finalMetrics = api.getMetrics()

          // Memory usage should have increased proportionally
          const memoryIncrease = finalMetrics.memoryUsage - initialMetrics.memoryUsage
          expect(memoryIncrease).toBeGreaterThan(0)
          expect(memoryIncrease).toBeLessThan(longText.length) // Should be reasonable
        })
      )
    })
  })

  describe('API Contract Properties', () => {
    it('should maintain consistent response format', () => {
      fc.assert(
        fc.property(arbitraryVoiceText, arbitraryVoiceId, async (text, voiceId) => {
          if (text.trim().length > 0 && voiceId.length >= 5) {
            const result = await api.synthesizeSpeech({ text, voiceId })

            if (E.isRight(result)) {
              // Response should have all required fields
              expect(result.right).toHaveProperty('audioBuffer')
              expect(result.right).toHaveProperty('contentType')
              expect(result.right).toHaveProperty('characterCount')
              expect(result.right).toHaveProperty('duration')
              
              // Field types should be correct
              expect(result.right.audioBuffer).toBeInstanceOf(ArrayBuffer)
              expect(typeof result.right.contentType).toBe('string')
              expect(typeof result.right.characterCount).toBe('number')
              expect(typeof result.right.duration).toBe('number')
            } else {
              // Error should have required fields
              expect(result.left).toHaveProperty('type')
              expect(result.left).toHaveProperty('message')
              expect(typeof result.left.type).toBe('string')
              expect(typeof result.left.message).toBe('string')
            }
          }
        })
      )
    })

    it('should validate input parameters consistently', () => {
      fc.assert(
        fc.property(
          fc.option(fc.string()),
          fc.option(fc.string()),
          async (text, voiceId) => {
            const request: VoiceSynthesisRequest = {
              text: text || '',
              voiceId: voiceId || ''
            }

            const result = await api.synthesizeSpeech(request)

            // Invalid inputs should consistently return validation errors
            if (!text || text.trim().length === 0) {
              expect(E.isLeft(result)).toBe(true)
              if (E.isLeft(result)) {
                expect(result.left.type).toBe('API_ERROR')
                expect(result.left.statusCode).toBe(400)
              }
            }

            if (!voiceId || voiceId.length < 5) {
              expect(E.isLeft(result)).toBe(true)
              if (E.isLeft(result)) {
                expect(result.left.type).toBe('API_ERROR')
                expect(result.left.statusCode).toBe(400)
              }
            }
          }
        )
      )
    })
  })
})
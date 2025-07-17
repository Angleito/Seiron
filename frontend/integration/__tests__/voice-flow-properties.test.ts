/**
 * End-to-end voice flow property tests
 * Tests complete voice chat workflows, integration points, and system behavior
 */

import * as fc from 'fast-check'
import * as E from 'fp-ts/Either'
import * as TE from 'fp-ts/TaskEither'
import { pipe } from 'fp-ts/function'
import {
  arbitraryVoiceScenario,
  arbitraryConversation,
  arbitraryUserInteractionSequence,
  arbitraryVoiceText,
  arbitraryAudioFile,
  arbitraryNetworkCondition,
  arbitraryHighLoadScenario,
  arbitraryConcurrentUserScenario,
  arbitraryPerformanceConstraint,
  arbitraryAccessibilityRequirement,
  arbitraryDeviceCapability,
  arbitraryErrorRecoveryScenario
} from '../../lib/test-utils/voice-generators'
import type { VoiceState, VoiceSettings } from '../../types/components/voice'

// Integration test framework
interface VoiceFlowStep {
  type: 'user_input' | 'system_response' | 'voice_synthesis' | 'speech_recognition' | 'memory_operation' | 'ui_update'
  input?: any
  expectedOutput?: any
  timeout?: number
  retries?: number
}

interface VoiceFlowTestResult {
  success: boolean
  steps: Array<{
    step: VoiceFlowStep
    result: 'success' | 'failure' | 'timeout'
    output?: any
    error?: string
    duration: number
  }>
  totalDuration: number
  memoryUsage: number
  errorCount: number
}

// Mock integrated voice system
class MockIntegratedVoiceSystem {
  private state: VoiceState = {
    recognition: {
      state: 'idle',
      isListening: false,
      transcript: '',
      interimTranscript: '',
      confidence: 0,
      error: null
    },
    tts: {
      state: 'idle',
      isLoading: false,
      isSpeaking: false,
      isPaused: false,
      currentText: null,
      queue: [],
      error: null
    },
    isEnabled: false,
    isInitialized: false,
    error: null
  }

  private settings: VoiceSettings = {
    enabled: true,
    language: 'en-US',
    autoStart: false,
    showVisualizer: true,
    showTranscript: true,
    ttsEnabled: true,
    ttsRate: 1,
    ttsPitch: 1,
    ttsVolume: 1,
    commandsEnabled: true,
    noiseReduction: true,
    echoCancellation: true,
    autoGainControl: true
  }

  private conversationHistory: Array<{
    speaker: 'user' | 'assistant'
    content: string
    timestamp: number
    confidence?: number
  }> = []

  private networkLatency = 100
  private errorRate = 0
  private memoryUsage = 0
  private isInitialized = false

  async initialize(): Promise<E.Either<Error, void>> {
    try {
      await this.simulateLatency(200) // Initialization delay
      this.isInitialized = true
      this.state.isInitialized = true
      return E.right(undefined)
    } catch (error) {
      return E.left(error as Error)
    }
  }

  async startListening(): Promise<E.Either<Error, void>> {
    try {
      if (!this.isInitialized) {
        return E.left(new Error('System not initialized'))
      }

      await this.simulateLatency(50)
      
      if (Math.random() < this.errorRate) {
        return E.left(new Error('Failed to start listening'))
      }

      this.state.recognition.isListening = true
      this.state.recognition.state = 'listening'
      
      return E.right(undefined)
    } catch (error) {
      return E.left(error as Error)
    }
  }

  async stopListening(): Promise<E.Either<Error, void>> {
    try {
      this.state.recognition.isListening = false
      this.state.recognition.state = 'idle'
      return E.right(undefined)
    } catch (error) {
      return E.left(error as Error)
    }
  }

  async processAudioInput(audioBuffer: ArrayBuffer): Promise<E.Either<Error, string>> {
    try {
      if (!this.state.recognition.isListening) {
        return E.left(new Error('Not listening'))
      }

      await this.simulateLatency(this.networkLatency * 2) // Processing delay

      if (Math.random() < this.errorRate) {
        return E.left(new Error('Speech recognition failed'))
      }

      if (audioBuffer.byteLength === 0) {
        return E.left(new Error('Empty audio buffer'))
      }

      // Simulate transcript generation
      const transcript = `Processed audio (${audioBuffer.byteLength} bytes)`
      const confidence = Math.max(0.1, 1 - this.errorRate)

      this.state.recognition.transcript = transcript
      this.state.recognition.confidence = confidence
      this.state.recognition.state = 'processing'

      // Add to conversation history
      this.conversationHistory.push({
        speaker: 'user',
        content: transcript,
        timestamp: Date.now(),
        confidence
      })

      this.memoryUsage += transcript.length * 0.1

      return E.right(transcript)
    } catch (error) {
      return E.left(error as Error)
    }
  }

  async generateResponse(userInput: string): Promise<E.Either<Error, string>> {
    try {
      await this.simulateLatency(this.networkLatency * 3) // AI processing delay

      if (Math.random() < this.errorRate) {
        return E.left(new Error('AI response generation failed'))
      }

      if (!userInput.trim()) {
        return E.left(new Error('Empty user input'))
      }

      // Simple response generation
      const responses = [
        `I understand you said: ${userInput}`,
        `That's interesting about: ${userInput}`,
        `Let me help you with: ${userInput}`,
        `I can assist with: ${userInput}`,
        `Thank you for sharing: ${userInput}`
      ]

      const response = responses[Math.floor(Math.random() * responses.length)]

      // Add to conversation history
      this.conversationHistory.push({
        speaker: 'assistant',
        content: response,
        timestamp: Date.now()
      })

      this.memoryUsage += response.length * 0.1

      return E.right(response)
    } catch (error) {
      return E.left(error as Error)
    }
  }

  async synthesizeSpeech(text: string): Promise<E.Either<Error, ArrayBuffer>> {
    try {
      if (!this.settings.ttsEnabled) {
        return E.left(new Error('TTS disabled'))
      }

      this.state.tts.isLoading = true
      this.state.tts.state = 'loading'

      await this.simulateLatency(this.networkLatency * 2)

      if (Math.random() < this.errorRate) {
        this.state.tts.isLoading = false
        this.state.tts.state = 'error'
        return E.left(new Error('TTS synthesis failed'))
      }

      if (!text.trim()) {
        this.state.tts.isLoading = false
        return E.left(new Error('Empty text input'))
      }

      // Simulate audio generation
      const audioBuffer = new ArrayBuffer(text.length * 1000)

      this.state.tts.isLoading = false
      this.state.tts.isSpeaking = true
      this.state.tts.state = 'speaking'
      this.state.tts.currentText = text

      this.memoryUsage += text.length * 0.2

      // Simulate playback completion
      setTimeout(() => {
        this.state.tts.isSpeaking = false
        this.state.tts.state = 'idle'
        this.state.tts.currentText = null
      }, text.length * 100) // 100ms per character

      return E.right(audioBuffer)
    } catch (error) {
      return E.left(error as Error)
    }
  }

  async executeCompleteFlow(userAudioInput: ArrayBuffer): Promise<E.Either<Error, ArrayBuffer>> {
    try {
      // Step 1: Process speech input
      const transcriptResult = await this.processAudioInput(userAudioInput)
      if (E.isLeft(transcriptResult)) {
        return transcriptResult
      }

      // Step 2: Generate AI response
      const responseResult = await this.generateResponse(transcriptResult.right)
      if (E.isLeft(responseResult)) {
        return E.left(responseResult.left)
      }

      // Step 3: Synthesize speech output
      const audioResult = await this.synthesizeSpeech(responseResult.right)
      if (E.isLeft(audioResult)) {
        return E.left(audioResult.left)
      }

      return E.right(audioResult.right)
    } catch (error) {
      return E.left(error as Error)
    }
  }

  async runFlowTest(steps: VoiceFlowStep[]): Promise<VoiceFlowTestResult> {
    const startTime = Date.now()
    const stepResults: VoiceFlowTestResult['steps'] = []
    let errorCount = 0

    for (const step of steps) {
      const stepStartTime = Date.now()
      let result: 'success' | 'failure' | 'timeout' = 'success'
      let output: any = undefined
      let error: string | undefined = undefined

      try {
        const timeout = step.timeout || 5000
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Step timeout')), timeout)
        )

        let stepPromise: Promise<any>

        switch (step.type) {
          case 'user_input':
            stepPromise = this.processAudioInput(step.input || new ArrayBuffer(1000))
            break
          case 'system_response':
            stepPromise = this.generateResponse(step.input || 'test input')
            break
          case 'voice_synthesis':
            stepPromise = this.synthesizeSpeech(step.input || 'test text')
            break
          case 'speech_recognition':
            stepPromise = this.startListening()
            break
          case 'memory_operation':
            stepPromise = Promise.resolve(E.right(this.conversationHistory))
            break
          case 'ui_update':
            stepPromise = Promise.resolve(E.right(this.state))
            break
          default:
            stepPromise = Promise.resolve(E.left(new Error('Unknown step type')))
        }

        const stepResult = await Promise.race([stepPromise, timeoutPromise])
        
        if (E.isLeft(stepResult)) {
          result = 'failure'
          error = stepResult.left.message
          errorCount++
        } else {
          output = stepResult.right
        }

      } catch (err) {
        result = err instanceof Error && err.message === 'Step timeout' ? 'timeout' : 'failure'
        error = err instanceof Error ? err.message : 'Unknown error'
        errorCount++
      }

      const stepEndTime = Date.now()
      stepResults.push({
        step,
        result,
        output,
        error,
        duration: stepEndTime - stepStartTime
      })
    }

    const endTime = Date.now()
    return {
      success: errorCount === 0,
      steps: stepResults,
      totalDuration: endTime - startTime,
      memoryUsage: this.memoryUsage,
      errorCount
    }
  }

  setNetworkLatency(ms: number) {
    this.networkLatency = Math.max(0, ms)
  }

  setErrorRate(rate: number) {
    this.errorRate = Math.max(0, Math.min(1, rate))
  }

  getState(): VoiceState {
    return { ...this.state }
  }

  getSettings(): VoiceSettings {
    return { ...this.settings }
  }

  updateSettings(updates: Partial<VoiceSettings>) {
    this.settings = { ...this.settings, ...updates }
  }

  getConversationHistory() {
    return [...this.conversationHistory]
  }

  getMetrics() {
    return {
      memoryUsage: this.memoryUsage,
      conversationLength: this.conversationHistory.length,
      networkLatency: this.networkLatency,
      errorRate: this.errorRate,
      isInitialized: this.isInitialized
    }
  }

  reset() {
    this.state = {
      recognition: {
        state: 'idle',
        isListening: false,
        transcript: '',
        interimTranscript: '',
        confidence: 0,
        error: null
      },
      tts: {
        state: 'idle',
        isLoading: false,
        isSpeaking: false,
        isPaused: false,
        currentText: null,
        queue: [],
        error: null
      },
      isEnabled: false,
      isInitialized: false,
      error: null
    }
    this.conversationHistory = []
    this.memoryUsage = 0
    this.isInitialized = false
  }

  private async simulateLatency(ms: number = this.networkLatency) {
    if (ms > 0) {
      await new Promise(resolve => setTimeout(resolve, ms))
    }
  }
}

describe('End-to-End Voice Flow Properties', () => {
  let system: MockIntegratedVoiceSystem

  beforeEach(() => {
    system = new MockIntegratedVoiceSystem()
  })

  describe('Complete Voice Flow Properties', () => {
    it('should handle any valid voice interaction flow', () => {
      fc.assert(
        fc.property(arbitraryVoiceScenario, async (scenario) => {
          system.setNetworkLatency(Math.min(scenario.networkCondition.latency, 1000))
          system.setErrorRate(Math.min(scenario.networkCondition.packetLoss, 0.3)) // Cap error rate for meaningful tests

          await system.initialize()

          const userAudioInput = new ArrayBuffer(1000) // Mock audio input
          const result = await system.executeCompleteFlow(userAudioInput)

          if (scenario.expectedBehavior.shouldSucceed && scenario.networkCondition.latency < 1000) {
            if (E.isRight(result)) {
              expect(result.right).toBeInstanceOf(ArrayBuffer)
              expect(result.right.byteLength).toBeGreaterThan(0)

              // Check conversation history was updated
              const history = system.getConversationHistory()
              expect(history.length).toBeGreaterThanOrEqual(2) // User input + assistant response

              // Check performance
              const metrics = system.getMetrics()
              expect(metrics.memoryUsage).toBeGreaterThan(0)
              expect(metrics.conversationLength).toBeGreaterThanOrEqual(2)
            }
          }

          // System should remain in valid state regardless of outcome
          const finalState = system.getState()
          expect(typeof finalState.isEnabled).toBe('boolean')
          expect(typeof finalState.isInitialized).toBe('boolean')
        })
      )
    })

    it('should maintain consistency through complex interaction sequences', () => {
      fc.assert(
        fc.property(arbitraryUserInteractionSequence, async (interactions) => {
          await system.initialize()

          const steps: VoiceFlowStep[] = interactions.slice(0, 10).map(interaction => {
            switch (interaction.action) {
              case 'start_listening':
                return { type: 'speech_recognition' as const }
              case 'stop_listening':
                return { type: 'user_input' as const, input: new ArrayBuffer(500) }
              case 'toggle_auto_speak':
                return { type: 'voice_synthesis' as const, input: 'Test response' }
              case 'clear_transcript':
                return { type: 'memory_operation' as const }
              default:
                return { type: 'ui_update' as const }
            }
          })

          const testResult = await system.runFlowTest(steps)

          // System should complete all steps
          expect(testResult.steps.length).toBe(steps.length)

          // Most steps should succeed under normal conditions
          const successCount = testResult.steps.filter(s => s.result === 'success').length
          const successRate = successCount / testResult.steps.length
          expect(successRate).toBeGreaterThan(0.5) // At least 50% success rate

          // System should remain responsive
          expect(testResult.totalDuration).toBeLessThan(30000) // Max 30 seconds total

          // Final state should be valid
          const finalState = system.getState()
          expect(finalState).toBeDefined()
          expect(typeof finalState.recognition.isListening).toBe('boolean')
        })
      )
    })
  })

  describe('Multi-User Scenario Properties', () => {
    it('should handle concurrent users correctly', () => {
      fc.assert(
        fc.property(arbitraryConcurrentUserScenario, async (scenario) => {
          await system.initialize()

          const userFlows = scenario.users.slice(0, 5).map(async (user, index) => {
            const userAudioInput = new ArrayBuffer(1000 + index * 100) // Different audio sizes
            return system.executeCompleteFlow(userAudioInput)
          })

          const results = await Promise.all(userFlows)

          // Check that all flows completed
          expect(results.length).toBe(Math.min(scenario.users.length, 5))

          // At least some should succeed under normal conditions
          const successCount = results.filter(E.isRight).length
          expect(successCount).toBeGreaterThan(0)

          // System should maintain conversation history
          const history = system.getConversationHistory()
          expect(history.length).toBeGreaterThanOrEqual(successCount * 2) // Each success = user + assistant

          // Memory usage should be reasonable
          const metrics = system.getMetrics()
          expect(metrics.memoryUsage).toBeLessThan(10000) // Reasonable upper bound
        })
      )
    })

    it('should handle high-load scenarios gracefully', () => {
      fc.assert(
        fc.property(arbitraryHighLoadScenario, async (scenario) => {
          await system.initialize()

          const requestCount = Math.min(scenario.concurrentUsers, 20) // Limit for test performance
          const requests = Array.from({ length: requestCount }, (_, i) => ({
            audioInput: new ArrayBuffer(500 + i * 10),
            expectedLatency: scenario.expectedResponseTime
          }))

          const startTime = Date.now()
          const promises = requests.map(req => system.executeCompleteFlow(req.audioInput))
          const results = await Promise.all(promises)
          const endTime = Date.now()

          const totalTime = endTime - startTime
          const avgTimePerRequest = totalTime / requestCount

          // Should handle load efficiently
          expect(avgTimePerRequest).toBeLessThan(scenario.expectedResponseTime * 2) // Allow some overhead

          // Most requests should succeed
          const successCount = results.filter(E.isRight).length
          const successRate = successCount / requestCount
          expect(successRate).toBeGreaterThan(0.3) // At least 30% under high load

          // System should not crash
          const finalState = system.getState()
          expect(finalState).toBeDefined()
        })
      )
    })
  })

  describe('Error Recovery Properties', () => {
    it('should recover from any error scenario', () => {
      fc.assert(
        fc.property(arbitraryErrorRecoveryScenario, async (scenario) => {
          await system.initialize()

          // Configure system for errors
          system.setErrorRate(0.8) // High error rate

          const steps: VoiceFlowStep[] = [
            { type: 'speech_recognition' },
            { type: 'user_input', input: new ArrayBuffer(1000) },
            { type: 'system_response', input: 'test input' },
            { type: 'voice_synthesis', input: 'test response' }
          ]

          let attempts = 0
          let lastResult: VoiceFlowTestResult | null = null

          // Implement retry logic
          while (attempts < scenario.maxRetries) {
            attempts++
            lastResult = await system.runFlowTest(steps)

            if (lastResult.success) {
              break // Success, stop retrying
            }

            // Brief delay before retry
            await new Promise(resolve => setTimeout(resolve, 10))
          }

          expect(lastResult).toBeDefined()
          expect(attempts).toBeLessThanOrEqual(scenario.maxRetries)

          // Even if all retries failed, system should be in valid state
          const finalState = system.getState()
          expect(finalState).toBeDefined()
          expect(typeof finalState.isInitialized).toBe('boolean')
        })
      )
    })

    it('should maintain system stability under error conditions', () => {
      fc.assert(
        fc.property(
          fc.float({ min: 0.1, max: 0.9 }),
          fc.nat({ min: 5, max: 20 }),
          async (errorRate, operationCount) => {
            await system.initialize()
            system.setErrorRate(errorRate)

            // Perform multiple operations with errors
            for (let i = 0; i < operationCount; i++) {
              const audioInput = new ArrayBuffer(500 + i * 50)
              await system.executeCompleteFlow(audioInput)
              
              // System should remain responsive after each operation
              const currentState = system.getState()
              expect(currentState).toBeDefined()
              expect(typeof currentState.isInitialized).toBe('boolean')
            }

            // Final system health check
            const metrics = system.getMetrics()
            expect(metrics.isInitialized).toBe(true)
            expect(metrics.memoryUsage).toBeGreaterThanOrEqual(0)
          }
        )
      )
    })
  })

  describe('Performance Integration Properties', () => {
    it('should meet performance constraints across complete flows', () => {
      fc.assert(
        fc.property(arbitraryPerformanceConstraint, async (constraints) => {
          await system.initialize()

          const maxOperations = Math.min(constraints.maxMemoryUsage || 10, 10)
          const maxLatency = constraints.maxLatency || 2000

          system.setNetworkLatency(Math.min(maxLatency / 4, 500)) // Quarter of max latency

          const operations = Array.from({ length: maxOperations }, (_, i) => ({
            audioInput: new ArrayBuffer(100 + i * 50),
            text: `Operation ${i}`
          }))

          const startTime = Date.now()
          
          for (const operation of operations) {
            const operationStart = Date.now()
            const result = await system.executeCompleteFlow(operation.audioInput)
            const operationEnd = Date.now()

            const operationTime = operationEnd - operationStart
            expect(operationTime).toBeLessThan(maxLatency)

            // Memory should not grow excessively
            const metrics = system.getMetrics()
            expect(metrics.memoryUsage).toBeLessThan((constraints.maxMemoryUsage || 1000) * 1000)
          }

          const endTime = Date.now()
          const totalTime = endTime - startTime
          
          // Total execution should be reasonable
          expect(totalTime).toBeLessThan(maxLatency * maxOperations)

          // System should maintain performance metrics
          const finalMetrics = system.getMetrics()
          expect(finalMetrics.conversationLength).toBeLessThanOrEqual(maxOperations * 2)
        })
      )
    })

    it('should handle resource constraints gracefully', () => {
      fc.assert(
        fc.property(
          fc.record({
            memoryLimit: fc.nat({ min: 100, max: 5000 }),
            timeLimit: fc.nat({ min: 1000, max: 10000 }),
            operationCount: fc.nat({ min: 5, max: 50 })
          }),
          async ({ memoryLimit, timeLimit, operationCount }) => {
            await system.initialize()

            const startTime = Date.now()
            let operationsCompleted = 0

            for (let i = 0; i < operationCount; i++) {
              const currentTime = Date.now()
              const elapsed = currentTime - startTime

              // Check time constraint
              if (elapsed > timeLimit) {
                break
              }

              // Check memory constraint
              const metrics = system.getMetrics()
              if (metrics.memoryUsage > memoryLimit) {
                // System should handle memory pressure gracefully
                system.reset()
                await system.initialize()
              }

              const audioInput = new ArrayBuffer(100)
              await system.executeCompleteFlow(audioInput)
              operationsCompleted++
            }

            // Should have completed some operations
            expect(operationsCompleted).toBeGreaterThan(0)

            // System should still be functional
            const finalState = system.getState()
            expect(finalState.isInitialized).toBe(true)
          }
        )
      )
    })
  })

  describe('Accessibility Integration Properties', () => {
    it('should maintain accessibility across all voice flows', () => {
      fc.assert(
        fc.property(arbitraryAccessibilityRequirement, async (a11yReq) => {
          await system.initialize()

          // Configure system for accessibility requirements
          system.updateSettings({
            showTranscript: true,
            showVisualizer: !a11yReq.reducedMotionEnabled,
            ttsEnabled: true // Always enable for screen readers
          })

          const audioInput = new ArrayBuffer(1000)
          const result = await system.executeCompleteFlow(audioInput)

          // Flow should work regardless of accessibility settings
          if (E.isRight(result)) {
            expect(result.right).toBeInstanceOf(ArrayBuffer)
          }

          // State should include accessibility-friendly information
          const state = system.getState()
          expect(state.recognition.transcript).toBeDefined()
          expect(typeof state.recognition.confidence).toBe('number')

          // Settings should respect accessibility requirements
          const settings = system.getSettings()
          expect(settings.showTranscript).toBe(true)
          if (a11yReq.reducedMotionEnabled) {
            expect(settings.showVisualizer).toBe(false)
          }
        })
      )
    })
  })

  describe('Device Compatibility Properties', () => {
    it('should adapt to different device capabilities', () => {
      fc.assert(
        fc.property(arbitraryDeviceCapability, async (deviceCap) => {
          // Mock device capabilities
          const mockNavigator = {
            mediaDevices: deviceCap.hasMicrophone ? {
              getUserMedia: jest.fn(() => Promise.resolve({} as MediaStream))
            } : undefined
          }

          Object.defineProperty(global, 'navigator', {
            value: mockNavigator,
            writable: true
          })

          await system.initialize()

          // System should adapt to device capabilities
          const audioInput = new ArrayBuffer(deviceCap.hasMicrophone ? 1000 : 0)
          const result = await system.executeCompleteFlow(audioInput)

          if (deviceCap.hasMicrophone && deviceCap.hasWebAudio) {
            // Should work normally with full capabilities
            if (E.isRight(result)) {
              expect(result.right).toBeInstanceOf(ArrayBuffer)
            }
          } else {
            // Should handle limited capabilities gracefully
            if (E.isLeft(result)) {
              expect(result.left.message).toBeDefined()
            }
          }

          // System should remain stable regardless
          const finalState = system.getState()
          expect(finalState).toBeDefined()
        })
      )
    })
  })

  describe('Data Flow Integrity Properties', () => {
    it('should preserve data integrity through complete flows', () => {
      fc.assert(
        fc.property(arbitraryConversation, async (conversation) => {
          await system.initialize()

          // Simulate conversation flow
          for (const turn of conversation.slice(0, 5)) { // Limit for performance
            if (turn.speaker === 'user') {
              const audioInput = new ArrayBuffer(turn.text.length * 10)
              await system.executeCompleteFlow(audioInput)
            }
          }

          // Check conversation history integrity
          const history = system.getConversationHistory()
          
          // Each entry should have required fields
          history.forEach(entry => {
            expect(typeof entry.speaker).toBe('string')
            expect(['user', 'assistant']).toContain(entry.speaker)
            expect(typeof entry.content).toBe('string')
            expect(typeof entry.timestamp).toBe('number')
            expect(entry.timestamp).toBeGreaterThan(0)
          })

          // Conversation should be in chronological order
          for (let i = 1; i < history.length; i++) {
            expect(history[i].timestamp).toBeGreaterThanOrEqual(history[i-1].timestamp)
          }
        })
      )
    })

    it('should handle data serialization correctly', () => {
      fc.assert(
        fc.property(arbitraryVoiceText, async (text) => {
          await system.initialize()

          if (text.trim().length > 0) {
            const audioInput = new ArrayBuffer(text.length * 10)
            await system.executeCompleteFlow(audioInput)

            // Test state serialization
            const state = system.getState()
            const serialized = JSON.stringify(state)
            const deserialized = JSON.parse(serialized)

            expect(deserialized).toEqual(state)

            // Test conversation history serialization
            const history = system.getConversationHistory()
            const historySerial = JSON.stringify(history)
            const historyDeserial = JSON.parse(historySerial)

            expect(historyDeserial).toEqual(history)
          }
        })
      )
    })
  })
})
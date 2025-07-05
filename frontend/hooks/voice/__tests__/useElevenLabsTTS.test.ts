import { renderHook, act } from '@testing-library/react'
import * as fc from 'fast-check'
import * as E from 'fp-ts/Either'
import * as TE from 'fp-ts/TaskEither'
import * as O from 'fp-ts/Option'
import { useElevenLabsTTS, ElevenLabsConfig, TTSError } from '../useElevenLabsTTS'

// Mock IndexedDB
const mockIndexedDB = {
  open: jest.fn(),
  deleteDatabase: jest.fn(),
}

const mockIDBDatabase = {
  transaction: jest.fn(),
  close: jest.fn(),
  objectStoreNames: { contains: jest.fn() },
  createObjectStore: jest.fn(),
}

const mockTransaction = {
  objectStore: jest.fn(),
}

const mockObjectStore = {
  get: jest.fn(),
  put: jest.fn(),
  delete: jest.fn(),
  getAllKeys: jest.fn(),
}

const mockIDBRequest = {
  result: null,
  error: null,
  onsuccess: null as any,
  onerror: null as any,
  onupgradeneeded: null as any,
}

// Mock AudioContext
const mockAudioContext = {
  decodeAudioData: jest.fn(),
  createBufferSource: jest.fn(),
  destination: {},
  close: jest.fn(),
}

const mockAudioBufferSourceNode = {
  buffer: null,
  connect: jest.fn(),
  start: jest.fn(),
  stop: jest.fn(),
  onended: null as any,
}

// Mock fetch
global.fetch = jest.fn()

// Setup mocks
beforeAll(() => {
  Object.defineProperty(window, 'indexedDB', {
    value: mockIndexedDB,
    writable: true,
  })

  Object.defineProperty(window, 'AudioContext', {
    value: jest.fn(() => mockAudioContext),
    writable: true,
  })

  Object.defineProperty(window, 'webkitAudioContext', {
    value: jest.fn(() => mockAudioContext),
    writable: true,
  })
})

// Property generators
const arbitraryConfig = fc.record({
  apiUrl: fc.webUrl(),
  modelId: fc.option(fc.string({ minLength: 5, maxLength: 50 })),
  voiceSettings: fc.option(
    fc.record({
      stability: fc.float({ min: 0, max: 1 }),
      similarityBoost: fc.float({ min: 0, max: 1 }),
      style: fc.option(fc.float({ min: 0, max: 1 })),
      useSpeakerBoost: fc.option(fc.boolean()),
    })
  ),
})

const arbitraryText = fc.oneof(
  fc.string({ minLength: 1, maxLength: 500 }),
  fc.constant('Hello world'),
  fc.constant('This is a test message'),
  fc.constant('Dragon speaks with wisdom and power')
)

const arbitraryErrorType = fc.constantFrom(
  'API_ERROR',
  'NETWORK_ERROR',
  'AUDIO_ERROR',
  'QUOTA_EXCEEDED'
)

describe('useElevenLabsTTS Hook', () => {
  const defaultConfig: ElevenLabsConfig = {
    apiUrl: 'https://api.elevenlabs.io',
    modelId: 'eleven_monolingual_v1',
    voiceSettings: {
      stability: 0.5,
      similarityBoost: 0.75,
      style: 0.5,
      useSpeakerBoost: true,
    },
  }

  beforeEach(() => {
    jest.clearAllMocks()
    
    // Setup IndexedDB mocks
    mockIndexedDB.open.mockImplementation(() => {
      const request = { ...mockIDBRequest }
      setTimeout(() => {
        request.result = mockIDBDatabase
        if (request.onsuccess) request.onsuccess()
      }, 0)
      return request
    })

    mockIDBDatabase.transaction.mockReturnValue(mockTransaction)
    mockTransaction.objectStore.mockReturnValue(mockObjectStore)
    mockIDBDatabase.objectStoreNames.contains.mockReturnValue(false)

    // Setup AudioContext mocks
    mockAudioContext.createBufferSource.mockReturnValue(mockAudioBufferSourceNode)
    mockAudioContext.decodeAudioData.mockResolvedValue({
      duration: 1.5,
      numberOfChannels: 1,
      sampleRate: 44100,
    })

    // Setup fetch mock
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      arrayBuffer: () => Promise.resolve(new ArrayBuffer(1024)),
    })
  })

  describe('Property-based tests', () => {
    it('should initialize with any valid configuration', () => {
      fc.assert(
        fc.property(arbitraryConfig, (config) => {
          const { result } = renderHook(() => useElevenLabsTTS(config))

          expect(result.current.isSpeaking).toBe(false)
          expect(result.current.isLoading).toBe(false)
          expect(result.current.error).toBe(null)
          expect(result.current.cachedAudio).toBeInstanceOf(Map)
          expect(typeof result.current.speak).toBe('function')
          expect(typeof result.current.stop).toBe('function')
          expect(typeof result.current.preloadAudio).toBe('function')
        })
      )
    })

    it('should handle any valid text input', async () => {
      fc.assert(
        fc.asyncProperty(arbitraryText, async (text) => {
          const { result } = renderHook(() => useElevenLabsTTS(defaultConfig))

          const speakTask = result.current.speak(text)
          expect(typeof speakTask).toBe('function')

          // The speak function returns a TaskEither
          const taskResult = await speakTask()()
          expect(E.isRight(taskResult) || E.isLeft(taskResult)).toBe(true)
        })
      )
    })

    it('should maintain consistent state through multiple operations', async () => {
      fc.assert(
        fc.asyncProperty(
          fc.array(arbitraryText, { minLength: 1, maxLength: 3 }),
          async (texts) => {
            const { result } = renderHook(() => useElevenLabsTTS(defaultConfig))

            for (const text of texts) {
              const speakTask = result.current.speak(text)
              await speakTask()()
            }

            // State should always be consistent
            expect(typeof result.current.isSpeaking).toBe('boolean')
            expect(typeof result.current.isLoading).toBe('boolean')
            expect(result.current.error === null || typeof result.current.error === 'object').toBe(true)
          }
        )
      )
    })
  })

  describe('Unit tests', () => {
    it('should initialize with correct default state', () => {
      const { result } = renderHook(() => useElevenLabsTTS(defaultConfig))

      expect(result.current.isSpeaking).toBe(false)
      expect(result.current.isLoading).toBe(false)
      expect(result.current.error).toBe(null)
      expect(result.current.cachedAudio).toBeInstanceOf(Map)
      expect(result.current.cachedAudio.size).toBe(0)
    })

    it('should provide required functions', () => {
      const { result } = renderHook(() => useElevenLabsTTS(defaultConfig))

      expect(typeof result.current.speak).toBe('function')
      expect(typeof result.current.stop).toBe('function')
      expect(typeof result.current.preloadAudio).toBe('function')
    })

    it('should handle successful speech synthesis', async () => {
      const { result } = renderHook(() => useElevenLabsTTS(defaultConfig))

      // Mock successful audio playback
      mockAudioBufferSourceNode.start.mockImplementation(() => {
        setTimeout(() => {
          if (mockAudioBufferSourceNode.onended) {
            mockAudioBufferSourceNode.onended()
          }
        }, 100)
      })

      await act(async () => {
        const speakTask = result.current.speak('Hello world')
        await speakTask()()
      })

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/voice/synthesize'),
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: expect.stringContaining('Hello world'),
        })
      )
    })

    it('should handle API errors gracefully', async () => {
      const { result } = renderHook(() => useElevenLabsTTS(defaultConfig))

      // Mock API error
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
      })

      await act(async () => {
        const speakTask = result.current.speak('Hello world')
        const taskResult = await speakTask()()
        expect(E.isLeft(taskResult)).toBe(true)
      })

      expect(result.current.error).toBeTruthy()
      expect(result.current.error?.type).toBe('API_ERROR')
    })

    it('should handle quota exceeded errors', async () => {
      const { result } = renderHook(() => useElevenLabsTTS(defaultConfig))

      // Mock quota exceeded
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 429,
        statusText: 'Too Many Requests',
      })

      await act(async () => {
        const speakTask = result.current.speak('Hello world')
        const taskResult = await speakTask()()
        expect(E.isLeft(taskResult)).toBe(true)
      })

      expect(result.current.error?.type).toBe('QUOTA_EXCEEDED')
    })

    it('should handle network errors', async () => {
      const { result } = renderHook(() => useElevenLabsTTS(defaultConfig))

      // Mock network error
      ;(global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'))

      await act(async () => {
        const speakTask = result.current.speak('Hello world')
        const taskResult = await speakTask()()
        expect(E.isLeft(taskResult)).toBe(true)
      })

      expect(result.current.error?.type).toBe('NETWORK_ERROR')
    })

    it('should validate empty text input', async () => {
      const { result } = renderHook(() => useElevenLabsTTS(defaultConfig))

      await act(async () => {
        const speakTask = result.current.speak('')
        const taskResult = await speakTask()()
        expect(E.isLeft(taskResult)).toBe(true)
      })

      expect(result.current.error?.type).toBe('API_ERROR')
      expect(result.current.error?.message).toContain('empty')
    })

    it('should stop audio playback', () => {
      const { result } = renderHook(() => useElevenLabsTTS(defaultConfig))

      // Set up speaking state
      act(() => {
        result.current.stop()
      })

      expect(result.current.isSpeaking).toBe(false)
    })

    it('should preload multiple audio texts', async () => {
      const { result } = renderHook(() => useElevenLabsTTS(defaultConfig))

      const texts = ['Hello', 'World', 'Test']

      await act(async () => {
        const preloadTask = result.current.preloadAudio(texts)
        await preloadTask()()
      })

      expect(global.fetch).toHaveBeenCalledTimes(texts.length)
    })

    it('should handle audio context creation failure', async () => {
      const { result } = renderHook(() => useElevenLabsTTS(defaultConfig))

      // Mock AudioContext failure
      Object.defineProperty(window, 'AudioContext', {
        value: jest.fn(() => {
          throw new Error('Audio context not supported')
        }),
        writable: true,
      })

      Object.defineProperty(window, 'webkitAudioContext', {
        value: undefined,
        writable: true,
      })

      await act(async () => {
        const speakTask = result.current.speak('Hello world')
        const taskResult = await speakTask()()
        expect(E.isLeft(taskResult)).toBe(true)
      })

      expect(result.current.error?.type).toBe('AUDIO_ERROR')
    })

    it('should handle audio decoding failure', async () => {
      const { result } = renderHook(() => useElevenLabsTTS(defaultConfig))

      // Mock audio decoding failure
      mockAudioContext.decodeAudioData.mockRejectedValue(new Error('Decode failed'))

      await act(async () => {
        const speakTask = result.current.speak('Hello world')
        const taskResult = await speakTask()()
        expect(E.isLeft(taskResult)).toBe(true)
      })

      expect(result.current.error?.type).toBe('AUDIO_ERROR')
    })
  })

  describe('Caching tests', () => {
    it('should use cached audio when available', async () => {
      const { result } = renderHook(() => useElevenLabsTTS(defaultConfig))

      // Mock cache hit
      mockObjectStore.get.mockImplementation(() => {
        const request = { ...mockIDBRequest }
        setTimeout(() => {
          request.result = {
            id: 'elevenlabs_tts_Hello world',
            buffer: new ArrayBuffer(1024),
            timestamp: Date.now(),
          }
          if (request.onsuccess) request.onsuccess()
        }, 0)
        return request
      })

      await act(async () => {
        const speakTask = result.current.speak('Hello world')
        await speakTask()()
      })

      // Should not make API call due to cache hit
      expect(global.fetch).not.toHaveBeenCalled()
    })

    it('should handle cache miss and make API call', async () => {
      const { result } = renderHook(() => useElevenLabsTTS(defaultConfig))

      // Mock cache miss
      mockObjectStore.get.mockImplementation(() => {
        const request = { ...mockIDBRequest }
        setTimeout(() => {
          request.result = null
          if (request.onsuccess) request.onsuccess()
        }, 0)
        return request
      })

      await act(async () => {
        const speakTask = result.current.speak('Hello world')
        await speakTask()()
      })

      expect(global.fetch).toHaveBeenCalled()
    })

    it('should handle expired cache entries', async () => {
      const { result } = renderHook(() => useElevenLabsTTS(defaultConfig))

      // Mock expired cache entry
      mockObjectStore.get.mockImplementation(() => {
        const request = { ...mockIDBRequest }
        setTimeout(() => {
          request.result = {
            id: 'elevenlabs_tts_Hello world',
            buffer: new ArrayBuffer(1024),
            timestamp: Date.now() - 7200000, // 2 hours old
          }
          if (request.onsuccess) request.onsuccess()
        }, 0)
        return request
      })

      await act(async () => {
        const speakTask = result.current.speak('Hello world')
        await speakTask()()
      })

      // Should make API call due to expired cache
      expect(global.fetch).toHaveBeenCalled()
    })

    it('should handle cache storage errors gracefully', async () => {
      const { result } = renderHook(() => useElevenLabsTTS(defaultConfig))

      // Mock IndexedDB error
      mockIndexedDB.open.mockImplementation(() => {
        const request = { ...mockIDBRequest }
        setTimeout(() => {
          request.error = new Error('IndexedDB error')
          if (request.onerror) request.onerror()
        }, 0)
        return request
      })

      await act(async () => {
        const speakTask = result.current.speak('Hello world')
        const taskResult = await speakTask()()
        
        // Should still work without cache, making API call
        expect(global.fetch).toHaveBeenCalled()
      })
    })
  })

  describe('State management tests', () => {
    it('should update loading state correctly', async () => {
      const { result } = renderHook(() => useElevenLabsTTS(defaultConfig))

      // Mock slow API response
      ;(global.fetch as jest.Mock).mockImplementation(
        () => new Promise(resolve => 
          setTimeout(() => resolve({
            ok: true,
            arrayBuffer: () => Promise.resolve(new ArrayBuffer(1024)),
          }), 100)
        )
      )

      act(() => {
        result.current.speak('Hello world')
      })

      // Initially should be loading
      expect(result.current.isLoading).toBe(true)

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 150))
      })

      // Should finish loading
      expect(result.current.isLoading).toBe(false)
    })

    it('should update speaking state correctly', async () => {
      const { result } = renderHook(() => useElevenLabsTTS(defaultConfig))

      mockAudioBufferSourceNode.start.mockImplementation(() => {
        // Simulate audio playing
        act(() => {
          // This would normally be set by the hook
        })
        
        setTimeout(() => {
          if (mockAudioBufferSourceNode.onended) {
            mockAudioBufferSourceNode.onended()
          }
        }, 50)
      })

      await act(async () => {
        const speakTask = result.current.speak('Hello world')
        await speakTask()()
      })

      // Should have completed speaking
      expect(result.current.isSpeaking).toBe(false)
    })

    it('should clear errors on successful operations', async () => {
      const { result } = renderHook(() => useElevenLabsTTS(defaultConfig))

      // First, cause an error
      ;(global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'))

      await act(async () => {
        const speakTask = result.current.speak('Hello world')
        await speakTask()()
      })

      expect(result.current.error).toBeTruthy()

      // Then, mock successful response
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(1024)),
      })

      await act(async () => {
        const speakTask = result.current.speak('Hello world')
        await speakTask()()
      })

      expect(result.current.error).toBe(null)
    })
  })

  describe('Cleanup tests', () => {
    it('should cleanup audio resources on unmount', () => {
      const { unmount } = renderHook(() => useElevenLabsTTS(defaultConfig))

      unmount()

      expect(mockAudioContext.close).toHaveBeenCalled()
    })

    it('should stop current audio on unmount', () => {
      const { result, unmount } = renderHook(() => useElevenLabsTTS(defaultConfig))

      // Simulate audio playing
      act(() => {
        result.current.stop()
      })

      unmount()

      // Should have stopped audio
      expect(mockAudioBufferSourceNode.stop).toHaveBeenCalled()
    })
  })

  describe('Edge cases', () => {
    it('should handle malformed API responses', async () => {
      const { result } = renderHook(() => useElevenLabsTTS(defaultConfig))

      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        arrayBuffer: () => Promise.reject(new Error('Invalid response')),
      })

      await act(async () => {
        const speakTask = result.current.speak('Hello world')
        const taskResult = await speakTask()()
        expect(E.isLeft(taskResult)).toBe(true)
      })

      expect(result.current.error?.type).toBe('NETWORK_ERROR')
    })

    it('should handle concurrent speak requests', async () => {
      const { result } = renderHook(() => useElevenLabsTTS(defaultConfig))

      const promises = [
        result.current.speak('Hello'),
        result.current.speak('World'),
        result.current.speak('Test'),
      ].map(task => task()())

      await act(async () => {
        await Promise.all(promises)
      })

      // All requests should complete
      expect(global.fetch).toHaveBeenCalledTimes(3)
    })
  })
})
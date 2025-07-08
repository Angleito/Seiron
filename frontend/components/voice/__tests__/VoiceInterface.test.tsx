import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { act } from 'react-dom/test-utils'
import * as fc from 'fast-check'
import VoiceInterface, { VoiceInterfaceProps, useVoiceInterfaceAudio } from '../VoiceInterface'
import { renderHook } from '@testing-library/react-hooks'
import * as E from 'fp-ts/Either'

// Mock the hooks
jest.mock('../../../hooks/voice/useSpeechRecognition')
jest.mock('../../../hooks/voice/useSecureElevenLabsTTS')

// Import mocked versions
import { useSpeechRecognition } from '../../../hooks/voice/useSpeechRecognition'
import { useSecureElevenLabsTTS } from '../../../hooks/voice/useSecureElevenLabsTTS'

const mockUseSpeechRecognition = useSpeechRecognition as jest.MockedFunction<typeof useSpeechRecognition>
const mockUseSecureElevenLabsTTS = useSecureElevenLabsTTS as jest.MockedFunction<typeof useSecureElevenLabsTTS>

// Property generators
const arbitraryElevenLabsConfig = fc.record({
  voiceId: fc.string({ minLength: 5, maxLength: 20 }),
  modelId: fc.option(fc.string({ minLength: 5, maxLength: 30 })),
  voiceSettings: fc.option(fc.record({
    stability: fc.float({ min: 0, max: 1 }),
    similarityBoost: fc.float({ min: 0, max: 1 }),
    style: fc.option(fc.float({ min: 0, max: 1 })),
    useSpeakerBoost: fc.option(fc.boolean())
  }))
})

const arbitraryTranscript = fc.string({ minLength: 0, maxLength: 500 })

const arbitraryError = fc.oneof(
  fc.record({
    type: fc.constantFrom('NO_SUPPORT', 'PERMISSION_DENIED', 'NETWORK', 'UNKNOWN'),
    message: fc.string({ minLength: 5, maxLength: 100 })
  }),
  fc.record({
    type: fc.constantFrom('API_ERROR', 'NETWORK_ERROR', 'AUDIO_ERROR', 'QUOTA_EXCEEDED'),
    message: fc.string({ minLength: 5, maxLength: 100 }),
    statusCode: fc.option(fc.integer({ min: 400, max: 599 }))
  })
)

describe('VoiceInterface Component', () => {
  const defaultMockSpeechRecognition = {
    isListening: false,
    transcript: '',
    interimTranscript: '',
    error: null,
    startListening: jest.fn(() => () => Promise.resolve(E.right(undefined))),
    stopListening: jest.fn(() => () => Promise.resolve(E.right(undefined))),
    clearTranscript: jest.fn(),
    isSupported: true
  }

  const defaultMockTTS = {
    isSpeaking: false,
    isLoading: false,
    error: null,
    cachedAudio: new Map(),
    speak: jest.fn(() => () => Promise.resolve(E.right(undefined))),
    stop: jest.fn(),
    preloadAudio: jest.fn(() => () => Promise.resolve(E.right([])))
  }

  const defaultProps: VoiceInterfaceProps = {
    elevenLabsConfig: {
      apiKey: 'test-api-key',
      voiceId: 'test-voice-id'
    }
  }

  beforeEach(() => {
    jest.clearAllMocks()
    mockUseSpeechRecognition.mockReturnValue(defaultMockSpeechRecognition)
    mockUseElevenLabsTTS.mockReturnValue(defaultMockTTS)
  })

  describe('Property-based tests', () => {
    it('should handle any valid ElevenLabs configuration', () => {
      fc.assert(
        fc.property(arbitraryElevenLabsConfig, (config) => {
          const { container } = render(
            <VoiceInterface elevenLabsConfig={config} />
          )
          
          expect(container).toBeTruthy()
          expect(screen.getByLabelText(/start recording/i)).toBeInTheDocument()
          expect(screen.getByLabelText(/enable auto-speak/i)).toBeInTheDocument()
        })
      )
    })

    it('should display any transcript correctly', () => {
      fc.assert(
        fc.property(arbitraryTranscript, arbitraryTranscript, (transcript, interimTranscript) => {
          mockUseSpeechRecognition.mockReturnValue({
            ...defaultMockSpeechRecognition,
            transcript,
            interimTranscript
          })

          const { rerender } = render(<VoiceInterface {...defaultProps} />)
          
          if (transcript || interimTranscript) {
            const expectedText = transcript + (interimTranscript ? ` ${interimTranscript}` : '')
            expect(screen.getByText(/Transcript:/)).toBeInTheDocument()
            expect(screen.getByText(new RegExp(expectedText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))).toBeInTheDocument()
          }
        })
      )
    })

    it('should handle any error state gracefully', () => {
      fc.assert(
        fc.property(arbitraryError, (error) => {
          mockUseSpeechRecognition.mockReturnValue({
            ...defaultMockSpeechRecognition,
            error: error as any
          })

          render(<VoiceInterface {...defaultProps} />)
          
          expect(screen.getByText(/Error:/)).toBeInTheDocument()
          expect(screen.getByText(new RegExp(error.message))).toBeInTheDocument()
        })
      )
    })

    it('should maintain consistent state through multiple interactions', () => {
      fc.assert(
        fc.property(
          fc.array(fc.constantFrom('toggleMic', 'toggleSpeaker'), { minLength: 1, maxLength: 10 }),
          async (actions) => {
            const { getByLabelText } = render(<VoiceInterface {...defaultProps} />)
            
            for (const action of actions) {
              if (action === 'toggleMic') {
                const micButton = getByLabelText(/recording/i)
                await act(async () => {
                  fireEvent.click(micButton)
                })
              } else {
                const speakerButton = getByLabelText(/auto-speak/i)
                await act(async () => {
                  fireEvent.click(speakerButton)
                })
              }
            }
            
            // Component should still be functional
            expect(getByLabelText(/recording/i)).toBeInTheDocument()
            expect(getByLabelText(/auto-speak/i)).toBeInTheDocument()
          }
        )
      )
    })
  })

  describe('Unit tests', () => {
    it('should render when speech recognition is not supported', () => {
      mockUseSpeechRecognition.mockReturnValue({
        ...defaultMockSpeechRecognition,
        isSupported: false
      })

      render(<VoiceInterface {...defaultProps} />)
      
      expect(screen.getByText(/Speech recognition is not supported/i)).toBeInTheDocument()
    })

    it('should toggle microphone state', async () => {
      const { getByLabelText } = render(<VoiceInterface {...defaultProps} />)
      const micButton = getByLabelText('Start recording')
      
      await act(async () => {
        fireEvent.click(micButton)
      })
      
      expect(defaultMockSpeechRecognition.startListening).toHaveBeenCalled()
    })

    it('should toggle speaker state', () => {
      const { getByLabelText } = render(<VoiceInterface {...defaultProps} />)
      const speakerButton = getByLabelText('Enable auto-speak')
      
      fireEvent.click(speakerButton)
      
      // The button should change to disable state
      expect(getByLabelText('Disable auto-speak')).toBeInTheDocument()
    })

    it('should show dragon breathing fire when audio is playing', () => {
      mockUseElevenLabsTTS.mockReturnValue({
        ...defaultMockTTS,
        isSpeaking: true
      })

      render(<VoiceInterface {...defaultProps} />)
      
      expect(screen.getByText('🐉🔥')).toBeInTheDocument()
    })

    it('should display loading state when TTS is loading', () => {
      mockUseElevenLabsTTS.mockReturnValue({
        ...defaultMockTTS,
        isLoading: true
      })

      render(<VoiceInterface {...defaultProps} />)
      
      expect(screen.getByText('Preparing audio...')).toBeInTheDocument()
    })

    it('should show listening indicator when microphone is active', () => {
      mockUseSpeechRecognition.mockReturnValue({
        ...defaultMockSpeechRecognition,
        isListening: true
      })

      render(<VoiceInterface {...defaultProps} />)
      
      expect(screen.getByText('Listening...')).toBeInTheDocument()
    })

    it('should call onTranscriptChange when transcript updates', () => {
      const onTranscriptChange = jest.fn()
      const transcript = 'Hello world'
      
      mockUseSpeechRecognition.mockReturnValue({
        ...defaultMockSpeechRecognition,
        transcript
      })

      render(
        <VoiceInterface
          {...defaultProps}
          onTranscriptChange={onTranscriptChange}
        />
      )
      
      expect(onTranscriptChange).toHaveBeenCalledWith(transcript)
    })

    it('should call onError when an error occurs', () => {
      const onError = jest.fn()
      const error = { type: 'NETWORK', message: 'Network error' }
      
      mockUseSpeechRecognition.mockReturnValue({
        ...defaultMockSpeechRecognition,
        error: error as any
      })

      render(
        <VoiceInterface
          {...defaultProps}
          onError={onError}
        />
      )
      
      expect(onError).toHaveBeenCalledWith(new Error(error.message))
    })

    it('should disable microphone button when TTS is loading', () => {
      mockUseElevenLabsTTS.mockReturnValue({
        ...defaultMockTTS,
        isLoading: true
      })

      const { getByLabelText } = render(<VoiceInterface {...defaultProps} />)
      const micButton = getByLabelText('Start recording')
      
      expect(micButton).toBeDisabled()
    })

    it('should handle autoReadResponses prop', () => {
      const { getByLabelText } = render(
        <VoiceInterface {...defaultProps} autoReadResponses={true} />
      )
      
      expect(getByLabelText('Disable auto-speak')).toBeInTheDocument()
    })

    it('should apply custom className', () => {
      const customClass = 'custom-voice-interface'
      const { container } = render(
        <VoiceInterface {...defaultProps} className={customClass} />
      )
      
      expect(container.firstChild).toHaveClass(customClass)
    })
  })

  describe('useVoiceInterfaceAudio hook', () => {
    it('should provide audio playback functionality', async () => {
      const { result } = renderHook(() => 
        useVoiceInterfaceAudio({ apiKey: 'test', voiceId: 'test' })
      )

      expect(result.current.playResponse).toBeDefined()
      expect(result.current.stopAudio).toBeDefined()
      expect(result.current.isPlaying).toBe(false)
    })

    it('should handle playback errors', async () => {
      const errorMessage = 'API Error'
      mockUseElevenLabsTTS.mockReturnValue({
        ...defaultMockTTS,
        speak: jest.fn(() => () => Promise.resolve(E.left({ 
          type: 'API_ERROR', 
          message: errorMessage 
        })))
      })

      const { result } = renderHook(() => 
        useVoiceInterfaceAudio({ apiKey: 'test', voiceId: 'test' })
      )

      await expect(result.current.playResponse('test')).rejects.toThrow(errorMessage)
    })
  })

  describe('Accessibility tests', () => {
    it('should have proper ARIA labels', () => {
      render(<VoiceInterface {...defaultProps} />)
      
      expect(screen.getByLabelText('Dragon')).toBeInTheDocument()
      expect(screen.getByLabelText(/recording/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/auto-speak/i)).toBeInTheDocument()
    })

    it('should update ARIA labels based on state', () => {
      mockUseSpeechRecognition.mockReturnValue({
        ...defaultMockSpeechRecognition,
        isListening: true
      })

      render(<VoiceInterface {...defaultProps} />)
      
      expect(screen.getByLabelText('Stop recording')).toBeInTheDocument()
    })
  })

  describe('Visual state tests', () => {
    it('should apply pulse animation to microphone when active', () => {
      mockUseSpeechRecognition.mockReturnValue({
        ...defaultMockSpeechRecognition,
        isListening: true
      })

      const { getByLabelText } = render(<VoiceInterface {...defaultProps} />)
      const micButton = getByLabelText('Stop recording')
      
      expect(micButton).toHaveClass('animate-pulse')
      expect(micButton).toHaveClass('bg-red-600')
    })

    it('should apply correct styles to speaker button when enabled', () => {
      const { getByLabelText } = render(
        <VoiceInterface {...defaultProps} autoReadResponses={true} />
      )
      const speakerButton = getByLabelText('Disable auto-speak')
      
      expect(speakerButton).toHaveClass('bg-orange-600')
    })

    it('should show dragon bounce animation when playing audio', () => {
      mockUseElevenLabsTTS.mockReturnValue({
        ...defaultMockTTS,
        isSpeaking: true
      })

      render(<VoiceInterface {...defaultProps} />)
      const dragon = screen.getByText('🐉🔥')
      
      expect(dragon).toHaveClass('animate-bounce')
      expect(dragon).toHaveClass('scale-125')
    })
  })
})
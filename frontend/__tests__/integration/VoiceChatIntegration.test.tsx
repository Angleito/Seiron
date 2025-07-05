import React from 'react'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import * as fc from 'fast-check'
import { VoiceEnabledChat } from '@components/chat/VoiceEnabledChat'

// Mock dependencies
jest.mock('@hooks/voice/useSpeechRecognition')
jest.mock('@hooks/voice/useElevenLabsTTS')
jest.mock('@components/chat/useChatStream')

// Import mocked versions
import { useSpeechRecognition } from '@hooks/voice/useSpeechRecognition'
import { useElevenLabsTTS } from '@hooks/voice/useElevenLabsTTS'
import { useChatStream } from '@components/chat/useChatStream'

const mockUseSpeechRecognition = useSpeechRecognition as jest.MockedFunction<typeof useSpeechRecognition>
const mockUseElevenLabsTTS = useElevenLabsTTS as jest.MockedFunction<typeof useElevenLabsTTS>
const mockUseChatStream = useChatStream as jest.MockedFunction<typeof useChatStream>

// Property generators
const arbitraryMessage = fc.record({
  id: fc.string({ minLength: 1, maxLength: 20 }),
  content: fc.string({ minLength: 1, maxLength: 200 }),
  role: fc.constantFrom('user', 'assistant'),
  timestamp: fc.date(),
})

const arbitraryConversation = fc.array(arbitraryMessage, { minLength: 1, maxLength: 10 })

const arbitraryVoiceConfig = fc.record({
  apiKey: fc.string({ minLength: 10, maxLength: 50 }),
  voiceId: fc.string({ minLength: 5, maxLength: 20 }),
  enabled: fc.boolean(),
})

describe('Voice-Chat Integration Tests', () => {
  const defaultMockSpeechRecognition = {
    isListening: false,
    transcript: '',
    interimTranscript: '',
    error: null,
    startListening: jest.fn(() => () => Promise.resolve({ _tag: 'Right', right: undefined })),
    stopListening: jest.fn(() => () => Promise.resolve({ _tag: 'Right', right: undefined })),
    clearTranscript: jest.fn(),
    isSupported: true,
  }

  const defaultMockTTS = {
    isSpeaking: false,
    isLoading: false,
    error: null,
    cachedAudio: new Map(),
    speak: jest.fn(() => () => Promise.resolve({ _tag: 'Right', right: undefined })),
    stop: jest.fn(),
    preloadAudio: jest.fn(() => () => Promise.resolve({ _tag: 'Right', right: [] })),
  }

  const defaultMockChatStream = {
    messages: [],
    isLoading: false,
    error: null,
    sendMessage: jest.fn(),
    clearMessages: jest.fn(),
    retryLastMessage: jest.fn(),
  }

  const defaultProps = {
    elevenLabsConfig: {
      apiKey: 'test-api-key',
      voiceId: 'test-voice-id',
    },
    onTranscriptChange: jest.fn(),
    onError: jest.fn(),
  }

  beforeEach(() => {
    jest.clearAllMocks()
    mockUseSpeechRecognition.mockReturnValue(defaultMockSpeechRecognition)
    mockUseElevenLabsTTS.mockReturnValue(defaultMockTTS)
    mockUseChatStream.mockReturnValue(defaultMockChatStream)
  })

  describe('Property-based integration tests', () => {
    it('should handle any conversation flow with voice integration', () => {
      fc.assert(
        fc.property(arbitraryConversation, arbitraryVoiceConfig, (messages, voiceConfig) => {
          mockUseChatStream.mockReturnValue({
            ...defaultMockChatStream,
            messages,
          })

          render(
            <VoiceEnabledChat
              elevenLabsConfig={{
                apiKey: voiceConfig.apiKey,
                voiceId: voiceConfig.voiceId,
              }}
            />
          )

          // Component should render with messages
          expect(screen.getByLabelText(/start recording/i)).toBeInTheDocument()
          
          // Should display messages if any
          if (messages.length > 0) {
            messages.forEach(message => {
              if (message.content.length > 0) {
                expect(screen.getByText(message.content)).toBeInTheDocument()
              }
            })
          }
        })
      )
    })

    it('should maintain consistent state across voice-text interactions', async () => {
      fc.assert(
        fc.asyncProperty(
          fc.array(fc.string({ minLength: 1, maxLength: 50 }), { minLength: 1, maxLength: 5 }),
          async (userMessages) => {
            const user = userEvent.setup()
            let messagesSent = 0

            // Mock sendMessage to track calls
            const mockSendMessage = jest.fn((message) => {
              messagesSent++
              // Simulate adding message to conversation
              mockUseChatStream.mockReturnValue({
                ...defaultMockChatStream,
                messages: [
                  ...defaultMockChatStream.messages,
                  {
                    id: `user-${messagesSent}`,
                    content: message,
                    role: 'user',
                    timestamp: new Date(),
                  },
                ],
              })
            })

            mockUseChatStream.mockReturnValue({
              ...defaultMockChatStream,
              sendMessage: mockSendMessage,
            })

            render(<VoiceEnabledChat {...defaultProps} />)

            // Simulate sending messages via text input
            for (const message of userMessages) {
              const textInput = screen.getByPlaceholderText(/type your message/i)
              await user.clear(textInput)
              await user.type(textInput, message)
              await user.keyboard('{Enter}')
            }

            expect(mockSendMessage).toHaveBeenCalledTimes(userMessages.length)
            userMessages.forEach((message, index) => {
              expect(mockSendMessage).toHaveBeenNthCalledWith(index + 1, message)
            })
          }
        )
      )
    })
  })

  describe('Voice-to-text flow integration', () => {
    it('should transcribe speech and send as chat message', async () => {
      const user = userEvent.setup()
      const mockTranscript = 'Hello, I want to swap tokens'
      
      // Mock speech recognition with transcript
      mockUseSpeechRecognition.mockReturnValue({
        ...defaultMockSpeechRecognition,
        transcript: mockTranscript,
      })

      const mockSendMessage = jest.fn()
      mockUseChatStream.mockReturnValue({
        ...defaultMockChatStream,
        sendMessage: mockSendMessage,
      })

      render(<VoiceEnabledChat {...defaultProps} />)

      // Start voice recording
      const micButton = screen.getByLabelText(/start recording/i)
      await user.click(micButton)

      // Should start listening
      expect(defaultMockSpeechRecognition.startListening).toHaveBeenCalled()

      // Transcript should appear
      await waitFor(() => {
        expect(screen.getByText(mockTranscript)).toBeInTheDocument()
      })

      // Stop recording and send message
      const stopButton = screen.getByLabelText(/stop recording/i)
      await user.click(stopButton)

      // Should send the transcript as a message
      await waitFor(() => {
        expect(mockSendMessage).toHaveBeenCalledWith(mockTranscript)
      })
    })

    it('should handle interim transcript updates', async () => {
      const user = userEvent.setup()
      
      render(<VoiceEnabledChat {...defaultProps} />)

      // Start listening
      mockUseSpeechRecognition.mockReturnValue({
        ...defaultMockSpeechRecognition,
        isListening: true,
        interimTranscript: 'Hello...',
      })

      const micButton = screen.getByLabelText(/start recording/i)
      await user.click(micButton)

      await waitFor(() => {
        expect(screen.getByText(/Hello.../)).toBeInTheDocument()
      })

      // Update with final transcript
      mockUseSpeechRecognition.mockReturnValue({
        ...defaultMockSpeechRecognition,
        isListening: false,
        transcript: 'Hello world',
        interimTranscript: '',
      })

      // Component should re-render with updated state
      await waitFor(() => {
        expect(screen.getByText('Hello world')).toBeInTheDocument()
      })
    })

    it('should handle speech recognition errors gracefully', async () => {
      const user = userEvent.setup()
      const speechError = {
        type: 'NO_SUPPORT',
        message: 'Speech recognition not supported',
      }

      mockUseSpeechRecognition.mockReturnValue({
        ...defaultMockSpeechRecognition,
        error: speechError,
      })

      render(<VoiceEnabledChat {...defaultProps} />)

      const micButton = screen.getByLabelText(/start recording/i)
      await user.click(micButton)

      await waitFor(() => {
        expect(screen.getByText(/speech recognition not supported/i)).toBeInTheDocument()
      })
    })
  })

  describe('Text-to-speech integration', () => {
    it('should speak AI responses when auto-speak is enabled', async () => {
      const user = userEvent.setup()
      const aiResponse = 'I can help you swap tokens using our protocol.'

      // Enable auto-speak
      render(<VoiceEnabledChat {...defaultProps} autoReadResponses={true} />)

      // Mock receiving an AI response
      mockUseChatStream.mockReturnValue({
        ...defaultMockChatStream,
        messages: [
          {
            id: 'ai-1',
            content: aiResponse,
            role: 'assistant',
            timestamp: new Date(),
          },
        ],
      })

      // Component should re-render with new message
      await waitFor(() => {
        expect(screen.getByText(aiResponse)).toBeInTheDocument()
      })

      // Should attempt to speak the response
      await waitFor(() => {
        expect(defaultMockTTS.speak).toHaveBeenCalledWith(aiResponse)
      })
    })

    it('should not speak when auto-speak is disabled', async () => {
      const aiResponse = 'This should not be spoken.'

      render(<VoiceEnabledChat {...defaultProps} autoReadResponses={false} />)

      mockUseChatStream.mockReturnValue({
        ...defaultMockChatStream,
        messages: [
          {
            id: 'ai-2',
            content: aiResponse,
            role: 'assistant',
            timestamp: new Date(),
          },
        ],
      })

      await waitFor(() => {
        expect(screen.getByText(aiResponse)).toBeInTheDocument()
      })

      // Should not attempt to speak
      expect(defaultMockTTS.speak).not.toHaveBeenCalled()
    })

    it('should handle TTS errors gracefully', async () => {
      const user = userEvent.setup()
      const ttsError = {
        type: 'API_ERROR',
        message: 'TTS API quota exceeded',
      }

      mockUseElevenLabsTTS.mockReturnValue({
        ...defaultMockTTS,
        error: ttsError,
      })

      render(<VoiceEnabledChat {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText(/tts api quota exceeded/i)).toBeInTheDocument()
      })
    })

    it('should show speaking indicator during TTS playback', async () => {
      mockUseElevenLabsTTS.mockReturnValue({
        ...defaultMockTTS,
        isSpeaking: true,
      })

      render(<VoiceEnabledChat {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText(/speaking/i)).toBeInTheDocument()
      })
    })
  })

  describe('Simultaneous voice operations', () => {
    it('should disable microphone while TTS is speaking', async () => {
      const user = userEvent.setup()

      mockUseElevenLabsTTS.mockReturnValue({
        ...defaultMockTTS,
        isSpeaking: true,
      })

      render(<VoiceEnabledChat {...defaultProps} />)

      const micButton = screen.getByLabelText(/start recording/i)
      expect(micButton).toBeDisabled()

      // Should not be able to start listening
      await user.click(micButton)
      expect(defaultMockSpeechRecognition.startListening).not.toHaveBeenCalled()
    })

    it('should stop TTS when starting to record', async () => {
      const user = userEvent.setup()

      render(<VoiceEnabledChat {...defaultProps} />)

      const micButton = screen.getByLabelText(/start recording/i)
      await user.click(micButton)

      // Should stop any ongoing TTS
      expect(defaultMockTTS.stop).toHaveBeenCalled()
    })

    it('should handle rapid voice interactions', async () => {
      const user = userEvent.setup()

      render(<VoiceEnabledChat {...defaultProps} />)

      const micButton = screen.getByLabelText(/start recording/i)

      // Rapid start/stop cycles
      for (let i = 0; i < 3; i++) {
        await user.click(micButton)
        await user.click(micButton) // Click again to stop
      }

      // Should handle all interactions gracefully
      expect(defaultMockSpeechRecognition.startListening).toHaveBeenCalledTimes(3)
      expect(defaultMockSpeechRecognition.stopListening).toHaveBeenCalledTimes(3)
    })
  })

  describe('Performance and cleanup', () => {
    it('should preload common TTS phrases', async () => {
      render(<VoiceEnabledChat {...defaultProps} />)

      await waitFor(() => {
        expect(defaultMockTTS.preloadAudio).toHaveBeenCalled()
      })

      // Check if common phrases were preloaded
      const preloadCall = defaultMockTTS.preloadAudio.mock.calls[0]
      if (preloadCall) {
        const preloadedTexts = preloadCall[0]
        expect(Array.isArray(preloadedTexts)).toBe(true)
        expect(preloadedTexts.length).toBeGreaterThan(0)
      }
    })

    it('should cleanup resources on unmount', () => {
      const { unmount } = render(<VoiceEnabledChat {...defaultProps} />)

      unmount()

      // Should stop any ongoing operations
      expect(defaultMockTTS.stop).toHaveBeenCalled()
      expect(defaultMockSpeechRecognition.stopListening).toHaveBeenCalled()
    })

    it('should handle rapid component re-renders', () => {
      const { rerender } = render(<VoiceEnabledChat {...defaultProps} />)

      // Rapid re-renders with different props
      for (let i = 0; i < 5; i++) {
        rerender(
          <VoiceEnabledChat
            {...defaultProps}
            elevenLabsConfig={{
              ...defaultProps.elevenLabsConfig,
              voiceId: `voice-${i}`,
            }}
          />
        )
      }

      // Should remain stable
      expect(screen.getByLabelText(/start recording/i)).toBeInTheDocument()
    })
  })

  describe('Accessibility integration', () => {
    it('should provide proper ARIA labels for voice controls', () => {
      render(<VoiceEnabledChat {...defaultProps} />)

      expect(screen.getByLabelText(/start recording/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/enable auto-speak/i)).toBeInTheDocument()
    })

    it('should announce state changes to screen readers', async () => {
      const user = userEvent.setup()

      render(<VoiceEnabledChat {...defaultProps} />)

      // Start recording
      mockUseSpeechRecognition.mockReturnValue({
        ...defaultMockSpeechRecognition,
        isListening: true,
      })

      const micButton = screen.getByLabelText(/start recording/i)
      await user.click(micButton)

      await waitFor(() => {
        expect(screen.getByLabelText(/stop recording/i)).toBeInTheDocument()
      })
    })

    it('should support keyboard navigation for voice controls', async () => {
      const user = userEvent.setup()

      render(<VoiceEnabledChat {...defaultProps} />)

      // Tab to voice controls
      await user.tab()
      await user.tab()

      const micButton = screen.getByLabelText(/start recording/i)
      expect(micButton).toHaveFocus()

      // Use Enter key to activate
      await user.keyboard('{Enter}')
      expect(defaultMockSpeechRecognition.startListening).toHaveBeenCalled()
    })
  })
})
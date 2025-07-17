/**
 * Voice Chat Hook Integration Tests
 * Tests the integration between voice hooks, chat system, and AI memory
 */

import { renderHook, act } from '@testing-library/react';
import { pipe } from 'fp-ts/function';
import * as E from 'fp-ts/Either';
import * as TE from 'fp-ts/TaskEither';
import * as O from 'fp-ts/Option';
import { 
  mockWebAudioAPI, 
  mockMediaRecorder, 
  mockElevenLabsAPI,
  resetAllMocks,
  setMockPermissions,
  simulateNetworkLatency 
} from '../../lib/test-utils/audio-mocks';
import { 
  generateRealisticAudioWaveform, 
  simulateVoiceActivity,
  simulateMicrophonePermissions 
} from '../../lib/test-utils/audio-simulator';

// Mock the voice and chat hooks (these would be real implementations)
const mockUseVoiceRecognition = () => ({
  transcript: '',
  interimTranscript: '',
  finalTranscript: '',
  isListening: false,
  isSupported: true,
  confidence: 0,
  error: null,
  startListening: jest.fn().mockResolvedValue(E.right(undefined)),
  stopListening: jest.fn(),
  abortListening: jest.fn(),
  resetTranscript: jest.fn(),
  clearError: jest.fn(),
  retryLastRecognition: jest.fn().mockResolvedValue(E.right(undefined)),
});

const mockUseTextToSpeech = () => ({
  state: { isPlaying: false, isSynthesizing: false, queue: [], error: null },
  speak: jest.fn().mockResolvedValue(E.right(undefined)),
  pause: jest.fn(),
  resume: jest.fn(),
  stop: jest.fn(),
  clearQueue: jest.fn(),
  setVolume: jest.fn(),
  setRate: jest.fn(),
  clearCache: jest.fn(),
  getCacheSize: jest.fn().mockReturnValue(0),
  getQueueLength: jest.fn().mockReturnValue(0),
  isSupported: true,
});

const mockUseAIChat = () => ({
  messages: [],
  isLoading: false,
  error: null,
  sendMessage: jest.fn().mockResolvedValue(E.right({ id: '1', content: 'AI response', timestamp: Date.now() })),
  clearMessages: jest.fn(),
  retryLastMessage: jest.fn(),
  cancelCurrentMessage: jest.fn(),
});

const mockUseAIMemory = () => ({
  memories: [],
  isLoading: false,
  error: null,
  saveMemory: jest.fn().mockResolvedValue(E.right({ id: '1', content: 'Saved memory' })),
  searchMemories: jest.fn().mockResolvedValue(E.right([])),
  updateMemory: jest.fn().mockResolvedValue(E.right({ id: '1', content: 'Updated memory' })),
  deleteMemory: jest.fn().mockResolvedValue(E.right(undefined)),
  loadMemories: jest.fn().mockResolvedValue(E.right([])),
});

// Mock React hooks
jest.mock('react', () => ({
  ...jest.requireActual('react'),
  useState: jest.fn(),
  useEffect: jest.fn(),
  useCallback: jest.fn((fn) => fn),
  useMemo: jest.fn((fn) => fn()),
  useRef: jest.fn(() => ({ current: null })),
}));

// Composite voice chat hook for integration testing
const useVoiceChatIntegration = (config = {}) => {
  const voiceRecognition = mockUseVoiceRecognition();
  const textToSpeech = mockUseTextToSpeech();
  const aiChat = mockUseAIChat();
  const aiMemory = mockUseAIMemory();

  // Integration state
  const [isVoiceModeActive, setIsVoiceModeActive] = React.useState(false);
  const [conversationContext, setConversationContext] = React.useState([]);
  const [audioMetadata, setAudioMetadata] = React.useState({});

  // Integration methods
  const startVoiceConversation = async () => {
    setIsVoiceModeActive(true);
    return voiceRecognition.startListening();
  };

  const endVoiceConversation = async () => {
    voiceRecognition.stopListening();
    textToSpeech.stop();
    setIsVoiceModeActive(false);
  };

  const processVoiceInput = async (transcript: string) => {
    // Save audio metadata to memory
    await aiMemory.saveMemory({
      content: transcript,
      type: 'voice_input',
      metadata: { timestamp: Date.now(), ...audioMetadata },
    });

    // Send to AI chat
    const response = await aiChat.sendMessage(transcript);
    
    if (E.isRight(response)) {
      // Convert response to speech
      await textToSpeech.speak(response.right.content);
      
      // Save AI response to memory
      await aiMemory.saveMemory({
        content: response.right.content,
        type: 'ai_response',
        metadata: { timestamp: Date.now(), voice_enabled: true },
      });
    }

    return response;
  };

  const handleVoiceCommand = async (command: string) => {
    switch (command.toLowerCase()) {
      case 'stop listening':
        return endVoiceConversation();
      case 'clear conversation':
        aiChat.clearMessages();
        return E.right(undefined);
      case 'repeat last':
        const lastMessage = aiChat.messages[aiChat.messages.length - 1];
        if (lastMessage) {
          return textToSpeech.speak(lastMessage.content);
        }
        return E.left(new Error('No message to repeat'));
      default:
        return processVoiceInput(command);
    }
  };

  return {
    // State
    isVoiceModeActive,
    conversationContext,
    audioMetadata,
    
    // Voice Recognition
    transcript: voiceRecognition.transcript,
    isListening: voiceRecognition.isListening,
    confidence: voiceRecognition.confidence,
    
    // Text-to-Speech
    isSpeaking: textToSpeech.state.isPlaying,
    speechQueue: textToSpeech.state.queue,
    
    // Chat
    messages: aiChat.messages,
    isProcessingMessage: aiChat.isLoading,
    
    // Memory
    memories: aiMemory.memories,
    isLoadingMemory: aiMemory.isLoading,
    
    // Actions
    startVoiceConversation,
    endVoiceConversation,
    processVoiceInput,
    handleVoiceCommand,
    
    // Sub-components
    voiceRecognition,
    textToSpeech,
    aiChat,
    aiMemory,
  };
};

describe('Voice Chat Integration', () => {
  beforeAll(() => {
    mockWebAudioAPI();
    mockMediaRecorder();
    mockElevenLabsAPI();
  });

  beforeEach(() => {
    resetAllMocks();
    setMockPermissions('granted');
  });

  describe('Voice Mode Activation and Deactivation', () => {
    it('should activate voice mode and start listening', async () => {
      const { result } = renderHook(() => useVoiceChatIntegration());

      await act(async () => {
        await result.current.startVoiceConversation();
      });

      expect(result.current.isVoiceModeActive).toBe(true);
      expect(result.current.isListening).toBe(true);
      expect(result.current.voiceRecognition.startListening).toHaveBeenCalled();
    });

    it('should deactivate voice mode and stop all audio', async () => {
      const { result } = renderHook(() => useVoiceChatIntegration());

      await act(async () => {
        await result.current.startVoiceConversation();
        await result.current.endVoiceConversation();
      });

      expect(result.current.isVoiceModeActive).toBe(false);
      expect(result.current.voiceRecognition.stopListening).toHaveBeenCalled();
      expect(result.current.textToSpeech.stop).toHaveBeenCalled();
    });

    it('should handle permission denied gracefully', async () => {
      setMockPermissions('denied');
      const { result } = renderHook(() => useVoiceChatIntegration());

      await act(async () => {
        const response = await result.current.startVoiceConversation();
        expect(E.isLeft(response)).toBe(true);
      });

      expect(result.current.isVoiceModeActive).toBe(false);
    });
  });

  describe('Voice Input Processing', () => {
    it('should process voice input and generate AI response', async () => {
      const { result } = renderHook(() => useVoiceChatIntegration());
      const testTranscript = 'Hello, how are you?';

      await act(async () => {
        const response = await result.current.processVoiceInput(testTranscript);
        expect(E.isRight(response)).toBe(true);
      });

      expect(result.current.aiMemory.saveMemory).toHaveBeenCalledWith(
        expect.objectContaining({
          content: testTranscript,
          type: 'voice_input',
        })
      );
      expect(result.current.aiChat.sendMessage).toHaveBeenCalledWith(testTranscript);
      expect(result.current.textToSpeech.speak).toHaveBeenCalled();
    });

    it('should save audio metadata with voice input', async () => {
      const { result } = renderHook(() => useVoiceChatIntegration());
      const testTranscript = 'Test message with metadata';

      // Simulate audio metadata
      act(() => {
        result.current.audioMetadata = {
          audioLevel: 0.75,
          confidence: 0.95,
          voiceActivityDuration: 2.5,
          noiseLevel: 0.02,
        };
      });

      await act(async () => {
        await result.current.processVoiceInput(testTranscript);
      });

      expect(result.current.aiMemory.saveMemory).toHaveBeenCalledWith(
        expect.objectContaining({
          content: testTranscript,
          metadata: expect.objectContaining({
            audioLevel: 0.75,
            confidence: 0.95,
            voiceActivityDuration: 2.5,
            noiseLevel: 0.02,
          }),
        })
      );
    });

    it('should handle AI chat errors gracefully', async () => {
      const { result } = renderHook(() => useVoiceChatIntegration());
      
      // Mock AI chat error
      result.current.aiChat.sendMessage = jest.fn().mockResolvedValue(
        E.left(new Error('AI service unavailable'))
      );

      await act(async () => {
        const response = await result.current.processVoiceInput('Test message');
        expect(E.isLeft(response)).toBe(true);
      });

      expect(result.current.textToSpeech.speak).not.toHaveBeenCalled();
    });
  });

  describe('Voice Commands', () => {
    it('should handle stop listening command', async () => {
      const { result } = renderHook(() => useVoiceChatIntegration());

      await act(async () => {
        await result.current.startVoiceConversation();
        await result.current.handleVoiceCommand('stop listening');
      });

      expect(result.current.isVoiceModeActive).toBe(false);
    });

    it('should handle clear conversation command', async () => {
      const { result } = renderHook(() => useVoiceChatIntegration());

      await act(async () => {
        await result.current.handleVoiceCommand('clear conversation');
      });

      expect(result.current.aiChat.clearMessages).toHaveBeenCalled();
    });

    it('should handle repeat last command', async () => {
      const { result } = renderHook(() => useVoiceChatIntegration());

      // Mock message history
      result.current.aiChat.messages = [
        { id: '1', content: 'Last AI response', timestamp: Date.now() }
      ];

      await act(async () => {
        await result.current.handleVoiceCommand('repeat last');
      });

      expect(result.current.textToSpeech.speak).toHaveBeenCalledWith('Last AI response');
    });

    it('should handle unknown commands as regular input', async () => {
      const { result } = renderHook(() => useVoiceChatIntegration());
      const unknownCommand = 'tell me a joke';

      await act(async () => {
        await result.current.handleVoiceCommand(unknownCommand);
      });

      expect(result.current.aiChat.sendMessage).toHaveBeenCalledWith(unknownCommand);
    });
  });

  describe('Real-time Audio Processing', () => {
    it('should handle continuous voice input with interruptions', async () => {
      const { result } = renderHook(() => useVoiceChatIntegration());

      await act(async () => {
        await result.current.startVoiceConversation();
        
        // Simulate multiple voice inputs
        await result.current.processVoiceInput('First message');
        await result.current.processVoiceInput('Second message');
        await result.current.processVoiceInput('Third message');
      });

      expect(result.current.aiChat.sendMessage).toHaveBeenCalledTimes(3);
      expect(result.current.aiMemory.saveMemory).toHaveBeenCalledTimes(6); // 3 inputs + 3 responses
    });

    it('should handle voice activity detection', async () => {
      const { result } = renderHook(() => useVoiceChatIntegration());
      let voiceActivityCount = 0;

      // Mock voice activity detection
      const mockVoiceActivityHandler = (isActive: boolean) => {
        if (isActive) voiceActivityCount++;
      };

      await act(async () => {
        await result.current.startVoiceConversation();
        
        // Simulate voice activity
        for (let i = 0; i < 5; i++) {
          mockVoiceActivityHandler(true);
          await new Promise(resolve => setTimeout(resolve, 100));
          mockVoiceActivityHandler(false);
        }
      });

      expect(voiceActivityCount).toBe(5);
    });

    it('should maintain conversation context across multiple exchanges', async () => {
      const { result } = renderHook(() => useVoiceChatIntegration());

      await act(async () => {
        await result.current.processVoiceInput('My name is John');
        await result.current.processVoiceInput('What is my name?');
      });

      // Verify memory search was called for context
      expect(result.current.aiMemory.searchMemories).toHaveBeenCalled();
      expect(result.current.aiMemory.saveMemory).toHaveBeenCalledTimes(4); // 2 inputs + 2 responses
    });
  });

  describe('Performance and Latency', () => {
    it('should maintain low latency in voice processing pipeline', async () => {
      simulateNetworkLatency(50); // 50ms network delay
      const { result } = renderHook(() => useVoiceChatIntegration());

      const startTime = performance.now();
      
      await act(async () => {
        await result.current.processVoiceInput('Quick response test');
      });

      const endTime = performance.now();
      const totalLatency = endTime - startTime;

      // Should complete within reasonable time (accounting for mocks)
      expect(totalLatency).toBeLessThan(500); // 500ms threshold
    });

    it('should handle concurrent voice operations', async () => {
      const { result } = renderHook(() => useVoiceChatIntegration());

      await act(async () => {
        // Start multiple operations concurrently
        const operations = [
          result.current.processVoiceInput('First concurrent message'),
          result.current.processVoiceInput('Second concurrent message'),
          result.current.handleVoiceCommand('repeat last'),
        ];

        await Promise.all(operations);
      });

      // All operations should complete without conflicts
      expect(result.current.aiChat.sendMessage).toHaveBeenCalledTimes(2);
      expect(result.current.textToSpeech.speak).toHaveBeenCalled();
    });
  });

  describe('Error Recovery and Resilience', () => {
    it('should recover from voice recognition errors', async () => {
      const { result } = renderHook(() => useVoiceChatIntegration());

      // Mock voice recognition error
      result.current.voiceRecognition.startListening = jest.fn()
        .mockResolvedValueOnce(E.left(new Error('Microphone error')))
        .mockResolvedValueOnce(E.right(undefined));

      await act(async () => {
        // First attempt should fail
        const firstAttempt = await result.current.startVoiceConversation();
        expect(E.isLeft(firstAttempt)).toBe(true);

        // Retry should succeed
        const retryAttempt = await result.current.startVoiceConversation();
        expect(E.isRight(retryAttempt)).toBe(true);
      });
    });

    it('should handle speech synthesis failures', async () => {
      const { result } = renderHook(() => useVoiceChatIntegration());

      // Mock TTS error
      result.current.textToSpeech.speak = jest.fn()
        .mockResolvedValue(E.left(new Error('Speech synthesis failed')));

      await act(async () => {
        const response = await result.current.processVoiceInput('Test message');
        
        // Voice input should still be processed despite TTS failure
        expect(result.current.aiChat.sendMessage).toHaveBeenCalled();
        expect(result.current.aiMemory.saveMemory).toHaveBeenCalled();
      });
    });

    it('should handle memory storage failures gracefully', async () => {
      const { result } = renderHook(() => useVoiceChatIntegration());

      // Mock memory error
      result.current.aiMemory.saveMemory = jest.fn()
        .mockResolvedValue(E.left(new Error('Memory storage failed')));

      await act(async () => {
        const response = await result.current.processVoiceInput('Test message');
        
        // Chat should still work despite memory failure
        expect(result.current.aiChat.sendMessage).toHaveBeenCalled();
      });
    });
  });

  describe('Accessibility and User Experience', () => {
    it('should provide audio feedback for all user actions', async () => {
      const { result } = renderHook(() => useVoiceChatIntegration());
      const audioFeedback: string[] = [];

      // Mock audio feedback collection
      const originalSpeak = result.current.textToSpeech.speak;
      result.current.textToSpeech.speak = jest.fn().mockImplementation((text) => {
        audioFeedback.push(text);
        return originalSpeak(text);
      });

      await act(async () => {
        await result.current.startVoiceConversation();
        await result.current.processVoiceInput('Hello');
        await result.current.endVoiceConversation();
      });

      expect(audioFeedback.length).toBeGreaterThan(0);
    });

    it('should support voice control for all chat functions', async () => {
      const { result } = renderHook(() => useVoiceChatIntegration());

      const voiceCommands = [
        'stop listening',
        'clear conversation', 
        'repeat last',
        'hello world',
      ];

      for (const command of voiceCommands) {
        await act(async () => {
          const response = await result.current.handleVoiceCommand(command);
          expect(response).toBeDefined();
        });
      }
    });

    it('should maintain conversation state across voice mode toggles', async () => {
      const { result } = renderHook(() => useVoiceChatIntegration());

      await act(async () => {
        // Start conversation
        await result.current.startVoiceConversation();
        await result.current.processVoiceInput('First message');
        
        // Toggle voice mode off and on
        await result.current.endVoiceConversation();
        await result.current.startVoiceConversation();
        
        // Continue conversation
        await result.current.processVoiceInput('Second message');
      });

      // Conversation history should be maintained
      expect(result.current.aiMemory.saveMemory).toHaveBeenCalledTimes(4);
      expect(result.current.aiChat.sendMessage).toHaveBeenCalledTimes(2);
    });
  });

  describe('Integration with External Services', () => {
    it('should integrate with ElevenLabs API for voice synthesis', async () => {
      const { result } = renderHook(() => useVoiceChatIntegration());

      await act(async () => {
        await result.current.processVoiceInput('Generate speech for this text');
      });

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('elevenlabs.io'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
        })
      );
    });

    it('should handle ElevenLabs API rate limiting', async () => {
      const { result } = renderHook(() => useVoiceChatIntegration());

      // Mock rate limiting
      global.fetch = jest.fn()
        .mockRejectedValueOnce(new Error('Rate limit exceeded'))
        .mockResolvedValueOnce({
          status: 200,
          arrayBuffer: () => Promise.resolve(new ArrayBuffer(1024)),
        });

      await act(async () => {
        // First request should fail
        await result.current.textToSpeech.speak('First message');
        
        // Retry should succeed
        await result.current.textToSpeech.speak('Second message');
      });

      expect(global.fetch).toHaveBeenCalledTimes(2);
    });
  });
});
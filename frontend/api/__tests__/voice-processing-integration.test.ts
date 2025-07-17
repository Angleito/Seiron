/**
 * Backend Voice Processing Integration Tests
 * Tests the integration between voice processing APIs, audio processing, and external services
 */

import { pipe } from 'fp-ts/function';
import * as E from 'fp-ts/Either';
import * as TE from 'fp-ts/TaskEither';
import * as O from 'fp-ts/Option';
import { 
  mockWebAudioAPI, 
  mockMediaRecorder, 
  mockElevenLabsAPI,
  resetAllMocks,
  setElevenLabsRateLimit,
  simulateNetworkLatency 
} from '../../lib/test-utils/audio-mocks';
import { 
  generateRealisticAudioWaveform, 
  simulateAudioQualityVariations,
  measureAudioProcessingLatency 
} from '../../lib/test-utils/audio-simulator';

// Mock API endpoints
const API_ENDPOINTS = {
  VOICE_SYNTHESIS: '/api/voice/synthesize',
  SPEECH_RECOGNITION: '/api/voice/recognize',
  AUDIO_PROCESSING: '/api/voice/process',
  VOICE_ANALYSIS: '/api/voice/analyze',
  MEMORY_INTEGRATION: '/api/ai/memory',
} as const;

// Mock audio processing utilities
const mockAudioProcessor = {
  convertFormat: jest.fn().mockImplementation(async (audioData: ArrayBuffer, targetFormat: string) => {
    // Simulate audio format conversion
    await new Promise(resolve => setTimeout(resolve, 50));
    return new ArrayBuffer(audioData.byteLength * 0.8); // Simulate compression
  }),
  
  enhanceAudio: jest.fn().mockImplementation(async (audioData: ArrayBuffer) => {
    // Simulate audio enhancement
    await new Promise(resolve => setTimeout(resolve, 100));
    return new ArrayBuffer(audioData.byteLength);
  }),
  
  extractFeatures: jest.fn().mockImplementation(async (audioData: ArrayBuffer) => {
    // Simulate feature extraction
    await new Promise(resolve => setTimeout(resolve, 75));
    return {
      duration: 2.5,
      sampleRate: 16000,
      channels: 1,
      rms: 0.25,
      peak: 0.8,
      spectralCentroid: 1500,
      mfcc: new Float32Array(13),
      pitch: 220,
      voiceActivitySegments: [{ start: 0.2, end: 2.0 }],
    };
  }),
  
  compressAudio: jest.fn().mockImplementation(async (audioData: ArrayBuffer, quality: number) => {
    const compressionRatio = 1 - (quality * 0.7);
    await new Promise(resolve => setTimeout(resolve, 30));
    return new ArrayBuffer(Math.floor(audioData.byteLength * compressionRatio));
  }),
};

// Mock voice synthesis API
const mockVoiceSynthesisAPI = {
  synthesize: jest.fn().mockImplementation(async (params: {
    text: string;
    voiceId: string;
    settings?: any;
  }) => {
    const { text, voiceId, settings = {} } = params;
    
    // Simulate processing time based on text length
    const processingTime = Math.max(100, text.length * 10);
    await new Promise(resolve => setTimeout(resolve, processingTime));
    
    // Generate mock audio data
    const audioSize = text.length * 50; // Simulate realistic audio size
    const audioBuffer = new ArrayBuffer(audioSize);
    
    return {
      audioBuffer,
      format: 'audio/mpeg',
      duration: text.length * 0.1, // ~100ms per character
      sampleRate: 22050,
      bitRate: 128000,
      metadata: {
        voiceId,
        textLength: text.length,
        processingTime,
        settings,
      },
    };
  }),
  
  getVoices: jest.fn().mockResolvedValue([
    { id: 'voice-1', name: 'Sarah', language: 'en-US', gender: 'female' },
    { id: 'voice-2', name: 'John', language: 'en-US', gender: 'male' },
    { id: 'voice-3', name: 'Emma', language: 'en-GB', gender: 'female' },
  ]),
  
  getVoiceSettings: jest.fn().mockResolvedValue({
    stability: 0.5,
    similarityBoost: 0.5,
    style: 0.0,
    useSpeakerBoost: true,
  }),
};

// Mock speech recognition API
const mockSpeechRecognitionAPI = {
  transcribe: jest.fn().mockImplementation(async (audioData: ArrayBuffer, options: {
    language?: string;
    model?: string;
    enablePunctuation?: boolean;
    enableWordTimestamps?: boolean;
  } = {}) => {
    // Simulate transcription processing
    const processingTime = Math.max(200, audioData.byteLength / 1000);
    await new Promise(resolve => setTimeout(resolve, processingTime));
    
    // Generate mock transcription
    const mockTranscripts = [
      'Hello, this is a test transcription.',
      'The weather is nice today.',
      'Can you help me with this task?',
      'Thank you for your assistance.',
    ];
    
    const transcript = mockTranscripts[Math.floor(Math.random() * mockTranscripts.length)];
    
    return {
      transcript,
      confidence: 0.85 + Math.random() * 0.1, // 0.85-0.95
      language: options.language || 'en-US',
      duration: audioData.byteLength / 16000, // Assume 16kHz sample rate
      wordTimestamps: options.enableWordTimestamps ? transcript.split(' ').map((word, index) => ({
        word,
        start: index * 0.5,
        end: (index + 1) * 0.5,
        confidence: 0.8 + Math.random() * 0.2,
      })) : undefined,
      metadata: {
        model: options.model || 'whisper-1',
        processingTime,
        audioFormat: 'audio/wav',
      },
    };
  }),
  
  getLanguages: jest.fn().mockResolvedValue([
    { code: 'en-US', name: 'English (US)' },
    { code: 'en-GB', name: 'English (UK)' },
    { code: 'es-ES', name: 'Spanish' },
    { code: 'fr-FR', name: 'French' },
  ]),
};

// Mock memory integration API
const mockMemoryIntegrationAPI = {
  saveAudioMemory: jest.fn().mockImplementation(async (memory: {
    content: string;
    audioMetadata: any;
    type: 'voice_input' | 'ai_response';
  }) => {
    await new Promise(resolve => setTimeout(resolve, 50));
    return {
      id: `memory-${Date.now()}`,
      ...memory,
      timestamp: Date.now(),
    };
  }),
  
  searchAudioMemories: jest.fn().mockImplementation(async (query: string, filters?: any) => {
    await new Promise(resolve => setTimeout(resolve, 100));
    return [
      {
        id: 'memory-1',
        content: 'Previous voice conversation about weather',
        audioMetadata: { duration: 3.5, confidence: 0.9 },
        type: 'voice_input',
        timestamp: Date.now() - 86400000, // 24 hours ago
        relevanceScore: 0.8,
      },
    ];
  }),
  
  getAudioInsights: jest.fn().mockImplementation(async (timeRange?: { start: number; end: number }) => {
    await new Promise(resolve => setTimeout(resolve, 75));
    return {
      totalVoiceInteractions: 45,
      averageConfidence: 0.87,
      mostCommonTopics: ['weather', 'tasks', 'questions'],
      languageDistribution: { 'en-US': 0.8, 'es-ES': 0.2 },
      voiceActivityHours: [9, 14, 18, 21], // Peak hours
      averageResponseTime: 1.2, // seconds
    };
  }),
};

describe('Voice Processing Integration', () => {
  beforeAll(() => {
    mockWebAudioAPI();
    mockMediaRecorder();
    mockElevenLabsAPI();
    
    // Mock fetch for API calls
    global.fetch = jest.fn();
  });

  beforeEach(() => {
    resetAllMocks();
    jest.clearAllMocks();
  });

  describe('Voice Synthesis API Integration', () => {
    it('should synthesize speech with correct parameters', async () => {
      const testText = 'Hello, this is a test message for voice synthesis.';
      const voiceId = 'voice-1';
      const settings = { stability: 0.7, similarityBoost: 0.6 };

      const result = await mockVoiceSynthesisAPI.synthesize({
        text: testText,
        voiceId,
        settings,
      });

      expect(result.audioBuffer).toBeInstanceOf(ArrayBuffer);
      expect(result.audioBuffer.byteLength).toBeGreaterThan(0);
      expect(result.metadata.voiceId).toBe(voiceId);
      expect(result.metadata.textLength).toBe(testText.length);
      expect(result.duration).toBeCloseTo(testText.length * 0.1, 1);
    });

    it('should handle long text synthesis efficiently', async () => {
      const longText = 'This is a very long text that should be processed efficiently. '.repeat(20);
      
      const startTime = performance.now();
      const result = await mockVoiceSynthesisAPI.synthesize({
        text: longText,
        voiceId: 'voice-1',
      });
      const endTime = performance.now();

      expect(result.audioBuffer.byteLength).toBeGreaterThan(longText.length * 30);
      expect(endTime - startTime).toBeLessThan(longText.length * 15); // Reasonable processing time
    });

    it('should retrieve available voices', async () => {
      const voices = await mockVoiceSynthesisAPI.getVoices();

      expect(voices).toHaveLength(3);
      expect(voices[0]).toHaveProperty('id');
      expect(voices[0]).toHaveProperty('name');
      expect(voices[0]).toHaveProperty('language');
      expect(voices[0]).toHaveProperty('gender');
    });

    it('should get voice settings', async () => {
      const settings = await mockVoiceSynthesisAPI.getVoiceSettings();

      expect(settings).toHaveProperty('stability');
      expect(settings).toHaveProperty('similarityBoost');
      expect(settings.stability).toBeGreaterThanOrEqual(0);
      expect(settings.stability).toBeLessThanOrEqual(1);
    });

    it('should handle synthesis errors gracefully', async () => {
      mockVoiceSynthesisAPI.synthesize.mockRejectedValueOnce(new Error('Voice synthesis failed'));

      await expect(mockVoiceSynthesisAPI.synthesize({
        text: 'Test text',
        voiceId: 'invalid-voice',
      })).rejects.toThrow('Voice synthesis failed');
    });
  });

  describe('Speech Recognition API Integration', () => {
    it('should transcribe audio with high accuracy', async () => {
      const audioData = generateRealisticAudioWaveform({
        duration: 3000,
        sampleRate: 16000,
        waveform: 'voice',
        amplitude: 0.7,
      });

      const audioBuffer = audioData.buffer;
      const result = await mockSpeechRecognitionAPI.transcribe(audioBuffer, {
        language: 'en-US',
        enablePunctuation: true,
        enableWordTimestamps: true,
      });

      expect(result.transcript).toBeTruthy();
      expect(result.confidence).toBeGreaterThan(0.8);
      expect(result.language).toBe('en-US');
      expect(result.wordTimestamps).toBeDefined();
      expect(result.wordTimestamps!.length).toBeGreaterThan(0);
    });

    it('should handle different audio qualities', async () => {
      const qualities = ['high', 'medium', 'low', 'noisy'] as const;
      
      for (const quality of qualities) {
        const audioData = simulateAudioQualityVariations(quality, {
          duration: 2000,
          sampleRate: 16000,
        });

        const result = await mockSpeechRecognitionAPI.transcribe(audioData.buffer);
        
        expect(result.transcript).toBeTruthy();
        if (quality === 'high') {
          expect(result.confidence).toBeGreaterThan(0.9);
        } else if (quality === 'noisy') {
          expect(result.confidence).toBeGreaterThan(0.7); // Lower but still acceptable
        }
      }
    });

    it('should support multiple languages', async () => {
      const languages = await mockSpeechRecognitionAPI.getLanguages();

      expect(languages).toHaveLength(4);
      expect(languages.map(l => l.code)).toContain('en-US');
      expect(languages.map(l => l.code)).toContain('es-ES');
    });

    it('should provide word-level timestamps when requested', async () => {
      const audioData = new ArrayBuffer(16000 * 2); // 2 seconds of audio
      const result = await mockSpeechRecognitionAPI.transcribe(audioData, {
        enableWordTimestamps: true,
      });

      expect(result.wordTimestamps).toBeDefined();
      if (result.wordTimestamps) {
        expect(result.wordTimestamps.length).toBeGreaterThan(0);
        result.wordTimestands.forEach(word => {
          expect(word).toHaveProperty('word');
          expect(word).toHaveProperty('start');
          expect(word).toHaveProperty('end');
          expect(word).toHaveProperty('confidence');
        });
      }
    });
  });

  describe('Audio Processing Pipeline', () => {
    it('should process audio through complete pipeline', async () => {
      const originalAudio = generateRealisticAudioWaveform({
        duration: 5000,
        sampleRate: 44100,
        waveform: 'voice',
        amplitude: 0.8,
      });

      const audioBuffer = originalAudio.buffer;

      // Step 1: Convert format
      const convertedAudio = await mockAudioProcessor.convertFormat(audioBuffer, 'audio/wav');
      expect(convertedAudio.byteLength).toBeLessThan(audioBuffer.byteLength);

      // Step 2: Enhance audio
      const enhancedAudio = await mockAudioProcessor.enhanceAudio(convertedAudio);
      expect(enhancedAudio.byteLength).toBe(convertedAudio.byteLength);

      // Step 3: Extract features
      const features = await mockAudioProcessor.extractFeatures(enhancedAudio);
      expect(features.duration).toBeCloseTo(5.0, 1);
      expect(features.sampleRate).toBe(16000);
      expect(features.voiceActivitySegments).toHaveLength(1);

      // Step 4: Compress for storage
      const compressedAudio = await mockAudioProcessor.compressAudio(enhancedAudio, 0.8);
      expect(compressedAudio.byteLength).toBeLessThan(enhancedAudio.byteLength);
    });

    it('should measure processing latency', async () => {
      const audioData = new ArrayBuffer(16000 * 3); // 3 seconds of audio

      const latency = await measureAudioProcessingLatency(async () => {
        await mockAudioProcessor.convertFormat(audioData, 'audio/mp3');
        await mockAudioProcessor.enhanceAudio(audioData);
        await mockAudioProcessor.extractFeatures(audioData);
      });

      expect(latency).toBeLessThan(500); // Should complete within 500ms
    });

    it('should handle audio feature extraction accurately', async () => {
      const audioData = generateRealisticAudioWaveform({
        duration: 3000,
        sampleRate: 16000,
        waveform: 'voice',
        frequency: 220, // A3 note
        amplitude: 0.6,
      });

      const features = await mockAudioProcessor.extractFeatures(audioData.buffer);

      expect(features.pitch).toBeCloseTo(220, 50); // Within 50Hz tolerance
      expect(features.rms).toBeGreaterThan(0.1);
      expect(features.peak).toBeGreaterThan(0.5);
      expect(features.spectralCentroid).toBeGreaterThan(100);
      expect(features.mfcc).toHaveLength(13);
    });
  });

  describe('Memory Integration', () => {
    it('should save voice interactions to memory', async () => {
      const voiceMemory = {
        content: 'User asked about the weather today',
        audioMetadata: {
          duration: 2.5,
          confidence: 0.92,
          language: 'en-US',
          audioLevel: 0.7,
        },
        type: 'voice_input' as const,
      };

      const savedMemory = await mockMemoryIntegrationAPI.saveAudioMemory(voiceMemory);

      expect(savedMemory.id).toBeTruthy();
      expect(savedMemory.content).toBe(voiceMemory.content);
      expect(savedMemory.audioMetadata).toEqual(voiceMemory.audioMetadata);
      expect(savedMemory.timestamp).toBeTruthy();
    });

    it('should search audio memories effectively', async () => {
      const searchQuery = 'weather';
      const results = await mockMemoryIntegrationAPI.searchAudioMemories(searchQuery);

      expect(results).toHaveLength(1);
      expect(results[0].content).toContain('weather');
      expect(results[0].relevanceScore).toBeGreaterThan(0.5);
      expect(results[0].audioMetadata).toBeDefined();
    });

    it('should provide audio interaction insights', async () => {
      const insights = await mockMemoryIntegrationAPI.getAudioInsights({
        start: Date.now() - 7 * 24 * 60 * 60 * 1000, // Last 7 days
        end: Date.now(),
      });

      expect(insights.totalVoiceInteractions).toBeGreaterThan(0);
      expect(insights.averageConfidence).toBeGreaterThan(0.5);
      expect(insights.mostCommonTopics).toHaveLength(3);
      expect(insights.languageDistribution).toHaveProperty('en-US');
      expect(insights.voiceActivityHours).toHaveLength(4);
    });

    it('should handle concurrent memory operations', async () => {
      const memories = [
        { content: 'First voice input', audioMetadata: { duration: 1.5 }, type: 'voice_input' as const },
        { content: 'Second voice input', audioMetadata: { duration: 2.0 }, type: 'voice_input' as const },
        { content: 'AI response', audioMetadata: { duration: 2.5 }, type: 'ai_response' as const },
      ];

      const savePromises = memories.map(memory => 
        mockMemoryIntegrationAPI.saveAudioMemory(memory)
      );

      const savedMemories = await Promise.all(savePromises);

      expect(savedMemories).toHaveLength(3);
      savedMemories.forEach((memory, index) => {
        expect(memory.content).toBe(memories[index].content);
        expect(memory.id).toBeTruthy();
      });
    });
  });

  describe('Error Handling and Resilience', () => {
    it('should handle API rate limiting', async () => {
      setElevenLabsRateLimit(0); // Trigger rate limiting

      const result = await expect(mockVoiceSynthesisAPI.synthesize({
        text: 'Test text',
        voiceId: 'voice-1',
      })).rejects.toThrow();

      expect(result).toBeDefined();
    });

    it('should retry failed operations with exponential backoff', async () => {
      let attemptCount = 0;
      const maxRetries = 3;

      mockSpeechRecognitionAPI.transcribe.mockImplementation(async () => {
        attemptCount++;
        if (attemptCount < maxRetries) {
          throw new Error('Temporary failure');
        }
        return { transcript: 'Success after retries', confidence: 0.9 };
      });

      const retryWithBackoff = async (fn: () => Promise<any>, retries = maxRetries) => {
        for (let attempt = 1; attempt <= retries; attempt++) {
          try {
            return await fn();
          } catch (error) {
            if (attempt === retries) throw error;
            await new Promise(resolve => setTimeout(resolve, 100 * Math.pow(2, attempt - 1)));
          }
        }
      };

      const audioData = new ArrayBuffer(1000);
      const result = await retryWithBackoff(() => 
        mockSpeechRecognitionAPI.transcribe(audioData)
      );

      expect(result.transcript).toBe('Success after retries');
      expect(attemptCount).toBe(maxRetries);
    });

    it('should handle network timeouts gracefully', async () => {
      simulateNetworkLatency(5000); // 5 second delay

      const audioData = new ArrayBuffer(1000);
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Request timeout')), 3000)
      );

      const transcribePromise = mockSpeechRecognitionAPI.transcribe(audioData);

      await expect(Promise.race([transcribePromise, timeoutPromise]))
        .rejects.toThrow('Request timeout');
    });

    it('should validate audio input formats', async () => {
      const invalidAudioData = new ArrayBuffer(10); // Too small

      await expect(mockAudioProcessor.extractFeatures(invalidAudioData))
        .rejects.toThrow();
    });
  });

  describe('Performance Optimization', () => {
    it('should process audio in chunks for large files', async () => {
      const largeAudioData = new ArrayBuffer(16000 * 60); // 1 minute of audio
      const chunkSize = 16000 * 10; // 10 second chunks

      const processChunk = async (chunk: ArrayBuffer) => {
        return mockSpeechRecognitionAPI.transcribe(chunk);
      };

      const chunks: ArrayBuffer[] = [];
      for (let offset = 0; offset < largeAudioData.byteLength; offset += chunkSize) {
        const chunkLength = Math.min(chunkSize, largeAudioData.byteLength - offset);
        chunks.push(largeAudioData.slice(offset, offset + chunkLength));
      }

      const results = await Promise.all(chunks.map(processChunk));

      expect(results).toHaveLength(6); // 60 seconds / 10 seconds = 6 chunks
      results.forEach(result => {
        expect(result.transcript).toBeTruthy();
        expect(result.confidence).toBeGreaterThan(0.8);
      });
    });

    it('should cache processed audio features', async () => {
      const audioData = new ArrayBuffer(16000 * 5); // 5 seconds
      const cacheKey = `features-${audioData.byteLength}`;
      const cache = new Map();

      const getCachedFeatures = async (data: ArrayBuffer) => {
        const key = `features-${data.byteLength}`;
        if (cache.has(key)) {
          return cache.get(key);
        }
        
        const features = await mockAudioProcessor.extractFeatures(data);
        cache.set(key, features);
        return features;
      };

      // First call should process and cache
      const features1 = await getCachedFeatures(audioData);
      expect(mockAudioProcessor.extractFeatures).toHaveBeenCalledTimes(1);

      // Second call should use cache
      const features2 = await getCachedFeatures(audioData);
      expect(mockAudioProcessor.extractFeatures).toHaveBeenCalledTimes(1); // No additional calls
      expect(features2).toEqual(features1);
    });

    it('should optimize memory usage for audio processing', async () => {
      const audioData = generateRealisticAudioWaveform({
        duration: 10000, // 10 seconds
        sampleRate: 44100,
        waveform: 'voice',
      });

      // Process audio and measure memory usage
      const initialMemory = performance.memory?.usedJSHeapSize || 0;
      
      await mockAudioProcessor.convertFormat(audioData.buffer, 'audio/wav');
      await mockAudioProcessor.enhanceAudio(audioData.buffer);
      
      const finalMemory = performance.memory?.usedJSHeapSize || 0;
      const memoryIncrease = finalMemory - initialMemory;

      // Memory increase should be reasonable (less than 10MB)
      expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024);
    });
  });

  describe('Real-time Processing', () => {
    it('should handle streaming audio data', async () => {
      const streamChunks: ArrayBuffer[] = [];
      const chunkDuration = 100; // 100ms chunks
      const totalDuration = 2000; // 2 seconds total

      // Simulate streaming audio chunks
      for (let i = 0; i < totalDuration / chunkDuration; i++) {
        const chunk = generateRealisticAudioWaveform({
          duration: chunkDuration,
          sampleRate: 16000,
          waveform: 'voice',
        });
        streamChunks.push(chunk.buffer);
      }

      // Process chunks in real-time
      const results: any[] = [];
      for (const chunk of streamChunks) {
        const features = await mockAudioProcessor.extractFeatures(chunk);
        results.push(features);
      }

      expect(results).toHaveLength(streamChunks.length);
      results.forEach(result => {
        expect(result.duration).toBeCloseTo(chunkDuration / 1000, 1);
      });
    });

    it('should maintain low latency in real-time processing', async () => {
      const audioChunk = new ArrayBuffer(16000 * 0.1); // 100ms of audio

      const startTime = performance.now();
      await mockAudioProcessor.extractFeatures(audioChunk);
      const endTime = performance.now();

      const processingLatency = endTime - startTime;
      
      // Processing should be faster than real-time (< 100ms for 100ms of audio)
      expect(processingLatency).toBeLessThan(100);
    });
  });
});
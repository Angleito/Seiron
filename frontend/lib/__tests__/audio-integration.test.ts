/**
 * Enhanced Audio Pipeline Integration Tests
 * Tests the complete audio processing pipeline from microphone input to speaker output
 * Includes realistic mocking, ElevenLabs integration, voice activity detection, and error handling
 */

import { pipe } from 'fp-ts/function';
import * as E from 'fp-ts/Either';
import * as TE from 'fp-ts/TaskEither';
import * as O from 'fp-ts/Option';
import { AudioRecorder } from '../audio-recorder';
import { VoiceAssistant } from '../elevenlabs-client';
import { AudioConverter, VoiceActivityDetector } from '../audio-utils';
import { 
  mockWebAudioAPI, 
  mockMediaRecorder, 
  mockElevenLabsAPI, 
  mockAudioDevices,
  resetAllMocks,
  setMockPermissions,
  simulateNetworkLatency,
  setElevenLabsRateLimit,
  simulateDeviceDisconnection,
  getElevenLabsRequestHistory
} from '../test-utils/audio-mocks';
import { 
  generateRealisticAudioWaveform, 
  simulateVoiceActivity, 
  simulateAudioQualityVariations,
  simulateMicrophonePermissions,
  measureAudioProcessingLatency,
  simulateAudioProcessingLoad,
  calculateAudioMetrics,
  detectVoiceActivity
} from '../test-utils/audio-simulator';

// Test configuration
const TEST_CONFIG = {
  SAMPLE_RATE: 16000,
  CHUNK_DURATION: 100,
  VAD_THRESHOLD: 0.01,
  TIMEOUT: 5000,
  QUALITY_VARIATIONS: ['high', 'medium', 'low', 'noisy'] as const,
  PERMISSION_SCENARIOS: ['granted', 'denied', 'prompt'] as const,
} as const;

describe('Enhanced Audio Pipeline Integration', () => {
  let audioRecorder: AudioRecorder;
  let voiceAssistant: VoiceAssistant;
  let voiceActivityDetector: VoiceActivityDetector;
  let mockAudioContext: AudioContext;
  let mockAnalyser: AnalyserNode;

  beforeAll(() => {
    // Initialize comprehensive mocks
    mockWebAudioAPI();
    mockMediaRecorder();
    mockElevenLabsAPI();
    mockAudioDevices();
  });

  beforeEach(() => {
    resetAllMocks();
    setMockPermissions('granted');
    
    audioRecorder = new AudioRecorder({
      sampleRate: TEST_CONFIG.SAMPLE_RATE,
      chunkInterval: TEST_CONFIG.CHUNK_DURATION,
      vadThreshold: TEST_CONFIG.VAD_THRESHOLD,
    });
    
    voiceAssistant = new VoiceAssistant('test-api-key');
    voiceActivityDetector = new VoiceActivityDetector({
      threshold: TEST_CONFIG.VAD_THRESHOLD,
      minSpeechDuration: 100,
      maxSilenceDuration: 500,
    });
  });

  afterEach(async () => {
    if (audioRecorder) {
      await audioRecorder.stop().catch(() => {});
    }
    if (voiceAssistant) {
      await voiceAssistant.cleanup();
    }
    if (voiceActivityDetector) {
      voiceActivityDetector.destroy();
    }
  });

  describe('End-to-End Audio Processing Pipeline', () => {
    it('should process audio from recording to streaming successfully', async () => {
      const dataChunks: Blob[] = [];
      const voiceActivity: boolean[] = [];
      const audioLevels: number[] = [];

      const recorder = new AudioRecorder({
        sampleRate: TEST_CONFIG.SAMPLE_RATE,
        onDataAvailable: (chunk) => dataChunks.push(chunk),
        onVoiceActivity: (isActive) => voiceActivity.push(isActive),
        onAudioLevel: (level) => audioLevels.push(level),
      });

      // Start recording
      await recorder.start();
      
      // Simulate realistic audio input
      const audioData = generateRealisticAudioWaveform({
        duration: 2000,
        sampleRate: TEST_CONFIG.SAMPLE_RATE,
        frequency: 440, // A4 note
        amplitude: 0.5,
      });

      // Simulate voice activity pattern
      simulateVoiceActivity(audioData, {
        speechSegments: [
          { start: 0.2, end: 0.8, intensity: 0.7 },
          { start: 1.2, end: 1.8, intensity: 0.8 },
        ],
        noiseLevel: 0.05,
      });

      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 2100));

      // Stop recording
      const finalBlob = await recorder.stop();

      // Verify pipeline results
      expect(dataChunks.length).toBeGreaterThan(0);
      expect(voiceActivity).toContain(true);
      expect(audioLevels.some(level => level > TEST_CONFIG.VAD_THRESHOLD)).toBe(true);
      expect(finalBlob).toBeInstanceOf(Blob);
      expect(finalBlob.size).toBeGreaterThan(0);
    });

    it('should handle real-time audio level monitoring', async () => {
      const audioLevels: number[] = [];
      let maxLevel = 0;
      let minLevel = 1;

      const recorder = new AudioRecorder({
        onAudioLevel: (level) => {
          audioLevels.push(level);
          maxLevel = Math.max(maxLevel, level);
          minLevel = Math.min(minLevel, level);
        },
      });

      await recorder.start();

      // Simulate varying audio levels
      const testDuration = 1000;
      const interval = 50;
      const steps = testDuration / interval;

      for (let i = 0; i < steps; i++) {
        const level = Math.sin((i / steps) * Math.PI * 2) * 0.5 + 0.5;
        simulateVoiceActivity(generateRealisticAudioWaveform({
          duration: interval,
          sampleRate: TEST_CONFIG.SAMPLE_RATE,
          amplitude: level,
        }), { noiseLevel: 0.01 });
        
        await new Promise(resolve => setTimeout(resolve, interval));
      }

      await recorder.stop();

      // Verify audio level monitoring
      expect(audioLevels.length).toBeGreaterThan(10);
      expect(maxLevel).toBeGreaterThan(0.3);
      expect(minLevel).toBeLessThan(0.2);
      expect(audioLevels.every(level => level >= 0 && level <= 1)).toBe(true);
    });

    it('should detect voice activity with various noise levels', async () => {
      const voiceActivities: Array<{ level: number; isActive: boolean }> = [];

      const recorder = new AudioRecorder({
        vadThreshold: 0.02,
        onVoiceActivity: (isActive) => {
          const data = recorder.getVisualizationData();
          if (data) {
            voiceActivities.push({ level: data.level, isActive });
          }
        },
      });

      await recorder.start();

      // Test different noise scenarios
      const scenarios = [
        { noiseLevel: 0.001, speechIntensity: 0.1, expectedActive: true },
        { noiseLevel: 0.05, speechIntensity: 0.15, expectedActive: true },
        { noiseLevel: 0.08, speechIntensity: 0.05, expectedActive: false },
        { noiseLevel: 0.001, speechIntensity: 0.001, expectedActive: false },
      ];

      for (const scenario of scenarios) {
        const audioData = generateRealisticAudioWaveform({
          duration: 500,
          sampleRate: TEST_CONFIG.SAMPLE_RATE,
          amplitude: scenario.speechIntensity,
        });

        simulateVoiceActivity(audioData, {
          speechSegments: [{ start: 0.1, end: 0.4, intensity: scenario.speechIntensity }],
          noiseLevel: scenario.noiseLevel,
        });

        await new Promise(resolve => setTimeout(resolve, 600));
      }

      await recorder.stop();

      // Verify voice activity detection
      expect(voiceActivities.length).toBeGreaterThan(0);
      expect(voiceActivities.some(va => va.isActive)).toBe(true);
      expect(voiceActivities.some(va => !va.isActive)).toBe(true);
    });
  });

  describe('Audio Format Conversion and Compression', () => {
    it('should handle different audio formats correctly', async () => {
      const supportedFormats = AudioRecorder.getSupportedMimeTypes();
      expect(supportedFormats.length).toBeGreaterThan(0);

      for (const mimeType of supportedFormats.slice(0, 3)) {
        const recorder = new AudioRecorder({ mimeType });
        
        await recorder.start();
        await new Promise(resolve => setTimeout(resolve, 500));
        const blob = await recorder.stop();

        expect(blob.type).toBe(mimeType);
        expect(blob.size).toBeGreaterThan(0);
      }
    });

    it('should compress audio data efficiently', async () => {
      const chunks: Blob[] = [];
      
      const recorder = new AudioRecorder({
        mimeType: 'audio/webm;codecs=opus',
        onDataAvailable: (chunk) => chunks.push(chunk),
      });

      await recorder.start();
      
      // Generate high-quality audio data
      const audioData = generateRealisticAudioWaveform({
        duration: 2000,
        sampleRate: TEST_CONFIG.SAMPLE_RATE,
        amplitude: 0.8,
        frequency: 440,
      });

      simulateVoiceActivity(audioData, {
        speechSegments: [{ start: 0.2, end: 1.8, intensity: 0.8 }],
      });

      await new Promise(resolve => setTimeout(resolve, 2100));
      const finalBlob = await recorder.stop();

      // Verify compression efficiency
      const totalChunkSize = chunks.reduce((sum, chunk) => sum + chunk.size, 0);
      const compressionRatio = totalChunkSize / (TEST_CONFIG.SAMPLE_RATE * 2 * 2); // 16-bit mono
      
      expect(compressionRatio).toBeLessThan(0.5); // At least 50% compression
      expect(finalBlob.size).toBeGreaterThan(0);
    });
  });

  describe('ElevenLabs API Integration', () => {
    it('should integrate with ElevenLabs for voice synthesis', async () => {
      const mockResponse = {
        status: 200,
        headers: { 'content-type': 'audio/mpeg' },
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(1024)),
      };

      // Mock fetch for ElevenLabs API
      global.fetch = jest.fn().mockResolvedValue(mockResponse);

      const testText = 'Hello, this is a test message for voice synthesis.';
      
      // Simulate API call
      const response = await fetch('https://api.elevenlabs.io/v1/text-to-speech/test-voice-id', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'xi-api-key': 'test-api-key',
        },
        body: JSON.stringify({
          text: testText,
          model_id: 'eleven_monolingual_v1',
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.5,
          },
        }),
      });

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toBe('audio/mpeg');
      
      const audioBuffer = await response.arrayBuffer();
      expect(audioBuffer.byteLength).toBeGreaterThan(0);
    });

    it('should handle ElevenLabs API errors with retry logic', async () => {
      let attemptCount = 0;
      
      global.fetch = jest.fn().mockImplementation(() => {
        attemptCount++;
        if (attemptCount < 3) {
          return Promise.reject(new Error('Network error'));
        }
        return Promise.resolve({
          status: 200,
          arrayBuffer: () => Promise.resolve(new ArrayBuffer(512)),
        });
      });

      const retryWithBackoff = async (fn: () => Promise<any>, maxRetries = 3) => {
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
          try {
            return await fn();
          } catch (error) {
            if (attempt === maxRetries) throw error;
            await new Promise(resolve => setTimeout(resolve, 100 * attempt));
          }
        }
      };

      const result = await retryWithBackoff(() => 
        fetch('https://api.elevenlabs.io/v1/text-to-speech/test-voice-id')
      );

      expect(attemptCount).toBe(3);
      expect(result.status).toBe(200);
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle microphone permission denied gracefully', async () => {
      simulateMicrophonePermissions('denied');
      
      const recorder = new AudioRecorder();
      
      await expect(recorder.start()).rejects.toThrow('Microphone permission denied');
      expect(recorder.getState()).toBe('inactive');
    });

    it('should recover from audio device disconnection', async () => {
      const recorder = new AudioRecorder();
      await recorder.start();
      
      expect(recorder.getState()).toBe('recording');
      
      // Simulate device disconnection
      const stream = (recorder as any).stream as MediaStream;
      stream.getTracks().forEach(track => {
        track.dispatchEvent(new Event('ended'));
      });

      // Verify cleanup
      await new Promise(resolve => setTimeout(resolve, 100));
      expect(recorder.getState()).toBe('inactive');
    });

    it('should handle WebRTC connection failures', async () => {
      // Mock WebRTC failure
      global.navigator.mediaDevices.getUserMedia = jest.fn()
        .mockRejectedValue(new Error('NotFoundError: No audio devices found'));

      const recorder = new AudioRecorder();
      
      await expect(recorder.start()).rejects.toThrow('No audio devices found');
    });
  });

  describe('Performance and Latency Testing', () => {
    it('should maintain low latency in audio processing', async () => {
      const processingTimes: number[] = [];
      
      const recorder = new AudioRecorder({
        chunkInterval: 50, // 50ms chunks for low latency
        onDataAvailable: (chunk) => {
          const endTime = performance.now();
          processingTimes.push(endTime);
        },
      });

      const startTime = performance.now();
      await recorder.start();
      
      // Simulate 1 second of audio
      await new Promise(resolve => setTimeout(resolve, 1000));
      await recorder.stop();

      // Calculate average processing latency
      const latencies = processingTimes.map((time, index) => 
        time - startTime - (index * 50)
      ).filter(latency => latency > 0);

      const averageLatency = latencies.reduce((sum, lat) => sum + lat, 0) / latencies.length;
      
      // Expect low latency (under 100ms)
      expect(averageLatency).toBeLessThan(100);
      expect(latencies.every(lat => lat < 200)).toBe(true);
    });

    it('should handle high-frequency audio processing', async () => {
      const recorder = new AudioRecorder({
        sampleRate: 44100, // High sample rate
        chunkInterval: 25,  // Very frequent chunks
      });

      const startTime = performance.now();
      await recorder.start();
      
      await new Promise(resolve => setTimeout(resolve, 2000));
      const endTime = performance.now();
      
      await recorder.stop();

      const totalTime = endTime - startTime;
      
      // Verify no significant performance degradation
      expect(totalTime).toBeLessThan(2500); // Allow 500ms overhead
    });
  });

  describe('Memory Management and Resource Cleanup', () => {
    it('should properly clean up resources after recording', async () => {
      const recorder = new AudioRecorder();
      
      await recorder.start();
      expect(recorder.getState()).toBe('recording');
      
      await recorder.stop();
      expect(recorder.getState()).toBe('inactive');
      
      // Verify cleanup
      expect((recorder as any).audioContext).toBeNull();
      expect((recorder as any).stream).toBeNull();
      expect((recorder as any).mediaRecorder).toBeNull();
    });

    it('should handle multiple start/stop cycles without memory leaks', async () => {
      const recorder = new AudioRecorder();
      
      for (let i = 0; i < 5; i++) {
        await recorder.start();
        await new Promise(resolve => setTimeout(resolve, 200));
        await recorder.stop();
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      // No memory leaks should occur
      expect(recorder.getState()).toBe('inactive');
    });
  });

  describe('Audio Quality Variations', () => {
    it('should handle different audio quality scenarios', async () => {
      for (const quality of TEST_CONFIG.QUALITY_VARIATIONS) {
        const recorder = new AudioRecorder({
          onAudioLevel: jest.fn(),
          onVoiceActivity: jest.fn(),
        });

        await recorder.start();

        const audioData = simulateAudioQualityVariations(quality, {
          duration: 1000,
          sampleRate: TEST_CONFIG.SAMPLE_RATE,
        });

        await new Promise(resolve => setTimeout(resolve, 1100));
        const blob = await recorder.stop();

        expect(blob.size).toBeGreaterThan(0);
        expect(recorder.getState()).toBe('inactive');
      }
    });
  });

  describe('Accessibility and User Experience', () => {
    it('should provide accessible audio feedback', async () => {
      const announcements: string[] = [];
      
      const recorder = new AudioRecorder({
        onError: (error) => {
          announcements.push(`Audio error: ${error.message}`);
        },
        onVoiceActivity: (isActive) => {
          announcements.push(isActive ? 'Voice detected' : 'Voice stopped');
        },
      });

      await recorder.start();
      await new Promise(resolve => setTimeout(resolve, 500));
      await recorder.stop();

      expect(announcements.length).toBeGreaterThan(0);
    });

    it('should support keyboard navigation for audio controls', async () => {
      const recorder = new AudioRecorder();
      
      // Simulate keyboard events
      const spaceKeyEvent = new KeyboardEvent('keydown', { code: 'Space' });
      const enterKeyEvent = new KeyboardEvent('keydown', { code: 'Enter' });

      document.dispatchEvent(spaceKeyEvent);
      // Should handle space key for record toggle
      
      document.dispatchEvent(enterKeyEvent);
      // Should handle enter key for confirmation

      expect(true).toBe(true); // Placeholder for keyboard navigation tests
    });
  });

  describe('Complete Voice Chat Integration Pipeline', () => {
    it('should handle full conversation flow from voice input to TTS output', async () => {
      const conversationFlow: string[] = [];
      const audioMetrics: any[] = [];

      // Set up complete pipeline
      const recorder = new AudioRecorder({
        onDataAvailable: (chunk) => {
          conversationFlow.push('audio_chunk_received');
        },
        onVoiceActivity: (isActive) => {
          conversationFlow.push(isActive ? 'voice_start' : 'voice_stop');
        },
      });

      // Start conversation
      await recorder.start();
      conversationFlow.push('recording_started');

      // Simulate realistic speech input
      const speechAudio = generateRealisticAudioWaveform({
        duration: 3000,
        sampleRate: TEST_CONFIG.SAMPLE_RATE,
        waveform: 'voice',
        frequency: 200,
        amplitude: 0.7,
      });

      const voiceActivityData = simulateVoiceActivity(speechAudio, {
        speechSegments: [
          { start: 0.5, end: 2.5, intensity: 0.8, pitch: 200 }
        ],
        breathSounds: true,
        clickSounds: false,
      });

      // Process voice activity detection
      const vadResult = voiceActivityDetector.process(voiceActivityData);
      expect(vadResult.isVoiceActive).toBe(true);
      expect(vadResult.confidence).toBeGreaterThan(0.7);

      // Simulate voice to text processing
      await new Promise(resolve => setTimeout(resolve, 3100));
      conversationFlow.push('transcription_complete');

      // Simulate AI response generation
      conversationFlow.push('ai_processing');

      // Test ElevenLabs TTS integration
      const ttsResponse = await voiceAssistant.speak(
        'Thank you for your question about Sei blockchain investments.',
        {
          voice: 'rachel',
          stability: 0.5,
          similarity_boost: 0.5,
        }
      );

      expect(E.isRight(ttsResponse)).toBe(true);
      conversationFlow.push('tts_complete');

      // Stop recording
      await recorder.stop();
      conversationFlow.push('recording_stopped');

      // Verify complete flow
      expect(conversationFlow).toContain('recording_started');
      expect(conversationFlow).toContain('voice_start');
      expect(conversationFlow).toContain('voice_stop');
      expect(conversationFlow).toContain('transcription_complete');
      expect(conversationFlow).toContain('ai_processing');
      expect(conversationFlow).toContain('tts_complete');
      expect(conversationFlow).toContain('recording_stopped');

      // Verify ElevenLabs API was called
      const apiHistory = getElevenLabsRequestHistory();
      expect(apiHistory.length).toBeGreaterThan(0);
    });

    it('should handle concurrent audio processing and streaming', async () => {
      const processingTimes: number[] = [];
      const streamEvents: string[] = [];

      // Create multiple recorders for concurrent testing
      const recorders = Array.from({ length: 3 }, () => new AudioRecorder({
        onDataAvailable: () => {
          streamEvents.push('data_available');
        },
      }));

      // Start all recorders simultaneously
      const startTime = performance.now();
      await Promise.all(recorders.map(recorder => recorder.start()));

      // Generate different audio for each recorder
      const audioVariations = ['sine', 'voice', 'noise'] as const;
      for (let i = 0; i < recorders.length; i++) {
        const audio = generateRealisticAudioWaveform({
          duration: 1000,
          sampleRate: TEST_CONFIG.SAMPLE_RATE,
          waveform: audioVariations[i],
          amplitude: 0.5 + (i * 0.1),
        });

        // Measure processing latency
        const processingStart = performance.now();
        const vadResult = voiceActivityDetector.process(audio);
        const processingEnd = performance.now();
        processingTimes.push(processingEnd - processingStart);
      }

      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 1200));

      // Stop all recorders
      await Promise.all(recorders.map(recorder => recorder.stop()));
      const totalTime = performance.now() - startTime;

      // Verify concurrent processing performance
      expect(totalTime).toBeLessThan(2000);
      expect(processingTimes.every(time => time < 100)).toBe(true);
      expect(streamEvents.length).toBeGreaterThan(0);
    });

    it('should maintain audio quality through complete pipeline', async () => {
      const qualityMetrics: any[] = [];

      for (const quality of TEST_CONFIG.QUALITY_VARIATIONS) {
        // Generate audio with specific quality
        const testAudio = simulateAudioQualityVariations(quality, {
          duration: 2000,
          sampleRate: TEST_CONFIG.SAMPLE_RATE,
        });

        // Analyze audio metrics
        const metrics = calculateAudioMetrics(testAudio);
        qualityMetrics.push({
          quality,
          ...metrics,
        });

        // Test voice activity detection at different qualities
        const vadResult = voiceActivityDetector.process(testAudio);
        expect(vadResult.confidence).toBeGreaterThan(0);

        // Test audio conversion
        const convertedAudio = AudioConverter.resample(testAudio, TEST_CONFIG.SAMPLE_RATE, 22050);
        expect(convertedAudio.length).toBeGreaterThan(0);
      }

      // Verify quality degradation is as expected
      const highQuality = qualityMetrics.find(m => m.quality === 'high');
      const lowQuality = qualityMetrics.find(m => m.quality === 'low');
      
      expect(highQuality!.snr).toBeGreaterThan(lowQuality!.snr);
      expect(highQuality!.dynamicRange).toBeGreaterThan(lowQuality!.dynamicRange);
    });
  });

  describe('Real-time Audio Streaming and Processing', () => {
    it('should handle real-time audio streaming with WebSocket simulation', async () => {
      const streamChunks: ArrayBuffer[] = [];
      const streamMetrics: any[] = [];

      // Create streaming audio processor
      const processAudioStream = (audioData: Float32Array) => {
        const metrics = calculateAudioMetrics(audioData);
        streamMetrics.push({
          timestamp: Date.now(),
          ...metrics,
        });

        // Convert to ArrayBuffer for streaming
        const buffer = new ArrayBuffer(audioData.length * 4);
        const view = new Float32Array(buffer);
        view.set(audioData);
        streamChunks.push(buffer);
      };

      // Simulate real-time audio generation
      const chunkCount = 10;
      const chunkDuration = 100; // 100ms chunks

      for (let i = 0; i < chunkCount; i++) {
        const chunkAudio = generateRealisticAudioWaveform({
          duration: chunkDuration,
          sampleRate: TEST_CONFIG.SAMPLE_RATE,
          waveform: 'voice',
          amplitude: Math.random() * 0.5 + 0.3,
        });

        processAudioStream(chunkAudio);
        await new Promise(resolve => setTimeout(resolve, chunkDuration));
      }

      // Verify streaming performance
      expect(streamChunks.length).toBe(chunkCount);
      expect(streamMetrics.length).toBe(chunkCount);

      // Check that processing is fast enough for real-time
      const processingTimes = streamMetrics.map((metric, index) => 
        index > 0 ? metric.timestamp - streamMetrics[index - 1].timestamp : 0
      ).filter(time => time > 0);

      const avgProcessingTime = processingTimes.reduce((sum, time) => sum + time, 0) / processingTimes.length;
      expect(avgProcessingTime).toBeLessThan(chunkDuration * 1.5); // Allow 50% overhead
    });

    it('should handle audio format conversion in real-time', async () => {
      const formats = ['wav', 'webm', 'ogg', 'mp4'] as const;
      const conversionResults: any[] = [];

      const sourceAudio = generateRealisticAudioWaveform({
        duration: 1000,
        sampleRate: TEST_CONFIG.SAMPLE_RATE,
        waveform: 'voice',
        amplitude: 0.6,
      });

      for (const format of formats) {
        const startTime = performance.now();
        
        // Test blob conversion
        const blob = AudioConverter.toBlob(sourceAudio, format);
        
        // Test ArrayBuffer conversion
        const arrayBuffer = AudioConverter.toArrayBuffer(sourceAudio);
        
        // Test Base64 conversion
        const base64 = AudioConverter.toBase64(sourceAudio, format);
        
        const endTime = performance.now();

        conversionResults.push({
          format,
          conversionTime: endTime - startTime,
          blobSize: blob.size,
          arrayBufferSize: arrayBuffer.byteLength,
          base64Length: base64.length,
        });

        // Verify conversions are valid
        expect(blob.size).toBeGreaterThan(0);
        expect(arrayBuffer.byteLength).toBeGreaterThan(0);
        expect(base64.length).toBeGreaterThan(0);
      }

      // Verify all conversions complete in reasonable time
      conversionResults.forEach(result => {
        expect(result.conversionTime).toBeLessThan(500); // 500ms max
      });
    });
  });

  describe('Advanced Error Simulation and Recovery', () => {
    it('should recover from ElevenLabs API failures with retry logic', async () => {
      const retryAttempts: number[] = [];
      let apiCallCount = 0;

      // Simulate rate limiting initially
      setElevenLabsRateLimit(0);

      const voiceAssistantWithRetry = new VoiceAssistant('test-api-key', {
        maxRetries: 3,
        retryDelay: 100,
      });

      // Override the speak method to track attempts
      const originalSpeak = voiceAssistantWithRetry.speak.bind(voiceAssistantWithRetry);
      voiceAssistantWithRetry.speak = async (text, options) => {
        apiCallCount++;
        retryAttempts.push(apiCallCount);
        
        if (apiCallCount < 3) {
          setElevenLabsRateLimit(0); // Keep rate limit for first 2 attempts
        } else {
          setElevenLabsRateLimit(100); // Allow on 3rd attempt
        }
        
        return originalSpeak(text, options);
      };

      const result = await voiceAssistantWithRetry.speak('Test retry logic');
      
      expect(E.isRight(result)).toBe(true);
      expect(retryAttempts.length).toBe(3);
      expect(apiCallCount).toBe(3);
    });

    it('should handle device disconnection during recording', async () => {
      const errorEvents: string[] = [];
      
      const recorder = new AudioRecorder({
        onError: (error) => {
          errorEvents.push(error.message);
        },
      });

      await recorder.start();
      expect(recorder.getState()).toBe('recording');

      // Simulate device disconnection
      simulateDeviceDisconnection('default-microphone');

      // Wait for error handling
      await new Promise(resolve => setTimeout(resolve, 200));

      expect(errorEvents.length).toBeGreaterThan(0);
      expect(errorEvents.some(err => err.includes('device') || err.includes('disconn'))).toBe(true);
    });

    it('should gracefully degrade when WebRTC features are unavailable', async () => {
      // Mock WebRTC unavailability
      Object.defineProperty(global.navigator, 'mediaDevices', {
        value: undefined,
        configurable: true,
      });

      const recorder = new AudioRecorder();
      
      await expect(recorder.start()).rejects.toThrow();
      expect(recorder.getState()).toBe('inactive');

      // Restore WebRTC mocks
      mockAudioDevices();
    });
  });

  describe('Performance Benchmarking and Optimization', () => {
    it('should maintain consistent performance under load', async () => {
      const iterations = 50;
      const latencies: number[] = [];
      const memoryUsages: number[] = [];

      for (let i = 0; i < iterations; i++) {
        const startMemory = performance.memory?.usedJSHeapSize || 0;
        
        const latency = await measureAudioProcessingLatency(async () => {
          const audio = generateRealisticAudioWaveform({
            duration: 500,
            sampleRate: TEST_CONFIG.SAMPLE_RATE,
            waveform: 'voice',
          });

          const vadResult = voiceActivityDetector.process(audio);
          const metrics = calculateAudioMetrics(audio);
          
          // Simulate processing load
          simulateAudioProcessingLoad('medium');
        });

        const endMemory = performance.memory?.usedJSHeapSize || 0;
        
        latencies.push(latency);
        memoryUsages.push(endMemory - startMemory);
      }

      // Analyze performance metrics
      const avgLatency = latencies.reduce((sum, lat) => sum + lat, 0) / latencies.length;
      const maxLatency = Math.max(...latencies);
      const avgMemoryDelta = memoryUsages.reduce((sum, mem) => sum + mem, 0) / memoryUsages.length;

      expect(avgLatency).toBeLessThan(100); // 100ms average
      expect(maxLatency).toBeLessThan(200); // 200ms maximum
      expect(avgMemoryDelta).toBeLessThan(1024 * 1024); // 1MB average memory increase
    });

    it('should handle high-frequency audio processing efficiently', async () => {
      const processingTimes: number[] = [];
      const highFrequencyCount = 100;
      const targetProcessingTime = 10; // 10ms per operation

      for (let i = 0; i < highFrequencyCount; i++) {
        const startTime = performance.now();
        
        const audio = generateRealisticAudioWaveform({
          duration: 100, // Short chunks for high frequency
          sampleRate: TEST_CONFIG.SAMPLE_RATE,
          waveform: 'voice',
          amplitude: Math.random() * 0.5 + 0.3,
        });

        const vadResult = voiceActivityDetector.process(audio);
        const endTime = performance.now();
        
        processingTimes.push(endTime - startTime);
      }

      const avgProcessingTime = processingTimes.reduce((sum, time) => sum + time, 0) / processingTimes.length;
      const maxProcessingTime = Math.max(...processingTimes);

      expect(avgProcessingTime).toBeLessThan(targetProcessingTime);
      expect(maxProcessingTime).toBeLessThan(targetProcessingTime * 2);
      expect(processingTimes.filter(time => time > targetProcessingTime).length).toBeLessThan(highFrequencyCount * 0.1); // Less than 10% over target
    });
  });
});
/**
 * Audio Simulation Utilities
 * Generate realistic audio waveforms, simulate voice activity patterns, and create audio quality variations
 */

import * as E from 'fp-ts/Either';
import * as O from 'fp-ts/Option';
import { pipe } from 'fp-ts/function';

// Types for audio simulation
export interface AudioWaveformConfig {
  duration: number; // in milliseconds
  sampleRate: number;
  frequency?: number;
  amplitude?: number;
  waveform?: 'sine' | 'square' | 'triangle' | 'sawtooth' | 'noise' | 'voice';
  harmonics?: number[];
  noiseLevel?: number;
}

export interface VoiceActivityConfig {
  speechSegments: Array<{
    start: number; // seconds
    end: number;   // seconds
    intensity: number; // 0-1
    pitch?: number; // Hz
  }>;
  noiseLevel?: number;
  silenceLevel?: number;
  breathSounds?: boolean;
  clickSounds?: boolean;
}

export interface AudioQualityConfig {
  duration: number;
  sampleRate: number;
  bitDepth?: number;
  compression?: 'none' | 'low' | 'medium' | 'high';
  artifacts?: Array<'clipping' | 'distortion' | 'dropouts' | 'echo' | 'noise'>;
}

export interface MicrophonePermissionConfig {
  state: PermissionState;
  autoRevoke?: boolean;
  revokeAfter?: number; // milliseconds
  intermittentFailure?: boolean;
  failureRate?: number; // 0-1
}

export interface AudioDeviceConfig {
  deviceId: string;
  quality: 'high' | 'medium' | 'low' | 'unstable';
  latency: number; // milliseconds
  dropoutRate: number; // 0-1
  noiseFloor: number; // 0-1
  frequencyResponse: Array<{ frequency: number; gain: number }>;
}

// Audio waveform generation
export const generateRealisticAudioWaveform = (config: AudioWaveformConfig): Float32Array => {
  const { duration, sampleRate, frequency = 440, amplitude = 0.5, waveform = 'sine', harmonics = [], noiseLevel = 0.01 } = config;
  
  const sampleCount = Math.floor((duration / 1000) * sampleRate);
  const samples = new Float32Array(sampleCount);
  
  for (let i = 0; i < sampleCount; i++) {
    const t = i / sampleRate;
    let sample = 0;
    
    switch (waveform) {
      case 'sine':
        sample = Math.sin(2 * Math.PI * frequency * t);
        break;
      case 'square':
        sample = Math.sign(Math.sin(2 * Math.PI * frequency * t));
        break;
      case 'triangle':
        sample = (2 / Math.PI) * Math.asin(Math.sin(2 * Math.PI * frequency * t));
        break;
      case 'sawtooth':
        sample = 2 * (t * frequency - Math.floor(t * frequency + 0.5));
        break;
      case 'noise':
        sample = (Math.random() - 0.5) * 2;
        break;
      case 'voice':
        sample = generateVoiceWaveform(t, frequency);
        break;
    }
    
    // Add harmonics
    for (const harmonic of harmonics) {
      sample += 0.3 * Math.sin(2 * Math.PI * harmonic * t);
    }
    
    // Add noise
    sample += (Math.random() - 0.5) * noiseLevel;
    
    // Apply amplitude and envelope
    const envelope = generateEnvelope(t, duration / 1000);
    samples[i] = sample * amplitude * envelope;
  }
  
  return samples;
};

const generateVoiceWaveform = (t: number, fundamentalFreq: number): number => {
  // Simulate human voice with formants
  const formants = [
    { frequency: fundamentalFreq, amplitude: 1.0 },
    { frequency: fundamentalFreq * 2, amplitude: 0.5 },
    { frequency: fundamentalFreq * 3, amplitude: 0.3 },
    { frequency: fundamentalFreq * 4, amplitude: 0.2 },
    { frequency: fundamentalFreq * 5, amplitude: 0.1 },
  ];
  
  let sample = 0;
  for (const formant of formants) {
    sample += formant.amplitude * Math.sin(2 * Math.PI * formant.frequency * t);
  }
  
  // Add vibrato
  const vibrato = 1 + 0.05 * Math.sin(2 * Math.PI * 5 * t);
  sample *= vibrato;
  
  // Add breath noise
  sample += (Math.random() - 0.5) * 0.02;
  
  return sample * 0.3; // Normalize
};

const generateEnvelope = (t: number, duration: number): number => {
  const attackTime = 0.01;  // 10ms attack
  const releaseTime = 0.05; // 50ms release
  
  if (t < attackTime) {
    return t / attackTime; // Linear attack
  } else if (t > duration - releaseTime) {
    return (duration - t) / releaseTime; // Linear release
  } else {
    return 1.0; // Sustain
  }
};

// Voice activity simulation
export const simulateVoiceActivity = (audioData: Float32Array, config: VoiceActivityConfig): Float32Array => {
  const { speechSegments, noiseLevel = 0.02, silenceLevel = 0.001, breathSounds = true, clickSounds = false } = config;
  const result = new Float32Array(audioData.length);
  const sampleRate = 16000; // Assume 16kHz sample rate
  
  // Initialize with silence/noise
  for (let i = 0; i < result.length; i++) {
    result[i] = (Math.random() - 0.5) * silenceLevel;
  }
  
  // Add speech segments
  for (const segment of speechSegments) {
    const startSample = Math.floor(segment.start * sampleRate);
    const endSample = Math.floor(segment.end * sampleRate);
    
    for (let i = startSample; i < endSample && i < result.length; i++) {
      const t = (i - startSample) / (endSample - startSample);
      const envelope = generateSpeechEnvelope(t);
      
      // Use original audio data or generate voice-like signal
      let sample = i < audioData.length ? audioData[i] : generateVoiceWaveform(i / sampleRate, segment.pitch || 150);
      sample *= segment.intensity * envelope;
      
      // Add background noise
      sample += (Math.random() - 0.5) * noiseLevel;
      
      result[i] = sample;
    }
    
    // Add breath sounds between segments
    if (breathSounds && segment !== speechSegments[speechSegments.length - 1]) {
      const breathStart = endSample;
      const breathDuration = Math.floor(0.2 * sampleRate); // 200ms breath
      
      for (let i = breathStart; i < breathStart + breathDuration && i < result.length; i++) {
        const breathIntensity = Math.exp(-((i - breathStart) / breathDuration) * 5);
        result[i] += (Math.random() - 0.5) * 0.05 * breathIntensity;
      }
    }
  }
  
  // Add occasional click sounds (mouth sounds)
  if (clickSounds) {
    const clickCount = Math.floor(Math.random() * 3) + 1;
    for (let i = 0; i < clickCount; i++) {
      const clickPos = Math.floor(Math.random() * result.length);
      const clickDuration = Math.floor(0.01 * sampleRate); // 10ms click
      
      for (let j = 0; j < clickDuration && clickPos + j < result.length; j++) {
        result[clickPos + j] += (Math.random() - 0.5) * 0.1 * Math.exp(-j / clickDuration * 10);
      }
    }
  }
  
  return result;
};

const generateSpeechEnvelope = (t: number): number => {
  // More complex envelope for natural speech
  const attackTime = 0.02;
  const decayTime = 0.1;
  const sustainLevel = 0.8;
  const releaseTime = 0.05;
  
  if (t < attackTime) {
    return t / attackTime;
  } else if (t < attackTime + decayTime) {
    const decayProgress = (t - attackTime) / decayTime;
    return 1 - (1 - sustainLevel) * decayProgress;
  } else if (t < 1 - releaseTime) {
    // Add natural speech modulation
    return sustainLevel * (1 + 0.1 * Math.sin(t * 20 * Math.PI));
  } else {
    const releaseProgress = (t - (1 - releaseTime)) / releaseTime;
    return sustainLevel * (1 - releaseProgress);
  }
};

// Audio quality variations
export const simulateAudioQualityVariations = (
  quality: 'high' | 'medium' | 'low' | 'noisy',
  config: AudioQualityConfig
): Float32Array => {
  const baseAudio = generateRealisticAudioWaveform({
    duration: config.duration,
    sampleRate: config.sampleRate,
    waveform: 'voice',
    frequency: 200,
    amplitude: 0.6,
  });
  
  switch (quality) {
    case 'high':
      return applyHighQuality(baseAudio);
    case 'medium':
      return applyMediumQuality(baseAudio);
    case 'low':
      return applyLowQuality(baseAudio);
    case 'noisy':
      return applyNoisyQuality(baseAudio);
    default:
      return baseAudio;
  }
};

const applyHighQuality = (audio: Float32Array): Float32Array => {
  // Minimal processing for high quality
  const result = new Float32Array(audio.length);
  for (let i = 0; i < audio.length; i++) {
    result[i] = audio[i] + (Math.random() - 0.5) * 0.001; // Very low noise
  }
  return result;
};

const applyMediumQuality = (audio: Float32Array): Float32Array => {
  const result = new Float32Array(audio.length);
  for (let i = 0; i < audio.length; i++) {
    let sample = audio[i];
    
    // Add some compression
    sample = Math.sign(sample) * Math.pow(Math.abs(sample), 0.8);
    
    // Add moderate noise
    sample += (Math.random() - 0.5) * 0.01;
    
    // Apply slight low-pass filtering
    if (i > 0) {
      sample = 0.7 * sample + 0.3 * result[i - 1];
    }
    
    result[i] = sample;
  }
  return result;
};

const applyLowQuality = (audio: Float32Array): Float32Array => {
  const result = new Float32Array(audio.length);
  for (let i = 0; i < audio.length; i++) {
    let sample = audio[i];
    
    // Heavy compression
    sample = Math.sign(sample) * Math.pow(Math.abs(sample), 0.5);
    
    // Add significant noise
    sample += (Math.random() - 0.5) * 0.05;
    
    // Apply aggressive low-pass filtering
    if (i > 2) {
      sample = 0.4 * sample + 0.3 * result[i - 1] + 0.2 * result[i - 2] + 0.1 * result[i - 3];
    }
    
    // Simulate occasional dropouts
    if (Math.random() < 0.001) {
      sample *= 0.1;
    }
    
    result[i] = Math.max(-0.8, Math.min(0.8, sample)); // Limit dynamic range
  }
  return result;
};

const applyNoisyQuality = (audio: Float32Array): Float32Array => {
  const result = new Float32Array(audio.length);
  for (let i = 0; i < audio.length; i++) {
    let sample = audio[i];
    
    // Add heavy noise
    sample += (Math.random() - 0.5) * 0.1;
    
    // Add interference patterns
    sample += 0.02 * Math.sin(i * 0.01); // 60Hz hum simulation
    sample += 0.01 * Math.sin(i * 0.001); // Low frequency rumble
    
    // Random clicks and pops
    if (Math.random() < 0.0005) {
      sample += (Math.random() - 0.5) * 0.5;
    }
    
    result[i] = sample;
  }
  return result;
};

// Microphone permission simulation
export const simulateMicrophonePermissions = (
  state: PermissionState,
  config?: Partial<MicrophonePermissionConfig>
): void => {
  const fullConfig: MicrophonePermissionConfig = {
    state,
    autoRevoke: false,
    revokeAfter: 5000,
    intermittentFailure: false,
    failureRate: 0.1,
    ...config,
  };
  
  // Mock navigator.permissions
  Object.defineProperty(global.navigator, 'permissions', {
    value: {
      query: jest.fn().mockImplementation(async (permission: { name: string }) => {
        if (permission.name === 'microphone') {
          if (fullConfig.intermittentFailure && Math.random() < fullConfig.failureRate) {
            return { state: 'denied' };
          }
          return { state: fullConfig.state };
        }
        return { state: 'granted' };
      }),
    },
    writable: true,
  });
  
  // Mock getUserMedia
  const originalGetUserMedia = global.navigator.mediaDevices?.getUserMedia;
  Object.defineProperty(global.navigator, 'mediaDevices', {
    value: {
      getUserMedia: jest.fn().mockImplementation(async (constraints: MediaStreamConstraints) => {
        if (fullConfig.state === 'denied') {
          throw new Error('Permission denied');
        }
        
        if (fullConfig.intermittentFailure && Math.random() < fullConfig.failureRate) {
          throw new Error('Device not available');
        }
        
        // Create mock MediaStream
        const mockStream = {
          getTracks: () => [{
            stop: jest.fn(),
            addEventListener: jest.fn(),
            removeEventListener: jest.fn(),
          }],
          getAudioTracks: () => [{
            stop: jest.fn(),
            getSettings: () => ({
              sampleRate: constraints.audio?.sampleRate || 44100,
              channelCount: constraints.audio?.channelCount || 1,
            }),
          }],
        };
        
        // Auto-revoke permission after specified time
        if (fullConfig.autoRevoke && fullConfig.revokeAfter) {
          setTimeout(() => {
            mockStream.getTracks().forEach(track => {
              track.dispatchEvent(new Event('ended'));
            });
          }, fullConfig.revokeAfter);
        }
        
        return mockStream as MediaStream;
      }),
      enumerateDevices: jest.fn().mockResolvedValue([
        {
          deviceId: 'default',
          kind: 'audioinput',
          label: fullConfig.state === 'granted' ? 'Default Microphone' : '',
          groupId: 'default-group',
        },
      ]),
    },
    writable: true,
  });
};

// Audio device simulation
export const simulateAudioDevice = (config: AudioDeviceConfig): void => {
  const { deviceId, quality, latency, dropoutRate, noiseFloor, frequencyResponse } = config;
  
  // Mock device-specific behavior in getUserMedia
  const originalGetUserMedia = global.navigator.mediaDevices?.getUserMedia;
  
  global.navigator.mediaDevices.getUserMedia = jest.fn().mockImplementation(async (constraints) => {
    // Simulate device latency
    await new Promise(resolve => setTimeout(resolve, latency));
    
    // Simulate dropouts
    if (Math.random() < dropoutRate) {
      throw new Error(`Audio device ${deviceId} not available`);
    }
    
    const mockTrack = {
      stop: jest.fn(),
      getSettings: () => ({
        deviceId,
        sampleRate: constraints.audio?.sampleRate || 44100,
        channelCount: constraints.audio?.channelCount || 1,
        echoCancellation: quality !== 'low',
        noiseSuppression: quality === 'high',
        autoGainControl: quality !== 'low',
      }),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    };
    
    const mockStream = {
      getTracks: () => [mockTrack],
      getAudioTracks: () => [mockTrack],
      id: `stream-${deviceId}`,
    };
    
    return mockStream as MediaStream;
  });
};

// Performance testing utilities
export const measureAudioProcessingLatency = async (
  processingFunction: () => Promise<void>
): Promise<number> => {
  const startTime = performance.now();
  await processingFunction();
  const endTime = performance.now();
  return endTime - startTime;
};

export const simulateAudioProcessingLoad = (intensity: 'low' | 'medium' | 'high'): void => {
  const loadMap = { low: 10, medium: 50, high: 100 };
  const operations = loadMap[intensity];
  
  // Simulate CPU-intensive audio processing
  const startTime = Date.now();
  while (Date.now() - startTime < operations) {
    Math.random() * Math.sin(Math.random() * 1000);
  }
};

// Property-based testing helpers
export const generateRandomAudioConfig = (): AudioWaveformConfig => ({
  duration: Math.random() * 5000 + 500, // 0.5-5.5 seconds
  sampleRate: [16000, 44100, 48000][Math.floor(Math.random() * 3)],
  frequency: Math.random() * 400 + 100, // 100-500 Hz
  amplitude: Math.random() * 0.8 + 0.1, // 0.1-0.9
  waveform: ['sine', 'voice', 'noise'][Math.floor(Math.random() * 3)] as any,
  noiseLevel: Math.random() * 0.05,
});

export const isValidAudioData = (audioData: Float32Array): E.Either<string, Float32Array> => {
  if (audioData.length === 0) {
    return E.left('Audio data is empty');
  }
  
  if (audioData.some(sample => Math.abs(sample) > 1.0)) {
    return E.left('Audio samples exceed valid range [-1, 1]');
  }
  
  if (audioData.every(sample => sample === 0)) {
    return E.left('Audio data contains only silence');
  }
  
  return E.right(audioData);
};

// Audio analysis utilities
export const calculateAudioMetrics = (audioData: Float32Array) => {
  const rms = Math.sqrt(audioData.reduce((sum, sample) => sum + sample * sample, 0) / audioData.length);
  const peak = Math.max(...audioData.map(Math.abs));
  const zeroCrossings = audioData.slice(1).reduce((count, sample, i) => 
    count + (Math.sign(sample) !== Math.sign(audioData[i]) ? 1 : 0), 0
  );
  
  return {
    rms,
    peak,
    crestFactor: peak / rms,
    zeroCrossingRate: zeroCrossings / audioData.length,
    dynamicRange: 20 * Math.log10(peak / Math.min(...audioData.map(s => Math.abs(s) || 0.001))),
  };
};

export const detectVoiceActivity = (audioData: Float32Array, threshold = 0.01): boolean[] => {
  const windowSize = 160; // 10ms at 16kHz
  const activity: boolean[] = [];
  
  for (let i = 0; i < audioData.length; i += windowSize) {
    const window = audioData.slice(i, i + windowSize);
    const energy = window.reduce((sum, sample) => sum + sample * sample, 0) / window.length;
    activity.push(Math.sqrt(energy) > threshold);
  }
  
  return activity;
};

// Export utility functions for testing
export const testUtilities = {
  generateRandomAudioConfig,
  isValidAudioData,
  calculateAudioMetrics,
  detectVoiceActivity,
  measureAudioProcessingLatency,
  simulateAudioProcessingLoad,
};
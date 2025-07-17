/**
 * Audio Utilities for Voice Chat Integration
 * 
 * This module provides comprehensive audio recording, processing, and visualization
 * utilities for the voice chat implementation.
 */

import * as TE from 'fp-ts/TaskEither';
import * as O from 'fp-ts/Option';
import { pipe } from 'fp-ts/function';
import { logger } from './logger';

// Types and Interfaces
export interface AudioRecorderConfig {
  sampleRate?: number;
  channels?: number;
  bitDepth?: number;
  maxDuration?: number; // in milliseconds
  enableNoiseSuppression?: boolean;
  enableEchoCancellation?: boolean;
  enableAutoGainControl?: boolean;
}

export interface AudioChunk {
  data: ArrayBuffer;
  timestamp: number;
  duration: number;
  sampleRate: number;
  channels: number;
}

export interface VoiceActivityConfig {
  threshold?: number; // Volume threshold for voice detection (0-1)
  minSpeechDuration?: number; // Minimum continuous speech duration (ms)
  maxSilenceDuration?: number; // Maximum silence before stopping (ms)
  smoothingFactor?: number; // Smoothing factor for volume calculation (0-1)
}

export interface AudioVisualizationData {
  frequencyData: Uint8Array;
  timeData: Uint8Array;
  volume: number;
  peak: number;
  rms: number;
}

export interface AudioFormat {
  mimeType: string;
  extension: string;
  supported: boolean;
}

export interface AudioError {
  type: 'PERMISSION_DENIED' | 'DEVICE_ERROR' | 'FORMAT_ERROR' | 'PROCESSING_ERROR';
  message: string;
  originalError?: unknown;
}

/**
 * AudioRecorder - Advanced audio recording with real-time processing
 */
export class AudioRecorder {
  private mediaRecorder: MediaRecorder | null = null;
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private microphone: MediaStreamAudioSourceNode | null = null;
  private stream: MediaStream | null = null;
  private config: Required<AudioRecorderConfig>;
  private chunks: Blob[] = [];
  private isRecording = false;
  private startTime = 0;

  constructor(config: AudioRecorderConfig = {}) {
    this.config = {
      sampleRate: 44100,
      channels: 1,
      bitDepth: 16,
      maxDuration: 300000, // 5 minutes
      enableNoiseSuppression: true,
      enableEchoCancellation: true,
      enableAutoGainControl: true,
      ...config,
    };
  }

  /**
   * Initialize audio recording setup
   */
  public async initialize(): Promise<TE.TaskEither<AudioError, MediaStream>> {
    return TE.tryCatch(
      async () => {
        logger.debug('🎙️ Initializing audio recorder', this.config);

        // Get user media with optimized constraints
        const constraints: MediaStreamConstraints = {
          audio: {
            sampleRate: this.config.sampleRate,
            channelCount: this.config.channels,
            noiseSuppression: this.config.enableNoiseSuppression,
            echoCancellation: this.config.enableEchoCancellation,
            autoGainControl: this.config.enableAutoGainControl,
            // Advanced constraints for better quality
            sampleSize: this.config.bitDepth,
            latency: 0.01, // 10ms latency for real-time feel
          },
        };

        this.stream = await navigator.mediaDevices.getUserMedia(constraints);

        // Create audio context
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)({
          sampleRate: this.config.sampleRate,
          latencyHint: 'interactive',
        });

        // Create analyser for real-time analysis
        this.analyser = this.audioContext.createAnalyser();
        this.analyser.fftSize = 2048;
        this.analyser.smoothingTimeConstant = 0.8;

        // Connect microphone to analyser
        this.microphone = this.audioContext.createMediaStreamSource(this.stream);
        this.microphone.connect(this.analyser);

        logger.debug('🎙️ Audio recorder initialized successfully');
        return this.stream;
      },
      (error): AudioError => {
        logger.error('🎙️ Failed to initialize audio recorder', { error });
        return {
          type: 'DEVICE_ERROR',
          message: 'Failed to initialize audio recording',
          originalError: error,
        };
      }
    );
  }

  /**
   * Start recording audio
   */
  public async startRecording(): Promise<TE.TaskEither<AudioError, void>> {
    if (!this.stream) {
      return TE.left({
        type: 'DEVICE_ERROR',
        message: 'Audio recorder not initialized',
      });
    }

    return TE.tryCatch(
      async () => {
        logger.debug('🎙️ Starting audio recording');

        // Determine best supported format
        const format = this.getBestSupportedFormat();
        
        this.mediaRecorder = new MediaRecorder(this.stream, {
          mimeType: format.mimeType,
          audioBitsPerSecond: this.config.sampleRate * this.config.channels * this.config.bitDepth,
        });

        this.chunks = [];
        this.startTime = Date.now();

        // Set up event handlers
        this.mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            this.chunks.push(event.data);
          }
        };

        this.mediaRecorder.onstop = () => {
          logger.debug('🎙️ Recording stopped');
          this.isRecording = false;
        };

        this.mediaRecorder.onerror = (event) => {
          logger.error('🎙️ MediaRecorder error', { event });
          this.isRecording = false;
        };

        // Start recording
        this.mediaRecorder.start(100); // Collect data every 100ms
        this.isRecording = true;

        // Auto-stop after max duration
        setTimeout(() => {
          if (this.isRecording) {
            this.stopRecording();
          }
        }, this.config.maxDuration);

        logger.debug('🎙️ Recording started');
      },
      (error): AudioError => {
        logger.error('🎙️ Failed to start recording', { error });
        return {
          type: 'DEVICE_ERROR',
          message: 'Failed to start audio recording',
          originalError: error,
        };
      }
    );
  }

  /**
   * Stop recording and return audio blob
   */
  public async stopRecording(): Promise<TE.TaskEither<AudioError, Blob>> {
    if (!this.mediaRecorder || !this.isRecording) {
      return TE.left({
        type: 'DEVICE_ERROR',
        message: 'No active recording to stop',
      });
    }

    return TE.tryCatch(
      async () => {
        return new Promise<Blob>((resolve, reject) => {
          if (!this.mediaRecorder) {
            reject(new Error('MediaRecorder not available'));
            return;
          }

          this.mediaRecorder.onstop = () => {
            try {
              const format = this.getBestSupportedFormat();
              const audioBlob = new Blob(this.chunks, { type: format.mimeType });
              
              logger.debug('🎙️ Recording completed', {
                size: audioBlob.size,
                duration: Date.now() - this.startTime,
                format: format.mimeType,
              });

              resolve(audioBlob);
            } catch (error) {
              reject(error);
            }
          };

          this.mediaRecorder.stop();
        });
      },
      (error): AudioError => {
        logger.error('🎙️ Failed to stop recording', { error });
        return {
          type: 'PROCESSING_ERROR',
          message: 'Failed to complete audio recording',
          originalError: error,
        };
      }
    );
  }

  /**
   * Get real-time audio visualization data
   */
  public getVisualizationData(): O.Option<AudioVisualizationData> {
    if (!this.analyser) {
      return O.none;
    }

    try {
      const bufferLength = this.analyser.frequencyBinCount;
      const frequencyData = new Uint8Array(bufferLength);
      const timeData = new Uint8Array(bufferLength);

      this.analyser.getByteFrequencyData(frequencyData);
      this.analyser.getByteTimeDomainData(timeData);

      // Calculate volume metrics
      const { volume, peak, rms } = this.calculateVolumeMetrics(timeData);

      return O.some({
        frequencyData,
        timeData,
        volume,
        peak,
        rms,
      });
    } catch (error) {
      logger.error('🎙️ Failed to get visualization data', { error });
      return O.none;
    }
  }

  /**
   * Get current volume level (0-1)
   */
  public getCurrentVolume(): number {
    const vizData = this.getVisualizationData();
    return O.isSome(vizData) ? vizData.value.volume : 0;
  }

  /**
   * Check if currently recording
   */
  public isCurrentlyRecording(): boolean {
    return this.isRecording;
  }

  /**
   * Get recording duration
   */
  public getRecordingDuration(): number {
    return this.isRecording ? Date.now() - this.startTime : 0;
  }

  /**
   * Cleanup resources
   */
  public dispose(): void {
    logger.debug('🎙️ Disposing audio recorder');

    if (this.mediaRecorder && this.isRecording) {
      this.mediaRecorder.stop();
    }

    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }

    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }

    this.mediaRecorder = null;
    this.analyser = null;
    this.microphone = null;
    this.chunks = [];
    this.isRecording = false;
  }

  // Private helper methods
  private getBestSupportedFormat(): AudioFormat {
    const formats: AudioFormat[] = [
      { mimeType: 'audio/webm;codecs=opus', extension: 'webm', supported: false },
      { mimeType: 'audio/webm', extension: 'webm', supported: false },
      { mimeType: 'audio/mp4', extension: 'mp4', supported: false },
      { mimeType: 'audio/wav', extension: 'wav', supported: false },
    ];

    // Check format support
    formats.forEach(format => {
      format.supported = MediaRecorder.isTypeSupported(format.mimeType);
    });

    // Return first supported format
    const supportedFormat = formats.find(f => f.supported);
    return supportedFormat || formats[formats.length - 1]; // Fallback to wav
  }

  private calculateVolumeMetrics(timeData: Uint8Array): { volume: number; peak: number; rms: number } {
    let sum = 0;
    let peak = 0;

    for (let i = 0; i < timeData.length; i++) {
      const amplitude = Math.abs(timeData[i] - 128) / 128;
      sum += amplitude * amplitude;
      peak = Math.max(peak, amplitude);
    }

    const rms = Math.sqrt(sum / timeData.length);
    const volume = Math.min(rms * 5, 1); // Amplify for better sensitivity

    return { volume, peak, rms };
  }
}

/**
 * VoiceActivityDetector - Intelligent voice activity detection
 */
export class VoiceActivityDetector {
  private config: Required<VoiceActivityConfig>;
  private volumeHistory: number[] = [];
  private isSpeaking = false;
  private lastSpeechTime = 0;
  private speechStartTime = 0;
  private smoothedVolume = 0;

  constructor(config: VoiceActivityConfig = {}) {
    this.config = {
      threshold: 0.02,
      minSpeechDuration: 300,
      maxSilenceDuration: 1000,
      smoothingFactor: 0.3,
      ...config,
    };
  }

  /**
   * Process audio volume and detect voice activity
   */
  public processVolume(volume: number): {
    isSpeaking: boolean;
    confidence: number;
    speechDuration: number;
    silenceDuration: number;
  } {
    const now = Date.now();
    
    // Apply smoothing
    this.smoothedVolume = this.smoothedVolume * (1 - this.config.smoothingFactor) + 
                          volume * this.config.smoothingFactor;

    // Update volume history (keep last 20 samples)
    this.volumeHistory.push(this.smoothedVolume);
    if (this.volumeHistory.length > 20) {
      this.volumeHistory.shift();
    }

    // Calculate adaptive threshold based on recent history
    const adaptiveThreshold = this.calculateAdaptiveThreshold();
    const isAboveThreshold = this.smoothedVolume > adaptiveThreshold;

    // State machine for voice activity
    if (!this.isSpeaking && isAboveThreshold) {
      // Start of potential speech
      this.speechStartTime = now;
      this.isSpeaking = true;
      this.lastSpeechTime = now;
    } else if (this.isSpeaking && isAboveThreshold) {
      // Continue speech
      this.lastSpeechTime = now;
    } else if (this.isSpeaking && !isAboveThreshold) {
      // Potential end of speech
      const silenceDuration = now - this.lastSpeechTime;
      if (silenceDuration > this.config.maxSilenceDuration) {
        this.isSpeaking = false;
      }
    }

    // Calculate metrics
    const speechDuration = this.isSpeaking ? now - this.speechStartTime : 0;
    const silenceDuration = this.isSpeaking ? 0 : now - this.lastSpeechTime;
    const confidence = this.calculateConfidence(this.smoothedVolume, adaptiveThreshold);

    return {
      isSpeaking: this.isSpeaking && speechDuration >= this.config.minSpeechDuration,
      confidence,
      speechDuration,
      silenceDuration,
    };
  }

  /**
   * Reset detector state
   */
  public reset(): void {
    this.volumeHistory = [];
    this.isSpeaking = false;
    this.lastSpeechTime = 0;
    this.speechStartTime = 0;
    this.smoothedVolume = 0;
  }

  /**
   * Update configuration
   */
  public updateConfig(config: Partial<VoiceActivityConfig>): void {
    this.config = { ...this.config, ...config };
  }

  private calculateAdaptiveThreshold(): number {
    if (this.volumeHistory.length < 5) {
      return this.config.threshold;
    }

    // Calculate noise floor from recent quiet periods
    const sortedHistory = [...this.volumeHistory].sort((a, b) => a - b);
    const noiseFloor = sortedHistory[Math.floor(sortedHistory.length * 0.3)];
    
    // Adaptive threshold is noise floor + base threshold
    return Math.max(noiseFloor * 2, this.config.threshold);
  }

  private calculateConfidence(volume: number, threshold: number): number {
    if (volume <= threshold) {
      return 0;
    }
    
    // Confidence increases with volume above threshold
    const ratio = volume / threshold;
    return Math.min(Math.pow(ratio - 1, 0.5), 1);
  }
}

/**
 * AudioConverter - Format conversion utilities
 */
export namespace AudioConverter {
  /**
   * Convert Blob to ArrayBuffer
   */
  export async function blobToArrayBuffer(blob: Blob): Promise<ArrayBuffer> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as ArrayBuffer);
      reader.onerror = () => reject(reader.error);
      reader.readAsArrayBuffer(blob);
    });
  }

  /**
   * Convert ArrayBuffer to Base64
   */
  export function arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  /**
   * Convert Base64 to ArrayBuffer
   */
  export function base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
  }

  /**
   * Resample audio to target sample rate
   */
  export async function resampleAudio(
    audioBuffer: AudioBuffer,
    targetSampleRate: number
  ): Promise<AudioBuffer> {
    if (audioBuffer.sampleRate === targetSampleRate) {
      return audioBuffer;
    }

    const audioContext = new AudioContext({ sampleRate: targetSampleRate });
    const offlineContext = new OfflineAudioContext(
      audioBuffer.numberOfChannels,
      Math.ceil(audioBuffer.duration * targetSampleRate),
      targetSampleRate
    );

    const source = offlineContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(offlineContext.destination);
    source.start();

    return await offlineContext.startRendering();
  }

  /**
   * Convert stereo to mono
   */
  export function stereoToMono(audioBuffer: AudioBuffer): AudioBuffer {
    if (audioBuffer.numberOfChannels === 1) {
      return audioBuffer;
    }

    const audioContext = new AudioContext();
    const monoBuffer = audioContext.createBuffer(
      1,
      audioBuffer.length,
      audioBuffer.sampleRate
    );

    const leftChannel = audioBuffer.getChannelData(0);
    const rightChannel = audioBuffer.getChannelData(1);
    const monoChannel = monoBuffer.getChannelData(0);

    for (let i = 0; i < audioBuffer.length; i++) {
      monoChannel[i] = (leftChannel[i] + rightChannel[i]) / 2;
    }

    return monoBuffer;
  }
}

/**
 * AudioVisualizer - Real-time audio visualization helpers
 */
export namespace AudioVisualizer {
  /**
   * Generate waveform visualization data
   */
  export function generateWaveform(
    frequencyData: Uint8Array,
    width: number,
    height: number
  ): ImageData {
    const canvas = new OffscreenCanvas(width, height);
    const ctx = canvas.getContext('2d')!;
    
    ctx.fillStyle = 'rgba(0, 0, 0, 0)';
    ctx.fillRect(0, 0, width, height);
    
    ctx.fillStyle = '#3b82f6';
    
    const barWidth = width / frequencyData.length;
    
    for (let i = 0; i < frequencyData.length; i++) {
      const barHeight = (frequencyData[i] / 255) * height;
      ctx.fillRect(i * barWidth, height - barHeight, barWidth, barHeight);
    }
    
    return ctx.getImageData(0, 0, width, height);
  }

  /**
   * Generate circular volume indicator
   */
  export function generateVolumeCircle(
    volume: number,
    size: number,
    color: string = '#3b82f6'
  ): ImageData {
    const canvas = new OffscreenCanvas(size, size);
    const ctx = canvas.getContext('2d')!;
    
    const centerX = size / 2;
    const centerY = size / 2;
    const radius = (size / 2) * 0.8;
    
    // Background circle
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
    ctx.strokeStyle = 'rgba(59, 130, 246, 0.3)';
    ctx.lineWidth = 2;
    ctx.stroke();
    
    // Volume arc
    if (volume > 0) {
      const angle = volume * 2 * Math.PI;
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, -Math.PI / 2, -Math.PI / 2 + angle);
      ctx.strokeStyle = color;
      ctx.lineWidth = 4;
      ctx.stroke();
    }
    
    return ctx.getImageData(0, 0, size, size);
  }

  /**
   * Generate spectrum analyzer bars
   */
  export function generateSpectrum(
    frequencyData: Uint8Array,
    width: number,
    height: number,
    barCount: number = 32
  ): number[] {
    const barsData: number[] = [];
    const binSize = Math.floor(frequencyData.length / barCount);
    
    for (let i = 0; i < barCount; i++) {
      let sum = 0;
      for (let j = 0; j < binSize; j++) {
        sum += frequencyData[i * binSize + j];
      }
      const average = sum / binSize;
      const normalizedHeight = (average / 255) * height;
      barsData.push(normalizedHeight);
    }
    
    return barsData;
  }
}

/**
 * Utility functions
 */
export namespace AudioUtils {
  /**
   * Check browser audio capabilities
   */
  export function checkAudioSupport(): {
    mediaRecorder: boolean;
    webAudio: boolean;
    formats: AudioFormat[];
  } {
    const formats: AudioFormat[] = [
      { mimeType: 'audio/webm;codecs=opus', extension: 'webm', supported: false },
      { mimeType: 'audio/webm', extension: 'webm', supported: false },
      { mimeType: 'audio/mp4', extension: 'mp4', supported: false },
      { mimeType: 'audio/wav', extension: 'wav', supported: false },
    ];

    // Check format support
    if (typeof MediaRecorder !== 'undefined') {
      formats.forEach(format => {
        format.supported = MediaRecorder.isTypeSupported(format.mimeType);
      });
    }

    return {
      mediaRecorder: typeof MediaRecorder !== 'undefined',
      webAudio: typeof AudioContext !== 'undefined' || typeof webkitAudioContext !== 'undefined',
      formats,
    };
  }

  /**
   * Create audio context with optimal settings
   */
  export function createOptimalAudioContext(sampleRate?: number): AudioContext {
    const options: AudioContextOptions = {
      latencyHint: 'interactive',
      sampleRate,
    };

    return new (window.AudioContext || window.webkitAudioContext)(options);
  }

  /**
   * Format file size for display
   */
  export function formatFileSize(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(1)} ${units[unitIndex]}`;
  }

  /**
   * Format duration for display
   */
  export function formatDuration(milliseconds: number): string {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;

    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }
}

// Global audio context for reuse
let globalAudioContext: AudioContext | null = null;

/**
 * Get shared audio context instance
 */
export function getSharedAudioContext(): AudioContext {
  if (!globalAudioContext || globalAudioContext.state === 'closed') {
    globalAudioContext = AudioUtils.createOptimalAudioContext();
  }
  return globalAudioContext;
}
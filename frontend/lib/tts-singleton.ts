import { useState, useEffect } from 'react';
import * as TE from 'fp-ts/TaskEither';
import * as O from 'fp-ts/Option';
import { pipe } from 'fp-ts/function';
import { logger } from './logger';
import { voiceLogger, logTTS, logEnvironment, logPerformance } from './voice-logger';

// Add webkitAudioContext to Window interface
declare global {
  interface Window {
    webkitAudioContext: typeof AudioContext;
  }
}

export interface TTSError {
  type: 'API_ERROR' | 'NETWORK_ERROR' | 'AUDIO_ERROR' | 'QUOTA_EXCEEDED';
  message: string;
  statusCode?: number;
  originalError?: unknown;
}

export interface TTSRequest {
  id: string;
  text: string;
  voiceId: string;
  priority: 'low' | 'medium' | 'high';
  onComplete?: (success: boolean, error?: TTSError) => void;
  onProgress?: (progress: number) => void;
}

export interface TTSState {
  isInitialized: boolean;
  isProcessing: boolean;
  currentRequest: TTSRequest | null;
  queue: TTSRequest[];
  audioContext: AudioContext | null;
  cache: Map<string, ArrayBuffer>;
  error: TTSError | null;
}

export interface ElevenLabsConfig {
  apiKey?: string;
  voiceId: string;
  modelId?: string;
  voiceSettings?: {
    stability?: number;
    similarityBoost?: number;
    style?: number;
    useSpeakerBoost?: boolean;
  };
  useSecureEndpoint?: boolean;
}

/**
 * Singleton TTS Manager to prevent resource conflicts
 * Handles all TTS operations through a single instance
 */
class TTSManager {
  private static instance: TTSManager | null = null;
  private state: TTSState;
  private config: ElevenLabsConfig | null = null;
  private requestIdCounter = 0;
  private processingTimeout: NodeJS.Timeout | null = null;
  private audioContext: AudioContext | null = null;
  private currentSource: AudioBufferSourceNode | null = null;
  private isPlaying = false;
  
  private constructor() {
    this.state = {
      isInitialized: false,
      isProcessing: false,
      currentRequest: null,
      queue: [],
      audioContext: null,
      cache: new Map(),
      error: null
    };
    
    voiceLogger.info('🔊 TTS Manager singleton created');
  }
  
  /**
   * Get the singleton instance
   */
  public static getInstance(): TTSManager {
    if (!TTSManager.instance) {
      TTSManager.instance = new TTSManager();
    }
    return TTSManager.instance;
  }
  
  /**
   * Initialize the TTS Manager with configuration
   */
  public async initialize(config: ElevenLabsConfig): Promise<void> {
    if (this.state.isInitialized) {
      voiceLogger.debug('🔊 TTS Manager already initialized');
      return;
    }
    
    voiceLogger.info('🔊 Initializing TTS Manager', {
      voiceId: config.voiceId,
      modelId: config.modelId,
      useSecureEndpoint: config.useSecureEndpoint
    });
    
    this.config = config;
    
    try {
      // Initialize AudioContext
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) {
        throw new Error('AudioContext not supported in this browser');
      }
      
      this.audioContext = new AudioContextClass();
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }
      
      this.state.audioContext = this.audioContext;
      this.state.isInitialized = true;
      this.state.error = null;
      
      voiceLogger.info('🔊 TTS Manager initialized successfully', {
        audioContextState: this.audioContext.state,
        sampleRate: this.audioContext.sampleRate
      });
      
      // Start processing queue
      this.processQueue();
      
    } catch (error) {
      const ttsError = this.createTTSError(
        'AUDIO_ERROR',
        'Failed to initialize TTS Manager',
        undefined,
        error
      );
      
      this.state.error = ttsError;
      this.state.isInitialized = false;
      
      voiceLogger.error('🔊 TTS Manager initialization failed', { error: ttsError });
      throw ttsError;
    }
  }
  
  /**
   * Add a TTS request to the queue
   */
  public speak(
    text: string,
    options: {
      priority?: 'low' | 'medium' | 'high';
      onComplete?: (success: boolean, error?: TTSError) => void;
      onProgress?: (progress: number) => void;
    } = {}
  ): string {
    if (!this.state.isInitialized) {
      const error = this.createTTSError(
        'API_ERROR',
        'TTS Manager not initialized. Call initialize() first.'
      );
      options.onComplete?.(false, error);
      throw error;
    }
    
    const requestId = `tts-${++this.requestIdCounter}-${Date.now()}`;
    const request: TTSRequest = {
      id: requestId,
      text,
      voiceId: this.config!.voiceId,
      priority: options.priority || 'medium',
      onComplete: options.onComplete,
      onProgress: options.onProgress
    };
    
    // Add to queue based on priority
    if (request.priority === 'high') {
      this.state.queue.unshift(request);
    } else {
      this.state.queue.push(request);
    }
    
    voiceLogger.debug('🔊 TTS request queued', {
      requestId,
      text: text.substring(0, 50) + (text.length > 50 ? '...' : ''),
      priority: request.priority,
      queueLength: this.state.queue.length
    });
    
    // Start processing if not already processing
    if (!this.state.isProcessing) {
      this.processQueue();
    }
    
    return requestId;
  }
  
  /**
   * Stop current playback and clear queue
   */
  public stop(): void {
    voiceLogger.debug('🔊 Stopping TTS Manager');
    
    // Stop current audio
    if (this.currentSource) {
      this.currentSource.stop();
      this.currentSource = null;
    }
    
    this.isPlaying = false;
    
    // Clear queue
    this.state.queue = [];
    this.state.currentRequest = null;
    this.state.isProcessing = false;
    
    if (this.processingTimeout) {
      clearTimeout(this.processingTimeout);
      this.processingTimeout = null;
    }
    
    voiceLogger.debug('🔊 TTS Manager stopped');
  }
  
  /**
   * Get current state
   */
  public getState(): TTSState {
    return { ...this.state };
  }
  
  /**
   * Check if TTS is currently speaking
   */
  public isSpeaking(): boolean {
    return this.isPlaying;
  }
  
  /**
   * Process the TTS queue
   */
  private async processQueue(): Promise<void> {
    if (this.state.isProcessing || this.state.queue.length === 0) {
      return;
    }
    
    this.state.isProcessing = true;
    
    while (this.state.queue.length > 0) {
      const request = this.state.queue.shift()!;
      this.state.currentRequest = request;
      
      try {
        await this.processRequest(request);
      } catch (error) {
        voiceLogger.error('🔊 TTS request processing failed', {
          requestId: request.id,
          error
        });
        
        const ttsError = this.createTTSError(
          'API_ERROR',
          'Failed to process TTS request',
          undefined,
          error
        );
        
        request.onComplete?.(false, ttsError);
      }
    }
    
    this.state.isProcessing = false;
    this.state.currentRequest = null;
  }
  
  /**
   * Process a single TTS request
   */
  private async processRequest(request: TTSRequest): Promise<void> {
    const startTime = performance.now();
    
    voiceLogger.debug('🔊 Processing TTS request', {
      requestId: request.id,
      text: request.text.substring(0, 50) + (request.text.length > 50 ? '...' : ''),
      voiceId: request.voiceId
    });
    
    try {
      // Check cache first
      const cacheKey = this.getCacheKey(request.text, request.voiceId);
      let audioBuffer = this.state.cache.get(cacheKey);
      
      if (!audioBuffer) {
        // Synthesize speech
        request.onProgress?.(0.3);
        audioBuffer = await this.synthesizeSpeech(request);
        
        // Cache the result
        this.state.cache.set(cacheKey, audioBuffer);
        
        // Limit cache size
        if (this.state.cache.size > 20) {
          const firstKey = this.state.cache.keys().next().value;
          this.state.cache.delete(firstKey);
        }
      }
      
      request.onProgress?.(0.7);
      
      // Play audio
      await this.playAudioBuffer(audioBuffer);
      
      request.onProgress?.(1.0);
      
      const duration = performance.now() - startTime;
      voiceLogger.info('🔊 TTS request completed', {
        requestId: request.id,
        duration: Math.round(duration),
        fromCache: this.state.cache.has(cacheKey)
      });
      
      request.onComplete?.(true);
      
    } catch (error) {
      const ttsError = this.createTTSError(
        'API_ERROR',
        'Failed to process TTS request',
        undefined,
        error
      );
      
      request.onComplete?.(false, ttsError);
      throw ttsError;
    }
  }
  
  /**
   * Synthesize speech using configured endpoint
   */
  private async synthesizeSpeech(request: TTSRequest): Promise<ArrayBuffer> {
    const endpoint = this.config!.useSecureEndpoint 
      ? '/api/voice/synthesize'
      : `https://api.elevenlabs.io/v1/text-to-speech/${request.voiceId}`;
      
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };
    
    // Add API key if not using secure endpoint
    if (!this.config!.useSecureEndpoint && this.config!.apiKey) {
      headers['xi-api-key'] = this.config!.apiKey;
    }
    
    const body = {
      text: request.text,
      voice_id: request.voiceId,
      model_id: this.config!.modelId || 'eleven_monolingual_v1',
      voice_settings: this.config!.voiceSettings || {
        stability: 0.5,
        similarity_boost: 0.5
      }
    };
    
    const response = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(body)
    });
    
    if (!response.ok) {
      throw new Error(`TTS API error: ${response.status} ${response.statusText}`);
    }
    
    return await response.arrayBuffer();
  }
  
  /**
   * Play audio buffer
   */
  private async playAudioBuffer(audioBuffer: ArrayBuffer): Promise<void> {
    if (!this.audioContext) {
      throw new Error('AudioContext not initialized');
    }
    
    const decodedAudioBuffer = await this.audioContext.decodeAudioData(audioBuffer);
    
    return new Promise((resolve, reject) => {
      const source = this.audioContext!.createBufferSource();
      source.buffer = decodedAudioBuffer;
      source.connect(this.audioContext!.destination);
      
      this.currentSource = source;
      this.isPlaying = true;
      
      source.onended = () => {
        this.isPlaying = false;
        this.currentSource = null;
        resolve();
      };
      
      source.start();
    });
  }
  
  /**
   * Create cache key for text and voice combination
   */
  private getCacheKey(text: string, voiceId: string): string {
    return `${voiceId}-${text.substring(0, 100)}-${text.length}`;
  }
  
  /**
   * Create TTS error with logging
   */
  private createTTSError(
    type: TTSError['type'],
    message: string,
    statusCode?: number,
    originalError?: unknown
  ): TTSError {
    const error: TTSError = {
      type,
      message,
      statusCode,
      originalError
    };
    
    voiceLogger.error('🔊 TTS Error', {
      type,
      message,
      statusCode,
      originalError: originalError instanceof Error ? originalError.message : originalError
    });
    
    return error;
  }
  
  /**
   * Clean up resources
   */
  public dispose(): void {
    this.stop();
    
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    
    this.state.cache.clear();
    this.state.isInitialized = false;
    
    voiceLogger.info('🔊 TTS Manager disposed');
  }
}

// Export singleton instance
export const ttsManager = TTSManager.getInstance();

// Export hook for React components
export function useTTSManager() {
  const [state, setState] = useState<TTSState>(ttsManager.getState());
  
  useEffect(() => {
    // Subscribe to state changes (simple implementation)
    const interval = setInterval(() => {
      setState(ttsManager.getState());
    }, 100);
    
    return () => clearInterval(interval);
  }, []);
  
  return {
    state,
    speak: ttsManager.speak.bind(ttsManager),
    stop: ttsManager.stop.bind(ttsManager),
    isSpeaking: ttsManager.isSpeaking.bind(ttsManager),
    initialize: ttsManager.initialize.bind(ttsManager)
  };
}

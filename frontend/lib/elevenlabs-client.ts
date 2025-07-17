/**
 * ElevenLabs v2 Conversational AI Integration Client
 * 
 * This module provides a comprehensive wrapper around the ElevenLabs Conversational AI SDK
 * with enhanced error handling, retry logic, and configuration management.
 */

import { Conversation } from '@elevenlabs/client';
import * as TE from 'fp-ts/TaskEither';
import * as O from 'fp-ts/Option';
import { pipe } from 'fp-ts/function';
import { logger } from './logger';

// Types and Interfaces
export interface VoiceAssistantConfig {
  /** Agent ID for ElevenLabs Conversational AI */
  agentId?: string;
  /** Signed URL for authorized conversations */
  signedUrl?: string;
  /** API endpoint for generating signed URLs */
  signedUrlEndpoint?: string;
  /** Audio settings */
  audioSettings?: {
    volume?: number; // 0-1
    sampleRate?: number;
    channels?: number;
  };
  /** Retry configuration */
  retryConfig?: {
    maxRetries?: number;
    retryDelay?: number;
    exponentialBackoff?: boolean;
  };
  /** Debug mode */
  debug?: boolean;
}

export interface ConversationMessage {
  id: string;
  type: 'user' | 'agent' | 'system';
  content: string;
  timestamp: number;
  isFinal?: boolean;
  metadata?: {
    confidence?: number;
    duration?: number;
    audioUrl?: string;
  };
}

export interface ConversationSession {
  id: string;
  startTime: number;
  endTime?: number;
  messages: ConversationMessage[];
  status: 'connecting' | 'connected' | 'disconnected' | 'error';
  agentMode: 'listening' | 'speaking' | 'thinking';
}

export interface VoiceAssistantError {
  type: 'CONNECTION_ERROR' | 'AUDIO_ERROR' | 'PERMISSION_ERROR' | 'API_ERROR' | 'NETWORK_ERROR';
  message: string;
  code?: string;
  originalError?: unknown;
  timestamp: number;
}

export interface AudioMetrics {
  inputVolume: number;
  outputVolume: number;
  inputFrequencyData?: Uint8Array;
  outputFrequencyData?: Uint8Array;
}

// Event handlers
export interface ConversationEventHandlers {
  onConnect?: () => void;
  onDisconnect?: (reason?: string) => void;
  onMessage?: (message: ConversationMessage) => void;
  onError?: (error: VoiceAssistantError) => void;
  onStatusChange?: (status: ConversationSession['status']) => void;
  onModeChange?: (mode: ConversationSession['agentMode']) => void;
  onAudioMetrics?: (metrics: AudioMetrics) => void;
}

/**
 * VoiceAssistant - Main class for ElevenLabs Conversational AI integration
 */
export class VoiceAssistant {
  private config: Required<VoiceAssistantConfig>;
  private conversation: Conversation | null = null;
  private session: ConversationSession | null = null;
  private eventHandlers: ConversationEventHandlers = {};
  private retryCount = 0;
  private isConnecting = false;
  private audioMetricsInterval: NodeJS.Timeout | null = null;

  constructor(config: VoiceAssistantConfig) {
    this.config = {
      agentId: config.agentId || '',
      signedUrl: config.signedUrl || '',
      signedUrlEndpoint: config.signedUrlEndpoint || '/api/elevenlabs/signed-url',
      audioSettings: {
        volume: 0.8,
        sampleRate: 44100,
        channels: 1,
        ...config.audioSettings,
      },
      retryConfig: {
        maxRetries: 3,
        retryDelay: 1000,
        exponentialBackoff: true,
        ...config.retryConfig,
      },
      debug: config.debug || false,
    };

    if (this.config.debug) {
      logger.debug('🎙️ VoiceAssistant initialized', {
        agentId: this.config.agentId,
        hasSignedUrl: !!this.config.signedUrl,
        audioSettings: this.config.audioSettings,
      });
    }
  }

  /**
   * Register event handlers for conversation events
   */
  public setEventHandlers(handlers: ConversationEventHandlers): void {
    this.eventHandlers = { ...this.eventHandlers, ...handlers };
  }

  /**
   * Request microphone permissions
   */
  public async requestMicrophonePermission(): Promise<TE.TaskEither<VoiceAssistantError, MediaStream>> {
    return TE.tryCatch(
      async () => {
        logger.debug('🎙️ Requesting microphone permission');
        
        const stream = await navigator.mediaDevices.getUserMedia({ 
          audio: {
            sampleRate: this.config.audioSettings.sampleRate,
            channelCount: this.config.audioSettings.channels,
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          }
        });
        
        logger.debug('🎙️ Microphone permission granted');
        return stream;
      },
      (error): VoiceAssistantError => {
        logger.error('🎙️ Failed to get microphone permission', { error });
        return {
          type: 'PERMISSION_ERROR',
          message: 'Microphone permission denied or unavailable',
          originalError: error,
          timestamp: Date.now(),
        };
      }
    );
  }

  /**
   * Get signed URL for authorized conversations
   */
  private async getSignedUrl(): Promise<TE.TaskEither<VoiceAssistantError, string>> {
    if (this.config.signedUrl) {
      return TE.right(this.config.signedUrl);
    }

    return TE.tryCatch(
      async () => {
        logger.debug('🎙️ Fetching signed URL from endpoint', {
          endpoint: this.config.signedUrlEndpoint,
        });

        const response = await fetch(this.config.signedUrlEndpoint, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error(`Failed to get signed URL: ${response.status} ${response.statusText}`);
        }

        const signedUrl = await response.text();
        logger.debug('🎙️ Signed URL obtained successfully');
        return signedUrl;
      },
      (error): VoiceAssistantError => {
        logger.error('🎙️ Failed to get signed URL', { error });
        return {
          type: 'API_ERROR',
          message: 'Failed to obtain signed URL for conversation',
          originalError: error,
          timestamp: Date.now(),
        };
      }
    );
  }

  /**
   * Start a conversation session with retry logic
   */
  public async startSession(): Promise<TE.TaskEither<VoiceAssistantError, ConversationSession>> {
    if (this.isConnecting) {
      return TE.left({
        type: 'CONNECTION_ERROR',
        message: 'Connection attempt already in progress',
        timestamp: Date.now(),
      });
    }

    if (this.conversation) {
      await this.endSession();
    }

    this.isConnecting = true;
    this.retryCount = 0;

    return this.attemptConnection();
  }

  /**
   * Attempt to establish connection with retry logic
   */
  private async attemptConnection(): Promise<TE.TaskEither<VoiceAssistantError, ConversationSession>> {
    return pipe(
      await this.getSignedUrl(),
      TE.chain((signedUrl) =>
        TE.tryCatch(
          async () => {
            logger.debug('🎙️ Starting conversation session', {
              attempt: this.retryCount + 1,
              maxRetries: this.config.retryConfig.maxRetries,
            });

            // Initialize session
            this.session = {
              id: crypto.randomUUID(),
              startTime: Date.now(),
              messages: [],
              status: 'connecting',
              agentMode: 'listening',
            };

            this.eventHandlers.onStatusChange?.('connecting');

            // Start conversation
            const sessionConfig = this.config.agentId
              ? { agentId: this.config.agentId }
              : { signedUrl };

            this.conversation = await Conversation.startSession({
              ...sessionConfig,
              onConnect: this.handleConnect.bind(this),
              onDisconnect: this.handleDisconnect.bind(this),
              onMessage: this.handleMessage.bind(this),
              onError: this.handleError.bind(this),
              onStatusChange: this.handleStatusChange.bind(this),
              onModeChange: this.handleModeChange.bind(this),
            });

            // Set initial volume
            await this.conversation.setVolume({ 
              volume: this.config.audioSettings.volume 
            });

            // Start audio metrics monitoring
            this.startAudioMetricsMonitoring();

            this.isConnecting = false;
            this.retryCount = 0;

            return this.session;
          },
          async (error): Promise<VoiceAssistantError> => {
            logger.error('🎙️ Failed to start conversation session', { 
              error, 
              attempt: this.retryCount + 1 
            });

            this.isConnecting = false;

            const voiceError: VoiceAssistantError = {
              type: 'CONNECTION_ERROR',
              message: 'Failed to establish conversation session',
              originalError: error,
              timestamp: Date.now(),
            };

            // Retry logic
            if (this.retryCount < this.config.retryConfig.maxRetries) {
              this.retryCount++;
              const delay = this.config.retryConfig.exponentialBackoff
                ? this.config.retryConfig.retryDelay * Math.pow(2, this.retryCount - 1)
                : this.config.retryConfig.retryDelay;

              logger.debug('🎙️ Retrying connection', { 
                delay, 
                attempt: this.retryCount + 1 
              });

              await new Promise(resolve => setTimeout(resolve, delay));
              return this.attemptConnection();
            }

            return TE.left(voiceError);
          }
        )
      )
    );
  }

  /**
   * End the current conversation session
   */
  public async endSession(): Promise<void> {
    logger.debug('🎙️ Ending conversation session');

    this.stopAudioMetricsMonitoring();

    if (this.conversation) {
      try {
        await this.conversation.endSession();
      } catch (error) {
        logger.error('🎙️ Error ending conversation', { error });
      }
      this.conversation = null;
    }

    if (this.session) {
      this.session.endTime = Date.now();
      this.session.status = 'disconnected';
      this.session = null;
    }

    this.isConnecting = false;
    this.retryCount = 0;
  }

  /**
   * Set conversation volume
   */
  public async setVolume(volume: number): Promise<TE.TaskEither<VoiceAssistantError, void>> {
    if (!this.conversation) {
      return TE.left({
        type: 'CONNECTION_ERROR',
        message: 'No active conversation session',
        timestamp: Date.now(),
      });
    }

    return TE.tryCatch(
      async () => {
        await this.conversation!.setVolume({ volume });
        this.config.audioSettings.volume = volume;
        logger.debug('🎙️ Volume set', { volume });
      },
      (error): VoiceAssistantError => ({
        type: 'AUDIO_ERROR',
        message: 'Failed to set volume',
        originalError: error,
        timestamp: Date.now(),
      })
    );
  }

  /**
   * Get current audio metrics
   */
  public async getAudioMetrics(): Promise<O.Option<AudioMetrics>> {
    if (!this.conversation) {
      return O.none;
    }

    try {
      const [inputVolume, outputVolume, inputFrequencyData, outputFrequencyData] = await Promise.all([
        this.conversation.getInputVolume(),
        this.conversation.getOutputVolume(),
        this.conversation.getInputByteFrequencyData(),
        this.conversation.getOutputByteFrequencyData(),
      ]);

      return O.some({
        inputVolume,
        outputVolume,
        inputFrequencyData,
        outputFrequencyData,
      });
    } catch (error) {
      logger.error('🎙️ Failed to get audio metrics', { error });
      return O.none;
    }
  }

  /**
   * Get current session info
   */
  public getCurrentSession(): O.Option<ConversationSession> {
    return this.session ? O.some(this.session) : O.none;
  }

  /**
   * Check if currently connected
   */
  public isConnected(): boolean {
    return this.session?.status === 'connected';
  }

  // Event Handlers
  private handleConnect(): void {
    logger.debug('🎙️ Conversation connected');
    if (this.session) {
      this.session.status = 'connected';
    }
    this.eventHandlers.onConnect?.();
    this.eventHandlers.onStatusChange?.('connected');
  }

  private handleDisconnect(reason?: string): void {
    logger.debug('🎙️ Conversation disconnected', { reason });
    if (this.session) {
      this.session.status = 'disconnected';
      this.session.endTime = Date.now();
    }
    this.stopAudioMetricsMonitoring();
    this.eventHandlers.onDisconnect?.(reason);
    this.eventHandlers.onStatusChange?.('disconnected');
  }

  private handleMessage(message: any): void {
    if (!this.session) return;

    const conversationMessage: ConversationMessage = {
      id: crypto.randomUUID(),
      type: message.source === 'user' ? 'user' : 'agent',
      content: message.message || message.text || '',
      timestamp: Date.now(),
      isFinal: message.is_final !== false,
      metadata: {
        confidence: message.confidence,
        duration: message.duration,
      },
    };

    this.session.messages.push(conversationMessage);
    
    logger.debug('🎙️ New message received', {
      type: conversationMessage.type,
      length: conversationMessage.content.length,
      isFinal: conversationMessage.isFinal,
    });

    this.eventHandlers.onMessage?.(conversationMessage);
  }

  private handleError(error: any): void {
    logger.error('🎙️ Conversation error', { error });
    
    const voiceError: VoiceAssistantError = {
      type: 'CONNECTION_ERROR',
      message: error.message || 'Unknown conversation error',
      code: error.code,
      originalError: error,
      timestamp: Date.now(),
    };

    if (this.session) {
      this.session.status = 'error';
    }

    this.eventHandlers.onError?.(voiceError);
    this.eventHandlers.onStatusChange?.('error');
  }

  private handleStatusChange(status: string): void {
    logger.debug('🎙️ Status changed', { status });
    // Map ElevenLabs status to our status types
    const mappedStatus = status as ConversationSession['status'];
    if (this.session) {
      this.session.status = mappedStatus;
    }
    this.eventHandlers.onStatusChange?.(mappedStatus);
  }

  private handleModeChange(mode: string): void {
    logger.debug('🎙️ Mode changed', { mode });
    // Map ElevenLabs mode to our mode types
    const mappedMode = mode as ConversationSession['agentMode'];
    if (this.session) {
      this.session.agentMode = mappedMode;
    }
    this.eventHandlers.onModeChange?.(mappedMode);
  }

  // Audio Metrics Monitoring
  private startAudioMetricsMonitoring(): void {
    if (this.audioMetricsInterval) {
      this.stopAudioMetricsMonitoring();
    }

    this.audioMetricsInterval = setInterval(async () => {
      const metrics = await this.getAudioMetrics();
      if (O.isSome(metrics)) {
        this.eventHandlers.onAudioMetrics?.(metrics.value);
      }
    }, 100); // Update every 100ms for smooth visualizations
  }

  private stopAudioMetricsMonitoring(): void {
    if (this.audioMetricsInterval) {
      clearInterval(this.audioMetricsInterval);
      this.audioMetricsInterval = null;
    }
  }
}

/**
 * Utility functions for voice assistant management
 */
export namespace VoiceAssistantUtils {
  /**
   * Create a VoiceAssistant with default configuration
   */
  export function createDefault(agentId: string): VoiceAssistant {
    return new VoiceAssistant({
      agentId,
      audioSettings: {
        volume: 0.8,
        sampleRate: 44100,
        channels: 1,
      },
      retryConfig: {
        maxRetries: 3,
        retryDelay: 1000,
        exponentialBackoff: true,
      },
      debug: process.env.NODE_ENV === 'development',
    });
  }

  /**
   * Check if the browser supports required features
   */
  export function checkBrowserSupport(): {
    supported: boolean;
    missing: string[];
  } {
    const missing: string[] = [];

    if (!navigator.mediaDevices?.getUserMedia) {
      missing.push('MediaDevices.getUserMedia');
    }

    if (!window.WebSocket) {
      missing.push('WebSocket');
    }

    if (!window.AudioContext && !window.webkitAudioContext) {
      missing.push('AudioContext');
    }

    if (!window.crypto?.randomUUID) {
      missing.push('crypto.randomUUID');
    }

    return {
      supported: missing.length === 0,
      missing,
    };
  }

  /**
   * Format conversation duration
   */
  export function formatDuration(startTime: number, endTime?: number): string {
    const duration = (endTime || Date.now()) - startTime;
    const seconds = Math.floor(duration / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}:${(minutes % 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;
    }
    return `${minutes}:${(seconds % 60).toString().padStart(2, '0')}`;
  }

  /**
   * Extract conversation transcript
   */
  export function extractTranscript(session: ConversationSession): string {
    return session.messages
      .filter(msg => msg.isFinal !== false)
      .map(msg => `${msg.type === 'user' ? 'User' : 'Agent'}: ${msg.content}`)
      .join('\n');
  }
}

// Export default instance factory
export function createVoiceAssistant(config: VoiceAssistantConfig): VoiceAssistant {
  return new VoiceAssistant(config);
}

// Edge runtime compatibility check
export const isEdgeCompatible = typeof EdgeRuntime !== 'undefined';
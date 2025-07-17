/**
 * Web Audio API Recording Module
 * Handles audio recording with streaming, voice activity detection, and visualization
 */

export interface AudioRecorderOptions {
  sampleRate?: number;
  echoCancellation?: boolean;
  noiseSuppression?: boolean;
  autoGainControl?: boolean;
  channelCount?: number;
  mimeType?: string;
  chunkInterval?: number; // milliseconds
  vadThreshold?: number; // 0-1 for voice activity detection
  onDataAvailable?: (chunk: Blob) => void;
  onVoiceActivity?: (isActive: boolean) => void;
  onAudioLevel?: (level: number) => void;
  onError?: (error: Error) => void;
}

export interface AudioVisualizationData {
  level: number;
  frequency: Float32Array;
  waveform: Float32Array;
}

export class AudioRecorder {
  private mediaRecorder: MediaRecorder | null = null;
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private stream: MediaStream | null = null;
  private chunks: Blob[] = [];
  private options: Required<AudioRecorderOptions>;
  private isRecording = false;
  private vadInterval: number | null = null;
  private chunkInterval: number | null = null;
  private lastVoiceActivity = false;
  private permissionStatus: PermissionState = 'prompt';

  constructor(options: AudioRecorderOptions = {}) {
    this.options = {
      sampleRate: 16000, // Optimized for ElevenLabs
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
      channelCount: 1, // Mono audio
      mimeType: this.getPreferredMimeType(),
      chunkInterval: 100, // 100ms chunks
      vadThreshold: 0.01,
      onDataAvailable: () => {},
      onVoiceActivity: () => {},
      onAudioLevel: () => {},
      onError: () => {},
      ...options
    };
  }

  /**
   * Get the preferred MIME type based on browser support
   */
  private getPreferredMimeType(): string {
    const mimeTypes = [
      'audio/webm;codecs=opus',
      'audio/ogg;codecs=opus',
      'audio/webm',
      'audio/ogg',
      'audio/wav',
      'audio/mp4'
    ];

    if (typeof MediaRecorder === 'undefined') {
      return 'audio/webm';
    }

    for (const mimeType of mimeTypes) {
      if (MediaRecorder.isTypeSupported(mimeType)) {
        return mimeType;
      }
    }

    return 'audio/webm';
  }

  /**
   * Check and request microphone permissions
   */
  public async checkPermissions(): Promise<PermissionState> {
    try {
      if ('permissions' in navigator) {
        const permission = await navigator.permissions.query({ name: 'microphone' as PermissionName });
        this.permissionStatus = permission.state;
        
        permission.addEventListener('change', () => {
          this.permissionStatus = permission.state;
        });
        
        return permission.state;
      }
      
      // Fallback: try to get user media to check permissions
      const testStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      testStream.getTracks().forEach(track => track.stop());
      this.permissionStatus = 'granted';
      return 'granted';
    } catch (error) {
      this.permissionStatus = 'denied';
      return 'denied';
    }
  }

  /**
   * Start recording audio
   */
  public async start(): Promise<void> {
    if (this.isRecording) {
      throw new Error('Recording already in progress');
    }

    try {
      // Check permissions first
      const permission = await this.checkPermissions();
      if (permission === 'denied') {
        throw new Error('Microphone permission denied');
      }

      // Get audio stream with specified constraints
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: this.options.sampleRate,
          echoCancellation: this.options.echoCancellation,
          noiseSuppression: this.options.noiseSuppression,
          autoGainControl: this.options.autoGainControl,
          channelCount: this.options.channelCount
        }
      });

      // Create audio context for analysis
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({
        sampleRate: this.options.sampleRate
      });

      // Set up audio analysis
      this.setupAudioAnalysis();

      // Create MediaRecorder
      this.mediaRecorder = new MediaRecorder(this.stream, {
        mimeType: this.options.mimeType,
        audioBitsPerSecond: 128000
      });

      // Handle data available event
      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.chunks.push(event.data);
          this.options.onDataAvailable(event.data);
        }
      };

      // Handle errors
      this.mediaRecorder.onerror = (event) => {
        this.options.onError(new Error(`MediaRecorder error: ${event}`));
      };

      // Start recording with chunking
      this.mediaRecorder.start(this.options.chunkInterval);
      this.isRecording = true;

      // Start voice activity detection
      this.startVoiceActivityDetection();

      // Start chunk interval for streaming
      this.startChunkInterval();
    } catch (error) {
      this.cleanup();
      this.options.onError(error as Error);
      throw error;
    }
  }

  /**
   * Stop recording
   */
  public async stop(): Promise<Blob> {
    if (!this.isRecording || !this.mediaRecorder) {
      throw new Error('No recording in progress');
    }

    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder) {
        reject(new Error('MediaRecorder not initialized'));
        return;
      }

      this.mediaRecorder.onstop = () => {
        const blob = new Blob(this.chunks, { type: this.options.mimeType });
        this.cleanup();
        resolve(blob);
      };

      this.mediaRecorder.stop();
      this.isRecording = false;
    });
  }

  /**
   * Pause recording
   */
  public pause(): void {
    if (this.mediaRecorder && this.isRecording && this.mediaRecorder.state === 'recording') {
      this.mediaRecorder.pause();
    }
  }

  /**
   * Resume recording
   */
  public resume(): void {
    if (this.mediaRecorder && this.isRecording && this.mediaRecorder.state === 'paused') {
      this.mediaRecorder.resume();
    }
  }

  /**
   * Get current recording state
   */
  public getState(): RecordingState {
    if (!this.mediaRecorder) {
      return 'inactive';
    }
    return this.mediaRecorder.state;
  }

  /**
   * Get audio visualization data
   */
  public getVisualizationData(): AudioVisualizationData | null {
    if (!this.analyser) {
      return null;
    }

    const bufferLength = this.analyser.frequencyBinCount;
    const frequencyData = new Float32Array(bufferLength);
    const waveformData = new Float32Array(bufferLength);

    this.analyser.getFloatFrequencyData(frequencyData);
    this.analyser.getFloatTimeDomainData(waveformData);

    // Calculate overall audio level
    let sum = 0;
    for (let i = 0; i < waveformData.length; i++) {
      sum += Math.abs(waveformData[i]);
    }
    const level = sum / waveformData.length;

    return {
      level,
      frequency: frequencyData,
      waveform: waveformData
    };
  }

  /**
   * Set up audio analysis for visualization and VAD
   */
  private setupAudioAnalysis(): void {
    if (!this.audioContext || !this.stream) {
      return;
    }

    this.source = this.audioContext.createMediaStreamSource(this.stream);
    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = 2048;
    this.analyser.smoothingTimeConstant = 0.8;

    this.source.connect(this.analyser);
  }

  /**
   * Start voice activity detection
   */
  private startVoiceActivityDetection(): void {
    if (!this.analyser) {
      return;
    }

    this.vadInterval = window.setInterval(() => {
      const data = this.getVisualizationData();
      if (!data) {
        return;
      }

      const isVoiceActive = data.level > this.options.vadThreshold;
      
      if (isVoiceActive !== this.lastVoiceActivity) {
        this.lastVoiceActivity = isVoiceActive;
        this.options.onVoiceActivity(isVoiceActive);
      }

      this.options.onAudioLevel(data.level);
    }, 50); // Check every 50ms
  }

  /**
   * Start chunk interval for streaming
   */
  private startChunkInterval(): void {
    // MediaRecorder already handles chunking via start(timeslice)
    // This is for additional processing if needed
  }

  /**
   * Clean up resources
   */
  private cleanup(): void {
    // Stop all intervals
    if (this.vadInterval) {
      clearInterval(this.vadInterval);
      this.vadInterval = null;
    }

    if (this.chunkInterval) {
      clearInterval(this.chunkInterval);
      this.chunkInterval = null;
    }

    // Close audio context
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }

    // Stop media stream
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }

    // Reset other properties
    this.mediaRecorder = null;
    this.analyser = null;
    this.source = null;
    this.chunks = [];
    this.isRecording = false;
    this.lastVoiceActivity = false;
  }

  /**
   * Check if browser supports required APIs
   */
  public static isSupported(): boolean {
    return !!(
      navigator.mediaDevices &&
      navigator.mediaDevices.getUserMedia &&
      window.MediaRecorder &&
      (window.AudioContext || (window as any).webkitAudioContext)
    );
  }

  /**
   * Get supported MIME types
   */
  public static getSupportedMimeTypes(): string[] {
    if (typeof MediaRecorder === 'undefined') {
      return [];
    }

    const mimeTypes = [
      'audio/webm;codecs=opus',
      'audio/ogg;codecs=opus',
      'audio/webm',
      'audio/ogg',
      'audio/wav',
      'audio/mp4'
    ];

    return mimeTypes.filter(mimeType => MediaRecorder.isTypeSupported(mimeType));
  }
}

export type RecordingState = 'inactive' | 'recording' | 'paused';

// Export default instance with optimal settings for ElevenLabs
export const createAudioRecorder = (options?: AudioRecorderOptions) => {
  return new AudioRecorder({
    sampleRate: 16000,
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
    channelCount: 1,
    chunkInterval: 100,
    ...options
  });
};
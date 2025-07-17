import { useRef, useState, useCallback, useEffect } from 'react';
import { AudioRecorder, AudioRecorderOptions, AudioVisualizationData, RecordingState } from '../lib/audio-recorder';

export interface UseAudioRecorderOptions extends AudioRecorderOptions {
  onRecordingComplete?: (blob: Blob) => void;
}

export interface UseAudioRecorderReturn {
  // Recording controls
  start: () => Promise<void>;
  stop: () => Promise<Blob | null>;
  pause: () => void;
  resume: () => void;
  
  // State
  isRecording: boolean;
  isPaused: boolean;
  recordingState: RecordingState;
  isSupported: boolean;
  permissionStatus: PermissionState | null;
  
  // Audio data
  audioLevel: number;
  isVoiceActive: boolean;
  visualizationData: AudioVisualizationData | null;
  recordingDuration: number;
  
  // Error handling
  error: Error | null;
  clearError: () => void;
  
  // Utils
  checkPermissions: () => Promise<PermissionState>;
}

export const useAudioRecorder = (options: UseAudioRecorderOptions = {}): UseAudioRecorderReturn => {
  const recorderRef = useRef<AudioRecorder | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const durationIntervalRef = useRef<number | null>(null);
  
  // State
  const [isRecording, setIsRecording] = useState(false);
  const [recordingState, setRecordingState] = useState<RecordingState>('inactive');
  const [audioLevel, setAudioLevel] = useState(0);
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  const [visualizationData, setVisualizationData] = useState<AudioVisualizationData | null>(null);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [error, setError] = useState<Error | null>(null);
  const [permissionStatus, setPermissionStatus] = useState<PermissionState | null>(null);
  
  // Computed state
  const isPaused = recordingState === 'paused';
  const isSupported = AudioRecorder.isSupported();

  // Initialize recorder
  const initializeRecorder = useCallback(() => {
    if (recorderRef.current) {
      return recorderRef.current;
    }

    const recorder = new AudioRecorder({
      ...options,
      onDataAvailable: (chunk) => {
        options.onDataAvailable?.(chunk);
      },
      onVoiceActivity: (active) => {
        setIsVoiceActive(active);
        options.onVoiceActivity?.(active);
      },
      onAudioLevel: (level) => {
        setAudioLevel(level);
        options.onAudioLevel?.(level);
      },
      onError: (err) => {
        setError(err);
        setIsRecording(false);
        setRecordingState('inactive');
        stopDurationTracking();
        options.onError?.(err);
      }
    });

    recorderRef.current = recorder;
    return recorder;
  }, [options]);

  // Start duration tracking
  const startDurationTracking = useCallback(() => {
    startTimeRef.current = Date.now();
    setRecordingDuration(0);
    
    durationIntervalRef.current = window.setInterval(() => {
      if (startTimeRef.current) {
        setRecordingDuration(Date.now() - startTimeRef.current);
      }
    }, 100);
  }, []);

  // Stop duration tracking
  const stopDurationTracking = useCallback(() => {
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }
    startTimeRef.current = null;
  }, []);

  // Update visualization data
  const updateVisualizationData = useCallback(() => {
    if (recorderRef.current && isRecording) {
      const data = recorderRef.current.getVisualizationData();
      setVisualizationData(data);
    }
  }, [isRecording]);

  // Start recording
  const start = useCallback(async () => {
    try {
      setError(null);
      const recorder = initializeRecorder();
      
      await recorder.start();
      setIsRecording(true);
      setRecordingState(recorder.getState());
      startDurationTracking();
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  }, [initializeRecorder, startDurationTracking]);

  // Stop recording
  const stop = useCallback(async () => {
    if (!recorderRef.current || !isRecording) {
      return null;
    }

    try {
      const blob = await recorderRef.current.stop();
      setIsRecording(false);
      setRecordingState('inactive');
      setAudioLevel(0);
      setIsVoiceActive(false);
      setVisualizationData(null);
      stopDurationTracking();
      
      options.onRecordingComplete?.(blob);
      return blob;
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  }, [isRecording, options, stopDurationTracking]);

  // Pause recording
  const pause = useCallback(() => {
    if (recorderRef.current && isRecording) {
      recorderRef.current.pause();
      setRecordingState(recorderRef.current.getState());
    }
  }, [isRecording]);

  // Resume recording
  const resume = useCallback(() => {
    if (recorderRef.current && isRecording) {
      recorderRef.current.resume();
      setRecordingState(recorderRef.current.getState());
    }
  }, [isRecording]);

  // Check permissions
  const checkPermissions = useCallback(async () => {
    const recorder = initializeRecorder();
    const status = await recorder.checkPermissions();
    setPermissionStatus(status);
    return status;
  }, [initializeRecorder]);

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Effect to update visualization data
  useEffect(() => {
    if (!isRecording) return;

    const interval = setInterval(updateVisualizationData, 50);
    return () => clearInterval(interval);
  }, [isRecording, updateVisualizationData]);

  // Effect to update recording state
  useEffect(() => {
    if (!recorderRef.current) return;

    const interval = setInterval(() => {
      if (recorderRef.current) {
        setRecordingState(recorderRef.current.getState());
      }
    }, 100);

    return () => clearInterval(interval);
  }, [isRecording]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopDurationTracking();
      if (recorderRef.current && isRecording) {
        recorderRef.current.stop().catch(console.error);
      }
    };
  }, [isRecording, stopDurationTracking]);

  return {
    // Recording controls
    start,
    stop,
    pause,
    resume,
    
    // State
    isRecording,
    isPaused,
    recordingState,
    isSupported,
    permissionStatus,
    
    // Audio data
    audioLevel,
    isVoiceActive,
    visualizationData,
    recordingDuration,
    
    // Error handling
    error,
    clearError,
    
    // Utils
    checkPermissions
  };
};
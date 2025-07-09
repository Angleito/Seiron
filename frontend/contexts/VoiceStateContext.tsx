'use client'

import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react';
import { ttsManager, type ElevenLabsConfig } from '../lib/tts-singleton';
import { voiceLogger } from '../lib/voice-logger';

// Voice Animation State Interface
export interface VoiceAnimationState {
  isListening: boolean;
  isSpeaking: boolean;
  isProcessing: boolean;
  isIdle: boolean;
  volume: number;
  emotion?: 'excited' | 'angry' | 'calm' | 'focused';
  transcript?: string;
  confidence?: number;
  error?: Error | null;
}

// Voice State Actions
type VoiceAction = 
  | { type: 'START_LISTENING' }
  | { type: 'STOP_LISTENING' }
  | { type: 'START_SPEAKING' }
  | { type: 'STOP_SPEAKING' }
  | { type: 'START_PROCESSING' }
  | { type: 'STOP_PROCESSING' }
  | { type: 'SET_VOLUME'; payload: number }
  | { type: 'SET_EMOTION'; payload: VoiceAnimationState['emotion'] }
  | { type: 'SET_TRANSCRIPT'; payload: string }
  | { type: 'SET_CONFIDENCE'; payload: number }
  | { type: 'SET_ERROR'; payload: Error | null }
  | { type: 'RESET' }
  | { type: 'SET_IDLE' };

// Voice State Context
interface VoiceStateContextType {
  state: VoiceAnimationState;
  dispatch: React.Dispatch<VoiceAction>;
  // Helper functions
  startListening: () => void;
  stopListening: () => void;
  startSpeaking: () => void;
  stopSpeaking: () => void;
  startProcessing: () => void;
  stopProcessing: () => void;
  setVolume: (volume: number) => void;
  setEmotion: (emotion: VoiceAnimationState['emotion']) => void;
  setTranscript: (transcript: string) => void;
  setConfidence: (confidence: number) => void;
  setError: (error: Error | null) => void;
  setIdle: () => void;
  reset: () => void;
  // TTS Integration
  speak: (text: string, options?: { priority?: 'low' | 'medium' | 'high' }) => void;
  stopSpeaking: () => void;
  isTTSSpeaking: () => boolean;
  initializeTTS: (config: ElevenLabsConfig) => Promise<void>;
}

// Initial state
const initialState: VoiceAnimationState = {
  isListening: false,
  isSpeaking: false,
  isProcessing: false,
  isIdle: true,
  volume: 0,
  emotion: 'calm',
  transcript: '',
  confidence: 0,
  error: null
};

// Voice state reducer
function voiceStateReducer(state: VoiceAnimationState, action: VoiceAction): VoiceAnimationState {
  switch (action.type) {
    case 'START_LISTENING':
      return {
        ...state,
        isListening: true,
        isSpeaking: false,
        isProcessing: false,
        isIdle: false,
        error: null
      };
    
    case 'STOP_LISTENING':
      return {
        ...state,
        isListening: false,
        isIdle: !state.isSpeaking && !state.isProcessing
      };
    
    case 'START_SPEAKING':
      return {
        ...state,
        isSpeaking: true,
        isListening: false,
        isProcessing: false,
        isIdle: false,
        error: null
      };
    
    case 'STOP_SPEAKING':
      return {
        ...state,
        isSpeaking: false,
        isIdle: !state.isListening && !state.isProcessing
      };
    
    case 'START_PROCESSING':
      return {
        ...state,
        isProcessing: true,
        isListening: false,
        isIdle: false,
        error: null
      };
    
    case 'STOP_PROCESSING':
      return {
        ...state,
        isProcessing: false,
        isIdle: !state.isListening && !state.isSpeaking
      };
    
    case 'SET_VOLUME':
      return {
        ...state,
        volume: Math.max(0, Math.min(1, action.payload))
      };
    
    case 'SET_EMOTION':
      return {
        ...state,
        emotion: action.payload
      };
    
    case 'SET_TRANSCRIPT':
      return {
        ...state,
        transcript: action.payload
      };
    
    case 'SET_CONFIDENCE':
      return {
        ...state,
        confidence: Math.max(0, Math.min(1, action.payload))
      };
    
    case 'SET_ERROR':
      return {
        ...state,
        error: action.payload,
        isListening: false,
        isSpeaking: false,
        isProcessing: false,
        isIdle: true
      };
    
    case 'SET_IDLE':
      return {
        ...state,
        isListening: false,
        isSpeaking: false,
        isProcessing: false,
        isIdle: true,
        volume: 0,
        transcript: '',
        confidence: 0
      };
    
    case 'RESET':
      return {
        ...initialState
      };
    
    default:
      return state;
  }
}

// Create context
const VoiceStateContext = createContext<VoiceStateContextType | undefined>(undefined);

// Provider component
export const VoiceStateProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(voiceStateReducer, initialState);
  
  // Helper functions
  const startListening = useCallback(() => {
    voiceLogger.debug('🎤 Voice state: Starting listening');
    dispatch({ type: 'START_LISTENING' });
  }, []);
  
  const stopListening = useCallback(() => {
    voiceLogger.debug('🎤 Voice state: Stopping listening');
    dispatch({ type: 'STOP_LISTENING' });
  }, []);
  
  const startSpeaking = useCallback(() => {
    voiceLogger.debug('🔊 Voice state: Starting speaking');
    dispatch({ type: 'START_SPEAKING' });
  }, []);
  
  const stopSpeaking = useCallback(() => {
    voiceLogger.debug('🔊 Voice state: Stopping speaking');
    dispatch({ type: 'STOP_SPEAKING' });
  }, []);
  
  const startProcessing = useCallback(() => {
    voiceLogger.debug('⚙️ Voice state: Starting processing');
    dispatch({ type: 'START_PROCESSING' });
  }, []);
  
  const stopProcessing = useCallback(() => {
    voiceLogger.debug('⚙️ Voice state: Stopping processing');
    dispatch({ type: 'STOP_PROCESSING' });
  }, []);
  
  const setVolume = useCallback((volume: number) => {
    dispatch({ type: 'SET_VOLUME', payload: volume });
  }, []);
  
  const setEmotion = useCallback((emotion: VoiceAnimationState['emotion']) => {
    dispatch({ type: 'SET_EMOTION', payload: emotion });
  }, []);
  
  const setTranscript = useCallback((transcript: string) => {
    dispatch({ type: 'SET_TRANSCRIPT', payload: transcript });
  }, []);
  
  const setConfidence = useCallback((confidence: number) => {
    dispatch({ type: 'SET_CONFIDENCE', payload: confidence });
  }, []);
  
  const setError = useCallback((error: Error | null) => {
    if (error) {
      voiceLogger.error('❌ Voice state error:', error);
    }
    dispatch({ type: 'SET_ERROR', payload: error });
  }, []);
  
  const setIdle = useCallback(() => {
    voiceLogger.debug('💤 Voice state: Setting idle');
    dispatch({ type: 'SET_IDLE' });
  }, []);
  
  const reset = useCallback(() => {
    voiceLogger.debug('🔄 Voice state: Resetting');
    dispatch({ type: 'RESET' });
  }, []);
  
  // TTS Integration
  const speak = useCallback((text: string, options: { priority?: 'low' | 'medium' | 'high' } = {}) => {
    voiceLogger.debug('🔊 Voice state: TTS speak request', {
      text: text.substring(0, 50) + (text.length > 50 ? '...' : ''),
      priority: options.priority
    });
    
    ttsManager.speak(text, {
      priority: options.priority,
      onComplete: (success, error) => {
        if (success) {
          stopSpeaking();
        } else {
          setError(error || new Error('TTS failed'));
        }
      }
    });
    
    startSpeaking();
  }, [startSpeaking, stopSpeaking, setError]);
  
  const stopTTSSpeaking = useCallback(() => {
    voiceLogger.debug('🔊 Voice state: TTS stop request');
    ttsManager.stop();
    stopSpeaking();
  }, [stopSpeaking]);
  
  const isTTSSpeaking = useCallback(() => {
    return ttsManager.isSpeaking();
  }, []);
  
  const initializeTTS = useCallback(async (config: ElevenLabsConfig) => {
    try {
      voiceLogger.debug('🔊 Voice state: Initializing TTS', config);
      await ttsManager.initialize(config);
      voiceLogger.info('🔊 Voice state: TTS initialized successfully');
    } catch (error) {
      voiceLogger.error('🔊 Voice state: TTS initialization failed', error);
      setError(error as Error);
      throw error;
    }
  }, [setError]);
  
  // Auto-cleanup effect
  useEffect(() => {
    return () => {
      voiceLogger.debug('🧹 Voice state: Cleaning up');
      ttsManager.stop();
    };
  }, []);
  
  // Log state changes in development
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      voiceLogger.debug('📊 Voice state changed:', {
        isListening: state.isListening,
        isSpeaking: state.isSpeaking,
        isProcessing: state.isProcessing,
        isIdle: state.isIdle,
        volume: state.volume,
        emotion: state.emotion,
        hasTranscript: !!state.transcript,
        confidence: state.confidence,
        hasError: !!state.error
      });
    }
  }, [state]);
  
  const contextValue: VoiceStateContextType = {
    state,
    dispatch,
    startListening,
    stopListening,
    startSpeaking,
    stopSpeaking: stopTTSSpeaking,
    startProcessing,
    stopProcessing,
    setVolume,
    setEmotion,
    setTranscript,
    setConfidence,
    setError,
    setIdle,
    reset,
    speak,
    stopSpeaking: stopTTSSpeaking,
    isTTSSpeaking,
    initializeTTS
  };
  
  return (
    <VoiceStateContext.Provider value={contextValue}>
      {children}
    </VoiceStateContext.Provider>
  );
};

// Hook to use voice state
export const useVoiceState = (): VoiceStateContextType => {
  const context = useContext(VoiceStateContext);
  if (!context) {
    throw new Error('useVoiceState must be used within a VoiceStateProvider');
  }
  return context;
};

// Hook to use voice state with optional default
export const useVoiceStateOptional = (): VoiceStateContextType | null => {
  const context = useContext(VoiceStateContext);
  return context || null;
};

// Export types
export type { VoiceStateContextType, VoiceAction };

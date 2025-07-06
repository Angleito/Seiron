'use client'

import { useRef, useCallback, useReducer, useEffect, useMemo } from 'react'
import * as TE from 'fp-ts/TaskEither'
import * as O from 'fp-ts/Option'
import * as E from 'fp-ts/Either'
import { pipe } from 'fp-ts/function'
import { BehaviorSubject, Subject, fromEvent, merge } from 'rxjs'
import { map, distinctUntilChanged, takeUntil, debounceTime, filter } from 'rxjs/operators'
import { logger } from '../../lib/logger'
import { voiceLogger } from '../../lib/voice-logger'
import { usePerformanceMonitor } from '../usePerformanceMonitor'

// Types and interfaces
export type DragonState = 'idle' | 'attention' | 'ready' | 'active' | 'speaking' | 'listening' | 'processing'

export type DragonMood = 'calm' | 'excited' | 'focused' | 'playful' | 'powerful' | 'mystical' | 'alert'

export type SpecialAnimation = 'roar' | 'powerUp' | 'spin' | 'pulse' | 'shake' | 'breatheFire' | 'orbit' | 'charge'

export interface DragonAnimationConfig {
  breathing: {
    enabled: boolean
    speed: number
    intensity: number
  }
  floating: {
    enabled: boolean
    speed: number
    amplitude: number
  }
  wingFlapping: {
    enabled: boolean
    speed: number
    intensity: number
  }
  particles: {
    enabled: boolean
    count: number
    intensity: number
  }
  aura: {
    enabled: boolean
    intensity: number
    color: string
  }
}

export interface Dragon3DState {
  state: DragonState
  mood: DragonMood
  powerLevel: number // 0-100
  isCharging: boolean
  isAnimating: boolean
  specialAnimation: O.Option<SpecialAnimation>
  animationConfig: DragonAnimationConfig
  voiceIntegration: {
    reactToVoice: boolean
    isListening: boolean
    isSpeaking: boolean
    isProcessing: boolean
    transcriptLength: number
  }
  performance: {
    enabled: boolean
    quality: 'low' | 'medium' | 'high'
    fps: number
    shouldOptimize: boolean
  }
}

export interface Dragon3DError {
  type: 'ANIMATION_ERROR' | 'STATE_ERROR' | 'PERFORMANCE_ERROR'
  message: string
  originalError?: unknown
}

// Action types for the reducer
export type Dragon3DAction =
  | { type: 'SET_STATE'; payload: DragonState }
  | { type: 'SET_MOOD'; payload: DragonMood }
  | { type: 'SET_POWER_LEVEL'; payload: number }
  | { type: 'SET_CHARGING'; payload: boolean }
  | { type: 'SET_ANIMATING'; payload: boolean }
  | { type: 'TRIGGER_SPECIAL_ANIMATION'; payload: SpecialAnimation }
  | { type: 'CLEAR_SPECIAL_ANIMATION' }
  | { type: 'UPDATE_ANIMATION_CONFIG'; payload: Partial<DragonAnimationConfig> }
  | { type: 'UPDATE_VOICE_INTEGRATION'; payload: Partial<Dragon3DState['voiceIntegration']> }
  | { type: 'UPDATE_PERFORMANCE'; payload: Partial<Dragon3DState['performance']> }
  | { type: 'VOICE_LISTENING_START' }
  | { type: 'VOICE_LISTENING_END' }
  | { type: 'VOICE_SPEAKING_START' }
  | { type: 'VOICE_SPEAKING_END' }
  | { type: 'VOICE_PROCESSING_START' }
  | { type: 'VOICE_PROCESSING_END' }
  | { type: 'VOICE_TRANSCRIPT_UPDATE'; payload: number }

// Initial dragon animation configuration
const initialAnimationConfig: DragonAnimationConfig = {
  breathing: {
    enabled: true,
    speed: 1,
    intensity: 0.5
  },
  floating: {
    enabled: true,
    speed: 0.8,
    amplitude: 0.3
  },
  wingFlapping: {
    enabled: true,
    speed: 1.2,
    intensity: 0.6
  },
  particles: {
    enabled: true,
    count: 100,
    intensity: 0.5
  },
  aura: {
    enabled: true,
    intensity: 0.4,
    color: '#ef4444'
  }
}

// Initial state
const initialDragon3DState: Dragon3DState = {
  state: 'idle',
  mood: 'calm',
  powerLevel: 30,
  isCharging: false,
  isAnimating: false,
  specialAnimation: O.none,
  animationConfig: initialAnimationConfig,
  voiceIntegration: {
    reactToVoice: true,
    isListening: false,
    isSpeaking: false,
    isProcessing: false,
    transcriptLength: 0
  },
  performance: {
    enabled: true,
    quality: 'medium',
    fps: 60,
    shouldOptimize: false
  }
}

// Dragon state reducer
export const dragon3DReducer = (
  state: Dragon3DState,
  action: Dragon3DAction
): Dragon3DState => {
  logger.debug('🐉 Dragon3D Action', {
    type: action.type,
    currentState: state.state,
    currentMood: state.mood,
    powerLevel: state.powerLevel
  })

  switch (action.type) {
    case 'SET_STATE':
      return { ...state, state: action.payload }
      
    case 'SET_MOOD':
      return { ...state, mood: action.payload }
      
    case 'SET_POWER_LEVEL':
      const clampedPower = Math.max(0, Math.min(100, action.payload))
      return { ...state, powerLevel: clampedPower }
      
    case 'SET_CHARGING':
      return { ...state, isCharging: action.payload }
      
    case 'SET_ANIMATING':
      return { ...state, isAnimating: action.payload }
      
    case 'TRIGGER_SPECIAL_ANIMATION':
      return {
        ...state,
        specialAnimation: O.some(action.payload),
        isAnimating: true
      }
      
    case 'CLEAR_SPECIAL_ANIMATION':
      return {
        ...state,
        specialAnimation: O.none,
        isAnimating: false
      }
      
    case 'UPDATE_ANIMATION_CONFIG':
      return {
        ...state,
        animationConfig: { ...state.animationConfig, ...action.payload }
      }
      
    case 'UPDATE_VOICE_INTEGRATION':
      return {
        ...state,
        voiceIntegration: { ...state.voiceIntegration, ...action.payload }
      }
      
    case 'UPDATE_PERFORMANCE':
      return {
        ...state,
        performance: { ...state.performance, ...action.payload }
      }
      
    case 'VOICE_LISTENING_START':
      return {
        ...state,
        state: 'listening',
        mood: 'alert',
        voiceIntegration: { ...state.voiceIntegration, isListening: true }
      }
      
    case 'VOICE_LISTENING_END':
      return {
        ...state,
        state: state.voiceIntegration.isSpeaking ? 'speaking' : 'idle',
        voiceIntegration: { ...state.voiceIntegration, isListening: false }
      }
      
    case 'VOICE_SPEAKING_START':
      return {
        ...state,
        state: 'speaking',
        mood: 'focused',
        voiceIntegration: { ...state.voiceIntegration, isSpeaking: true }
      }
      
    case 'VOICE_SPEAKING_END':
      return {
        ...state,
        state: 'idle',
        mood: 'calm',
        voiceIntegration: { ...state.voiceIntegration, isSpeaking: false }
      }
      
    case 'VOICE_PROCESSING_START':
      return {
        ...state,
        state: 'processing',
        mood: 'focused',
        voiceIntegration: { ...state.voiceIntegration, isProcessing: true }
      }
      
    case 'VOICE_PROCESSING_END':
      return {
        ...state,
        state: 'idle',
        voiceIntegration: { ...state.voiceIntegration, isProcessing: false }
      }
      
    case 'VOICE_TRANSCRIPT_UPDATE':
      return {
        ...state,
        voiceIntegration: { ...state.voiceIntegration, transcriptLength: action.payload }
      }
      
    default:
      logger.warn('🐉 Unknown Dragon3D action type', { type: (action as any).type })
      return state
  }
}

// Pure helper functions
const createDragon3DError = (
  type: Dragon3DError['type'],
  message: string,
  originalError?: unknown
): Dragon3DError => {
  const error = { type, message, originalError }
  logger.error('🐉 Dragon3D Error Created', { type, message, originalError })
  return error
}

// State mapping functions
const mapStateToAnimationConfig = (state: DragonState, mood: DragonMood): Partial<DragonAnimationConfig> => {
  const configs: Record<DragonState, Partial<DragonAnimationConfig>> = {
    idle: {
      breathing: { speed: 1, intensity: 0.3 },
      floating: { speed: 0.8, amplitude: 0.2 },
      wingFlapping: { speed: 0.5, intensity: 0.3 }
    },
    attention: {
      breathing: { speed: 1.2, intensity: 0.4 },
      floating: { speed: 1, amplitude: 0.3 },
      wingFlapping: { speed: 0.8, intensity: 0.4 },
      aura: { intensity: 0.6 }
    },
    ready: {
      breathing: { speed: 1.5, intensity: 0.6 },
      floating: { speed: 1.2, amplitude: 0.4 },
      wingFlapping: { speed: 1, intensity: 0.6 },
      aura: { intensity: 0.8 },
      particles: { intensity: 0.7 }
    },
    active: {
      breathing: { speed: 2, intensity: 0.8 },
      floating: { speed: 1.5, amplitude: 0.5 },
      wingFlapping: { speed: 1.5, intensity: 0.8 },
      aura: { intensity: 1 },
      particles: { intensity: 1 }
    },
    speaking: {
      breathing: { speed: 2.5, intensity: 1 },
      floating: { speed: 1.8, amplitude: 0.6 },
      wingFlapping: { speed: 2, intensity: 1 },
      aura: { intensity: 1, color: '#fbbf24' },
      particles: { intensity: 1.2 }
    },
    listening: {
      breathing: { speed: 1.3, intensity: 0.5 },
      floating: { speed: 1.1, amplitude: 0.3 },
      wingFlapping: { speed: 0.9, intensity: 0.5 },
      aura: { intensity: 0.7, color: '#10b981' }
    },
    processing: {
      breathing: { speed: 1.8, intensity: 0.7 },
      floating: { speed: 1.4, amplitude: 0.4 },
      wingFlapping: { speed: 1.2, intensity: 0.7 },
      aura: { intensity: 0.9, color: '#8b5cf6' },
      particles: { intensity: 0.8 }
    }
  }

  return configs[state] || configs.idle
}

const mapMoodToPowerLevel = (mood: DragonMood): number => {
  const moodPowerMap: Record<DragonMood, number> = {
    calm: 30,
    excited: 70,
    focused: 50,
    playful: 60,
    powerful: 90,
    mystical: 80,
    alert: 40
  }
  
  return moodPowerMap[mood] || 30
}

// Performance optimization functions
const optimizeConfigForPerformance = (
  config: DragonAnimationConfig,
  performanceScore: number
): DragonAnimationConfig => {
  if (performanceScore >= 70) return config

  // Reduce quality for poor performance
  const optimized = { ...config }
  
  if (performanceScore < 50) {
    optimized.particles.enabled = false
    optimized.aura.intensity *= 0.5
    optimized.wingFlapping.intensity *= 0.7
  }
  
  if (performanceScore < 30) {
    optimized.floating.enabled = false
    optimized.wingFlapping.enabled = false
    optimized.aura.enabled = false
  }
  
  return optimized
}

// Hook configuration interface
export interface UseDragon3DOptions {
  enableVoiceIntegration?: boolean
  enablePerformanceMonitoring?: boolean
  enableAutoStateTransitions?: boolean
  enableProximityDetection?: boolean
  proximityThreshold?: number
  autoOptimize?: boolean
  initialState?: DragonState
  initialMood?: DragonMood
  initialPowerLevel?: number
  animationConfig?: Partial<DragonAnimationConfig>
}

export const useDragon3D = (options: UseDragon3DOptions = {}) => {
  const {
    enableVoiceIntegration = true,
    enablePerformanceMonitoring = true,
    enableAutoStateTransitions = true,
    enableProximityDetection = false,
    proximityThreshold = 300,
    autoOptimize = true,
    initialState = 'idle',
    initialMood = 'calm',
    initialPowerLevel = 30,
    animationConfig: customAnimationConfig = {}
  } = options

  logger.debug('🐉 Initializing Dragon3D hook', {
    enableVoiceIntegration,
    enablePerformanceMonitoring,
    enableAutoStateTransitions,
    initialState,
    initialMood,
    initialPowerLevel
  })

  // State management
  const [state, dispatch] = useReducer(dragon3DReducer, {
    ...initialDragon3DState,
    state: initialState,
    mood: initialMood,
    powerLevel: initialPowerLevel,
    animationConfig: { ...initialAnimationConfig, ...customAnimationConfig }
  })

  // Performance monitoring
  const performanceMonitor = usePerformanceMonitor({
    enabled: enablePerformanceMonitoring,
    targetFPS: 60,
    sampleRate: 2000,
    onPerformanceWarning: (metrics) => {
      logger.warn('🐉 Dragon performance warning', metrics)
      if (autoOptimize) {
        dispatch({
          type: 'UPDATE_PERFORMANCE',
          payload: { shouldOptimize: true, fps: metrics.fps }
        })
      }
    }
  })

  // RxJS subjects for reactive state management
  const stateSubject = useRef(new BehaviorSubject(state))
  const animationSubject = useRef(new Subject<SpecialAnimation>())
  const voiceEventSubject = useRef(new Subject<{ type: string; data?: any }>())
  const cleanupSubject = useRef(new Subject<void>())

  // Update state subject when state changes
  useEffect(() => {
    stateSubject.current.next(state)
  }, [state])

  // Auto-optimize based on performance
  useEffect(() => {
    if (autoOptimize && enablePerformanceMonitoring) {
      const optimizedConfig = optimizeConfigForPerformance(
        state.animationConfig,
        performanceMonitor.performanceScore
      )
      
      if (JSON.stringify(optimizedConfig) !== JSON.stringify(state.animationConfig)) {
        dispatch({ type: 'UPDATE_ANIMATION_CONFIG', payload: optimizedConfig })
      }
    }
  }, [performanceMonitor.performanceScore, autoOptimize, enablePerformanceMonitoring, state.animationConfig])

  // State transition functions
  const setState = useCallback((newState: DragonState): TE.TaskEither<Dragon3DError, void> => {
    logger.debug('🐉 Setting dragon state', { from: state.state, to: newState })
    
    return TE.tryCatch(
      async () => {
        dispatch({ type: 'SET_STATE', payload: newState })
        
        // Auto-adjust animation config for new state
        const animationUpdate = mapStateToAnimationConfig(newState, state.mood)
        dispatch({ type: 'UPDATE_ANIMATION_CONFIG', payload: animationUpdate })
      },
      (error) => createDragon3DError('STATE_ERROR', 'Failed to set dragon state', error)
    )
  }, [state.state, state.mood])

  const setMood = useCallback((newMood: DragonMood): TE.TaskEither<Dragon3DError, void> => {
    logger.debug('🐉 Setting dragon mood', { from: state.mood, to: newMood })
    
    return TE.tryCatch(
      async () => {
        dispatch({ type: 'SET_MOOD', payload: newMood })
        
        // Auto-adjust power level for new mood
        const powerLevel = mapMoodToPowerLevel(newMood)
        dispatch({ type: 'SET_POWER_LEVEL', payload: powerLevel })
        
        // Update animation config
        const animationUpdate = mapStateToAnimationConfig(state.state, newMood)
        dispatch({ type: 'UPDATE_ANIMATION_CONFIG', payload: animationUpdate })
      },
      (error) => createDragon3DError('STATE_ERROR', 'Failed to set dragon mood', error)
    )
  }, [state.mood, state.state])

  const setPowerLevel = useCallback((level: number): TE.TaskEither<Dragon3DError, void> => {
    logger.debug('🐉 Setting power level', { from: state.powerLevel, to: level })
    
    return TE.tryCatch(
      async () => {
        dispatch({ type: 'SET_POWER_LEVEL', payload: level })
        
        // Adjust aura intensity based on power level
        const auraIntensity = Math.min(1, level / 100)
        dispatch({
          type: 'UPDATE_ANIMATION_CONFIG',
          payload: { aura: { ...state.animationConfig.aura, intensity: auraIntensity } }
        })
      },
      (error) => createDragon3DError('STATE_ERROR', 'Failed to set power level', error)
    )
  }, [state.powerLevel, state.animationConfig.aura])

  // Special animation triggers
  const triggerSpecialAnimation = useCallback(
    (animation: SpecialAnimation): TE.TaskEither<Dragon3DError, void> => {
      logger.debug('🐉 Triggering special animation', { animation, currentState: state.state })
      
      return TE.tryCatch(
        async () => {
          dispatch({ type: 'TRIGGER_SPECIAL_ANIMATION', payload: animation })
          animationSubject.current.next(animation)
          
          // Auto-clear animation after duration
          setTimeout(() => {
            dispatch({ type: 'CLEAR_SPECIAL_ANIMATION' })
          }, getAnimationDuration(animation))
        },
        (error) => createDragon3DError('ANIMATION_ERROR', 'Failed to trigger special animation', error)
      )
    },
    [state.state]
  )

  // Get animation duration for special animations
  const getAnimationDuration = (animation: SpecialAnimation): number => {
    const durations: Record<SpecialAnimation, number> = {
      roar: 3000,
      powerUp: 2000,
      spin: 1500,
      pulse: 1000,
      shake: 800,
      breatheFire: 2500,
      orbit: 4000,
      charge: 3500
    }
    return durations[animation] || 2000
  }

  // Voice integration functions
  const onVoiceListeningStart = useCallback(() => {
    if (enableVoiceIntegration) {
      logger.debug('🐉 Voice listening started')
      dispatch({ type: 'VOICE_LISTENING_START' })
      voiceEventSubject.current.next({ type: 'listening_start' })
    }
  }, [enableVoiceIntegration])

  const onVoiceListeningEnd = useCallback(() => {
    if (enableVoiceIntegration) {
      logger.debug('🐉 Voice listening ended')
      dispatch({ type: 'VOICE_LISTENING_END' })
      voiceEventSubject.current.next({ type: 'listening_end' })
    }
  }, [enableVoiceIntegration])

  const onVoiceSpeakingStart = useCallback(() => {
    if (enableVoiceIntegration) {
      logger.debug('🐉 Voice speaking started')
      dispatch({ type: 'VOICE_SPEAKING_START' })
      voiceEventSubject.current.next({ type: 'speaking_start' })
    }
  }, [enableVoiceIntegration])

  const onVoiceSpeakingEnd = useCallback(() => {
    if (enableVoiceIntegration) {
      logger.debug('🐉 Voice speaking ended')
      dispatch({ type: 'VOICE_SPEAKING_END' })
      voiceEventSubject.current.next({ type: 'speaking_end' })
    }
  }, [enableVoiceIntegration])

  const onVoiceProcessingStart = useCallback(() => {
    if (enableVoiceIntegration) {
      logger.debug('🐉 Voice processing started')
      dispatch({ type: 'VOICE_PROCESSING_START' })
      voiceEventSubject.current.next({ type: 'processing_start' })
    }
  }, [enableVoiceIntegration])

  const onVoiceProcessingEnd = useCallback(() => {
    if (enableVoiceIntegration) {
      logger.debug('🐉 Voice processing ended')
      dispatch({ type: 'VOICE_PROCESSING_END' })
      voiceEventSubject.current.next({ type: 'processing_end' })
    }
  }, [enableVoiceIntegration])

  const onTranscriptUpdate = useCallback((transcript: string) => {
    if (enableVoiceIntegration) {
      dispatch({ type: 'VOICE_TRANSCRIPT_UPDATE', payload: transcript.length })
      
      // Trigger animations based on transcript length
      if (transcript.length > 50 && transcript.length % 25 === 0) {
        triggerSpecialAnimation('pulse')()
      }
    }
  }, [enableVoiceIntegration, triggerSpecialAnimation])

  // Proximity detection
  useEffect(() => {
    if (!enableProximityDetection) return

    const handleMouseMove = (event: MouseEvent) => {
      // This would need to be integrated with the actual Dragon3D component position
      // For now, we'll use a simple distance calculation from center
      const centerX = window.innerWidth / 2
      const centerY = window.innerHeight / 2
      const distance = Math.sqrt(
        Math.pow(event.clientX - centerX, 2) + Math.pow(event.clientY - centerY, 2)
      )

      if (distance < proximityThreshold && state.state === 'idle') {
        setState('attention')()
      } else if (distance >= proximityThreshold && state.state === 'attention') {
        setState('idle')()
      }
    }

    window.addEventListener('mousemove', handleMouseMove)
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [enableProximityDetection, proximityThreshold, state.state, setState])

  // Reactive streams for complex state management
  const dragonState$ = useMemo(() => 
    stateSubject.current.pipe(
      map(s => s.state),
      distinctUntilChanged(),
      takeUntil(cleanupSubject.current)
    ), [])

  const powerLevel$ = useMemo(() =>
    stateSubject.current.pipe(
      map(s => s.powerLevel),
      distinctUntilChanged(),
      takeUntil(cleanupSubject.current)
    ), [])

  const voiceEvents$ = useMemo(() =>
    voiceEventSubject.current.pipe(
      debounceTime(100),
      takeUntil(cleanupSubject.current)
    ), [])

  // Cleanup
  useEffect(() => {
    return () => {
      cleanupSubject.current.next()
      cleanupSubject.current.complete()
    }
  }, [])

  // Functional getters using fp-ts
  const getSpecialAnimation = () => state.specialAnimation
  const hasSpecialAnimation = () => O.isSome(state.specialAnimation)
  const getAnimationName = () => pipe(
    state.specialAnimation,
    O.getOrElse(() => 'none' as const)
  )

  // Performance utilities
  const shouldReduceQuality = () => enablePerformanceMonitoring && performanceMonitor.shouldReduceQuality
  const shouldDisableAnimations = () => enablePerformanceMonitoring && performanceMonitor.shouldDisableAnimations

  return {
    // State
    state: state.state,
    mood: state.mood,
    powerLevel: state.powerLevel,
    isCharging: state.isCharging,
    isAnimating: state.isAnimating,
    animationConfig: state.animationConfig,
    voiceIntegration: state.voiceIntegration,
    performance: state.performance,

    // Actions
    setState,
    setMood,
    setPowerLevel,
    setCharging: (charging: boolean) => dispatch({ type: 'SET_CHARGING', payload: charging }),
    triggerSpecialAnimation,
    clearSpecialAnimation: () => dispatch({ type: 'CLEAR_SPECIAL_ANIMATION' }),
    updateAnimationConfig: (config: Partial<DragonAnimationConfig>) =>
      dispatch({ type: 'UPDATE_ANIMATION_CONFIG', payload: config }),

    // Voice integration
    onVoiceListeningStart,
    onVoiceListeningEnd,
    onVoiceSpeakingStart,
    onVoiceSpeakingEnd,
    onVoiceProcessingStart,
    onVoiceProcessingEnd,
    onTranscriptUpdate,

    // Functional getters
    getSpecialAnimation,
    hasSpecialAnimation,
    getAnimationName,
    isVoiceActive: () => state.voiceIntegration.isListening || state.voiceIntegration.isSpeaking,
    isPowerful: () => state.powerLevel > 70,
    isCalm: () => state.mood === 'calm' && state.state === 'idle',

    // Performance utilities
    shouldReduceQuality,
    shouldDisableAnimations,
    performanceScore: enablePerformanceMonitoring ? performanceMonitor.performanceScore : 100,
    isHighPerformance: enablePerformanceMonitoring ? performanceMonitor.isHighPerformance : true,

    // Reactive streams
    dragonState$,
    powerLevel$,
    voiceEvents$,

    // Configuration
    enableVoiceIntegration,
    enablePerformanceMonitoring,
    enableAutoStateTransitions,
    enableProximityDetection
  }
}

// Utility functions for external use
export const createDragonStateTransition = (
  from: DragonState,
  to: DragonState,
  duration: number = 1000
) => ({
  from,
  to,
  duration,
  easing: 'spring',
  stiffness: 200,
  damping: 25
})

export const createSpecialAnimationSequence = (
  animations: SpecialAnimation[],
  interval: number = 500
): TE.TaskEither<Dragon3DError, void> => {
  return TE.tryCatch(
    async () => {
      for (let i = 0; i < animations.length; i++) {
        await new Promise(resolve => setTimeout(resolve, i * interval))
        // This would need to be integrated with the actual hook instance
        logger.debug('🐉 Animation sequence step', { animation: animations[i], step: i + 1 })
      }
    },
    (error) => createDragon3DError('ANIMATION_ERROR', 'Failed to execute animation sequence', error)
  )
}

export const getDragonStateRecommendation = (
  voiceActive: boolean,
  transcriptLength: number,
  powerLevel: number
): DragonState => {
  if (voiceActive) {
    if (transcriptLength > 100) return 'active'
    if (transcriptLength > 50) return 'ready'
    return 'listening'
  }
  
  if (powerLevel > 80) return 'active'
  if (powerLevel > 60) return 'ready'
  if (powerLevel > 40) return 'attention'
  
  return 'idle'
}
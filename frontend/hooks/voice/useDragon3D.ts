'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { BehaviorSubject, combineLatest } from 'rxjs'
import { map, distinctUntilChanged, debounceTime } from 'rxjs/operators'
import * as TE from 'fp-ts/TaskEither'
import { pipe } from 'fp-ts/function'
import { VoiceAnimationState } from '../../components/dragon/DragonRenderer'
import { logger } from '@lib/logger'

// Dragon 3D state interface
export interface Dragon3DState {
  powerLevel: number // 0-100
  mood: 'calm' | 'excited' | 'angry' | 'focused' | 'sleepy'
  animationState: 'idle' | 'listening' | 'speaking' | 'processing' | 'flying' | 'roaring'
  particleIntensity: number // 0-1
  auraIntensity: number // 0-1
  lightingIntensity: number // 0-1
  cameraShakeIntensity: number // 0-1
  qualityLevel: 'low' | 'medium' | 'high' | 'ultra'
  performanceMetrics: {
    fps: number
    frameTime: number
    memoryUsage: number
  }
}

// Dragon 3D configuration
export interface Dragon3DConfig {
  enableVoiceIntegration: boolean
  enablePerformanceMonitoring: boolean
  enableAutoStateTransitions: boolean
  autoOptimize: boolean
  maxParticles: number
  qualityThresholds: {
    low: number
    medium: number
    high: number
  }
}

// Dragon 3D actions
export interface Dragon3DActions {
  setState: (state: Dragon3DState['animationState']) => TE.TaskEither<Error, void>
  setMood: (mood: Dragon3DState['mood']) => TE.TaskEither<Error, void>
  setPowerLevel: (level: number) => TE.TaskEither<Error, void>
  triggerSpecialAnimation: (animation: 'roar' | 'fly' | 'breathe' | 'pulse') => TE.TaskEither<Error, void>
  updateVoiceState: (voiceState: VoiceAnimationState) => TE.TaskEither<Error, void>
  optimizePerformance: () => TE.TaskEither<Error, void>
}

// Dragon 3D reactive streams
export interface Dragon3DStreams {
  dragonState$: BehaviorSubject<Dragon3DState>
  powerLevel$: BehaviorSubject<number>
  voiceEvents$: BehaviorSubject<VoiceAnimationState>
  performanceMetrics$: BehaviorSubject<Dragon3DState['performanceMetrics']>
}

// Default configuration
const defaultConfig: Dragon3DConfig = {
  enableVoiceIntegration: true,
  enablePerformanceMonitoring: true,
  enableAutoStateTransitions: true,
  autoOptimize: true,
  maxParticles: 1000,
  qualityThresholds: {
    low: 15,
    medium: 30,
    high: 50
  }
}

// Default dragon state
const defaultDragonState: Dragon3DState = {
  powerLevel: 50,
  mood: 'calm',
  animationState: 'idle',
  particleIntensity: 0.3,
  auraIntensity: 0.2,
  lightingIntensity: 1.0,
  cameraShakeIntensity: 0.0,
  qualityLevel: 'medium',
  performanceMetrics: {
    fps: 60,
    frameTime: 16.67,
    memoryUsage: 0
  }
}

// Utility functions
const createDragon3DError = (message: string): Error => new Error(`Dragon3D: ${message}`)

const mapVoiceStateToAnimationState = (voiceState: VoiceAnimationState): Dragon3DState['animationState'] => {
  if (voiceState.isSpeaking) return 'speaking'
  if (voiceState.isListening) return 'listening'
  if (voiceState.isProcessing) return 'processing'
  return 'idle'
}

const mapVoiceStateToMood = (voiceState: VoiceAnimationState): Dragon3DState['mood'] => {
  if (voiceState.emotion) {
    switch (voiceState.emotion) {
      case 'excited': return 'excited'
      case 'angry': return 'angry'
      case 'focused': return 'focused'
      case 'calm': return 'calm'
      default: return 'calm'
    }
  }
  return 'calm'
}

const calculateParticleIntensity = (voiceState: VoiceAnimationState, powerLevel: number): number => {
  let intensity = 0.3
  
  if (voiceState.isSpeaking) {
    intensity = 0.8 + (voiceState.volume * 0.2)
  } else if (voiceState.isListening) {
    intensity = 0.5 + (voiceState.volume * 0.1)
  } else if (voiceState.isProcessing) {
    intensity = 0.6
  }
  
  // Boost based on power level
  intensity *= (powerLevel / 100)
  
  return Math.max(0, Math.min(1, intensity))
}

const calculateAuraIntensity = (voiceState: VoiceAnimationState, powerLevel: number): number => {
  let intensity = 0.2
  
  if (voiceState.isSpeaking) {
    intensity = 0.6 + (voiceState.volume * 0.4)
  } else if (voiceState.isListening) {
    intensity = 0.4
  } else if (voiceState.isProcessing) {
    intensity = 0.5
  }
  
  // Boost based on power level
  intensity *= (powerLevel / 100)
  
  return Math.max(0, Math.min(1, intensity))
}

const determineQualityLevel = (
  fps: number, 
  thresholds: Dragon3DConfig['qualityThresholds']
): Dragon3DState['qualityLevel'] => {
  if (fps < thresholds.low) return 'low'
  if (fps < thresholds.medium) return 'medium'
  if (fps < thresholds.high) return 'high'
  return 'ultra'
}

// Main hook
export const useDragon3D = (config: Partial<Dragon3DConfig> = {}): Dragon3DActions & Dragon3DStreams => {
  const fullConfig = { ...defaultConfig, ...config }
  const [dragonState, setDragonState] = useState<Dragon3DState>(defaultDragonState)
  const [isInitialized, setIsInitialized] = useState(false)
  
  // Reactive streams
  const dragonStateSubject = useRef(new BehaviorSubject<Dragon3DState>(defaultDragonState))
  const powerLevelSubject = useRef(new BehaviorSubject<number>(50))
  const voiceEventsSubject = useRef(new BehaviorSubject<VoiceAnimationState>({
    isListening: false,
    isSpeaking: false,
    isProcessing: false,
    isIdle: true,
    volume: 0.5
  }))
  const performanceMetricsSubject = useRef(new BehaviorSubject<Dragon3DState['performanceMetrics']>({
    fps: 60,
    frameTime: 16.67,
    memoryUsage: 0
  }))
  
  // Performance monitoring
  const lastFrameTime = useRef(performance.now())
  const frameCount = useRef(0)
  const fpsHistory = useRef<number[]>([])
  
  // Initialize dragon state
  useEffect(() => {
    if (!isInitialized) {
      logger.info('Initializing Dragon3D system', fullConfig)
      setIsInitialized(true)
      
      // Set up reactive streams
      const subscription = combineLatest([
        voiceEventsSubject.current,
        powerLevelSubject.current,
        performanceMetricsSubject.current
      ]).pipe(
        map(([voiceState, powerLevel, metrics]) => {
          const newAnimationState = fullConfig.enableVoiceIntegration 
            ? mapVoiceStateToAnimationState(voiceState)
            : dragonState.animationState
          
          const newMood = fullConfig.enableVoiceIntegration
            ? mapVoiceStateToMood(voiceState)
            : dragonState.mood
          
          const newParticleIntensity = calculateParticleIntensity(voiceState, powerLevel)
          const newAuraIntensity = calculateAuraIntensity(voiceState, powerLevel)
          
          const newQualityLevel = fullConfig.autoOptimize
            ? determineQualityLevel(metrics.fps, fullConfig.qualityThresholds)
            : dragonState.qualityLevel
          
          return {
            ...dragonState,
            powerLevel,
            mood: newMood,
            animationState: newAnimationState,
            particleIntensity: newParticleIntensity,
            auraIntensity: newAuraIntensity,
            lightingIntensity: 1.0 + (powerLevel / 200), // Boost lighting with power
            cameraShakeIntensity: voiceState.isSpeaking ? voiceState.volume * 0.2 : 0,
            qualityLevel: newQualityLevel,
            performanceMetrics: metrics
          }
        }),
        distinctUntilChanged(),
        debounceTime(16) // ~60fps
      ).subscribe(newState => {
        setDragonState(newState)
        dragonStateSubject.current.next(newState)
      })
      
      return () => subscription.unsubscribe()
    }
    
    return () => {}
  }, [isInitialized, fullConfig, dragonState])
  
  // Performance monitoring loop
  useEffect(() => {
    if (!fullConfig.enablePerformanceMonitoring) return
    
    let animationFrameId: number
    
    const measurePerformance = () => {
      const now = performance.now()
      const deltaTime = now - lastFrameTime.current
      lastFrameTime.current = now
      
      frameCount.current++
      
      // Calculate FPS every 60 frames
      if (frameCount.current % 60 === 0) {
        fpsHistory.current.push(1000 / deltaTime)
        
        // Keep only last 10 measurements
        if (fpsHistory.current.length > 10) {
          fpsHistory.current = fpsHistory.current.slice(-10)
        }
        
        const avgFps = fpsHistory.current.reduce((a, b) => a + b, 0) / fpsHistory.current.length
        
        const metrics = {
          fps: Math.round(avgFps),
          frameTime: deltaTime,
          memoryUsage: (performance as any).memory?.usedJSHeapSize || 0
        }
        
        performanceMetricsSubject.current.next(metrics)
      }
      
      animationFrameId = requestAnimationFrame(measurePerformance)
    }
    
    animationFrameId = requestAnimationFrame(measurePerformance)
    
    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId)
      }
    }
  }, [fullConfig.enablePerformanceMonitoring])
  
  // Actions
  const setState = useCallback((state: Dragon3DState['animationState']) => {
    return pipe(
      TE.tryCatch(
        async () => {
          logger.debug(`Setting dragon animation state to: ${state}`)
          setDragonState(prev => ({ ...prev, animationState: state }))
          dragonStateSubject.current.next({ ...dragonState, animationState: state })
        },
        (error) => createDragon3DError(`Failed to set state: ${error}`)
      )
    )
  }, [dragonState])
  
  const setMood = useCallback((mood: Dragon3DState['mood']) => {
    return pipe(
      TE.tryCatch(
        async () => {
          logger.debug(`Setting dragon mood to: ${mood}`)
          setDragonState(prev => ({ ...prev, mood }))
          dragonStateSubject.current.next({ ...dragonState, mood })
        },
        (error) => createDragon3DError(`Failed to set mood: ${error}`)
      )
    )
  }, [dragonState])
  
  const setPowerLevel = useCallback((level: number) => {
    return pipe(
      TE.tryCatch(
        async () => {
          const clampedLevel = Math.max(0, Math.min(100, level))
          logger.debug(`Setting dragon power level to: ${clampedLevel}`)
          powerLevelSubject.current.next(clampedLevel)
        },
        (error) => createDragon3DError(`Failed to set power level: ${error}`)
      )
    )
  }, [])
  
  const triggerSpecialAnimation = useCallback((animation: 'roar' | 'fly' | 'breathe' | 'pulse') => {
    return pipe(
      TE.tryCatch(
        async () => {
          logger.debug(`Triggering special animation: ${animation}`)
          
          // Temporary state change for special animations
          const originalState = dragonState.animationState
          
          switch (animation) {
            case 'roar':
              setDragonState(prev => ({ 
                ...prev, 
                animationState: 'roaring',
                powerLevel: Math.min(100, prev.powerLevel + 10),
                particleIntensity: 1.0,
                auraIntensity: 1.0,
                cameraShakeIntensity: 0.5
              }))
              break
            case 'fly':
              setDragonState(prev => ({ 
                ...prev, 
                animationState: 'flying',
                powerLevel: Math.min(100, prev.powerLevel + 5)
              }))
              break
            case 'breathe':
              setDragonState(prev => ({ 
                ...prev, 
                particleIntensity: 0.8,
                auraIntensity: 0.6
              }))
              break
            case 'pulse':
              setDragonState(prev => ({ 
                ...prev, 
                auraIntensity: 1.0,
                lightingIntensity: 2.0
              }))
              break
          }
          
          // Return to original state after animation
          setTimeout(() => {
            setDragonState(prev => ({ 
              ...prev, 
              animationState: originalState,
              cameraShakeIntensity: 0
            }))
          }, 2000)
        },
        (error) => createDragon3DError(`Failed to trigger special animation: ${error}`)
      )
    )
  }, [dragonState])
  
  const updateVoiceState = useCallback((voiceState: VoiceAnimationState) => {
    return pipe(
      TE.tryCatch(
        async () => {
          logger.debug('Updating voice state', voiceState)
          voiceEventsSubject.current.next(voiceState)
        },
        (error) => createDragon3DError(`Failed to update voice state: ${error}`)
      )
    )
  }, [])
  
  const optimizePerformance = useCallback(() => {
    return pipe(
      TE.tryCatch(
        async () => {
          logger.debug('Optimizing dragon performance')
          
          const currentFps = performanceMetricsSubject.current.getValue().fps
          
          if (currentFps < 30) {
            // Reduce quality
            setDragonState(prev => ({
              ...prev,
              qualityLevel: 'low',
              particleIntensity: prev.particleIntensity * 0.5,
              auraIntensity: prev.auraIntensity * 0.5
            }))
            
            logger.warn(`Performance optimization: Reduced quality due to low FPS (${currentFps})`)
          } else if (currentFps > 55) {
            // Increase quality if performance allows
            setDragonState(prev => ({
              ...prev,
              qualityLevel: prev.qualityLevel === 'low' ? 'medium' : 
                           prev.qualityLevel === 'medium' ? 'high' : 'ultra'
            }))
            
            logger.info(`Performance optimization: Increased quality due to good FPS (${currentFps})`)
          }
        },
        (error) => createDragon3DError(`Failed to optimize performance: ${error}`)
      )
    )
  }, [])
  
  // Voice event handlers
  const onVoiceListeningStart = useCallback(() => {
    updateVoiceState({
      isListening: true,
      isSpeaking: false,
      isProcessing: false,
      isIdle: false,
      volume: 0.5
    })()
  }, [updateVoiceState])
  
  const onVoiceSpeakingStart = useCallback(() => {
    updateVoiceState({
      isListening: false,
      isSpeaking: true,
      isProcessing: false,
      isIdle: false,
      volume: 0.8
    })()
  }, [updateVoiceState])
  
  const onVoiceProcessingStart = useCallback(() => {
    updateVoiceState({
      isListening: false,
      isSpeaking: false,
      isProcessing: true,
      isIdle: false,
      volume: 0.3
    })()
  }, [updateVoiceState])
  
  const onTranscriptUpdate = useCallback((transcript: string) => {
    // Trigger special animations based on transcript content
    if (transcript.toLowerCase().includes('roar')) {
      triggerSpecialAnimation('roar')()
    } else if (transcript.toLowerCase().includes('fly')) {
      triggerSpecialAnimation('fly')()
    } else if (transcript.length > 50) {
      triggerSpecialAnimation('pulse')()
    }
  }, [triggerSpecialAnimation])
  
  return {
    // Actions
    setState,
    setMood,
    setPowerLevel,
    triggerSpecialAnimation,
    updateVoiceState,
    optimizePerformance,
    
    // Streams
    dragonState$: dragonStateSubject.current,
    powerLevel$: powerLevelSubject.current,
    voiceEvents$: voiceEventsSubject.current,
    performanceMetrics$: performanceMetricsSubject.current
  }
}

export default useDragon3D
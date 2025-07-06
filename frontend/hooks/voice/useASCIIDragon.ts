'use client'

import { useRef, useCallback, useReducer, useEffect, useMemo } from 'react'
import * as TE from 'fp-ts/TaskEither'
import * as O from 'fp-ts/Option'
import * as E from 'fp-ts/Either'
import { pipe } from 'fp-ts/function'
import { BehaviorSubject, Subject, fromEvent, merge } from 'rxjs'
import { map, distinctUntilChanged, takeUntil, debounceTime, filter, throttleTime } from 'rxjs/operators'
import { logger } from '../../lib/logger'
import { voiceLogger } from '../../lib/voice-logger'
import { usePerformanceMonitor } from '../usePerformanceMonitor'
import { 
  useDragonPerformance,
  adjustAnimationQuality,
  createOptimizedAnimationLoop
} from '../../utils/dragon-performance'

// Types and interfaces
export type ASCIIDragonPose = 'coiled' | 'flying' | 'attacking' | 'sleeping'
export type ASCIIDragonSize = 'sm' | 'md' | 'lg' | 'xl'
export type ASCIIDragonSpeed = 'slow' | 'normal' | 'fast'
export type ASCIIDragonAnimationState = 'idle' | 'typing' | 'breathing' | 'floating' | 'reacting' | 'transitioning'

export interface ASCIIDragonAnimationConfig {
  typewriter: {
    enabled: boolean
    speed: number
    cursor: boolean
  }
  breathing: {
    enabled: boolean
    speed: number
    intensity: number
    characterMapping: boolean
  }
  floating: {
    enabled: boolean
    speed: number
    amplitude: number
    rotationEnabled: boolean
  }
  transitions: {
    enabled: boolean
    duration: number
    easing: string
  }
  performance: {
    enabled: boolean
    throttleMs: number
    maxFPS: number
  }
}

export interface ASCIIDragonState {
  pose: ASCIIDragonPose
  size: ASCIIDragonSize
  speed: ASCIIDragonSpeed
  state: ASCIIDragonAnimationState
  animationConfig: ASCIIDragonAnimationConfig
  typewriter: {
    displayedLines: string[]
    currentLineIndex: number
    currentCharIndex: number
    isComplete: boolean
    isActive: boolean
  }
  breathing: {
    intensity: number
    phase: number
    lastUpdate: number
  }
  floating: {
    offsetY: number
    offsetX: number
    rotation: number
    lastUpdate: number
  }
  transitions: {
    isTransitioning: boolean
    fromPose: O.Option<ASCIIDragonPose>
    toPose: O.Option<ASCIIDragonPose>
    progress: number
    startTime: number
  }
  voiceIntegration: {
    reactToVoice: boolean
    isListening: boolean
    isSpeaking: boolean
    isProcessing: boolean
    transcriptLength: number
    currentMessage: string
  }
  performance: {
    fps: number
    shouldOptimize: boolean
    animationFrameId: number | null
    lastFrameTime: number
  }
  keyboard: {
    enableShortcuts: boolean
    shortcuts: Record<string, ASCIIDragonPose>
  }
}

export interface ASCIIDragonError {
  type: 'ANIMATION_ERROR' | 'POSE_ERROR' | 'PERFORMANCE_ERROR' | 'TYPEWRITER_ERROR'
  message: string
  originalError?: unknown
}

// Action types for the reducer
export type ASCIIDragonAction =
  | { type: 'SET_POSE'; payload: ASCIIDragonPose }
  | { type: 'SET_SIZE'; payload: ASCIIDragonSize }
  | { type: 'SET_SPEED'; payload: ASCIIDragonSpeed }
  | { type: 'SET_STATE'; payload: ASCIIDragonAnimationState }
  | { type: 'UPDATE_ANIMATION_CONFIG'; payload: Partial<ASCIIDragonAnimationConfig> }
  | { type: 'TYPEWRITER_START'; payload: { lines: string[]; speed: number } }
  | { type: 'TYPEWRITER_ADVANCE' }
  | { type: 'TYPEWRITER_COMPLETE' }
  | { type: 'TYPEWRITER_RESET' }
  | { type: 'BREATHING_UPDATE'; payload: { intensity: number; phase: number } }
  | { type: 'FLOATING_UPDATE'; payload: { offsetY: number; offsetX: number; rotation: number } }
  | { type: 'TRANSITION_START'; payload: { fromPose: ASCIIDragonPose; toPose: ASCIIDragonPose } }
  | { type: 'TRANSITION_UPDATE'; payload: { progress: number } }
  | { type: 'TRANSITION_COMPLETE' }
  | { type: 'VOICE_LISTENING_START' }
  | { type: 'VOICE_LISTENING_END' }
  | { type: 'VOICE_SPEAKING_START'; payload: { message: string } }
  | { type: 'VOICE_SPEAKING_END' }
  | { type: 'VOICE_PROCESSING_START' }
  | { type: 'VOICE_PROCESSING_END' }
  | { type: 'VOICE_TRANSCRIPT_UPDATE'; payload: { transcript: string } }
  | { type: 'PERFORMANCE_UPDATE'; payload: { fps: number; shouldOptimize: boolean } }
  | { type: 'KEYBOARD_SHORTCUT'; payload: { pose: ASCIIDragonPose } }

// Initial animation configuration
const initialAnimationConfig: ASCIIDragonAnimationConfig = {
  typewriter: {
    enabled: true,
    speed: 100,
    cursor: true
  },
  breathing: {
    enabled: true,
    speed: 4000,
    intensity: 0.15,
    characterMapping: true
  },
  floating: {
    enabled: true,
    speed: 8000,
    amplitude: 10,
    rotationEnabled: true
  },
  transitions: {
    enabled: true,
    duration: 1000,
    easing: 'ease-in-out'
  },
  performance: {
    enabled: true,
    throttleMs: 16, // ~60fps
    maxFPS: 60
  }
}

// Initial state
const initialASCIIDragonState: ASCIIDragonState = {
  pose: 'coiled',
  size: 'lg',
  speed: 'normal',
  state: 'idle',
  animationConfig: initialAnimationConfig,
  typewriter: {
    displayedLines: [],
    currentLineIndex: 0,
    currentCharIndex: 0,
    isComplete: false,
    isActive: false
  },
  breathing: {
    intensity: 1,
    phase: 0,
    lastUpdate: 0
  },
  floating: {
    offsetY: 0,
    offsetX: 0,
    rotation: 0,
    lastUpdate: 0
  },
  transitions: {
    isTransitioning: false,
    fromPose: O.none,
    toPose: O.none,
    progress: 0,
    startTime: 0
  },
  voiceIntegration: {
    reactToVoice: true,
    isListening: false,
    isSpeaking: false,
    isProcessing: false,
    transcriptLength: 0,
    currentMessage: ''
  },
  performance: {
    fps: 60,
    shouldOptimize: false,
    animationFrameId: null,
    lastFrameTime: 0
  },
  keyboard: {
    enableShortcuts: true,
    shortcuts: {
      '1': 'coiled',
      '2': 'flying',
      '3': 'attacking',
      '4': 'sleeping'
    }
  }
}

// ASCII Dragon patterns (taken from ASCIIDragon.tsx)
const dragonPatterns = {
  coiled: {
    sm: [
      "    /\\_/\\",
      "   ( o.o )",
      "    > ^ <",
      "  /~~~~~\\",
      " (  ~~~  )",
      "  \\~~~~~/"
    ],
    md: [
      "        /\\_/\\",
      "       ( o.o )",
      "      __> ^ <__",
      "     /~~~~~~~~~\\",
      "    (  ~~~~~~~  )",
      "   (  ~~~~~~~~~  )",
      "  (  ~~~~~~~~~~~  )",
      "   \\~~~~~~~~~~~~~/",
      "    \\~~~~~~~~~~~/"
    ],
    lg: [
      "            /\\_/\\",
      "           ( o.o )",
      "          __> ^ <__",
      "         /~~~~~~~~~~~\\",
      "        (  ~~~~~~~~~  )",
      "       (  ~~~~~~~~~~~  )",
      "      (  ~~~~~~~~~~~~~  )",
      "     (  ~~~~~~~~~~~~~~~  )",
      "    (  ~~~~~~~~~~~~~~~~~  )",
      "     \\~~~~~~~~~~~~~~~~~~/",
      "      \\~~~~~~~~~~~~~~~~/",
      "       \\~~~~~~~~~~~~~~/",
      "        \\~~~~~~~~~~~~/"
    ],
    xl: [
      "                /\\_/\\",
      "               ( o.o )",
      "              __> ^ <__",
      "             /~~~~~~~~~~~\\",
      "            (  ~~~~~~~~~  )",
      "           (  ~~~~~~~~~~~  )",
      "          (  ~~~~~~~~~~~~~  )",
      "         (  ~~~~~~~~~~~~~~~  )",
      "        (  ~~~~~~~~~~~~~~~~~  )",
      "       (  ~~~~~~~~~~~~~~~~~~~  )",
      "      (  ~~~~~~~~~~~~~~~~~~~~~  )",
      "     (  ~~~~~~~~~~~~~~~~~~~~~~~  )",
      "      \\~~~~~~~~~~~~~~~~~~~~~~~~/",
      "       \\~~~~~~~~~~~~~~~~~~~~~~/",
      "        \\~~~~~~~~~~~~~~~~~~~~/",
      "         \\~~~~~~~~~~~~~~~~~~/",
      "          \\~~~~~~~~~~~~~~~~/",
      "           \\~~~~~~~~~~~~~~/",
      "            \\~~~~~~~~~~~~/"
    ]
  },
  flying: {
    sm: [
      "  /\\_/\\",
      " ( o.o )",
      "  > ^ <",
      " /|   |\\",
      "/  ~~~  \\",
      "\\  ~~~  /",
      " \\|___|/"
    ],
    md: [
      "    /\\_/\\",
      "   ( o.o )",
      "    > ^ <",
      "   /|   |\\",
      "  / |~~~| \\",
      " /  |~~~|  \\",
      "/   |~~~|   \\",
      "\\   |~~~|   /",
      " \\  |~~~|  /",
      "  \\ |~~~| /",
      "   \\|___|/"
    ],
    lg: [
      "      /\\_/\\",
      "     ( o.o )",
      "      > ^ <",
      "     /|   |\\",
      "    / |~~~| \\",
      "   /  |~~~|  \\",
      "  /   |~~~|   \\",
      " /    |~~~|    \\",
      "/     |~~~|     \\",
      "\\     |~~~|     /",
      " \\    |~~~|    /",
      "  \\   |~~~|   /",
      "   \\  |~~~|  /",
      "    \\ |~~~| /",
      "     \\|___|/"
    ],
    xl: [
      "        /\\_/\\",
      "       ( o.o )",
      "        > ^ <",
      "       /|   |\\",
      "      / |~~~| \\",
      "     /  |~~~|  \\",
      "    /   |~~~|   \\",
      "   /    |~~~|    \\",
      "  /     |~~~|     \\",
      " /      |~~~|      \\",
      "/       |~~~|       \\",
      "\\       |~~~|       /",
      " \\      |~~~|      /",
      "  \\     |~~~|     /",
      "   \\    |~~~|    /",
      "    \\   |~~~|   /",
      "     \\  |~~~|  /",
      "      \\ |~~~| /",
      "       \\|___|/"
    ]
  },
  attacking: {
    sm: [
      "  /\\_/\\",
      " ( >.< )",
      "  \\|^|/",
      "   |||",
      "  /~~~\\",
      " (  ~  )",
      "  \\___/"
    ],
    md: [
      "    /\\_/\\",
      "   ( >.< )",
      "    \\|^|/",
      "     |||",
      "    /|||\\",
      "   /~~~~~\\",
      "  (  ~~~  )",
      "   \\~~~~~/"
    ],
    lg: [
      "      /\\_/\\",
      "     ( >.< )",
      "      \\|^|/",
      "       |||",
      "      /|||\\",
      "     /|||||\\",
      "    /~~~~~~~\\",
      "   (  ~~~~~  )",
      "  (  ~~~~~~~  )",
      "   \\~~~~~~~/"
    ],
    xl: [
      "        /\\_/\\",
      "       ( >.< )",
      "        \\|^|/",
      "         |||",
      "        /|||\\",
      "       /|||||\\",
      "      /|||||||\\",
      "     /~~~~~~~~~\\",
      "    (  ~~~~~~~  )",
      "   (  ~~~~~~~~~  )",
      "  (  ~~~~~~~~~~~  )",
      "   \\~~~~~~~~~~~/"
    ]
  },
  sleeping: {
    sm: [
      "  /\\_/\\",
      " ( -.- )",
      "  > z <",
      "  /~~~\\",
      " (  ~  )",
      "  \\___/"
    ],
    md: [
      "    /\\_/\\",
      "   ( -.- )",
      "    > z <",
      "   /~~~~~\\",
      "  (  ~~~  )",
      "   \\~~~~~/"
    ],
    lg: [
      "      /\\_/\\",
      "     ( -.- )",
      "      > z <",
      "     /~~~~~\\",
      "    (  ~~~  )",
      "   (  ~~~~~  )",
      "    \\~~~~~/"
    ],
    xl: [
      "        /\\_/\\",
      "       ( -.- )",
      "        > z <",
      "       /~~~~~\\",
      "      (  ~~~  )",
      "     (  ~~~~~  )",
      "    (  ~~~~~~~  )",
      "     \\~~~~~~~/"
    ]
  }
}

// ASCII Dragon state reducer
export const asciiDragonReducer = (
  state: ASCIIDragonState,
  action: ASCIIDragonAction
): ASCIIDragonState => {
  logger.debug('🐉 ASCIIDragon Action', {
    type: action.type,
    currentPose: state.pose,
    currentState: state.state,
    isTransitioning: state.transitions.isTransitioning
  })

  switch (action.type) {
    case 'SET_POSE':
      if (state.pose === action.payload) return state
      return {
        ...state,
        pose: action.payload,
        state: 'transitioning',
        transitions: {
          ...state.transitions,
          isTransitioning: true,
          fromPose: O.some(state.pose),
          toPose: O.some(action.payload),
          progress: 0,
          startTime: Date.now()
        }
      }

    case 'SET_SIZE':
      return { ...state, size: action.payload }

    case 'SET_SPEED':
      return { ...state, speed: action.payload }

    case 'SET_STATE':
      return { ...state, state: action.payload }

    case 'UPDATE_ANIMATION_CONFIG':
      return {
        ...state,
        animationConfig: { ...state.animationConfig, ...action.payload }
      }

    case 'TYPEWRITER_START':
      return {
        ...state,
        state: 'typing',
        typewriter: {
          displayedLines: [],
          currentLineIndex: 0,
          currentCharIndex: 0,
          isComplete: false,
          isActive: true
        }
      }

    case 'TYPEWRITER_ADVANCE':
      const { currentLineIndex, currentCharIndex } = state.typewriter
      const currentPattern = dragonPatterns[state.pose][state.size]
      
      if (currentLineIndex >= currentPattern.length) {
        return {
          ...state,
          state: 'idle',
          typewriter: { ...state.typewriter, isComplete: true, isActive: false }
        }
      }

      const currentLine = currentPattern[currentLineIndex]
      if (!currentLine) {
        return {
          ...state,
          state: 'idle',
          typewriter: { ...state.typewriter, isComplete: true, isActive: false }
        }
      }
      
      const newDisplayedLines = [...state.typewriter.displayedLines]
      
      if (currentCharIndex >= currentLine.length) {
        // Move to next line
        newDisplayedLines[currentLineIndex] = currentLine
        return {
          ...state,
          typewriter: {
            ...state.typewriter,
            displayedLines: newDisplayedLines,
            currentLineIndex: currentLineIndex + 1,
            currentCharIndex: 0
          }
        }
      } else {
        // Add character to current line
        newDisplayedLines[currentLineIndex] = currentLine.substring(0, currentCharIndex + 1)
        return {
          ...state,
          typewriter: {
            ...state.typewriter,
            displayedLines: newDisplayedLines,
            currentCharIndex: currentCharIndex + 1
          }
        }
      }

    case 'TYPEWRITER_COMPLETE':
      return {
        ...state,
        state: 'idle',
        typewriter: {
          ...state.typewriter,
          isComplete: true,
          isActive: false,
          displayedLines: dragonPatterns[state.pose][state.size]
        }
      }

    case 'TYPEWRITER_RESET':
      return {
        ...state,
        typewriter: {
          displayedLines: [],
          currentLineIndex: 0,
          currentCharIndex: 0,
          isComplete: false,
          isActive: false
        }
      }

    case 'BREATHING_UPDATE':
      return {
        ...state,
        breathing: {
          ...state.breathing,
          intensity: action.payload.intensity,
          phase: action.payload.phase,
          lastUpdate: Date.now()
        }
      }

    case 'FLOATING_UPDATE':
      return {
        ...state,
        floating: {
          ...state.floating,
          offsetY: action.payload.offsetY,
          offsetX: action.payload.offsetX,
          rotation: action.payload.rotation,
          lastUpdate: Date.now()
        }
      }

    case 'TRANSITION_START':
      return {
        ...state,
        state: 'transitioning',
        transitions: {
          ...state.transitions,
          isTransitioning: true,
          fromPose: O.some(action.payload.fromPose),
          toPose: O.some(action.payload.toPose),
          progress: 0,
          startTime: Date.now()
        }
      }

    case 'TRANSITION_UPDATE':
      return {
        ...state,
        transitions: {
          ...state.transitions,
          progress: action.payload.progress
        }
      }

    case 'TRANSITION_COMPLETE':
      return {
        ...state,
        state: 'idle',
        transitions: {
          ...state.transitions,
          isTransitioning: false,
          fromPose: O.none,
          toPose: O.none,
          progress: 1,
          startTime: 0
        }
      }

    case 'VOICE_LISTENING_START':
      return {
        ...state,
        pose: 'coiled',
        voiceIntegration: { ...state.voiceIntegration, isListening: true }
      }

    case 'VOICE_LISTENING_END':
      return {
        ...state,
        voiceIntegration: { ...state.voiceIntegration, isListening: false }
      }

    case 'VOICE_SPEAKING_START':
      return {
        ...state,
        pose: 'flying',
        voiceIntegration: {
          ...state.voiceIntegration,
          isSpeaking: true,
          currentMessage: action.payload.message
        }
      }

    case 'VOICE_SPEAKING_END':
      return {
        ...state,
        pose: 'coiled',
        voiceIntegration: {
          ...state.voiceIntegration,
          isSpeaking: false,
          currentMessage: ''
        }
      }

    case 'VOICE_PROCESSING_START':
      return {
        ...state,
        pose: 'attacking',
        voiceIntegration: { ...state.voiceIntegration, isProcessing: true }
      }

    case 'VOICE_PROCESSING_END':
      return {
        ...state,
        pose: 'coiled',
        voiceIntegration: { ...state.voiceIntegration, isProcessing: false }
      }

    case 'VOICE_TRANSCRIPT_UPDATE':
      return {
        ...state,
        voiceIntegration: {
          ...state.voiceIntegration,
          transcriptLength: action.payload.transcript.length
        }
      }

    case 'PERFORMANCE_UPDATE':
      return {
        ...state,
        performance: {
          ...state.performance,
          fps: action.payload.fps,
          shouldOptimize: action.payload.shouldOptimize
        }
      }

    case 'KEYBOARD_SHORTCUT':
      return {
        ...state,
        pose: action.payload.pose
      }

    default:
      logger.warn('🐉 Unknown ASCIIDragon action type', { type: (action as any).type })
      return state
  }
}

// Pure helper functions
const createASCIIDragonError = (
  type: ASCIIDragonError['type'],
  message: string,
  originalError?: unknown
): ASCIIDragonError => {
  const error = { type, message, originalError }
  logger.error('🐉 ASCIIDragon Error Created', { type, message, originalError })
  return error
}

// Character intensity mapping for breathing effect
const adjustCharacterIntensity = (char: string, intensity: number): string => {
  const intensityMap: Record<string, string[]> = {
    '~': ['·', '~', '≈', '∼'],
    '|': ['¦', '|', '‖', '║'],
    '-': ['·', '-', '–', '—'],
    '^': ['·', '^', '∧', '▲'],
    'o': ['·', 'o', 'O', '●'],
    '<': ['‹', '<', '‹', '«'],
    '>': ['›', '>', '›', '»']
  }

  const variations = intensityMap[char]
  if (variations) {
    const index = Math.floor(intensity * (variations.length - 1))
    const safeIndex = Math.max(0, Math.min(index, variations.length - 1))
    return variations[safeIndex] ?? char
  }

  return char
}

// Animation timing configurations
const getAnimationTimings = (speed: ASCIIDragonSpeed) => {
  const timings = {
    slow: { typewriter: 150, breathing: 6000, floating: 12000 },
    normal: { typewriter: 100, breathing: 4000, floating: 8000 },
    fast: { typewriter: 50, breathing: 2000, floating: 4000 }
  }
  return timings[speed]
}

// Performance optimization functions
const optimizeConfigForPerformance = (
  config: ASCIIDragonAnimationConfig,
  performanceScore: number
): ASCIIDragonAnimationConfig => {
  if (performanceScore >= 70) return config

  const optimized = { ...config }
  
  if (performanceScore < 50) {
    optimized.floating.enabled = false
    optimized.breathing.characterMapping = false
    optimized.performance.throttleMs = 32 // ~30fps
  }
  
  if (performanceScore < 30) {
    optimized.typewriter.enabled = false
    optimized.breathing.enabled = false
    optimized.performance.throttleMs = 64 // ~15fps
  }
  
  return optimized
}

// Hook configuration interface
export interface UseASCIIDragonOptions {
  enableVoiceIntegration?: boolean
  enablePerformanceMonitoring?: boolean
  enableKeyboardShortcuts?: boolean
  enableAutoTypewriter?: boolean
  enableBreathing?: boolean
  enableFloating?: boolean
  initialPose?: ASCIIDragonPose
  initialSize?: ASCIIDragonSize
  initialSpeed?: ASCIIDragonSpeed
  animationConfig?: Partial<ASCIIDragonAnimationConfig>
  keyboardShortcuts?: Record<string, ASCIIDragonPose>
  autoOptimize?: boolean
  targetFPS?: number
  enableLOD?: boolean
  maxAnimationQuality?: number
}

export const useASCIIDragon = (options: UseASCIIDragonOptions = {}) => {
  const {
    enableVoiceIntegration = true,
    enablePerformanceMonitoring = true,
    enableKeyboardShortcuts = true,
    enableAutoTypewriter = true,
    enableBreathing = true,
    enableFloating = true,
    initialPose = 'coiled',
    initialSize = 'lg',
    initialSpeed = 'normal',
    animationConfig: customAnimationConfig = {},
    keyboardShortcuts: customKeyboardShortcuts = {},
    autoOptimize = true,
    targetFPS = 60,
    enableLOD = true,
    maxAnimationQuality = 1.0
  } = options

  logger.debug('🐉 Initializing ASCIIDragon hook', {
    enableVoiceIntegration,
    enablePerformanceMonitoring,
    enableKeyboardShortcuts,
    initialPose,
    initialSize,
    initialSpeed
  })

  // State management
  const [state, dispatch] = useReducer(asciiDragonReducer, {
    ...initialASCIIDragonState,
    pose: initialPose,
    size: initialSize,
    speed: initialSpeed,
    animationConfig: { ...initialAnimationConfig, ...customAnimationConfig },
    keyboard: {
      ...initialASCIIDragonState.keyboard,
      shortcuts: { ...initialASCIIDragonState.keyboard.shortcuts, ...customKeyboardShortcuts }
    }
  })

  // Enhanced performance monitoring with dragon-specific optimizations
  const dragonPerformance = useDragonPerformance({
    config: {
      targetFPS,
      adaptiveLOD: enableLOD,
      autoOptimization: autoOptimize,
      maxMemoryMB: 64, // ASCII dragon uses minimal memory
      performanceMonitoring: enablePerformanceMonitoring
    },
    onWarning: (warning) => {
      logger.warn('🐉 ASCIIDragon performance warning', warning)
      voiceLogger.warn('ASCII Dragon Performance', { warning })
    },
    onLODChange: (newLOD, oldLOD) => {
      logger.info('🐉 ASCIIDragon LOD changed', { from: oldLOD.name, to: newLOD.name })
      
      // Update animation config based on new LOD
      const optimizedConfig = optimizeConfigForPerformance(
        state.animationConfig,
        newLOD.level * 20 // Convert LOD level to performance score
      )
      dispatch({ type: 'UPDATE_ANIMATION_CONFIG', payload: optimizedConfig })
    }
  })

  // Fallback to legacy performance monitor if dragon performance is not available
  const performanceMonitor = usePerformanceMonitor({
    enabled: enablePerformanceMonitoring && !dragonPerformance,
    targetFPS,
    sampleRate: 2000,
    onPerformanceWarning: (metrics) => {
      logger.warn('🐉 ASCIIDragon performance warning (legacy)', metrics)
      if (autoOptimize) {
        dispatch({
          type: 'PERFORMANCE_UPDATE',
          payload: { fps: metrics.fps, shouldOptimize: true }
        })
      }
    }
  })

  // RxJS subjects for reactive state management
  const stateSubject = useRef(new BehaviorSubject(state))
  const poseSubject = useRef(new Subject<ASCIIDragonPose>())
  const voiceEventSubject = useRef(new Subject<{ type: string; data?: any }>())
  const animationFrameSubject = useRef(new Subject<number>())
  const cleanupSubject = useRef(new Subject<void>())

  // Update state subject when state changes
  useEffect(() => {
    stateSubject.current.next(state)
  }, [state])

  // Auto-optimize based on performance using enhanced dragon performance system
  useEffect(() => {
    if (autoOptimize && enablePerformanceMonitoring) {
      const performanceScore = dragonPerformance ? 
        (5 - (dragonPerformance.currentLOD?.level ?? 2)) * 20 : // Convert LOD to score
        performanceMonitor.performanceScore
      
      const optimizedConfig = optimizeConfigForPerformance(
        state.animationConfig,
        performanceScore
      )
      
      if (JSON.stringify(optimizedConfig) !== JSON.stringify(state.animationConfig)) {
        dispatch({ type: 'UPDATE_ANIMATION_CONFIG', payload: optimizedConfig })
      }
    }
  }, [
    dragonPerformance?.currentLOD?.level, 
    performanceMonitor.performanceScore, 
    autoOptimize, 
    enablePerformanceMonitoring, 
    state.animationConfig,
    dragonPerformance
  ])

  // Pose management functions
  const setPose = useCallback((newPose: ASCIIDragonPose): TE.TaskEither<ASCIIDragonError, void> => {
    logger.debug('🐉 Setting ASCII dragon pose', { from: state.pose, to: newPose })
    
    return TE.tryCatch(
      async () => {
        dispatch({ type: 'SET_POSE', payload: newPose })
        poseSubject.current.next(newPose)
        
        // Trigger typewriter effect if enabled
        if (enableAutoTypewriter && state.animationConfig.typewriter.enabled) {
          setTimeout(() => {
            dispatch({ type: 'TYPEWRITER_START', payload: { lines: dragonPatterns[newPose][state.size], speed: state.animationConfig.typewriter.speed } })
          }, 100)
        }
      },
      (error) => createASCIIDragonError('POSE_ERROR', 'Failed to set dragon pose', error)
    )
  }, [state.pose, state.size, state.animationConfig.typewriter, enableAutoTypewriter])

  const setSize = useCallback((newSize: ASCIIDragonSize): TE.TaskEither<ASCIIDragonError, void> => {
    logger.debug('🐉 Setting ASCII dragon size', { from: state.size, to: newSize })
    
    return TE.tryCatch(
      async () => {
        dispatch({ type: 'SET_SIZE', payload: newSize })
        
        // Restart typewriter with new size if active
        if (state.typewriter.isActive) {
          dispatch({ type: 'TYPEWRITER_START', payload: { lines: dragonPatterns[state.pose][newSize], speed: state.animationConfig.typewriter.speed } })
        }
      },
      (error) => createASCIIDragonError('ANIMATION_ERROR', 'Failed to set dragon size', error)
    )
  }, [state.size, state.pose, state.typewriter.isActive, state.animationConfig.typewriter.speed])

  const setSpeed = useCallback((newSpeed: ASCIIDragonSpeed): TE.TaskEither<ASCIIDragonError, void> => {
    logger.debug('🐉 Setting ASCII dragon speed', { from: state.speed, to: newSpeed })
    
    return TE.tryCatch(
      async () => {
        dispatch({ type: 'SET_SPEED', payload: newSpeed })
        
        // Update animation config with new speed
        const timings = getAnimationTimings(newSpeed)
        dispatch({
          type: 'UPDATE_ANIMATION_CONFIG',
          payload: {
            typewriter: { ...state.animationConfig.typewriter, speed: timings.typewriter },
            breathing: { ...state.animationConfig.breathing, speed: timings.breathing },
            floating: { ...state.animationConfig.floating, speed: timings.floating }
          }
        })
      },
      (error) => createASCIIDragonError('ANIMATION_ERROR', 'Failed to set dragon speed', error)
    )
  }, [state.speed, state.animationConfig])

  // Typewriter effect management
  const startTypewriter = useCallback(() => {
    if (state.animationConfig.typewriter.enabled) {
      dispatch({ type: 'TYPEWRITER_START', payload: { lines: dragonPatterns[state.pose][state.size], speed: state.animationConfig.typewriter.speed } })
    }
  }, [state.pose, state.size, state.animationConfig.typewriter])

  const resetTypewriter = useCallback(() => {
    dispatch({ type: 'TYPEWRITER_RESET' })
  }, [])

  // Typewriter animation loop
  useEffect(() => {
    if (state.typewriter.isActive && state.animationConfig.typewriter.enabled) {
      const interval = setInterval(() => {
        dispatch({ type: 'TYPEWRITER_ADVANCE' })
      }, state.animationConfig.typewriter.speed)

      return () => clearInterval(interval)
    }
    return undefined
  }, [state.typewriter.isActive, state.animationConfig.typewriter.enabled, state.animationConfig.typewriter.speed])

  // Breathing animation loop
  useEffect(() => {
    if (enableBreathing && state.animationConfig.breathing.enabled) {
      const updateBreathing = () => {
        const now = Date.now()
        const phase = (now / state.animationConfig.breathing.speed) * 2 * Math.PI
        const intensity = 1 + Math.sin(phase) * state.animationConfig.breathing.intensity
        
        dispatch({ type: 'BREATHING_UPDATE', payload: { intensity, phase } })
      }

      const interval = setInterval(updateBreathing, state.animationConfig.performance.throttleMs)
      return () => clearInterval(interval)
    }
    return undefined
  }, [enableBreathing, state.animationConfig.breathing, state.animationConfig.performance.throttleMs])

  // Floating animation loop
  useEffect(() => {
    if (enableFloating && state.animationConfig.floating.enabled) {
      const updateFloating = () => {
        const now = Date.now()
        const phase = (now / state.animationConfig.floating.speed) * 2 * Math.PI
        const offsetY = Math.sin(phase) * state.animationConfig.floating.amplitude
        const offsetX = Math.cos(phase * 0.7) * (state.animationConfig.floating.amplitude * 0.5)
        const rotation = state.animationConfig.floating.rotationEnabled ? Math.sin(phase * 0.3) * 2 : 0
        
        dispatch({ type: 'FLOATING_UPDATE', payload: { offsetY, offsetX, rotation } })
      }

      const interval = setInterval(updateFloating, state.animationConfig.performance.throttleMs)
      return () => clearInterval(interval)
    }
    return undefined
  }, [enableFloating, state.animationConfig.floating, state.animationConfig.performance.throttleMs])

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

  const onVoiceSpeakingStart = useCallback((message: string) => {
    if (enableVoiceIntegration) {
      logger.debug('🐉 Voice speaking started', { messageLength: message.length })
      dispatch({ type: 'VOICE_SPEAKING_START', payload: { message } })
      voiceEventSubject.current.next({ type: 'speaking_start', data: { message } })
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
      dispatch({ type: 'VOICE_TRANSCRIPT_UPDATE', payload: { transcript } })
      
      // Trigger pose changes based on transcript length
      if (transcript.length > 100) {
        setPose('attacking')()
      } else if (transcript.length > 50) {
        setPose('flying')()
      } else if (transcript.length > 0) {
        setPose('coiled')()
      }
    }
  }, [enableVoiceIntegration, setPose])

  // Keyboard shortcuts
  useEffect(() => {
    if (!enableKeyboardShortcuts) return

    const handleKeyPress = (event: KeyboardEvent) => {
      const pose = state.keyboard.shortcuts[event.key]
      if (pose) {
        event.preventDefault()
        logger.debug('🐉 Keyboard shortcut triggered', { key: event.key, pose })
        dispatch({ type: 'KEYBOARD_SHORTCUT', payload: { pose } })
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [enableKeyboardShortcuts, state.keyboard.shortcuts])

  // Process displayed lines with breathing effect
  const processedLines = useMemo(() => {
    if (!enableBreathing || !state.animationConfig.breathing.characterMapping) {
      return state.typewriter.displayedLines
    }

    return state.typewriter.displayedLines.map(line => 
      line.split('').map(char => 
        adjustCharacterIntensity(char, state.breathing.intensity)
      ).join('')
    )
  }, [state.typewriter.displayedLines, state.breathing.intensity, enableBreathing, state.animationConfig.breathing.characterMapping])

  // Reactive streams for complex state management
  const dragonPose$ = useMemo(() => 
    stateSubject.current.pipe(
      map(s => s.pose),
      distinctUntilChanged(),
      takeUntil(cleanupSubject.current)
    ), [])

  const animationState$ = useMemo(() =>
    stateSubject.current.pipe(
      map(s => s.state),
      distinctUntilChanged(),
      takeUntil(cleanupSubject.current)
    ), [])

  const voiceEvents$ = useMemo(() =>
    voiceEventSubject.current.pipe(
      debounceTime(100),
      takeUntil(cleanupSubject.current)
    ), [])

  const typewriterProgress$ = useMemo(() =>
    stateSubject.current.pipe(
      map(s => ({
        progress: s.typewriter.displayedLines.length / dragonPatterns[s.pose][s.size].length,
        isComplete: s.typewriter.isComplete,
        isActive: s.typewriter.isActive
      })),
      distinctUntilChanged((a, b) => JSON.stringify(a) === JSON.stringify(b)),
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
  const getCurrentPose = () => state.pose
  const getCurrentSize = () => state.size
  const getCurrentSpeed = () => state.speed
  const getAnimationState = () => state.state
  const isTypewriterActive = () => state.typewriter.isActive
  const isTypewriterComplete = () => state.typewriter.isComplete
  const isTransitioning = () => state.transitions.isTransitioning
  const getTransitionProgress = () => state.transitions.progress
  const getDisplayedLines = () => processedLines
  const getBreathingIntensity = () => state.breathing.intensity
  const getFloatingOffset = () => ({ x: state.floating.offsetX, y: state.floating.offsetY, rotation: state.floating.rotation })

  // Enhanced performance utilities
  const shouldReduceQuality = useCallback(() => {
    if (dragonPerformance) {
      return dragonPerformance.shouldReduceQuality
    }
    return enablePerformanceMonitoring && performanceMonitor.shouldReduceQuality
  }, [dragonPerformance, enablePerformanceMonitoring, performanceMonitor.shouldReduceQuality])

  const shouldDisableAnimations = useCallback(() => {
    if (dragonPerformance) {
      return dragonPerformance.shouldDisableAnimations
    }
    return enablePerformanceMonitoring && performanceMonitor.shouldDisableAnimations
  }, [dragonPerformance, enablePerformanceMonitoring, performanceMonitor.shouldDisableAnimations])

  const getCurrentLOD = useCallback(() => {
    return dragonPerformance?.currentLOD || null
  }, [dragonPerformance])

  const getPerformanceMetrics = useCallback(() => {
    return dragonPerformance?.metrics || null
  }, [dragonPerformance])

  const optimizeForPerformance = useCallback(() => {
    if (dragonPerformance) {
      dragonPerformance.optimizeForPerformance()
    } else {
      // Fallback optimization
      const optimizedConfig = optimizeConfigForPerformance(state.animationConfig, 30)
      dispatch({ type: 'UPDATE_ANIMATION_CONFIG', payload: optimizedConfig })
    }
  }, [dragonPerformance, state.animationConfig])

  return {
    // State
    pose: state.pose,
    size: state.size,
    speed: state.speed,
    animationState: state.state,
    animationConfig: state.animationConfig,
    typewriter: state.typewriter,
    breathing: state.breathing,
    floating: state.floating,
    transitions: state.transitions,
    voiceIntegration: state.voiceIntegration,
    performance: state.performance,
    keyboard: state.keyboard,

    // Processed data
    displayedLines: processedLines,
    dragonPattern: dragonPatterns[state.pose][state.size],

    // Actions
    setPose,
    setSize,
    setSpeed,
    startTypewriter,
    resetTypewriter,
    updateAnimationConfig: (config: Partial<ASCIIDragonAnimationConfig>) =>
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
    getCurrentPose,
    getCurrentSize,
    getCurrentSpeed,
    getAnimationState,
    isTypewriterActive,
    isTypewriterComplete,
    isTransitioning,
    getTransitionProgress,
    getDisplayedLines,
    getBreathingIntensity,
    getFloatingOffset,
    isVoiceActive: () => state.voiceIntegration.isListening || state.voiceIntegration.isSpeaking || state.voiceIntegration.isProcessing,
    isAnimating: () => state.typewriter.isActive || state.transitions.isTransitioning,
    isIdle: () => state.state === 'idle' && !state.typewriter.isActive && !state.transitions.isTransitioning,

    // Enhanced performance utilities
    shouldReduceQuality,
    shouldDisableAnimations,
    getCurrentLOD,
    getPerformanceMetrics,
    optimizeForPerformance,
    performanceScore: dragonPerformance ? 
      (5 - (dragonPerformance.currentLOD?.level ?? 2)) * 20 : 
      (enablePerformanceMonitoring ? performanceMonitor.performanceScore : 100),
    isHighPerformance: dragonPerformance ? 
      (dragonPerformance.currentLOD?.level ?? 2) < 2 : 
      (enablePerformanceMonitoring ? performanceMonitor.isHighPerformance : true),
    currentLOD: dragonPerformance?.currentLOD || null,
    memoryStats: dragonPerformance?.memoryStats || null,
    maxAnimationQuality,
    targetFPS,
    enableLOD,

    // Reactive streams
    dragonPose$,
    animationState$,
    voiceEvents$,
    typewriterProgress$,

    // Configuration
    enableVoiceIntegration,
    enablePerformanceMonitoring,
    enableKeyboardShortcuts,
    enableAutoTypewriter,
    enableBreathing,
    enableFloating
  }
}

// Utility functions for external use
export const createPoseTransition = (
  fromPose: ASCIIDragonPose,
  toPose: ASCIIDragonPose,
  duration: number = 1000
) => ({
  fromPose,
  toPose,
  duration,
  easing: 'ease-in-out'
})

export const createTypewriterSequence = (
  poses: ASCIIDragonPose[],
  size: ASCIIDragonSize,
  speed: ASCIIDragonSpeed,
  interval: number = 2000
): TE.TaskEither<ASCIIDragonError, void> => {
  return TE.tryCatch(
    async () => {
      const timings = getAnimationTimings(speed)
      for (let i = 0; i < poses.length; i++) {
        await new Promise(resolve => setTimeout(resolve, i * interval))
        logger.debug('🐉 Typewriter sequence step', { pose: poses[i], step: i + 1, size, speed })
      }
    },
    (error) => createASCIIDragonError('TYPEWRITER_ERROR', 'Failed to execute typewriter sequence', error)
  )
}

export const getPoseRecommendation = (
  voiceActive: boolean,
  transcriptLength: number,
  isProcessing: boolean
): ASCIIDragonPose => {
  if (isProcessing) return 'attacking'
  if (voiceActive) {
    if (transcriptLength > 100) return 'flying'
    if (transcriptLength > 50) return 'coiled'
    return 'coiled'
  }
  return 'sleeping'
}

export const getCharacterVariations = (char: string): string[] => {
  const intensityMap: Record<string, string[]> = {
    '~': ['·', '~', '≈', '∼'],
    '|': ['¦', '|', '‖', '║'],
    '-': ['·', '-', '–', '—'],
    '^': ['·', '^', '∧', '▲'],
    'o': ['·', 'o', 'O', '●'],
    '<': ['‹', '<', '‹', '«'],
    '>': ['›', '>', '›', '»']
  }
  
  return intensityMap[char] || [char]
}
'use client'

import { useReducer, useCallback, useEffect, useRef } from 'react'
import type { DragonState, DragonMood, DragonAnimationHookReturn } from '../types'
import { POWER_LEVELS, ANIMATION_TIMING } from '../constants'
import { logger } from '@lib/logger'

type DragonAction = 
  | { type: 'SET_STATE'; state: DragonState }
  | { type: 'SET_MOOD'; mood: DragonMood }
  | { type: 'POWER_UP'; amount?: number }
  | { type: 'POWER_DOWN'; amount?: number }
  | { type: 'SET_POWER_LEVEL'; level: number }
  | { type: 'TRIGGER_SPECIAL'; animation: 'roar' | 'spin' | 'pulse' | 'shake' }
  | { type: 'RESET_TO_IDLE' }
  | { type: 'START_TRANSITION' }
  | { type: 'END_TRANSITION' }
  | { type: 'AWAKENING' }
  | { type: 'SLEEPING' }

interface DragonStateData {
  state: DragonState
  mood: DragonMood
  powerLevel: number
  isTransitioning: boolean
  specialAnimation: string | null
  lastStateChange: number
  breathingRate: number
  attentionTarget: { x: number; y: number } | null
}

const initialState: DragonStateData = {
  state: 'idle',
  mood: 'neutral',
  powerLevel: POWER_LEVELS.minimum,
  isTransitioning: false,
  specialAnimation: null,
  lastStateChange: Date.now(),
  breathingRate: 1.0,
  attentionTarget: null
}

// State transition rules
const getValidTransitions = (currentState: DragonState): DragonState[] => {
  const transitions: Record<DragonState, DragonState[]> = {
    'idle': ['attention', 'arms-crossed', 'sleeping', 'awakening'],
    'attention': ['idle', 'ready', 'arms-crossed'],
    'ready': ['attention', 'active', 'arms-crossed', 'idle'],
    'active': ['ready', 'powering-up', 'idle'],
    'powering-up': ['active', 'ready', 'idle'],
    'arms-crossed': ['ready', 'attention', 'idle'],
    'sleeping': ['awakening', 'idle'],
    'awakening': ['idle', 'attention']
  }
  
  return transitions[currentState] || ['idle']
}

// Mood transitions based on state
const getMoodForState = (state: DragonState): DragonMood => {
  const moodMap: Record<DragonState, DragonMood> = {
    'idle': 'neutral',
    'attention': 'focused',
    'ready': 'confident',
    'active': 'excited',
    'powering-up': 'powerful',
    'arms-crossed': 'confident',
    'sleeping': 'neutral',
    'awakening': 'mystical'
  }
  
  return moodMap[state] || 'neutral'
}

// Breathing rate based on state
const getBreathingRateForState = (state: DragonState): number => {
  const rateMap: Record<DragonState, number> = {
    'idle': 1.0,
    'attention': 1.1,
    'ready': 1.3,
    'active': 1.6,
    'powering-up': 2.0,
    'arms-crossed': 0.8,
    'sleeping': 0.6,
    'awakening': 1.2
  }
  
  return rateMap[state] || 1.0
}

const dragonReducer = (state: DragonStateData, action: DragonAction): DragonStateData => {
  switch (action.type) {
    case 'SET_STATE': {
      const validTransitions = getValidTransitions(state.state)
      if (!validTransitions.includes(action.state)) {
        logger.warn(`Invalid transition from ${state.state} to ${action.state}`)
        return state
      }
      
      return {
        ...state,
        state: action.state,
        mood: getMoodForState(action.state),
        breathingRate: getBreathingRateForState(action.state),
        isTransitioning: true,
        lastStateChange: Date.now()
      }
    }
    
    case 'SET_MOOD':
      return {
        ...state,
        mood: action.mood
      }
    
    case 'POWER_UP': {
      const amount = action.amount || POWER_LEVELS.increments.normal
      const newLevel = Math.min(state.powerLevel + amount, POWER_LEVELS.maximum)
      
      // Auto-transition to powering-up state if crossing threshold
      let newState = state.state
      if (newLevel > POWER_LEVELS.thresholds.extreme && state.state !== 'powering-up') {
        newState = 'powering-up'
      } else if (newLevel > POWER_LEVELS.thresholds.high && state.state === 'idle') {
        newState = 'active'
      }
      
      return {
        ...state,
        powerLevel: newLevel,
        state: newState,
        mood: newLevel > POWER_LEVELS.thresholds.extreme ? 'powerful' : state.mood,
        isTransitioning: newState !== state.state
      }
    }
    
    case 'POWER_DOWN': {
      const amount = action.amount || POWER_LEVELS.increments.normal
      const newLevel = Math.max(state.powerLevel - amount, POWER_LEVELS.minimum)
      
      // Auto-transition to lower states if power decreases
      let newState = state.state
      if (newLevel < POWER_LEVELS.thresholds.medium && state.state === 'powering-up') {
        newState = 'active'
      } else if (newLevel < POWER_LEVELS.thresholds.low && state.state === 'active') {
        newState = 'ready'
      }
      
      return {
        ...state,
        powerLevel: newLevel,
        state: newState,
        isTransitioning: newState !== state.state
      }
    }
    
    case 'SET_POWER_LEVEL':
      return {
        ...state,
        powerLevel: Math.max(POWER_LEVELS.minimum, Math.min(POWER_LEVELS.maximum, action.level))
      }
    
    case 'TRIGGER_SPECIAL':
      return {
        ...state,
        specialAnimation: action.animation,
        isTransitioning: true
      }
    
    case 'RESET_TO_IDLE':
      return {
        ...state,
        state: 'idle',
        mood: 'neutral',
        breathingRate: 1.0,
        specialAnimation: null,
        isTransitioning: true,
        lastStateChange: Date.now()
      }
    
    case 'START_TRANSITION':
      return {
        ...state,
        isTransitioning: true
      }
    
    case 'END_TRANSITION':
      return {
        ...state,
        isTransitioning: false,
        specialAnimation: null
      }
    
    case 'AWAKENING':
      return {
        ...state,
        state: 'awakening',
        mood: 'mystical',
        breathingRate: 1.2,
        isTransitioning: true,
        lastStateChange: Date.now()
      }
    
    case 'SLEEPING':
      return {
        ...state,
        state: 'sleeping',
        mood: 'neutral',
        breathingRate: 0.6,
        isTransitioning: true,
        lastStateChange: Date.now()
      }
    
    default:
      return state
  }
}

export function useDragonStateMachine(
  initialDragonState: DragonState = 'idle',
  autoIdleTimeout: number = ANIMATION_TIMING.idleTimeout
): DragonAnimationHookReturn {
  const [dragonData, dispatch] = useReducer(dragonReducer, {
    ...initialState,
    state: initialDragonState,
    mood: getMoodForState(initialDragonState),
    breathingRate: getBreathingRateForState(initialDragonState)
  })

  // Auto-idle timeout ref
  const idleTimeoutRef = useRef<NodeJS.Timeout>()
  const transitionTimeoutRef = useRef<NodeJS.Timeout>()

  // Auto-clear transition flag
  useEffect(() => {
    if (dragonData.isTransitioning) {
      transitionTimeoutRef.current = setTimeout(() => {
        dispatch({ type: 'END_TRANSITION' })
      }, ANIMATION_TIMING.stateTransition)
    }

    return () => {
      if (transitionTimeoutRef.current) {
        clearTimeout(transitionTimeoutRef.current)
      }
    }
  }, [dragonData.isTransitioning])

  // Auto-idle timeout
  useEffect(() => {
    if (dragonData.state !== 'idle' && dragonData.state !== 'sleeping') {
      if (idleTimeoutRef.current) {
        clearTimeout(idleTimeoutRef.current)
      }

      idleTimeoutRef.current = setTimeout(() => {
        dispatch({ type: 'RESET_TO_IDLE' })
      }, autoIdleTimeout)
    }

    return () => {
      if (idleTimeoutRef.current) {
        clearTimeout(idleTimeoutRef.current)
      }
    }
  }, [dragonData.state, dragonData.lastStateChange, autoIdleTimeout])

  // Mock performance metrics (would be real in production)
  const performanceMetrics = {
    fps: 60,
    frameDrops: 0,
    averageFrameTime: 16.67,
    memoryUsage: 0.3,
    gpuUtilization: 0.2,
    lastUpdated: Date.now()
  }

  // Actions
  const actions = {
    setState: useCallback((state: DragonState) => {
      dispatch({ type: 'SET_STATE', state })
    }, []),

    setMood: useCallback((mood: DragonMood) => {
      dispatch({ type: 'SET_MOOD', mood })
    }, []),

    powerUp: useCallback((amount?: number) => {
      dispatch({ type: 'POWER_UP', amount })
    }, []),

    powerDown: useCallback((amount?: number) => {
      dispatch({ type: 'POWER_DOWN', amount })
    }, []),

    triggerSpecialAnimation: useCallback((type: 'roar' | 'spin' | 'pulse' | 'shake') => {
      dispatch({ type: 'TRIGGER_SPECIAL', animation: type })
    }, []),

    resetToIdle: useCallback(() => {
      dispatch({ type: 'RESET_TO_IDLE' })
    }, [])
  }

  return {
    state: dragonData.state,
    mood: dragonData.mood,
    powerLevel: dragonData.powerLevel,
    isTransitioning: dragonData.isTransitioning,
    performanceMetrics,
    actions
  }
}

// Advanced state machine with time-based transitions
export function useAdvancedDragonStateMachine(options: {
  initialState?: DragonState
  autoStates?: boolean
  interactionTimeout?: number
  sleepTimeout?: number
}) {
  const {
    initialState = 'idle',
    autoStates = true,
    interactionTimeout = ANIMATION_TIMING.idleTimeout,
    sleepTimeout = 30000 // 30 seconds of inactivity
  } = options

  const stateMachine = useDragonStateMachine(initialState, interactionTimeout)
  const lastInteractionRef = useRef(Date.now())
  const sleepTimeoutRef = useRef<NodeJS.Timeout>()

  // Track interactions
  const recordInteraction = useCallback(() => {
    lastInteractionRef.current = Date.now()
    
    // Clear sleep timeout on interaction
    if (sleepTimeoutRef.current) {
      clearTimeout(sleepTimeoutRef.current)
    }

    // Wake up if sleeping
    if (stateMachine.state === 'sleeping') {
      stateMachine.actions.setState('awakening')
    }
  }, [stateMachine.state, stateMachine.actions])

  // Auto-sleep after long inactivity
  useEffect(() => {
    if (!autoStates) return

    const checkForSleep = () => {
      const timeSinceInteraction = Date.now() - lastInteractionRef.current
      
      if (timeSinceInteraction > sleepTimeout && stateMachine.state === 'idle') {
        stateMachine.actions.setState('sleeping')
      }
    }

    sleepTimeoutRef.current = setTimeout(checkForSleep, sleepTimeout)

    return () => {
      if (sleepTimeoutRef.current) {
        clearTimeout(sleepTimeoutRef.current)
      }
    }
  }, [autoStates, sleepTimeout, stateMachine.state, stateMachine.actions])

  return {
    ...stateMachine,
    recordInteraction,
    timeSinceLastInteraction: () => Date.now() - lastInteractionRef.current
  }
}
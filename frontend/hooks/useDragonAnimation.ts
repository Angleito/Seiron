'use client'

import { useEffect, useReducer, useCallback, useRef } from 'react'
import { useAnimation } from 'framer-motion'
import * as O from 'fp-ts/Option'
import { pipe } from 'fp-ts/function'

// Use ReturnType to infer the type from useAnimation hook
type AnimationControls = ReturnType<typeof useAnimation>

export type DragonState = 'idle' | 'attention' | 'ready' | 'active' | 'sleeping' | 'awakening'
export type DragonMood = 'neutral' | 'happy' | 'excited' | 'powerful' | 'mystical'

interface DragonAnimationConfig {
  enableAutoState?: boolean
  enableProximityDetection?: boolean
  proximityThreshold?: number
  enableTimeBasedStates?: boolean
}

interface DragonAnimationState {
  dragonState: DragonState
  dragonMood: DragonMood
  powerLevel: number
  isCharging: boolean
  lastTransitionTime: number
  activeTimeouts: number[]
  activeIntervals: number[]
}

// Action types for the reducer
export type DragonAnimationAction =
  | { type: 'SET_DRAGON_STATE'; payload: DragonState }
  | { type: 'SET_DRAGON_MOOD'; payload: DragonMood }
  | { type: 'SET_POWER_LEVEL'; payload: number }
  | { type: 'SET_IS_CHARGING'; payload: boolean }
  | { type: 'INCREMENT_POWER'; payload: number }
  | { type: 'DECREMENT_POWER'; payload: number }
  | { type: 'ADD_TIMEOUT'; payload: number }
  | { type: 'ADD_INTERVAL'; payload: number }
  | { type: 'CLEAR_TIMEOUTS' }
  | { type: 'CLEAR_INTERVALS' }
  | { type: 'UPDATE_TRANSITION_TIME' }
  | { type: 'RESET_STATE' }

interface DragonAnimationReturn {
  dragonState: DragonState
  dragonMood: DragonMood
  controls: AnimationControls
  setDragonState: (state: DragonState) => void
  setDragonMood: (mood: DragonMood) => void
  triggerSpecialAnimation: (animation: string) => void
  powerLevel: number
  isCharging: boolean
  // Functional getters
  canTransition: () => boolean
  getStateHistory: () => DragonState[]
  getPowerPercentage: () => number
}

// Dragon Animation Reducer
const dragonAnimationReducer = (
  state: DragonAnimationState,
  action: DragonAnimationAction
): DragonAnimationState => {
  switch (action.type) {
    case 'SET_DRAGON_STATE':
      return {
        ...state,
        dragonState: action.payload,
        lastTransitionTime: Date.now()
      }
    case 'SET_DRAGON_MOOD':
      return {
        ...state,
        dragonMood: action.payload
      }
    case 'SET_POWER_LEVEL':
      return {
        ...state,
        powerLevel: Math.max(0, Math.min(100, action.payload))
      }
    case 'SET_IS_CHARGING':
      return {
        ...state,
        isCharging: action.payload
      }
    case 'INCREMENT_POWER':
      return {
        ...state,
        powerLevel: Math.min(100, state.powerLevel + action.payload)
      }
    case 'DECREMENT_POWER':
      return {
        ...state,
        powerLevel: Math.max(0, state.powerLevel - action.payload)
      }
    case 'ADD_TIMEOUT':
      return {
        ...state,
        activeTimeouts: [...state.activeTimeouts, action.payload]
      }
    case 'ADD_INTERVAL':
      return {
        ...state,
        activeIntervals: [...state.activeIntervals, action.payload]
      }
    case 'CLEAR_TIMEOUTS':
      return {
        ...state,
        activeTimeouts: []
      }
    case 'CLEAR_INTERVALS':
      return {
        ...state,
        activeIntervals: []
      }
    case 'UPDATE_TRANSITION_TIME':
      return {
        ...state,
        lastTransitionTime: Date.now()
      }
    case 'RESET_STATE':
      return initialDragonState
    default:
      return state
  }
}

// Initial state
const initialDragonState: DragonAnimationState = {
  dragonState: 'idle',
  dragonMood: 'neutral',
  powerLevel: 0,
  isCharging: false,
  lastTransitionTime: Date.now(),
  activeTimeouts: [],
  activeIntervals: []
}

export function useDragonAnimation({
  enableAutoState = true,
  enableProximityDetection = true,
  proximityThreshold = 300,
  enableTimeBasedStates = true
}: DragonAnimationConfig = {}): DragonAnimationReturn {
  const [state, dispatch] = useReducer(dragonAnimationReducer, initialDragonState)
  const controls = useAnimation()
  const timeoutRefs = useRef<NodeJS.Timeout[]>([])
  const intervalRefs = useRef<NodeJS.Timeout[]>([])
  const stateHistoryRef = useRef<DragonState[]>(['idle'])

  // Time-based state changes
  useEffect(() => {
    if (!enableTimeBasedStates) return

    const checkTime = () => {
      const hour = new Date().getHours()
      
      // Dragon sleeps late at night (11 PM - 5 AM)
      if (hour >= 23 || hour < 5) {
        dispatch({ type: 'SET_DRAGON_STATE', payload: 'sleeping' })
        dispatch({ type: 'SET_DRAGON_MOOD', payload: 'neutral' })
      } 
      // Dragon awakens in the morning (5 AM - 7 AM)
      else if (hour >= 5 && hour < 7) {
        dispatch({ type: 'SET_DRAGON_STATE', payload: 'awakening' })
        dispatch({ type: 'SET_DRAGON_MOOD', payload: 'happy' })
      }
      // Dragon is most active during day (9 AM - 5 PM)
      else if (hour >= 9 && hour < 17) {
        dispatch({ type: 'SET_DRAGON_MOOD', payload: 'excited' })
      }
      // Dragon is mystical during twilight (6 PM - 8 PM)
      else if (hour >= 18 && hour < 20) {
        dispatch({ type: 'SET_DRAGON_MOOD', payload: 'mystical' })
      }
    }

    checkTime()
    const interval = setInterval(checkTime, 60000) // Check every minute
    intervalRefs.current.push(interval)
    
    return () => {
      clearInterval(interval)
      const index = intervalRefs.current.indexOf(interval)
      if (index > -1) {
        intervalRefs.current.splice(index, 1)
      }
    }
  }, [enableTimeBasedStates])

  // Auto state transitions
  useEffect(() => {
    if (!enableAutoState || state.dragonState === 'sleeping') return

    const stateTransitions = {
      idle: () => {
        const random = Math.random()
        if (random < 0.1) {
          dispatch({ type: 'SET_DRAGON_STATE', payload: 'attention' })
          const timeout = setTimeout(() => {
            dispatch({ type: 'SET_DRAGON_STATE', payload: 'idle' })
          }, 3000)
          timeoutRefs.current.push(timeout)
        }
      },
      attention: () => {
        const random = Math.random()
        if (random < 0.3) {
          dispatch({ type: 'SET_DRAGON_STATE', payload: 'ready' })
        } else if (random < 0.1) {
          dispatch({ type: 'SET_DRAGON_STATE', payload: 'idle' })
        }
      },
      ready: () => {
        const random = Math.random()
        if (random < 0.2) {
          dispatch({ type: 'SET_DRAGON_STATE', payload: 'active' })
          dispatch({ type: 'SET_IS_CHARGING', payload: true })
          const timeout = setTimeout(() => {
            dispatch({ type: 'SET_IS_CHARGING', payload: false })
            dispatch({ type: 'SET_DRAGON_STATE', payload: 'idle' })
          }, 5000)
          timeoutRefs.current.push(timeout)
        }
      }
    }

    const transition = stateTransitions[state.dragonState as keyof typeof stateTransitions]
    if (transition) {
      const timeout = setTimeout(transition, 3000 + Math.random() * 4000)
      timeoutRefs.current.push(timeout)
      
      return () => {
        clearTimeout(timeout)
        const index = timeoutRefs.current.indexOf(timeout)
        if (index > -1) {
          timeoutRefs.current.splice(index, 1)
        }
      }
    }
  }, [state.dragonState, enableAutoState])

  // Power level management
  useEffect(() => {
    if (state.dragonState === 'active' && state.isCharging) {
      const interval = setInterval(() => {
        dispatch({ type: 'INCREMENT_POWER', payload: 10 })
      }, 100)
      intervalRefs.current.push(interval)
      
      return () => {
        clearInterval(interval)
        const index = intervalRefs.current.indexOf(interval)
        if (index > -1) {
          intervalRefs.current.splice(index, 1)
        }
      }
    } else {
      const interval = setInterval(() => {
        dispatch({ type: 'DECREMENT_POWER', payload: 5 })
      }, 200)
      intervalRefs.current.push(interval)
      
      return () => {
        clearInterval(interval)
        const index = intervalRefs.current.indexOf(interval)
        if (index > -1) {
          intervalRefs.current.splice(index, 1)
        }
      }
    }
  }, [state.dragonState, state.isCharging])

  // Trigger special animations based on state and mood
  useEffect(() => {
    const animationConfig = {
      idle: {
        neutral: { scale: 1, rotate: 0 },
        happy: { scale: 1.05, rotate: [0, 2, -2, 0] },
        excited: { scale: [1, 1.1, 1], rotate: [0, 5, -5, 0] },
        powerful: { scale: 1.1, rotate: 0 },
        mystical: { scale: 1, rotate: [0, 360] }
      },
      attention: {
        neutral: { scale: 1.05, rotate: 0 },
        happy: { scale: 1.1, rotate: 2 },
        excited: { scale: 1.15, rotate: [-2, 2] },
        powerful: { scale: 1.2, rotate: 0 },
        mystical: { scale: 1.05, rotate: [0, 180, 360] }
      },
      ready: {
        neutral: { scale: [1.05, 1.1, 1.05], rotate: 0 },
        happy: { scale: [1.1, 1.15, 1.1], rotate: [0, 5, 0] },
        excited: { scale: [1.1, 1.2, 1.1], rotate: [-5, 5] },
        powerful: { scale: [1.15, 1.25, 1.15], rotate: 0 },
        mystical: { scale: [1.05, 1.15, 1.05], rotate: [0, 90, 180, 270, 360] }
      },
      active: {
        neutral: { scale: [1.1, 1.2, 1.1], rotate: [-5, 5] },
        happy: { scale: [1.15, 1.25, 1.15], rotate: [-10, 10] },
        excited: { scale: [1.2, 1.3, 1.2], rotate: [-15, 15] },
        powerful: { scale: [1.25, 1.35, 1.25], rotate: [-20, 20] },
        mystical: { scale: [1.1, 1.3, 1.1], rotate: [0, 720] }
      },
      sleeping: {
        neutral: { scale: 0.9, rotate: 0 },
        happy: { scale: 0.9, rotate: 0 },
        excited: { scale: 0.9, rotate: 0 },
        powerful: { scale: 0.9, rotate: 0 },
        mystical: { scale: 0.9, rotate: 0 }
      },
      awakening: {
        neutral: { scale: [0.9, 1, 0.95, 1], rotate: 0 },
        happy: { scale: [0.9, 1.05, 1], rotate: [0, 5, 0] },
        excited: { scale: [0.9, 1.1, 1.05], rotate: [-5, 5, 0] },
        powerful: { scale: [0.9, 1.1, 1], rotate: 0 },
        mystical: { scale: [0.9, 1, 1.05, 1], rotate: [0, 360] }
      }
    }

    const config = animationConfig[state.dragonState]?.[state.dragonMood]
    if (config) {
      controls.start({
        ...config,
        transition: {
          duration: state.dragonState === 'active' ? 2 : 3,
          repeat: state.dragonState === 'active' || state.dragonState === 'ready' ? Infinity : 0,
          ease: "easeInOut"
        }
      })
    }
  }, [state.dragonState, state.dragonMood, controls])

  // Special animation triggers
  const triggerSpecialAnimation = useCallback((animation: string) => {
    switch (animation) {
      case 'roar':
        controls.start({
          scale: [1, 1.5, 1.3, 1],
          rotate: [0, -10, 10, 0],
          transition: { duration: 1, ease: "easeOut" }
        })
        break
      case 'spin':
        controls.start({
          rotate: [0, 360, 720],
          scale: [1, 1.2, 1],
          transition: { duration: 2, ease: "easeInOut" }
        })
        break
      case 'pulse':
        controls.start({
          scale: [1, 1.2, 0.8, 1.3, 1],
          transition: { duration: 1.5, ease: "easeInOut" }
        })
        break
      case 'shake':
        controls.start({
          x: [-10, 10, -10, 10, 0],
          rotate: [-5, 5, -5, 5, 0],
          transition: { duration: 0.5, ease: "easeOut" }
        })
        break
      case 'powerUp':
        dispatch({ type: 'SET_IS_CHARGING', payload: true })
        controls.start({
          scale: [1, 1.5, 1.3],
          filter: [
            "brightness(1) hue-rotate(0deg)",
            "brightness(2) hue-rotate(360deg)",
            "brightness(1.5) hue-rotate(180deg)"
          ],
          transition: { duration: 3, ease: "easeInOut" }
        })
        const timeout = setTimeout(() => {
          dispatch({ type: 'SET_IS_CHARGING', payload: false })
        }, 3000)
        timeoutRefs.current.push(timeout)
        break
    }
  }, [controls])

  // Cleanup effect for component unmount
  useEffect(() => {
    return () => {
      // Clear all timeouts
      timeoutRefs.current.forEach(timeout => {
        clearTimeout(timeout)
      })
      timeoutRefs.current = []
      
      // Clear all intervals
      intervalRefs.current.forEach(interval => {
        clearInterval(interval)
      })
      intervalRefs.current = []
      
      // Stop any ongoing animations
      controls.stop()
    }
  }, [])

  // Action creators
  const setDragonState = useCallback((newState: DragonState) => {
    stateHistoryRef.current.push(newState)
    if (stateHistoryRef.current.length > 10) {
      stateHistoryRef.current = stateHistoryRef.current.slice(-10)
    }
    dispatch({ type: 'SET_DRAGON_STATE', payload: newState })
  }, [])

  const setDragonMood = useCallback((mood: DragonMood) => {
    dispatch({ type: 'SET_DRAGON_MOOD', payload: mood })
  }, [])

  // Functional getters
  const canTransition = useCallback(() => {
    const timeSinceLastTransition = Date.now() - state.lastTransitionTime
    return timeSinceLastTransition > 1000 // Minimum 1 second between transitions
  }, [state.lastTransitionTime])

  const getStateHistory = useCallback(() => {
    return [...stateHistoryRef.current]
  }, [])

  const getPowerPercentage = useCallback(() => {
    return state.powerLevel / 100
  }, [state.powerLevel])

  return {
    dragonState: state.dragonState,
    dragonMood: state.dragonMood,
    controls,
    setDragonState,
    setDragonMood,
    triggerSpecialAnimation,
    powerLevel: state.powerLevel,
    isCharging: state.isCharging,
    // Functional getters
    canTransition,
    getStateHistory,
    getPowerPercentage
  }
}
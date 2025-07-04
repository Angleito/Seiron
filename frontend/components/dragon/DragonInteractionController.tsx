'use client'

import React, { createContext, useContext, useReducer, useEffect, useRef, useCallback } from 'react'
import { useMouseTracking } from '@/hooks/useMouseTracking'
import { useTouchGestures } from '@/hooks/useTouchGestures'
import { useAnimationPerformance } from '@/hooks/useAnimationPerformance'

// Dragon interaction states
export type DragonState = 'idle' | 'attention' | 'ready' | 'active'

// Interaction intensity levels
export type InteractionIntensity = 'low' | 'medium' | 'high' | 'max'

// Dragon interaction context type
interface DragonInteractionState {
  state: DragonState
  intensity: InteractionIntensity
  orientation: { x: number; y: number }
  isHovered: boolean
  isTouching: boolean
  lastInteractionTime: number
  performanceMode: 'full' | 'reduced' | 'minimal'
}

interface DragonInteractionActions {
  setState: (state: DragonState) => void
  setIntensity: (intensity: InteractionIntensity) => void
  setOrientation: (orientation: { x: number; y: number }) => void
  setHovered: (isHovered: boolean) => void
  setTouching: (isTouching: boolean) => void
  updateLastInteraction: () => void
  setPerformanceMode: (mode: 'full' | 'reduced' | 'minimal') => void
}

type DragonInteractionContextType = DragonInteractionState & DragonInteractionActions

// Action types for reducer
type DragonAction =
  | { type: 'SET_STATE'; payload: DragonState }
  | { type: 'SET_INTENSITY'; payload: InteractionIntensity }
  | { type: 'SET_ORIENTATION'; payload: { x: number; y: number } }
  | { type: 'SET_HOVERED'; payload: boolean }
  | { type: 'SET_TOUCHING'; payload: boolean }
  | { type: 'UPDATE_LAST_INTERACTION' }
  | { type: 'SET_PERFORMANCE_MODE'; payload: 'full' | 'reduced' | 'minimal' }

// Initial state
const initialState: DragonInteractionState = {
  state: 'idle',
  intensity: 'low',
  orientation: { x: 0, y: 0 },
  isHovered: false,
  isTouching: false,
  lastInteractionTime: Date.now(),
  performanceMode: 'full'
}

// Reducer function
function dragonReducer(state: DragonInteractionState, action: DragonAction): DragonInteractionState {
  switch (action.type) {
    case 'SET_STATE':
      return { ...state, state: action.payload }
    case 'SET_INTENSITY':
      return { ...state, intensity: action.payload }
    case 'SET_ORIENTATION':
      return { ...state, orientation: action.payload }
    case 'SET_HOVERED':
      return { ...state, isHovered: action.payload }
    case 'SET_TOUCHING':
      return { ...state, isTouching: action.payload }
    case 'UPDATE_LAST_INTERACTION':
      return { ...state, lastInteractionTime: Date.now() }
    case 'SET_PERFORMANCE_MODE':
      return { ...state, performanceMode: action.payload }
    default:
      return state
  }
}

// Context
const DragonInteractionContext = createContext<DragonInteractionContextType | null>(null)

// State transition thresholds
const IDLE_TIMEOUT = 5000 // Return to idle after 5 seconds
const ATTENTION_DISTANCE = 300 // Distance in pixels to trigger attention
const READY_DISTANCE = 150 // Distance to trigger ready state
const ACTIVE_DISTANCE = 50 // Distance to trigger active state

// Intensity calculation based on distance
function calculateIntensity(distance: number): InteractionIntensity {
  if (distance < 50) return 'max'
  if (distance < 100) return 'high'
  if (distance < 200) return 'medium'
  return 'low'
}

// State calculation based on distance and interaction
function calculateState(
  distance: number,
  isInteracting: boolean,
  currentState: DragonState
): DragonState {
  if (isInteracting) return 'active'
  
  if (distance < ACTIVE_DISTANCE) {
    return 'active'
  } else if (distance < READY_DISTANCE) {
    return 'ready'
  } else if (distance < ATTENTION_DISTANCE) {
    return 'attention'
  }
  
  // Add hysteresis to prevent rapid state changes
  if (currentState !== 'idle' && distance < ATTENTION_DISTANCE * 1.2) {
    return currentState
  }
  
  return 'idle'
}

interface DragonInteractionProviderProps {
  children: React.ReactNode
  dragonRef?: React.RefObject<HTMLElement>
}

export function DragonInteractionProvider({ 
  children, 
  dragonRef 
}: DragonInteractionProviderProps) {
  const [state, dispatch] = useReducer(dragonReducer, initialState)
  const idleTimeoutRef = useRef<NodeJS.Timeout>()
  
  // Performance optimization
  const { performanceMode } = useAnimationPerformance()
  
  // Mouse tracking
  const { mousePosition, isMouseActive } = useMouseTracking(dragonRef)
  
  // Touch gestures
  const { 
    isTouching, 
    touchPosition, 
    gesture 
  } = useTouchGestures(dragonRef)
  
  // Update performance mode
  useEffect(() => {
    dispatch({ type: 'SET_PERFORMANCE_MODE', payload: performanceMode })
  }, [performanceMode])
  
  // Calculate distance and orientation
  useEffect(() => {
    if (!dragonRef?.current) return
    
    const dragonRect = dragonRef.current.getBoundingClientRect()
    const dragonCenter = {
      x: dragonRect.left + dragonRect.width / 2,
      y: dragonRect.top + dragonRect.height / 2
    }
    
    // Use touch position if touching, otherwise mouse position
    const interactionPoint = isTouching ? touchPosition : mousePosition
    
    // Calculate distance
    const distance = Math.sqrt(
      Math.pow(interactionPoint.x - dragonCenter.x, 2) +
      Math.pow(interactionPoint.y - dragonCenter.y, 2)
    )
    
    // Calculate orientation (normalized direction vector)
    const orientation = {
      x: (interactionPoint.x - dragonCenter.x) / distance || 0,
      y: (interactionPoint.y - dragonCenter.y) / distance || 0
    }
    
    // Update orientation with smoothing
    dispatch({ 
      type: 'SET_ORIENTATION', 
      payload: orientation 
    })
    
    // Update intensity
    const intensity = calculateIntensity(distance)
    dispatch({ type: 'SET_INTENSITY', payload: intensity })
    
    // Update state
    const isInteracting = isTouching || (isMouseActive && distance < ACTIVE_DISTANCE)
    const newState = calculateState(distance, isInteracting, state.state)
    
    if (newState !== state.state) {
      dispatch({ type: 'SET_STATE', payload: newState })
    }
    
    // Update interaction time
    if (isInteracting || distance < ATTENTION_DISTANCE) {
      dispatch({ type: 'UPDATE_LAST_INTERACTION' })
    }
  }, [mousePosition, touchPosition, isTouching, isMouseActive, dragonRef, state.state])
  
  // Handle idle timeout
  useEffect(() => {
    // Clear existing timeout
    if (idleTimeoutRef.current) {
      clearTimeout(idleTimeoutRef.current)
    }
    
    // Set new timeout if not idle
    if (state.state !== 'idle') {
      idleTimeoutRef.current = setTimeout(() => {
        const timeSinceLastInteraction = Date.now() - state.lastInteractionTime
        if (timeSinceLastInteraction >= IDLE_TIMEOUT) {
          dispatch({ type: 'SET_STATE', payload: 'idle' })
        }
      }, IDLE_TIMEOUT)
    }
    
    return () => {
      if (idleTimeoutRef.current) {
        clearTimeout(idleTimeoutRef.current)
      }
    }
  }, [state.state, state.lastInteractionTime])
  
  // Update touch state
  useEffect(() => {
    dispatch({ type: 'SET_TOUCHING', payload: isTouching })
  }, [isTouching])
  
  // Handle gestures
  useEffect(() => {
    if (!gesture) return
    
    switch (gesture.type) {
      case 'tap':
        dispatch({ type: 'SET_STATE', payload: 'active' })
        dispatch({ type: 'UPDATE_LAST_INTERACTION' })
        break
      case 'hold':
        dispatch({ type: 'SET_STATE', payload: 'ready' })
        dispatch({ type: 'SET_INTENSITY', payload: 'high' })
        break
      case 'swipe':
        // Handle swipe gestures if needed
        dispatch({ type: 'UPDATE_LAST_INTERACTION' })
        break
    }
  }, [gesture])
  
  // Action creators
  const actions: DragonInteractionActions = {
    setState: useCallback((newState: DragonState) => {
      dispatch({ type: 'SET_STATE', payload: newState })
    }, []),
    setIntensity: useCallback((intensity: InteractionIntensity) => {
      dispatch({ type: 'SET_INTENSITY', payload: intensity })
    }, []),
    setOrientation: useCallback((orientation: { x: number; y: number }) => {
      dispatch({ type: 'SET_ORIENTATION', payload: orientation })
    }, []),
    setHovered: useCallback((isHovered: boolean) => {
      dispatch({ type: 'SET_HOVERED', payload: isHovered })
    }, []),
    setTouching: useCallback((isTouching: boolean) => {
      dispatch({ type: 'SET_TOUCHING', payload: isTouching })
    }, []),
    updateLastInteraction: useCallback(() => {
      dispatch({ type: 'UPDATE_LAST_INTERACTION' })
    }, []),
    setPerformanceMode: useCallback((mode: 'full' | 'reduced' | 'minimal') => {
      dispatch({ type: 'SET_PERFORMANCE_MODE', payload: mode })
    }, [])
  }
  
  const contextValue: DragonInteractionContextType = {
    ...state,
    ...actions
  }
  
  return (
    <DragonInteractionContext.Provider value={contextValue}>
      {children}
    </DragonInteractionContext.Provider>
  )
}

// Hook to use dragon interaction context
export function useDragonInteraction() {
  const context = useContext(DragonInteractionContext)
  if (!context) {
    throw new Error('useDragonInteraction must be used within DragonInteractionProvider')
  }
  return context
}

// Utility hook for dragon animation classes
export function useDragonAnimationClasses() {
  const { state, intensity, performanceMode } = useDragonInteraction()
  
  const baseClasses = ['transition-all', 'duration-300']
  
  // State-based classes
  const stateClasses = {
    idle: ['animate-dragon-float'],
    attention: ['animate-dragon-float', 'scale-105'],
    ready: ['animate-dragon-float', 'scale-110', 'dragon-fire'],
    active: ['scale-115', 'dragon-fire', 'power-surge']
  }
  
  // Intensity-based classes
  const intensityClasses = {
    low: [],
    medium: ['mystical-glow'],
    high: ['mystical-glow', 'dragon-breath'],
    max: ['mystical-glow', 'dragon-breath', 'cosmic-glow']
  }
  
  // Performance-based adjustments
  if (performanceMode === 'minimal') {
    return baseClasses
  }
  
  if (performanceMode === 'reduced') {
    return [...baseClasses, ...stateClasses[state].slice(0, 1)]
  }
  
  return [
    ...baseClasses,
    ...stateClasses[state],
    ...intensityClasses[intensity]
  ]
}
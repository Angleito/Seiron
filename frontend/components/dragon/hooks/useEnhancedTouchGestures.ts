'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { useTouchGestures } from './useTouchGestures'
import type { 
  TouchGesture, 
  DragonPart,
  EnhancedTouchGestureReturn 
} from '../types'
import { pipe } from 'fp-ts/function'
import * as O from 'fp-ts/Option'

interface UseEnhancedTouchGesturesOptions {
  enabled?: boolean
  onSVGPartTouch?: (part: DragonPart, gesture: TouchGesture) => void
  onDragonBallTouch?: (ballId: number, gesture: TouchGesture) => void
  onGestureRecognized?: (gesture: TouchGesture, context: TouchGestureContext) => void
  enableHapticFeedback?: boolean
  enableGestureTrails?: boolean
  touchTargetExpansion?: number
  multiTouchEnabled?: boolean
}

interface TouchGestureContext {
  targetPart: DragonPart | null
  dragonBallId: number | null
  gestureSequence: TouchGesture[]
  isSequentialGesture: boolean
  contextualData: Record<string, unknown>
}

interface GestureTrail {
  id: string
  points: Array<{ x: number; y: number; timestamp: number }>
  color: string
  opacity: number
  width: number
}

interface MultiTouchState {
  activeTouches: Map<number, { x: number; y: number; part: DragonPart | null }>
  gestureInProgress: boolean
  simultaneousGestures: TouchGesture[]
}

export function useEnhancedTouchGestures({
  enabled = true,
  onSVGPartTouch,
  onDragonBallTouch,
  onGestureRecognized,
  enableHapticFeedback = true,
  enableGestureTrails = false,
  multiTouchEnabled = true
}: UseEnhancedTouchGesturesOptions = {}): EnhancedTouchGestureReturn & {
  gestureTrails: GestureTrail[]
  multiTouchState: MultiTouchState
  specialGestures: {
    isDrawingCircle: boolean
    isDrawingZigzag: boolean
    isDragonSymbol: boolean
  }
  performanceMetrics: {
    gestureLatency: number
    touchAccuracy: number
    recognitionRate: number
  }
} {
  // Enhanced state management
  const [gestureTrails, setGestureTrails] = useState<GestureTrail[]>([])
  const [multiTouchState, setMultiTouchState] = useState<MultiTouchState>({
    activeTouches: new Map(),
    gestureInProgress: false,
    simultaneousGestures: []
  })
  const [gestureContext, setGestureContext] = useState<TouchGestureContext>({
    targetPart: null,
    dragonBallId: null,
    gestureSequence: [],
    isSequentialGesture: false,
    contextualData: {}
  })
  const [specialGestures, setSpecialGestures] = useState({
    isDrawingCircle: false,
    isDrawingZigzag: false,
    isDragonSymbol: false
  })
  const [performanceMetrics, setPerformanceMetrics] = useState({
    gestureLatency: 0,
    touchAccuracy: 0,
    recognitionRate: 0
  })

  // Refs for performance tracking
  const gestureStartTimeRef = useRef<number>(0)
  const accuracyCounterRef = useRef({ total: 0, successful: 0 })
  const trailCleanupRef = useRef<NodeJS.Timeout>()

  // Base touch gestures hook
  const baseTouchGestures = useTouchGestures({
    enabled,
    onTap: (gesture) => handleEnhancedGesture(gesture, 'tap'),
    onLongPress: (gesture) => handleEnhancedGesture(gesture, 'long-press'),
    onSwipe: (gesture) => handleEnhancedGesture(gesture, 'swipe'),
    onPinch: (gesture) => handleEnhancedGesture(gesture, 'pinch'),
    onRotate: (gesture) => handleEnhancedGesture(gesture, 'rotate'),
    longPressDuration: 600,
    swipeThreshold: 30,
    pinchThreshold: 15,
    rotateThreshold: 20
  })

  // Enhanced SVG element detection
  const getSVGElementAtPosition = useCallback((x: number, y: number): {
    part: DragonPart | null
    dragonBallId: number | null
    element: Element | null
  } => {
    const elements = document.elementsFromPoint(x, y)
    
    for (const element of elements) {
      // Check for dragon parts
      const partAttr = element.getAttribute('data-dragon-part')
      if (partAttr) {
        return {
          part: partAttr as DragonPart,
          dragonBallId: null,
          element
        }
      }

      // Check for dragon balls
      const ballIdAttr = element.getAttribute('data-dragon-ball-id')
      if (ballIdAttr) {
        return {
          part: 'dragon-ball',
          dragonBallId: parseInt(ballIdAttr, 10),
          element
        }
      }

      // Check SVG class names for fallback detection
      const classList = element.classList
      if (classList.contains('dragon-head')) return { part: 'head', dragonBallId: null, element }
      if (classList.contains('dragon-eye-left')) return { part: 'left-eye', dragonBallId: null, element }
      if (classList.contains('dragon-eye-right')) return { part: 'right-eye', dragonBallId: null, element }
      if (classList.contains('dragon-body')) return { part: 'body', dragonBallId: null, element }
      if (classList.contains('dragon-arm-left')) return { part: 'left-arm', dragonBallId: null, element }
      if (classList.contains('dragon-arm-right')) return { part: 'right-arm', dragonBallId: null, element }
      if (classList.contains('dragon-leg-left')) return { part: 'left-leg', dragonBallId: null, element }
      if (classList.contains('dragon-leg-right')) return { part: 'right-leg', dragonBallId: null, element }
      if (classList.contains('dragon-tail')) return { part: 'tail', dragonBallId: null, element }
      if (classList.contains('dragon-wings')) return { part: 'wings', dragonBallId: null, element }
    }

    return { part: null, dragonBallId: null, element: null }
  }, [])

  // Enhanced haptic feedback with part-specific patterns
  const triggerEnhancedHapticFeedback = useCallback((type: string, part?: DragonPart | null) => {
    if (!enableHapticFeedback || !('vibrate' in navigator)) return

    const getHapticPattern = (type: string, part?: DragonPart | null): number[] => {
      // Base patterns
      const basePatterns: Record<string, number[]> = {
        'tap': [20],
        'long-press': [50, 20, 50],
        'swipe': [30],
        'pinch': [40, 10, 40],
        'rotate': [60],
        'success': [100, 50, 100],
        'error': [200, 100, 200, 100, 200]
      }

      // Part-specific modifications
      const partModifiers: Record<DragonPart, number> = {
        'head': 1.2,
        'left-eye': 0.8,
        'right-eye': 0.8,
        'body': 1.0,
        'left-arm': 1.1,
        'right-arm': 1.1,
        'left-leg': 0.9,
        'right-leg': 0.9,
        'tail': 1.3,
        'wings': 0.7,
        'dragon-ball': 1.5
      }

      let pattern = basePatterns[type] || [30]
      
      if (part && partModifiers[part]) {
        pattern = pattern.map(duration => Math.round(duration * partModifiers[part]))
      }

      return pattern
    }

    const pattern = getHapticPattern(type, part)
    navigator.vibrate(pattern)
  }, [enableHapticFeedback])

  // Gesture trail management
  const addGestureTrail = useCallback((start: { x: number; y: number }, end: { x: number; y: number }, type: string) => {
    if (!enableGestureTrails) return

    const trailId = `trail_${Date.now()}_${Math.random()}`
    const getTrailColor = (type: string): string => {
      const colors: Record<string, string> = {
        'tap': '#FFD700',
        'swipe': '#FF6B6B',
        'pinch': '#4ECDC4',
        'rotate': '#45B7D1',
        'long-press': '#96CEB4'
      }
      return colors[type] || '#FFFFFF'
    }

    const newTrail: GestureTrail = {
      id: trailId,
      points: [
        { x: start.x, y: start.y, timestamp: Date.now() },
        { x: end.x, y: end.y, timestamp: Date.now() + 16 }
      ],
      color: getTrailColor(type),
      opacity: 1.0,
      width: type === 'pinch' ? 4 : 2
    }

    setGestureTrails(prev => [...prev, newTrail])

    // Auto-cleanup trail after animation
    setTimeout(() => {
      setGestureTrails(prev => prev.filter(trail => trail.id !== trailId))
    }, 1000)
  }, [enableGestureTrails])

  // Multi-touch gesture handling
  const handleMultiTouch = useCallback((touches: TouchList | React.TouchList, type: 'start' | 'move' | 'end') => {
    if (!multiTouchEnabled) return

    setMultiTouchState(prev => {
      const newActiveTouches = new Map(prev.activeTouches)

      if (type === 'start' || type === 'move') {
        const touchArray = Array.from(touches)
        for (const touch of touchArray) {
          if (touch && typeof touch.identifier === 'number') {
            const { part } = getSVGElementAtPosition(touch.clientX, touch.clientY)
            newActiveTouches.set(touch.identifier, {
              x: touch.clientX,
              y: touch.clientY,
              part
            })
          }
        }
      } else if (type === 'end') {
        // Keep existing touches that are still active
        const activeTouchIds = Array.from(touches)
          .filter(t => t && typeof t.identifier === 'number')
          .map(t => t.identifier)
        for (const [id] of newActiveTouches) {
          if (!activeTouchIds.includes(id)) {
            newActiveTouches.delete(id)
          }
        }
      }

      return {
        ...prev,
        activeTouches: newActiveTouches,
        gestureInProgress: newActiveTouches.size > 1
      }
    })
  }, [multiTouchEnabled, getSVGElementAtPosition])

  // Special gesture pattern recognition
  const recognizeSpecialGestures = useCallback((gesture: TouchGesture) => {
    const { startPosition, endPosition, type } = gesture

    // Detect circular motion (for summoning dragon)
    const isCircularMotion = (start: { x: number; y: number }, end: { x: number; y: number }): boolean => {
      const dx = end.x - start.x
      const dy = end.y - start.y
      const distance = Math.sqrt(dx * dx + dy * dy)
      return distance > 80 && type === 'swipe' // Basic circular motion heuristic
    }

    // Detect zigzag pattern (for power-up)
    const isZigzagPattern = (gesture: TouchGesture): boolean => {
      // This would need more sophisticated path analysis
      return type === 'swipe' && Math.abs(gesture.velocity.x) > 200 && Math.abs(gesture.velocity.y) > 100
    }

    // Update special gesture states
    setSpecialGestures(prev => ({
      ...prev,
      isDrawingCircle: isCircularMotion(startPosition, endPosition),
      isDrawingZigzag: isZigzagPattern(gesture),
      isDragonSymbol: false // Would need more complex pattern matching
    }))
  }, [])

  // Enhanced gesture handler with context awareness
  const handleEnhancedGesture = useCallback((gesture: TouchGesture, gestureType: string) => {
    const startTime = gestureStartTimeRef.current
    const latency = startTime ? Date.now() - startTime : 0

    // Update performance metrics
    setPerformanceMetrics(prev => ({
      ...prev,
      gestureLatency: latency,
      touchAccuracy: (accuracyCounterRef.current.successful / accuracyCounterRef.current.total) * 100 || 0
    }))

    // Get target information
    const { part, dragonBallId, element } = getSVGElementAtPosition(
      gesture.startPosition.x, 
      gesture.startPosition.y
    )

    // Update gesture context
    const newContext: TouchGestureContext = {
      targetPart: part,
      dragonBallId,
      gestureSequence: [...gestureContext.gestureSequence, gesture].slice(-5), // Keep last 5 gestures
      isSequentialGesture: gestureContext.gestureSequence.length > 0,
      contextualData: {
        element: element?.tagName,
        timestamp: Date.now(),
        touchArea: (element as any)?.getBoundingClientRect?.() || null
      }
    }

    setGestureContext(newContext)

    // Trigger haptic feedback
    triggerEnhancedHapticFeedback(gestureType, part)

    // Add gesture trail
    if (gestureType === 'swipe' || gestureType === 'rotate') {
      addGestureTrail(gesture.startPosition, gesture.endPosition, gestureType)
    }

    // Recognize special patterns
    recognizeSpecialGestures(gesture)

    // Call appropriate handlers
    if (part && onSVGPartTouch) {
      onSVGPartTouch(part, gesture)
    }

    if (dragonBallId !== null && onDragonBallTouch) {
      onDragonBallTouch(dragonBallId, gesture)
    }

    if (onGestureRecognized) {
      onGestureRecognized(gesture, newContext)
    }

    // Update accuracy counter
    accuracyCounterRef.current.total++
    if (part) {
      accuracyCounterRef.current.successful++
    }
  }, [
    gestureContext,
    getSVGElementAtPosition,
    triggerEnhancedHapticFeedback,
    addGestureTrail,
    recognizeSpecialGestures,
    onSVGPartTouch,
    onDragonBallTouch,
    onGestureRecognized
  ])

  // Enhanced touch target management
  const svgTouchTargets = new Map<DragonPart, { x: number; y: number; width: number; height: number }>()

  const expandTouchTarget = useCallback((part: DragonPart, expansion: number) => {
    // Implementation for expanding touch targets for better mobile UX
    pipe(
      O.fromNullable(document.querySelector(`[data-dragon-part="${part}"]`)),
      O.map(element => {
        const rect = element.getBoundingClientRect()
        const expandedTarget = {
          x: rect.left - expansion / 2,
          y: rect.top - expansion / 2,
          width: rect.width + expansion,
          height: rect.height + expansion
        }
        svgTouchTargets.set(part, expandedTarget)
        return expandedTarget
      })
    )
  }, [])

  const handleSVGTouch = useCallback((_part: DragonPart, event: React.TouchEvent) => {
    gestureStartTimeRef.current = Date.now()
    
    // Handle multi-touch
    handleMultiTouch(event.touches, 'start')

    // Create synthetic gesture for direct SVG interaction
    pipe(
      O.fromNullable(event.touches[0]),
      O.map(touch => {
        const syntheticGesture: TouchGesture = {
          type: 'tap',
          startTime: Date.now(),
          duration: 0,
          startPosition: { x: touch.clientX, y: touch.clientY },
          endPosition: { x: touch.clientX, y: touch.clientY },
          distance: 0,
          velocity: { x: 0, y: 0 }
        }

        handleEnhancedGesture(syntheticGesture, 'direct-touch')
        return syntheticGesture
      })
    )
  }, [handleMultiTouch, handleEnhancedGesture])

  // Cleanup trails periodically
  useEffect(() => {
    if (enableGestureTrails) {
      trailCleanupRef.current = setInterval(() => {
        setGestureTrails(prev => 
          prev.filter(trail => trail.points[0] && Date.now() - trail.points[0].timestamp < 2000)
        )
      }, 1000)

      return () => {
        if (trailCleanupRef.current) {
          clearInterval(trailCleanupRef.current)
        }
      }
    }
    
    // Return empty cleanup function when gesture trails are disabled
    return () => {}
  }, [enableGestureTrails])

  // Enhanced gesture handlers for multi-touch
  const enhancedGestureHandlers = {
    ...baseTouchGestures.gestureHandlers,
    onTouchStart: (e: React.TouchEvent) => {
      gestureStartTimeRef.current = Date.now()
      handleMultiTouch(e.touches, 'start')
      baseTouchGestures.gestureHandlers.onTouchStart(e)
    },
    onTouchMove: (e: React.TouchEvent) => {
      handleMultiTouch(e.touches, 'move')
      baseTouchGestures.gestureHandlers.onTouchMove(e)
    },
    onTouchEnd: (e: React.TouchEvent) => {
      handleMultiTouch(e.changedTouches, 'end')
      baseTouchGestures.gestureHandlers.onTouchEnd(e)
    }
  }

  return {
    ...baseTouchGestures,
    gestureHandlers: enhancedGestureHandlers,
    expandTouchTarget,
    handleSVGTouch,
    gestureTrails,
    multiTouchState,
    specialGestures,
    performanceMetrics
  }
}
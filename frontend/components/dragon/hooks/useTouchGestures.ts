'use client'

import { useState, useRef, useCallback } from 'react'
import type { TouchGesture, TouchGestureHookReturn } from '../types'
import { INTERACTION_ZONES } from '../constants'
// Removed unused fp-ts imports

interface UseTouchGesturesOptions {
  enabled?: boolean
  onTap?: (gesture: TouchGesture) => void
  onLongPress?: (gesture: TouchGesture) => void
  onSwipe?: (gesture: TouchGesture) => void
  onPinch?: (gesture: TouchGesture) => void
  onRotate?: (gesture: TouchGesture) => void
  longPressDuration?: number
  swipeThreshold?: number
  pinchThreshold?: number
  rotateThreshold?: number
}

export function useTouchGestures({
  enabled = true,
  onTap,
  onLongPress,
  onSwipe,
  onPinch,
  onRotate,
  longPressDuration = INTERACTION_ZONES.gesture.longPressDuration,
  swipeThreshold = INTERACTION_ZONES.gesture.minDistance,
  pinchThreshold = 10,
  rotateThreshold = 15
}: UseTouchGesturesOptions = {}): TouchGestureHookReturn {
  const [gestures, setGestures] = useState<TouchGesture[]>([])
  const [isGestureActive, setIsGestureActive] = useState(false)
  const [currentGesture, setCurrentGesture] = useState<TouchGesture | null>(null)

  // Refs for tracking gesture state
  const touchStartRef = useRef<{ 
    time: number
    touches: TouchList
    positions: Array<{ x: number; y: number }>
  } | null>(null)
  const longPressTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined)
  const initialDistanceRef = useRef<number>(0)
  const initialAngleRef = useRef<number>(0)
  const cleanupFunctionsRef = useRef<(() => void)[]>([])

  // Utility functions
  const getDistance = useCallback((touch1: Touch, touch2: Touch): number => {
    const dx = touch1.clientX - touch2.clientX
    const dy = touch1.clientY - touch2.clientY
    return Math.sqrt(dx * dx + dy * dy)
  }, [])

  const getAngle = useCallback((touch1: Touch, touch2: Touch): number => {
    const dx = touch1.clientX - touch2.clientX
    const dy = touch1.clientY - touch2.clientY
    return Math.atan2(dy, dx) * 180 / Math.PI
  }, [])

  const getTouchCenter = useCallback((touches: TouchList): { x: number; y: number } => {
    let x = 0, y = 0
    const touchArray = Array.from(touches)
    for (let i = 0; i < touchArray.length; i++) {
      const touch = touchArray[i]
      if (touch) {
        x += touch.clientX
        y += touch.clientY
      }
    }
    return { x: x / touchArray.length, y: y / touchArray.length }
  }, [])

  const getVelocity = useCallback((gesture: Partial<TouchGesture>): { x: number; y: number } => {
    if (!gesture.startPosition || !gesture.endPosition || !gesture.duration) {
      return { x: 0, y: 0 }
    }

    const dx = gesture.endPosition.x - gesture.startPosition.x
    const dy = gesture.endPosition.y - gesture.startPosition.y
    const time = gesture.duration / 1000 // Convert to seconds

    return {
      x: dx / time,
      y: dy / time
    }
  }, [])

  // Add haptic feedback if available
  const triggerHapticFeedback = useCallback((type: 'light' | 'medium' | 'heavy' = 'light') => {
    if ('vibrate' in navigator) {
      const patterns = {
        light: [10],
        medium: [50],
        heavy: [100]
      }
      navigator.vibrate(patterns[type])
    }
  }, [])

  // Handle touch start
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (!enabled) return

    const now = Date.now()
    const touches = e.touches
    const center = getTouchCenter(touches)

    touchStartRef.current = {
      time: now,
      touches,
      positions: Array.from(touches)
        .filter(touch => touch)
        .map(touch => ({ x: touch.clientX, y: touch.clientY }))
    }

    setIsGestureActive(true)

    // Set up long press detection for single touch
    if (touches.length === 1) {
      longPressTimeoutRef.current = setTimeout(() => {
        if (touchStartRef.current && enabled) {
          const longPressGesture: TouchGesture = {
            type: 'long-press',
            startTime: touchStartRef.current.time,
            duration: longPressDuration,
            startPosition: center,
            endPosition: center,
            distance: 0,
            velocity: { x: 0, y: 0 }
          }

          setCurrentGesture(longPressGesture)
          setGestures(prev => [...prev, longPressGesture])
          onLongPress?.(longPressGesture)
          triggerHapticFeedback('medium')
        }
      }, longPressDuration)
    }

    // Store initial multi-touch data
    if (touches.length === 2) {
      initialDistanceRef.current = getDistance(touches[0], touches[1])
      initialAngleRef.current = getAngle(touches[0], touches[1])
    }
  }, [enabled, getTouchCenter, longPressDuration, onLongPress, triggerHapticFeedback, getDistance, getAngle])

  // Handle touch move
  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!enabled || !touchStartRef.current) return

    const touches = e.touches
    const center = getTouchCenter(touches)
    const now = Date.now()

    // Clear long press timeout on move
    if (longPressTimeoutRef.current) {
      clearTimeout(longPressTimeoutRef.current)
      longPressTimeoutRef.current = undefined
    }

    // Handle pinch gesture
    if (touches.length === 2 && initialDistanceRef.current > 0) {
      const currentDistance = getDistance(touches[0], touches[1])
      const scale = currentDistance / initialDistanceRef.current

      if (Math.abs(scale - 1) > pinchThreshold / 100) {
        const pinchGesture: TouchGesture = {
          type: 'pinch',
          startTime: touchStartRef.current.time,
          duration: now - touchStartRef.current.time,
          startPosition: getTouchCenter(touchStartRef.current.touches),
          endPosition: center,
          distance: Math.abs(currentDistance - initialDistanceRef.current),
          velocity: { x: 0, y: 0 },
          scale
        }

        setCurrentGesture(pinchGesture)
        onPinch?.(pinchGesture)
      }
    }

    // Handle rotation gesture
    if (touches.length === 2 && initialAngleRef.current !== undefined) {
      const currentAngle = getAngle(touches[0], touches[1])
      const rotation = currentAngle - initialAngleRef.current

      if (Math.abs(rotation) > rotateThreshold) {
        const rotateGesture: TouchGesture = {
          type: 'rotate',
          startTime: touchStartRef.current.time,
          duration: now - touchStartRef.current.time,
          startPosition: getTouchCenter(touchStartRef.current.touches),
          endPosition: center,
          distance: 0,
          velocity: { x: 0, y: 0 },
          rotation
        }

        setCurrentGesture(rotateGesture)
        onRotate?.(rotateGesture)
      }
    }
  }, [enabled, getTouchCenter, getDistance, getAngle, pinchThreshold, rotateThreshold, onPinch, onRotate])

  // Handle touch end
  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!enabled || !touchStartRef.current) return

    const now = Date.now()
    const duration = now - touchStartRef.current.time
    const endPosition = e.changedTouches.length > 0 
      ? { x: e.changedTouches[0]?.clientX ?? 0, y: e.changedTouches[0]?.clientY ?? 0 }
      : getTouchCenter(touchStartRef.current?.touches || ({} as TouchList))

    const startPosition = touchStartRef.current.positions[0] || endPosition
    const distance = Math.sqrt(
      Math.pow(endPosition.x - startPosition.x, 2) + 
      Math.pow(endPosition.y - startPosition.y, 2)
    )

    // Clear timeouts
    if (longPressTimeoutRef.current) {
      clearTimeout(longPressTimeoutRef.current)
      longPressTimeoutRef.current = undefined
    }

    let gesture: TouchGesture | null = null

    // Determine gesture type
    if (duration < longPressDuration && distance < swipeThreshold) {
      // Tap gesture
      gesture = {
        type: 'tap',
        startTime: touchStartRef.current.time,
        duration,
        startPosition,
        endPosition,
        distance,
        velocity: getVelocity({ startPosition, endPosition, duration })
      }
      onTap?.(gesture)
      triggerHapticFeedback('light')
    } else if (distance >= swipeThreshold) {
      // Swipe gesture
      gesture = {
        type: 'swipe',
        startTime: touchStartRef.current.time,
        duration,
        startPosition,
        endPosition,
        distance,
        velocity: getVelocity({ startPosition, endPosition, duration })
      }
      onSwipe?.(gesture)
      triggerHapticFeedback('light')
    }

    if (gesture) {
      setCurrentGesture(gesture)
      setGestures(prev => [...prev, gesture as TouchGesture])
    }

    // Reset state
    setIsGestureActive(false)
    setCurrentGesture(null)
    touchStartRef.current = null
    initialDistanceRef.current = 0
    initialAngleRef.current = 0
  }, [enabled, getTouchCenter, longPressDuration, swipeThreshold, getVelocity, onTap, onSwipe, triggerHapticFeedback])

  // Cleanup effect for component unmount
  useEffect(() => {
    return () => {
      // Clear any remaining timeouts
      if (longPressTimeoutRef.current) {
        clearTimeout(longPressTimeoutRef.current)
        longPressTimeoutRef.current = undefined
      }
      
      // Execute cleanup functions
      cleanupFunctionsRef.current.forEach(cleanup => {
        try {
          cleanup()
        } catch (error) {
          console.warn('Error during gesture cleanup:', error)
        }
      })
      cleanupFunctionsRef.current = []
      
      // Reset state
      setGestures([])
      setIsGestureActive(false)
      setCurrentGesture(null)
      touchStartRef.current = null
      initialDistanceRef.current = 0
      initialAngleRef.current = 0
    }
  }, [])

  const gestureHandlers = {
    onTouchStart: handleTouchStart,
    onTouchMove: handleTouchMove,
    onTouchEnd: handleTouchEnd
  }

  return {
    gestures,
    isGestureActive,
    currentGesture,
    gestureHandlers
  }
}

// Utility hook for swipe direction detection
export function useSwipeDirection(gesture: TouchGesture | null) {
  if (!gesture || gesture.type !== 'swipe') return null

  const dx = gesture.endPosition.x - gesture.startPosition.x
  const dy = gesture.endPosition.y - gesture.startPosition.y

  const angle = Math.atan2(dy, dx) * 180 / Math.PI
  const normalizedAngle = angle < 0 ? angle + 360 : angle

  if (normalizedAngle >= 315 || normalizedAngle < 45) return 'right'
  if (normalizedAngle >= 45 && normalizedAngle < 135) return 'down'
  if (normalizedAngle >= 135 && normalizedAngle < 225) return 'left'
  if (normalizedAngle >= 225 && normalizedAngle < 315) return 'up'

  return null
}

// Hook for gesture-based dragon power control
export function useDragonGesturePower(
  onPowerUp: () => void,
  onPowerDown: () => void,
  onSpecialAction: (action: string) => void
) {
  const { gestureHandlers, currentGesture } = useTouchGestures({
    onSwipe: (gesture) => {
      const direction = useSwipeDirection(gesture)
      if (direction === 'up') onPowerUp()
      if (direction === 'down') onPowerDown()
    },
    onPinch: (gesture) => {
      if (gesture.scale && gesture.scale > 1.2) {
        onSpecialAction('expand')
      } else if (gesture.scale && gesture.scale < 0.8) {
        onSpecialAction('contract')
      }
    },
    onRotate: (gesture) => {
      if (gesture.rotation && Math.abs(gesture.rotation) > 45) {
        onSpecialAction('spin')
      }
    },
    onLongPress: () => {
      onSpecialAction('charge')
    }
  })

  return { gestureHandlers, currentGesture }
}
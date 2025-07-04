'use client'

import { useState, useCallback, useRef, useEffect } from 'react'

export interface GestureState {
  isActive: boolean
  gesture: 'none' | 'tap' | 'press' | 'swipe' | 'pinch' | 'rotate'
  direction?: 'up' | 'down' | 'left' | 'right'
  velocity: number
  distance: number
  scale: number
  rotation: number
  duration: number
}

interface UseDragonGesturesOptions {
  onTap?: () => void
  onLongPress?: () => void
  onSwipe?: (direction: 'up' | 'down' | 'left' | 'right', velocity: number) => void
  onPinch?: (scale: number) => void
  onRotate?: (rotation: number) => void
  onGestureStart?: () => void
  onGestureEnd?: () => void
  minSwipeDistance?: number
  longPressDelay?: number
  enabled?: boolean
}

export function useDragonGestures(options: UseDragonGesturesOptions = {}) {
  const {
    onTap,
    onLongPress,
    onSwipe,
    onPinch,
    onRotate,
    onGestureStart,
    onGestureEnd,
    minSwipeDistance = 50,
    longPressDelay = 500,
    enabled = true
  } = options

  const [gestureState, setGestureState] = useState<GestureState>({
    isActive: false,
    gesture: 'none',
    velocity: 0,
    distance: 0,
    scale: 1,
    rotation: 0,
    duration: 0
  })

  const touchStartRef = useRef<{
    time: number
    x: number
    y: number
    touches: Touch[]
  } | null>(null)

  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null)
  const gestureStartTimeRef = useRef<number>(0)

  // Calculate distance between two touch points
  const getDistance = (touch1: Touch, touch2: Touch) => {
    const dx = touch1.clientX - touch2.clientX
    const dy = touch1.clientY - touch2.clientY
    return Math.sqrt(dx * dx + dy * dy)
  }

  // Calculate angle between two touch points
  const getAngle = (touch1: Touch, touch2: Touch) => {
    return Math.atan2(touch2.clientY - touch1.clientY, touch2.clientX - touch1.clientX) * 180 / Math.PI
  }

  // Handle touch start
  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (!enabled) return

    const touches = Array.from(e.touches)
    touchStartRef.current = {
      time: Date.now(),
      x: touches[0].clientX,
      y: touches[0].clientY,
      touches: touches.map(t => ({
        identifier: t.identifier,
        clientX: t.clientX,
        clientY: t.clientY,
        pageX: t.pageX,
        pageY: t.pageY,
        screenX: t.screenX,
        screenY: t.screenY,
        radiusX: t.radiusX,
        radiusY: t.radiusY,
        rotationAngle: t.rotationAngle,
        force: t.force
      } as Touch))
    }

    gestureStartTimeRef.current = Date.now()
    
    setGestureState(prev => ({
      ...prev,
      isActive: true,
      gesture: 'none',
      velocity: 0,
      distance: 0
    }))

    onGestureStart?.()

    // Set up long press detection
    if (touches.length === 1 && onLongPress) {
      longPressTimerRef.current = setTimeout(() => {
        setGestureState(prev => ({
          ...prev,
          gesture: 'press'
        }))
        onLongPress()
      }, longPressDelay)
    }
  }, [enabled, onGestureStart, onLongPress, longPressDelay])

  // Handle touch move
  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!enabled || !touchStartRef.current) return

    // Clear long press timer on movement
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current)
      longPressTimerRef.current = null
    }

    const touches = Array.from(e.touches)
    const startTouch = touchStartRef.current

    // Single touch - detect swipe
    if (touches.length === 1 && startTouch.touches.length === 1) {
      const touch = touches[0]
      const deltaX = touch.clientX - startTouch.x
      const deltaY = touch.clientY - startTouch.y
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY)
      
      const timeDelta = Date.now() - startTouch.time
      const velocity = distance / timeDelta * 1000 // pixels per second

      setGestureState(prev => ({
        ...prev,
        gesture: distance > minSwipeDistance ? 'swipe' : 'none',
        distance,
        velocity,
        direction: Math.abs(deltaX) > Math.abs(deltaY) 
          ? (deltaX > 0 ? 'right' : 'left')
          : (deltaY > 0 ? 'down' : 'up')
      }))
    }

    // Multi-touch - detect pinch and rotate
    if (touches.length === 2 && startTouch.touches.length === 2) {
      const touch1 = touches[0]
      const touch2 = touches[1]
      const startTouch1 = startTouch.touches[0]
      const startTouch2 = startTouch.touches[1]

      // Calculate pinch
      const startDistance = getDistance(startTouch1, startTouch2)
      const currentDistance = getDistance(touch1, touch2)
      const scale = currentDistance / startDistance

      // Calculate rotation
      const startAngle = getAngle(startTouch1, startTouch2)
      const currentAngle = getAngle(touch1, touch2)
      const rotation = currentAngle - startAngle

      setGestureState(prev => ({
        ...prev,
        gesture: Math.abs(scale - 1) > 0.1 ? 'pinch' : 
                 Math.abs(rotation) > 10 ? 'rotate' : 'none',
        scale,
        rotation
      }))

      if (Math.abs(scale - 1) > 0.1 && onPinch) {
        onPinch(scale)
      }

      if (Math.abs(rotation) > 10 && onRotate) {
        onRotate(rotation)
      }
    }
  }, [enabled, minSwipeDistance, onPinch, onRotate])

  // Handle touch end
  const handleTouchEnd = useCallback((e: TouchEvent) => {
    if (!enabled || !touchStartRef.current) return

    // Clear long press timer
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current)
      longPressTimerRef.current = null
    }

    const duration = Date.now() - gestureStartTimeRef.current
    const startTouch = touchStartRef.current

    // Detect tap
    if (
      gestureState.gesture === 'none' &&
      duration < 300 &&
      gestureState.distance < 10 &&
      onTap
    ) {
      setGestureState(prev => ({ ...prev, gesture: 'tap' }))
      onTap()
    }

    // Execute swipe callback
    if (
      gestureState.gesture === 'swipe' &&
      gestureState.direction &&
      gestureState.distance > minSwipeDistance &&
      onSwipe
    ) {
      onSwipe(gestureState.direction, gestureState.velocity)
    }

    // Reset state
    setGestureState({
      isActive: false,
      gesture: 'none',
      velocity: 0,
      distance: 0,
      scale: 1,
      rotation: 0,
      duration
    })

    touchStartRef.current = null
    onGestureEnd?.()
  }, [enabled, gestureState, minSwipeDistance, onTap, onSwipe, onGestureEnd])

  // Set up event listeners
  useEffect(() => {
    if (!enabled) return

    const element = document.body // You can make this configurable

    element.addEventListener('touchstart', handleTouchStart, { passive: false })
    element.addEventListener('touchmove', handleTouchMove, { passive: false })
    element.addEventListener('touchend', handleTouchEnd, { passive: false })
    element.addEventListener('touchcancel', handleTouchEnd, { passive: false })

    return () => {
      element.removeEventListener('touchstart', handleTouchStart)
      element.removeEventListener('touchmove', handleTouchMove)
      element.removeEventListener('touchend', handleTouchEnd)
      element.removeEventListener('touchcancel', handleTouchEnd)
      
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current)
      }
    }
  }, [enabled, handleTouchStart, handleTouchMove, handleTouchEnd])

  return {
    gestureState,
    isGesturing: gestureState.isActive,
    currentGesture: gestureState.gesture,
    // Utility methods for gesture detection
    isTapping: gestureState.gesture === 'tap',
    isPressing: gestureState.gesture === 'press',
    isSwiping: gestureState.gesture === 'swipe',
    isPinching: gestureState.gesture === 'pinch',
    isRotating: gestureState.gesture === 'rotate'
  }
}
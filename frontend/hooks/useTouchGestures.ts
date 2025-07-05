'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

interface TouchPosition {
  x: number
  y: number
}

interface Gesture {
  type: 'tap' | 'hold' | 'swipe' | 'pinch' | 'rotate'
  direction?: 'up' | 'down' | 'left' | 'right'
  velocity?: number
  scale?: number
  rotation?: number
  timestamp: number
}

interface UseTouchGesturesOptions {
  holdThreshold?: number // ms to trigger hold
  swipeThreshold?: number // pixels to trigger swipe
  tapThreshold?: number // ms max for tap
  enableHaptic?: boolean
}

export function useTouchGestures(
  targetRef?: React.RefObject<HTMLElement>,
  options: UseTouchGesturesOptions = {}
) {
  const {
    holdThreshold = 500,
    swipeThreshold = 50,
    tapThreshold = 200,
    enableHaptic = true
  } = options

  const [isTouching, setIsTouching] = useState(false)
  const [touchPosition, setTouchPosition] = useState<TouchPosition>({ x: 0, y: 0 })
  const [gesture, setGesture] = useState<Gesture | null>(null)
  const [touchCount, setTouchCount] = useState(0)
  
  const touchStartRef = useRef<{ x: number; y: number; time: number }>()
  const holdTimeoutRef = useRef<NodeJS.Timeout>()
  const lastTouchRef = useRef<TouchPosition>({ x: 0, y: 0 })
  const initialPinchDistance = useRef<number>(0)
  const initialRotation = useRef<number>(0)

  // Haptic feedback helper
  const triggerHaptic = useCallback((type: 'light' | 'medium' | 'heavy' = 'light') => {
    if (!enableHaptic || !('vibrate' in navigator)) return

    const patterns = {
      light: [10],
      medium: [20],
      heavy: [30, 10, 30]
    }

    navigator.vibrate(patterns[type])
  }, [enableHaptic])

  // Calculate distance between two points
  const getDistance = (p1: TouchPosition, p2: TouchPosition) => {
    return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2))
  }

  // Calculate angle between two points
  const getAngle = (p1: TouchPosition, p2: TouchPosition) => {
    return Math.atan2(p2.y - p1.y, p2.x - p1.x) * 180 / Math.PI
  }

  // Handle multi-touch gestures
  const handleMultiTouch = useCallback((touches: TouchList) => {
    if (touches.length === 2 && touches[0] && touches[1]) {
      const touch1 = { x: touches[0].clientX, y: touches[0].clientY }
      const touch2 = { x: touches[1].clientX, y: touches[1].clientY }
      
      const currentDistance = getDistance(touch1, touch2)
      const currentAngle = getAngle(touch1, touch2)

      if (initialPinchDistance.current === 0) {
        initialPinchDistance.current = currentDistance
        initialRotation.current = currentAngle
      } else {
        const scale = currentDistance / initialPinchDistance.current
        const rotation = currentAngle - initialRotation.current

        // Detect pinch
        if (Math.abs(scale - 1) > 0.1) {
          setGesture({
            type: 'pinch',
            scale,
            timestamp: Date.now()
          })
          triggerHaptic('light')
        }

        // Detect rotation
        if (Math.abs(rotation) > 15) {
          setGesture({
            type: 'rotate',
            rotation,
            timestamp: Date.now()
          })
          triggerHaptic('light')
        }
      }
    }
  }, [triggerHaptic])

  // Handle touch start
  const handleTouchStart = useCallback((event: TouchEvent) => {
    const touch = event.touches[0]
    if (!touch) return
    
    const position = { x: touch.clientX, y: touch.clientY }
    
    setIsTouching(true)
    setTouchPosition(position)
    setTouchCount(event.touches.length)
    lastTouchRef.current = position
    
    touchStartRef.current = {
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now()
    }

    // Handle multi-touch
    if (event.touches.length > 1) {
      handleMultiTouch(event.touches)
    }

    // Set up hold detection
    holdTimeoutRef.current = setTimeout(() => {
      if (touchStartRef.current) {
        setGesture({
          type: 'hold',
          timestamp: Date.now()
        })
        triggerHaptic('medium')
      }
    }, holdThreshold)

    // Check if touch is within target
    if (targetRef?.current) {
      const rect = targetRef.current.getBoundingClientRect()
      const isInside = 
        touch.clientX >= rect.left &&
        touch.clientX <= rect.right &&
        touch.clientY >= rect.top &&
        touch.clientY <= rect.bottom
      
      if (isInside) {
        event.preventDefault()
      }
    }
  }, [targetRef, holdThreshold, triggerHaptic, handleMultiTouch])

  // Handle touch move
  const handleTouchMove = useCallback((event: TouchEvent) => {
    if (!touchStartRef.current) return

    const touch = event.touches[0]
    if (!touch) return
    
    const position = { x: touch.clientX, y: touch.clientY }
    
    setTouchPosition(position)
    lastTouchRef.current = position

    // Clear hold timeout on movement
    if (holdTimeoutRef.current) {
      clearTimeout(holdTimeoutRef.current)
    }

    // Handle multi-touch gestures
    if (event.touches.length > 1) {
      handleMultiTouch(event.touches)
    }

    // Prevent scrolling when interacting with dragon
    if (targetRef?.current) {
      const rect = targetRef.current.getBoundingClientRect()
      const isInside = 
        touch.clientX >= rect.left &&
        touch.clientX <= rect.right &&
        touch.clientY >= rect.top &&
        touch.clientY <= rect.bottom
      
      if (isInside) {
        event.preventDefault()
      }
    }
  }, [targetRef, handleMultiTouch])

  // Handle touch end
  const handleTouchEnd = useCallback((_event: TouchEvent) => {
    if (!touchStartRef.current) return

    const endTime = Date.now()
    const duration = endTime - touchStartRef.current.time
    
    const deltaX = lastTouchRef.current.x - touchStartRef.current.x
    const deltaY = lastTouchRef.current.y - touchStartRef.current.y
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY)

    // Clear hold timeout
    if (holdTimeoutRef.current) {
      clearTimeout(holdTimeoutRef.current)
    }

    // Detect tap
    if (duration < tapThreshold && distance < 10) {
      setGesture({
        type: 'tap',
        timestamp: Date.now()
      })
      triggerHaptic('light')
    }
    // Detect swipe
    else if (distance > swipeThreshold) {
      const velocity = distance / duration * 1000 // pixels per second
      let direction: 'up' | 'down' | 'left' | 'right'

      if (Math.abs(deltaX) > Math.abs(deltaY)) {
        direction = deltaX > 0 ? 'right' : 'left'
      } else {
        direction = deltaY > 0 ? 'down' : 'up'
      }

      setGesture({
        type: 'swipe',
        direction,
        velocity,
        timestamp: Date.now()
      })
      triggerHaptic('light')
    }

    // Reset states
    setIsTouching(false)
    setTouchCount(0)
    touchStartRef.current = undefined
    initialPinchDistance.current = 0
    initialRotation.current = 0
  }, [tapThreshold, swipeThreshold, triggerHaptic])

  // Handle touch cancel
  const handleTouchCancel = useCallback(() => {
    if (holdTimeoutRef.current) {
      clearTimeout(holdTimeoutRef.current)
    }
    
    setIsTouching(false)
    setTouchCount(0)
    touchStartRef.current = undefined
    initialPinchDistance.current = 0
    initialRotation.current = 0
  }, [])

  // Set up event listeners
  useEffect(() => {
    const element = targetRef?.current || document

    element.addEventListener('touchstart', handleTouchStart as any, { passive: false })
    element.addEventListener('touchmove', handleTouchMove as any, { passive: false })
    element.addEventListener('touchend', handleTouchEnd as any)
    element.addEventListener('touchcancel', handleTouchCancel as any)

    return () => {
      element.removeEventListener('touchstart', handleTouchStart as any)
      element.removeEventListener('touchmove', handleTouchMove as any)
      element.removeEventListener('touchend', handleTouchEnd as any)
      element.removeEventListener('touchcancel', handleTouchCancel as any)

      if (holdTimeoutRef.current) {
        clearTimeout(holdTimeoutRef.current)
      }
    }
  }, [targetRef, handleTouchStart, handleTouchMove, handleTouchEnd, handleTouchCancel])

  // Clear gesture after a delay
  useEffect(() => {
    if (gesture) {
      const timeout = setTimeout(() => {
        setGesture(null)
      }, 500)

      return () => clearTimeout(timeout)
    }
    // Return undefined when no cleanup is needed
    return undefined
  }, [gesture])

  return {
    isTouching,
    touchPosition,
    touchCount,
    gesture,
    triggerHaptic
  }
}

// Hook for detecting device capabilities
export function useTouchCapabilities() {
  const [hasTouch, setHasTouch] = useState(false)
  const [hasHaptic, setHasHaptic] = useState(false)
  const [hasPressure, setHasPressure] = useState(false)

  useEffect(() => {
    // Check for touch support
    setHasTouch('ontouchstart' in window || navigator.maxTouchPoints > 0)
    
    // Check for haptic feedback support
    setHasHaptic('vibrate' in navigator)
    
    // Check for pressure sensitivity (3D Touch / Force Touch)
    const checkPressure = (event: any) => {
      if (event.force !== undefined || event.webkitForce !== undefined) {
        setHasPressure(true)
        document.removeEventListener('touchstart', checkPressure)
        document.removeEventListener('mousedown', checkPressure)
      }
    }
    
    document.addEventListener('touchstart', checkPressure)
    document.addEventListener('mousedown', checkPressure)
    
    return () => {
      document.removeEventListener('touchstart', checkPressure)
      document.removeEventListener('mousedown', checkPressure)
    }
  }, [])

  return { hasTouch, hasHaptic, hasPressure }
}
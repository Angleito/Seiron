'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import type { MouseTrackingHookReturn } from '../types'
import { INTERACTION_ZONES } from '../constants'
import { performanceUtils } from './useAnimationPerformance'

interface UseMouseTrackingOptions {
  elementRef: React.RefObject<HTMLElement>
  enabled?: boolean
  smoothing?: number; // 0-1, higher = smoother but more laggy
  proximityThreshold?: number;
  activityTimeout?: number; // ms before considering mouse inactive
}

export function useMouseTracking({
  elementRef,
  enabled = true,
  smoothing = 0.1,
  proximityThreshold = INTERACTION_ZONES.proximity.outer,
  activityTimeout = 2000
}: UseMouseTrackingOptions): MouseTrackingHookReturn {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })
  const [isMouseActive, setIsMouseActive] = useState(false)
  const [distanceFromDragon, setDistanceFromDragon] = useState(Infinity)
  const [angleFromDragon, setAngleFromDragon] = useState(0)
  const [targetDirection, setTargetDirection] = useState({ x: 0, y: 0 })
  const [isInProximity, setIsInProximity] = useState(false)

  // Refs for smooth animation and performance
  const smoothedPositionRef = useRef({ x: 0, y: 0 })
  const lastUpdateRef = useRef(Date.now())
  const activityTimeoutRef = useRef<NodeJS.Timeout>()
  const animationFrameRef = useRef<number>()

  // Get element center
  const getElementCenter = useCallback((): { x: number; y: number } | null => {
    if (!elementRef.current) return null
    
    const rect = elementRef.current.getBoundingClientRect()
    return {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2
    }
  }, [elementRef])

  // Calculate distance between two points
  const calculateDistance = useCallback((p1: { x: number; y: number }, p2: { x: number; y: number }): number => {
    const dx = p1.x - p2.x
    const dy = p1.y - p2.y
    return Math.sqrt(dx * dx + dy * dy)
  }, [])

  // Calculate angle between two points (in radians)
  const calculateAngle = useCallback((from: { x: number; y: number }, to: { x: number; y: number }): number => {
    const dx = to.x - from.x
    const dy = to.y - from.y
    return Math.atan2(dy, dx)
  }, [])

  // Smooth position interpolation
  const smoothPosition = useCallback((target: { x: number; y: number }, current: { x: number; y: number }, factor: number): { x: number; y: number } => {
    return {
      x: current.x + (target.x - current.x) * factor,
      y: current.y + (target.y - current.y) * factor
    }
  }, [])

  // Update tracking data
  const updateTracking = useCallback((rawMousePos: { x: number; y: number }) => {
    const dragonCenter = getElementCenter()
    if (!dragonCenter) return

    // Smooth the mouse position
    smoothedPositionRef.current = smoothPosition(
      rawMousePos,
      smoothedPositionRef.current,
      1 - smoothing
    )

    const smoothedPos = smoothedPositionRef.current
    
    // Calculate distance and angle
    const distance = calculateDistance(smoothedPos, dragonCenter)
    const angle = calculateAngle(dragonCenter, smoothedPos)
    
    // Calculate normalized direction vector (for dragon to look at mouse)
    const direction = {
      x: Math.cos(angle),
      y: Math.sin(angle)
    }

    // Update state
    setMousePosition(smoothedPos)
    setDistanceFromDragon(distance)
    setAngleFromDragon(angle)
    setTargetDirection(direction)
    setIsInProximity(distance <= proximityThreshold)
    
    lastUpdateRef.current = Date.now()
  }, [getElementCenter, calculateDistance, calculateAngle, smoothPosition, smoothing, proximityThreshold])

  // Throttled mouse move handler for performance
  const handleMouseMove = useCallback(
    performanceUtils.throttle((e: MouseEvent) => {
      if (!enabled) return

      const rawPosition = { x: e.clientX, y: e.clientY }
      updateTracking(rawPosition)
      
      setIsMouseActive(true)
      
      // Reset activity timeout
      if (activityTimeoutRef.current) {
        clearTimeout(activityTimeoutRef.current)
      }
      
      activityTimeoutRef.current = setTimeout(() => {
        setIsMouseActive(false)
      }, activityTimeout)
    }, 16), // ~60fps
    [enabled, updateTracking, activityTimeout]
  )

  // Handle mouse leave
  const handleMouseLeave = useCallback(() => {
    setIsMouseActive(false)
    setIsInProximity(false)
    
    if (activityTimeoutRef.current) {
      clearTimeout(activityTimeoutRef.current)
    }
  }, [])

  // Smooth animation loop for interpolated updates
  const animationLoop = useCallback(() => {
    if (!enabled) return

    const now = Date.now()
    const timeSinceUpdate = now - lastUpdateRef.current

    // If mouse hasn't moved for a while, gradually reduce tracking intensity
    if (timeSinceUpdate > activityTimeout / 2) {
      // Gradually move target direction back to neutral
      setTargetDirection(prev => ({
        x: prev.x * 0.95,
        y: prev.y * 0.95
      }))
    }

    animationFrameRef.current = requestAnimationFrame(animationLoop)
  }, [enabled, activityTimeout])

  // Set up event listeners
  useEffect(() => {
    if (!enabled) return

    const handleGlobalMouseMove = (e: MouseEvent) => handleMouseMove(e)
    
    // Add global mouse move listener
    document.addEventListener('mousemove', handleGlobalMouseMove, { passive: true })
    document.addEventListener('mouseleave', handleMouseLeave, { passive: true })
    
    // Start animation loop
    animationFrameRef.current = requestAnimationFrame(animationLoop)

    return () => {
      document.removeEventListener('mousemove', handleGlobalMouseMove)
      document.removeEventListener('mouseleave', handleMouseLeave)
      
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
      
      if (activityTimeoutRef.current) {
        clearTimeout(activityTimeoutRef.current)
      }
    }
  }, [enabled, handleMouseMove, handleMouseLeave, animationLoop])

  // Handle element resize
  useEffect(() => {
    if (!enabled || !elementRef.current) return

    const resizeObserver = new ResizeObserver(() => {
      // Recalculate position on resize
      const dragonCenter = getElementCenter()
      if (dragonCenter) {
        updateTracking(smoothedPositionRef.current)
      }
    })

    resizeObserver.observe(elementRef.current)

    return () => {
      resizeObserver.disconnect()
    }
  }, [enabled, elementRef, getElementCenter, updateTracking])

  // Initialize position
  useEffect(() => {
    if (enabled && elementRef.current) {
      // Initialize with current mouse position
      const initializePosition = (e: MouseEvent) => {
        const initialPos = { x: e.clientX, y: e.clientY }
        smoothedPositionRef.current = initialPos
        updateTracking(initialPos)
        document.removeEventListener('mousemove', initializePosition)
      }
      
      document.addEventListener('mousemove', initializePosition, { once: true, passive: true })
    }
  }, [enabled, elementRef, updateTracking])

  return {
    mousePosition,
    isMouseActive,
    distanceFromDragon,
    angleFromDragon,
    targetDirection,
    isInProximity
  }
}

// Utility hook for cursor-based eye tracking
export function useEyeTracking(
  mousePosition: { x: number; y: number },
  dragonPosition: { x: number; y: number },
  maxRotation: number = 15 // degrees
) {
  const [eyeRotation, setEyeRotation] = useState({ x: 0, y: 0 })

  useEffect(() => {
    const dx = mousePosition.x - dragonPosition.x
    const dy = mousePosition.y - dragonPosition.y
    
    // Normalize to max rotation
    const distance = Math.sqrt(dx * dx + dy * dy)
    const maxDistance = 200 // pixels
    
    const normalizedDistance = Math.min(distance / maxDistance, 1)
    const rotationX = (dx / distance) * maxRotation * normalizedDistance || 0
    const rotationY = (dy / distance) * maxRotation * normalizedDistance || 0
    
    setEyeRotation({ x: rotationX, y: rotationY })
  }, [mousePosition.x, mousePosition.y, dragonPosition.x, dragonPosition.y, maxRotation])

  return eyeRotation
}

// Proximity detection hook
export function useProximityDetection(
  mousePosition: { x: number; y: number },
  targetPosition: { x: number; y: number },
  zones: { inner: number; outer: number; max: number } = INTERACTION_ZONES.proximity
) {
  const [proximityState, setProximityState] = useState<'none' | 'max' | 'outer' | 'inner'>('none')

  useEffect(() => {
    const distance = Math.sqrt(
      Math.pow(mousePosition.x - targetPosition.x, 2) + 
      Math.pow(mousePosition.y - targetPosition.y, 2)
    )

    if (distance <= zones.inner) {
      setProximityState('inner')
    } else if (distance <= zones.outer) {
      setProximityState('outer')
    } else if (distance <= zones.max) {
      setProximityState('max')
    } else {
      setProximityState('none')
    }
  }, [mousePosition.x, mousePosition.y, targetPosition.x, targetPosition.y, zones])

  return proximityState
}
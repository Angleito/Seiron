'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

interface MousePosition {
  x: number
  y: number
}

interface UseMouseTrackingOptions {
  smoothing?: boolean
  smoothingFactor?: number
  trackingDelay?: number
}

export function useMouseTracking(
  targetRef?: React.RefObject<HTMLElement>,
  options: UseMouseTrackingOptions = {}
) {
  const {
    smoothing = true,
    smoothingFactor = 0.1,
    trackingDelay = 0
  } = options

  const [mousePosition, setMousePosition] = useState<MousePosition>({ x: 0, y: 0 })
  const [smoothPosition, setSmoothPosition] = useState<MousePosition>({ x: 0, y: 0 })
  const [isMouseActive, setIsMouseActive] = useState(false)
  const [isMouseInTarget, setIsMouseInTarget] = useState(false)
  
  const lastActivityRef = useRef<number>(Date.now())
  const animationFrameRef = useRef<number>()
  const mouseTimeoutRef = useRef<NodeJS.Timeout>()
  const targetPosition = useRef<MousePosition>({ x: 0, y: 0 })

  // Smooth position interpolation
  const updateSmoothPosition = useCallback(() => {
    if (!smoothing) {
      setSmoothPosition(targetPosition.current)
      return
    }

    setSmoothPosition(prev => {
      const dx = targetPosition.current.x - prev.x
      const dy = targetPosition.current.y - prev.y
      
      // Only update if there's significant movement
      if (Math.abs(dx) < 0.1 && Math.abs(dy) < 0.1) {
        return prev
      }

      return {
        x: prev.x + dx * smoothingFactor,
        y: prev.y + dy * smoothingFactor
      }
    })

    animationFrameRef.current = requestAnimationFrame(updateSmoothPosition)
  }, [smoothing, smoothingFactor])

  // Handle mouse movement
  const handleMouseMove = useCallback((event: MouseEvent) => {
    const newPosition = { x: event.clientX, y: event.clientY }
    targetPosition.current = newPosition
    
    if (trackingDelay === 0) {
      setMousePosition(newPosition)
    } else {
      setTimeout(() => {
        setMousePosition(newPosition)
      }, trackingDelay)
    }

    // Update activity status
    setIsMouseActive(true)
    lastActivityRef.current = Date.now()

    // Clear existing timeout
    if (mouseTimeoutRef.current) {
      clearTimeout(mouseTimeoutRef.current)
    }

    // Set timeout to mark mouse as inactive
    mouseTimeoutRef.current = setTimeout(() => {
      setIsMouseActive(false)
    }, 1000) // Mouse considered inactive after 1 second of no movement

    // Check if mouse is in target element
    if (targetRef?.current) {
      const rect = targetRef.current.getBoundingClientRect()
      const isInside = 
        event.clientX >= rect.left &&
        event.clientX <= rect.right &&
        event.clientY >= rect.top &&
        event.clientY <= rect.bottom
      
      setIsMouseInTarget(isInside)
    }
  }, [targetRef, trackingDelay])

  // Handle mouse enter/leave for document
  const handleMouseEnter = useCallback(() => {
    setIsMouseActive(true)
  }, [])

  const handleMouseLeave = useCallback(() => {
    setIsMouseActive(false)
    setIsMouseInTarget(false)
  }, [])

  // Set up event listeners
  useEffect(() => {
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseenter', handleMouseEnter)
    document.addEventListener('mouseleave', handleMouseLeave)

    // Start smooth animation loop
    if (smoothing) {
      animationFrameRef.current = requestAnimationFrame(updateSmoothPosition)
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseenter', handleMouseEnter)
      document.removeEventListener('mouseleave', handleMouseLeave)

      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }

      if (mouseTimeoutRef.current) {
        clearTimeout(mouseTimeoutRef.current)
      }
    }
  }, [handleMouseMove, handleMouseEnter, handleMouseLeave, smoothing, updateSmoothPosition])

  // Calculate additional metrics
  const getDistanceFromTarget = useCallback((targetElement?: HTMLElement) => {
    const element = targetElement || targetRef?.current
    if (!element) return Infinity

    const rect = element.getBoundingClientRect()
    const centerX = rect.left + rect.width / 2
    const centerY = rect.top + rect.height / 2

    const position = smoothing ? smoothPosition : mousePosition
    return Math.sqrt(
      Math.pow(position.x - centerX, 2) + 
      Math.pow(position.y - centerY, 2)
    )
  }, [mousePosition, smoothPosition, smoothing, targetRef])

  const getAngleFromTarget = useCallback((targetElement?: HTMLElement) => {
    const element = targetElement || targetRef?.current
    if (!element) return 0

    const rect = element.getBoundingClientRect()
    const centerX = rect.left + rect.width / 2
    const centerY = rect.top + rect.height / 2

    const position = smoothing ? smoothPosition : mousePosition
    return Math.atan2(position.y - centerY, position.x - centerX)
  }, [mousePosition, smoothPosition, smoothing, targetRef])

  const getRelativePosition = useCallback((targetElement?: HTMLElement) => {
    const element = targetElement || targetRef?.current
    if (!element) return { x: 0, y: 0 }

    const rect = element.getBoundingClientRect()
    const position = smoothing ? smoothPosition : mousePosition

    return {
      x: position.x - rect.left,
      y: position.y - rect.top
    }
  }, [mousePosition, smoothPosition, smoothing, targetRef])

  return {
    mousePosition: smoothing ? smoothPosition : mousePosition,
    rawMousePosition: mousePosition,
    isMouseActive,
    isMouseInTarget,
    getDistanceFromTarget,
    getAngleFromTarget,
    getRelativePosition
  }
}

// Hook for tracking mouse speed and acceleration
export function useMouseVelocity() {
  const [velocity, setVelocity] = useState({ x: 0, y: 0 })
  const [speed, setSpeed] = useState(0)
  const [acceleration, setAcceleration] = useState({ x: 0, y: 0 })
  
  const previousPosition = useRef<MousePosition>({ x: 0, y: 0 })
  const previousVelocity = useRef({ x: 0, y: 0 })
  const lastTime = useRef(Date.now())

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      const currentTime = Date.now()
      const deltaTime = (currentTime - lastTime.current) / 1000 // Convert to seconds
      
      if (deltaTime > 0) {
        // Calculate velocity
        const newVelocity = {
          x: (event.clientX - previousPosition.current.x) / deltaTime,
          y: (event.clientY - previousPosition.current.y) / deltaTime
        }
        
        // Calculate speed (magnitude of velocity)
        const newSpeed = Math.sqrt(newVelocity.x ** 2 + newVelocity.y ** 2)
        
        // Calculate acceleration
        const newAcceleration = {
          x: (newVelocity.x - previousVelocity.current.x) / deltaTime,
          y: (newVelocity.y - previousVelocity.current.y) / deltaTime
        }
        
        setVelocity(newVelocity)
        setSpeed(newSpeed)
        setAcceleration(newAcceleration)
        
        previousVelocity.current = newVelocity
      }
      
      previousPosition.current = { x: event.clientX, y: event.clientY }
      lastTime.current = currentTime
    }

    document.addEventListener('mousemove', handleMouseMove)
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
    }
  }, [])

  return { velocity, speed, acceleration }
}
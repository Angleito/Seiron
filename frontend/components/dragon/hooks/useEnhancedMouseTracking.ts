'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { useMouseTracking } from './useMouseTracking'
import type { 
  EnhancedMouseTrackingReturn, 
  SVGInteractionState, 
  DragonPart,
  SVGInteractionZones
} from '../types'
import { INTERACTION_ZONES } from '../constants'

interface UseEnhancedMouseTrackingOptions {
  elementRef: React.RefObject<SVGElement | HTMLElement>
  svgZones?: SVGInteractionZones
  enabled?: boolean
  smoothing?: number
  eyeTrackingEnabled?: boolean
  headRotationEnabled?: boolean
  proximityThreshold?: number
  cursorEffectsEnabled?: boolean
  magneticCursorEnabled?: boolean
  onPartHover?: (part: DragonPart | null, event?: MouseEvent) => void
  onProximityChange?: (zone: 'inner' | 'outer' | 'max' | 'none') => void
}

interface CursorEffect {
  id: string
  x: number
  y: number
  type: 'spark' | 'glow' | 'trail' | 'magnetic'
  intensity: number
  duration: number
  color: string
}

interface EyeTrackingState {
  leftEye: { 
    rotation: { x: number; y: number }
    pupilPosition: { x: number; y: number }
    blinkState: 'open' | 'closing' | 'closed' | 'opening'
  }
  rightEye: { 
    rotation: { x: number; y: number }
    pupilPosition: { x: number; y: number }
    blinkState: 'open' | 'closing' | 'closed' | 'opening'
  }
  isTracking: boolean
  lastBlinkTime: number
}

interface MagneticCursorState {
  magneticTarget: DragonPart | null
  magneticStrength: number
  offsetPosition: { x: number; y: number }
  isSnappedToTarget: boolean
}

// Default SVG zones (same as in useSVGInteraction)
const DEFAULT_SVG_ZONES: SVGInteractionZones = {
  head: { x: 250, y: 150, radius: 60 },
  eyes: {
    left: { x: 220, y: 130, radius: 15 },
    right: { x: 280, y: 130, radius: 15 }
  },
  body: {
    segments: [
      { x: 200, y: 200, width: 100, height: 150 },
      { x: 180, y: 350, width: 140, height: 100 }
    ]
  },
  limbs: {
    frontArms: [
      { d: 'M150,250 L120,300 L100,350', bounds: { x: 100, y: 250, width: 50, height: 100 } },
      { d: 'M350,250 L380,300 L400,350', bounds: { x: 350, y: 250, width: 50, height: 100 } }
    ],
    rearArms: [
      { d: 'M160,400 L130,450 L110,500', bounds: { x: 110, y: 400, width: 50, height: 100 } },
      { d: 'M340,400 L370,450 L390,500', bounds: { x: 340, y: 400, width: 50, height: 100 } }
    ]
  },
  tail: {
    segments: [
      { d: 'M300,450 Q350,480 380,520 Q400,550 420,600', bounds: { x: 300, y: 450, width: 120, height: 150 } }
    ]
  },
  dragonBalls: {
    positions: [
      { cx: 150, cy: 100, r: 20 },
      { cx: 350, cy: 100, r: 20 },
      { cx: 100, cy: 250, r: 20 },
      { cx: 400, cy: 250, r: 20 },
      { cx: 120, cy: 400, r: 20 },
      { cx: 380, cy: 400, r: 20 },
      { cx: 250, cy: 550, r: 20 }
    ]
  }
}

export function useEnhancedMouseTracking({
  elementRef,
  svgZones = DEFAULT_SVG_ZONES,
  enabled = true,
  smoothing = 0.15,
  eyeTrackingEnabled = true,
  headRotationEnabled = true,
  proximityThreshold = INTERACTION_ZONES.proximity.outer,
  cursorEffectsEnabled = true,
  magneticCursorEnabled = false,
  onPartHover,
  onProximityChange
}: UseEnhancedMouseTrackingOptions): EnhancedMouseTrackingReturn & {
  eyeTracking: EyeTrackingState
  cursorEffects: CursorEffect[]
  magneticCursor: MagneticCursorState
  proximityZone: 'inner' | 'outer' | 'max' | 'none'
  performanceMetrics: {
    updateFrequency: number
    averageLatency: number
    missedFrames: number
  }
} {
  // Base mouse tracking
  const baseMouseTracking = useMouseTracking({
    elementRef,
    enabled,
    smoothing,
    proximityThreshold
  })

  // Enhanced state management
  const [svgState, setSvgState] = useState<SVGInteractionState>({
    hoveredPart: null,
    activePart: null,
    focusedPart: null,
    cursorPosition: { x: 0, y: 0 },
    eyeRotation: { 
      left: { x: 0, y: 0 }, 
      right: { x: 0, y: 0 } 
    },
    headRotation: { x: 0, y: 0 },
    isKeyboardNavigating: false,
    touchTargets: new Map()
  })

  const [eyeTracking, setEyeTracking] = useState<EyeTrackingState>({
    leftEye: { 
      rotation: { x: 0, y: 0 },
      pupilPosition: { x: 0, y: 0 },
      blinkState: 'open'
    },
    rightEye: { 
      rotation: { x: 0, y: 0 },
      pupilPosition: { x: 0, y: 0 },
      blinkState: 'open'
    },
    isTracking: false,
    lastBlinkTime: Date.now()
  })

  const [cursorEffects, setCursorEffects] = useState<CursorEffect[]>([])
  const [magneticCursor, setMagneticCursor] = useState<MagneticCursorState>({
    magneticTarget: null,
    magneticStrength: 0,
    offsetPosition: { x: 0, y: 0 },
    isSnappedToTarget: false
  })

  const [proximityZone, setProximityZone] = useState<'inner' | 'outer' | 'max' | 'none'>('none')
  const [performanceMetrics, setPerformanceMetrics] = useState({
    updateFrequency: 0,
    averageLatency: 0,
    missedFrames: 0
  })

  // Performance tracking refs
  const frameCountRef = useRef(0)
  const lastUpdateTimeRef = useRef(Date.now())
  const latencyMeasurementsRef = useRef<number[]>([])
  const missedFramesRef = useRef(0)

  // Enhanced element detection for SVG
  const getElementAtPosition = useCallback((x: number, y: number): DragonPart | null => {
    if (!elementRef.current) return null

    const rect = elementRef.current.getBoundingClientRect()
    const localX = x - rect.left
    const localY = y - rect.top

    // Check dragon balls first (highest priority for interaction)
    if (svgZones.dragonBalls?.positions) {
      for (const ball of svgZones.dragonBalls.positions) {
        const dx = localX - ball.cx
        const dy = localY - ball.cy
        if (Math.sqrt(dx * dx + dy * dy) <= ball.r) {
          return 'dragon-ball'
        }
      }
    }

    // Check eyes
    if (svgZones.eyes?.left) {
      const leftEyeDx = localX - svgZones.eyes.left.x
      const leftEyeDy = localY - svgZones.eyes.left.y
      if (Math.sqrt(leftEyeDx * leftEyeDx + leftEyeDy * leftEyeDy) <= (svgZones.eyes.left.radius || 15)) {
        return 'left-eye'
      }
    }

    if (svgZones.eyes?.right) {
      const rightEyeDx = localX - svgZones.eyes.right.x
      const rightEyeDy = localY - svgZones.eyes.right.y
      if (Math.sqrt(rightEyeDx * rightEyeDx + rightEyeDy * rightEyeDy) <= (svgZones.eyes.right.radius || 15)) {
        return 'right-eye'
      }
    }

    // Check head
    if (svgZones.head) {
      const headDx = localX - svgZones.head.x
      const headDy = localY - svgZones.head.y
      if (Math.sqrt(headDx * headDx + headDy * headDy) <= svgZones.head.radius) {
        return 'head'
      }
    }

    // Check limbs
    if (svgZones.limbs?.frontArms) {
      for (let i = 0; i < svgZones.limbs.frontArms.length; i++) {
        const arm = svgZones.limbs.frontArms[i]
        if (isPointInRect(localX, localY, arm.bounds)) {
          return i === 0 ? 'left-arm' : 'right-arm'
        }
      }
    }

    if (svgZones.limbs?.rearArms) {
      for (let i = 0; i < svgZones.limbs.rearArms.length; i++) {
        const leg = svgZones.limbs.rearArms[i]
        if (isPointInRect(localX, localY, leg.bounds)) {
          return i === 0 ? 'left-leg' : 'right-leg'
        }
      }
    }

    // Check tail
    if (svgZones.tail?.segments) {
      for (const tailSegment of svgZones.tail.segments) {
        if (isPointInRect(localX, localY, tailSegment.bounds)) {
          return 'tail'
        }
      }
    }

    // Check body
    if (svgZones.body?.segments) {
      for (const bodySegment of svgZones.body.segments) {
        if (isPointInRect(localX, localY, bodySegment)) {
          return 'body'
        }
      }
    }

    return null
  }, [elementRef, svgZones])

  // Utility function for rectangle collision
  const isPointInRect = useCallback((x: number, y: number, rect: { x: number; y: number; width: number; height: number }): boolean => {
    return x >= rect.x && x <= rect.x + rect.width && 
           y >= rect.y && y <= rect.y + rect.height
  }, [])

  // Enhanced eye tracking with realistic movement
  const updateEyeTracking = useCallback((mousePosition: { x: number; y: number }) => {
    if (!eyeTrackingEnabled || !elementRef.current) return

    const rect = elementRef.current.getBoundingClientRect()
    const localX = mousePosition.x - rect.left
    const localY = mousePosition.y - rect.top

    const calculateRealisticEyeMovement = (
      eyePos: { x: number; y: number }, 
      targetPos: { x: number; y: number },
      maxRotation = 12,
      maxPupilOffset = 8
    ) => {
      const dx = targetPos.x - eyePos.x
      const dy = targetPos.y - eyePos.y
      const distance = Math.sqrt(dx * dx + dy * dy)
      
      // Calculate eye rotation (eyelid movement)
      const rotationFactor = Math.min(distance / 100, 1)
      const rotation = {
        x: (dx / distance) * maxRotation * rotationFactor || 0,
        y: (dy / distance) * maxRotation * rotationFactor || 0
      }

      // Calculate pupil position within eye
      const pupilFactor = Math.min(distance / 80, 1)
      const pupilPosition = {
        x: (dx / distance) * maxPupilOffset * pupilFactor || 0,
        y: (dy / distance) * maxPupilOffset * pupilFactor || 0
      }

      return { rotation, pupilPosition }
    }

    const leftEyeMovement = svgZones.eyes?.left ? calculateRealisticEyeMovement(
      svgZones.eyes.left,
      { x: localX, y: localY }
    ) : { rotation: { x: 0, y: 0 }, pupilPosition: { x: 0, y: 0 } }

    const rightEyeMovement = svgZones.eyes?.right ? calculateRealisticEyeMovement(
      svgZones.eyes.right,
      { x: localX, y: localY }
    ) : { rotation: { x: 0, y: 0 }, pupilPosition: { x: 0, y: 0 } }

    // Simulate natural blinking
    const now = Date.now()
    const shouldBlink = now - eyeTracking.lastBlinkTime > 3000 + Math.random() * 4000 // 3-7 seconds

    setEyeTracking(prev => ({
      ...prev,
      leftEye: {
        ...prev.leftEye,
        rotation: leftEyeMovement.rotation,
        pupilPosition: leftEyeMovement.pupilPosition,
        blinkState: shouldBlink ? 'closing' : prev.leftEye.blinkState
      },
      rightEye: {
        ...prev.rightEye,
        rotation: rightEyeMovement.rotation,
        pupilPosition: rightEyeMovement.pupilPosition,
        blinkState: shouldBlink ? 'closing' : prev.rightEye.blinkState
      },
      isTracking: true,
      lastBlinkTime: shouldBlink ? now : prev.lastBlinkTime
    }))

    // Update SVG state
    setSvgState(prev => ({
      ...prev,
      eyeRotation: {
        left: leftEyeMovement.rotation,
        right: rightEyeMovement.rotation
      }
    }))
  }, [eyeTrackingEnabled, elementRef, svgZones.eyes])

  // Enhanced head rotation with inertia
  const updateHeadRotation = useCallback((mousePosition: { x: number; y: number }) => {
    if (!headRotationEnabled || !elementRef.current) return

    const rect = elementRef.current.getBoundingClientRect()
    const localX = mousePosition.x - rect.left
    const localY = mousePosition.y - rect.top

    if (!svgZones.head) return
    
    const dx = localX - svgZones.head.x
    const dy = localY - svgZones.head.y
    const distance = Math.sqrt(dx * dx + dy * dy)
    const maxDistance = 200
    const maxRotation = 15

    // Add some inertia and smoothing
    const targetRotation = {
      x: (dx / distance) * maxRotation * Math.min(distance / maxDistance, 1) || 0,
      y: (dy / distance) * maxRotation * Math.min(distance / maxDistance, 1) || 0
    }

    setSvgState(prev => {
      const smoothedRotation = {
        x: prev.headRotation.x + (targetRotation.x - prev.headRotation.x) * 0.2,
        y: prev.headRotation.y + (targetRotation.y - prev.headRotation.y) * 0.2
      }

      return {
        ...prev,
        headRotation: smoothedRotation
      }
    })
  }, [headRotationEnabled, elementRef, svgZones.head])

  // Magnetic cursor effect
  const updateMagneticCursor = useCallback((mousePosition: { x: number; y: number }) => {
    if (!magneticCursorEnabled) return

    const hoveredPart = getElementAtPosition(mousePosition.x, mousePosition.y)
    
    if (hoveredPart && hoveredPart !== 'body') { // Magnetic effect for interactive parts
      const partCenter = getPartCenter(hoveredPart)
      if (partCenter) {
        const dx = partCenter.x - mousePosition.x
        const dy = partCenter.y - mousePosition.y
        const distance = Math.sqrt(dx * dx + dy * dy)
        const magneticRadius = 60
        
        if (distance < magneticRadius) {
          const strength = 1 - (distance / magneticRadius)
          const pullStrength = strength * 0.3 // 30% pull towards center
          
          setMagneticCursor(prev => ({
            ...prev,
            magneticTarget: hoveredPart,
            magneticStrength: strength,
            offsetPosition: {
              x: dx * pullStrength,
              y: dy * pullStrength
            },
            isSnappedToTarget: distance < 20
          }))
          
          return
        }
      }
    }

    setMagneticCursor(prev => ({
      ...prev,
      magneticTarget: null,
      magneticStrength: 0,
      offsetPosition: { x: 0, y: 0 },
      isSnappedToTarget: false
    }))
  }, [magneticCursorEnabled, getElementAtPosition])

  // Get center position of dragon parts
  const getPartCenter = useCallback((part: DragonPart): { x: number; y: number } | null => {
    if (!elementRef.current) return null

    const rect = elementRef.current.getBoundingClientRect()

    switch (part) {
      case 'head':
        return svgZones.head ? {
          x: rect.left + svgZones.head.x,
          y: rect.top + svgZones.head.y
        } : null
      case 'left-eye':
        return svgZones.eyes?.left ? {
          x: rect.left + svgZones.eyes.left.x,
          y: rect.top + svgZones.eyes.left.y
        } : null
      case 'right-eye':
        return svgZones.eyes?.right ? {
          x: rect.left + svgZones.eyes.right.x,
          y: rect.top + svgZones.eyes.right.y
        } : null
      case 'body':
        const bodySegment = svgZones.body?.segments?.[0]
        return bodySegment ? {
          x: rect.left + bodySegment.x + bodySegment.width / 2,
          y: rect.top + bodySegment.y + bodySegment.height / 2
        } : null
      default:
        return null
    }
  }, [elementRef, svgZones])

  // Cursor effects management
  const addCursorEffect = useCallback((x: number, y: number, type: CursorEffect['type'], intensity = 1) => {
    if (!cursorEffectsEnabled) return

    const effectId = `effect_${Date.now()}_${Math.random()}`
    const effectColors = {
      'spark': '#FFD700',
      'glow': '#FF6B6B',
      'trail': '#4ECDC4',
      'magnetic': '#9B59B6'
    }

    const newEffect: CursorEffect = {
      id: effectId,
      x,
      y,
      type,
      intensity,
      duration: type === 'trail' ? 300 : 1000,
      color: effectColors[type]
    }

    setCursorEffects(prev => [...prev, newEffect])

    // Auto-remove effect
    setTimeout(() => {
      setCursorEffects(prev => prev.filter(effect => effect.id !== effectId))
    }, newEffect.duration)
  }, [cursorEffectsEnabled])

  // Enhanced proximity detection
  const updateProximityZone = useCallback((mousePosition: { x: number; y: number }) => {
    if (!elementRef.current) return

    const rect = elementRef.current.getBoundingClientRect()
    const dragonCenter = {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2
    }

    const distance = Math.sqrt(
      Math.pow(mousePosition.x - dragonCenter.x, 2) + 
      Math.pow(mousePosition.y - dragonCenter.y, 2)
    )

    let newZone: 'inner' | 'outer' | 'max' | 'none' = 'none'
    
    if (distance <= INTERACTION_ZONES.proximity.inner) {
      newZone = 'inner'
    } else if (distance <= INTERACTION_ZONES.proximity.outer) {
      newZone = 'outer'
    } else if (distance <= INTERACTION_ZONES.proximity.max) {
      newZone = 'max'
    }

    if (newZone !== proximityZone) {
      setProximityZone(newZone)
      onProximityChange?.(newZone)
      
      // Add proximity effect
      if (newZone !== 'none') {
        addCursorEffect(mousePosition.x, mousePosition.y, 'glow', newZone === 'inner' ? 2 : 1)
      }
    }
  }, [elementRef, proximityZone, onProximityChange, addCursorEffect])

  // Main mouse tracking update
  useEffect(() => {
    if (!enabled) return

    let animationFrameId: number

    const updateTracking = () => {
      const startTime = performance.now()
      frameCountRef.current++

      const mousePos = baseMouseTracking.mousePosition

      // Update SVG state
      const hoveredPart = getElementAtPosition(mousePos.x, mousePos.y)
      setSvgState(prev => {
        if (prev.hoveredPart !== hoveredPart) {
          onPartHover?.(hoveredPart)
        }
        return {
          ...prev,
          hoveredPart,
          cursorPosition: mousePos
        }
      })

      // Update various tracking systems
      updateEyeTracking(mousePos)
      updateHeadRotation(mousePos)
      updateMagneticCursor(mousePos)
      updateProximityZone(mousePos)

      // Performance tracking
      const endTime = performance.now()
      const latency = endTime - startTime
      latencyMeasurementsRef.current.push(latency)
      
      if (latencyMeasurementsRef.current.length > 100) {
        latencyMeasurementsRef.current.shift()
      }

      const now = Date.now()
      const timeSinceLastUpdate = now - lastUpdateTimeRef.current
      
      if (timeSinceLastUpdate > 0) {
        setPerformanceMetrics({
          updateFrequency: 1000 / timeSinceLastUpdate,
          averageLatency: latencyMeasurementsRef.current.reduce((a, b) => a + b, 0) / latencyMeasurementsRef.current.length,
          missedFrames: missedFramesRef.current
        })
      }

      lastUpdateTimeRef.current = now
      animationFrameId = requestAnimationFrame(updateTracking)
    }

    animationFrameId = requestAnimationFrame(updateTracking)

    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId)
      }
    }
  }, [
    enabled, 
    baseMouseTracking.mousePosition,
    getElementAtPosition,
    updateEyeTracking,
    updateHeadRotation,
    updateMagneticCursor,
    updateProximityZone,
    onPartHover
  ])

  // Handle blinking animation
  useEffect(() => {
    if (eyeTracking.leftEye.blinkState === 'closing' || eyeTracking.rightEye.blinkState === 'closing') {
      const blinkTimeout = setTimeout(() => {
        setEyeTracking(prev => ({
          ...prev,
          leftEye: { ...prev.leftEye, blinkState: 'opening' },
          rightEye: { ...prev.rightEye, blinkState: 'opening' }
        }))
      }, 150) // Blink duration

      return () => clearTimeout(blinkTimeout)
    }

    if (eyeTracking.leftEye.blinkState === 'opening' || eyeTracking.rightEye.blinkState === 'opening') {
      const openTimeout = setTimeout(() => {
        setEyeTracking(prev => ({
          ...prev,
          leftEye: { ...prev.leftEye, blinkState: 'open' },
          rightEye: { ...prev.rightEye, blinkState: 'open' }
        }))
      }, 100)

      return () => clearTimeout(openTimeout)
    }
  }, [eyeTracking.leftEye.blinkState, eyeTracking.rightEye.blinkState])

  return {
    ...baseMouseTracking,
    svgState,
    getElementAtPosition,
    updateEyeTracking,
    updateHeadRotation,
    eyeTracking,
    cursorEffects,
    magneticCursor,
    proximityZone,
    performanceMetrics
  }
}
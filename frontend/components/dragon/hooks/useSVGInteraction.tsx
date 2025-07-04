'use client'

import { useState, useRef, useCallback, useEffect, useMemo } from 'react'
import { useMouseTracking } from './useMouseTracking'
import { useTouchGestures } from './useTouchGestures'
import type { 
  EnhancedMouseTrackingReturn, 
  EnhancedTouchGestureReturn,
  SVGInteractionState, 
  SVGInteractionZones,
  DragonPart,
  TouchGesture,
  KeyboardNavigationConfig,
  SVGAccessibilityProps
} from '../types'
import { INTERACTION_ZONES } from '../constants'

interface UseSVGInteractionOptions {
  elementRef: React.RefObject<SVGElement | HTMLElement>
  svgZones?: SVGInteractionZones
  enabled?: boolean
  enableKeyboardNavigation?: boolean
  enableTouchTargetExpansion?: boolean
  onPartHover?: (part: DragonPart | null, event?: MouseEvent) => void
  onPartClick?: (part: DragonPart, event: MouseEvent) => void
  onPartFocus?: (part: DragonPart | null) => void
  onGestureDetected?: (gesture: TouchGesture, part?: DragonPart) => void
}

// Default SVG zones configuration for dragon
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

// Keyboard navigation configuration
const DEFAULT_KEYBOARD_CONFIG: KeyboardNavigationConfig = {
  focusableElements: ['head', 'left-eye', 'right-eye', 'body', 'left-arm', 'right-arm', 'tail'],
  focusIndicatorStyle: {
    outline: '2px solid #FFD700',
    outlineOffset: '2px',
    filter: 'drop-shadow(0 0 8px rgba(255, 215, 0, 0.8))'
  },
  announcements: {
    'head': 'Dragon head - interactive',
    'left-eye': 'Left eye - tracks cursor movement',
    'right-eye': 'Right eye - tracks cursor movement',
    'body': 'Dragon body - main interaction area',
    'left-arm': 'Left arm - can be activated',
    'right-arm': 'Right arm - can be activated',
    'left-leg': 'Left leg - interactive',
    'right-leg': 'Right leg - interactive',
    'tail': 'Dragon tail - swipes and gestures',
    'wings': 'Wings - hover effects',
    'dragon-ball': 'Dragon ball - collectible orb'
  },
  keyBindings: {}
}

export function useSVGInteraction(options: UseSVGInteractionOptions): {
  mouseTracking: EnhancedMouseTrackingReturn
  touchGestures: EnhancedTouchGestureReturn
  svgState: SVGInteractionState
  keyboardNavigation: {
    currentFocus: DragonPart | null
    navigateToNext: () => void
    navigateToPrevious: () => void
    activateCurrent: () => void
  }
  accessibility: {
    getAccessibilityProps: (part: DragonPart) => SVGAccessibilityProps
    announceChange: (message: string) => void
  }
  utils: {
    isPointInPath: (x: number, y: number, pathData: string) => boolean
    isPointInCircle: (x: number, y: number, circle: { cx: number; cy: number; r: number }) => boolean
    isPointInRect: (x: number, y: number, rect: { x: number; y: number; width: number; height: number }) => boolean
    getExpandedTouchTarget: (part: DragonPart, expansion?: number) => { x: number; y: number; width: number; height: number }
  }
} {
  const {
    elementRef,
    svgZones = DEFAULT_SVG_ZONES,
    enabled = true,
    enableKeyboardNavigation = true,
    enableTouchTargetExpansion = true,
    onPartHover,
    onPartClick,
    onPartFocus,
    onGestureDetected
  } = options

  // State management
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

  // Refs for performance optimization
  const pathCacheRef = useRef<Map<string, Path2D>>(new Map())
  const announcementRef = useRef<HTMLDivElement | null>(null)
  const keyboardConfigRef = useRef<KeyboardNavigationConfig>(DEFAULT_KEYBOARD_CONFIG)

  // Base mouse tracking hook
  const baseMouseTracking = useMouseTracking({
    elementRef,
    enabled,
    smoothing: 0.15,
    proximityThreshold: INTERACTION_ZONES.proximity.outer
  })

  // Base touch gesture hook
  const baseTouchGestures = useTouchGestures({
    enabled,
    onTap: (gesture) => {
      const part = getElementAtPosition(gesture.endPosition.x, gesture.endPosition.y)
      if (part && onPartClick) {
        onPartClick(part, new MouseEvent('click', {
          clientX: gesture.endPosition.x,
          clientY: gesture.endPosition.y
        }))
      }
      onGestureDetected?.(gesture, part || undefined)
    },
    onSwipe: (gesture) => {
      const part = getElementAtPosition(gesture.startPosition.x, gesture.startPosition.y)
      onGestureDetected?.(gesture, part || undefined)
    },
    onPinch: (gesture) => {
      const center = {
        x: (gesture.startPosition.x + gesture.endPosition.x) / 2,
        y: (gesture.startPosition.y + gesture.endPosition.y) / 2
      }
      const part = getElementAtPosition(center.x, center.y)
      onGestureDetected?.(gesture, part || undefined)
    }
  })

  // Utility functions
  const isPointInPath = useCallback((x: number, y: number, pathData: string): boolean => {
    if (!pathCacheRef.current.has(pathData)) {
      const path = new Path2D(pathData)
      pathCacheRef.current.set(pathData, path)
    }
    
    const path = pathCacheRef.current.get(pathData)!
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')!
    
    return ctx.isPointInPath(path, x, y)
  }, [])

  const isPointInCircle = useCallback((x: number, y: number, circle: { cx: number; cy: number; r: number }): boolean => {
    const dx = x - circle.cx
    const dy = y - circle.cy
    return Math.sqrt(dx * dx + dy * dy) <= circle.r
  }, [])

  const isPointInRect = useCallback((x: number, y: number, rect: { x: number; y: number; width: number; height: number }): boolean => {
    return x >= rect.x && x <= rect.x + rect.width && 
           y >= rect.y && y <= rect.y + rect.height
  }, [])

  // Enhanced element detection for SVG parts
  const getElementAtPosition = useCallback((x: number, y: number): DragonPart | null => {
    if (!elementRef.current) return null

    const rect = elementRef.current.getBoundingClientRect()
    const localX = x - rect.left
    const localY = y - rect.top

    // Check dragon balls first (smallest targets)
    for (let i = 0; i < svgZones.dragonBalls.positions.length; i++) {
      const ball = svgZones.dragonBalls.positions[i]
      if (isPointInCircle(localX, localY, ball)) {
        return 'dragon-ball'
      }
    }

    // Check eyes
    if (isPointInCircle(localX, localY, { ...svgZones.eyes.left, r: svgZones.eyes.left.radius || 15 })) {
      return 'left-eye'
    }
    if (isPointInCircle(localX, localY, { ...svgZones.eyes.right, r: svgZones.eyes.right.radius || 15 })) {
      return 'right-eye'
    }

    // Check head
    if (isPointInCircle(localX, localY, { cx: svgZones.head.x, cy: svgZones.head.y, r: svgZones.head.radius })) {
      return 'head'
    }

    // Check limbs (arms and legs)
    for (const arm of svgZones.limbs.frontArms) {
      if (isPointInRect(localX, localY, arm.bounds)) {
        return localX < 250 ? 'left-arm' : 'right-arm'
      }
    }

    for (const leg of svgZones.limbs.rearArms) {
      if (isPointInRect(localX, localY, leg.bounds)) {
        return localX < 250 ? 'left-leg' : 'right-leg'
      }
    }

    // Check tail
    for (const tailSegment of svgZones.tail.segments) {
      if (isPointInRect(localX, localY, tailSegment.bounds)) {
        return 'tail'
      }
    }

    // Check body segments
    for (const bodySegment of svgZones.body.segments) {
      if (isPointInRect(localX, localY, bodySegment)) {
        return 'body'
      }
    }

    return null
  }, [elementRef, svgZones, isPointInCircle, isPointInRect])

  // Eye tracking calculation
  const updateEyeTracking = useCallback((mousePosition: { x: number; y: number }) => {
    if (!elementRef.current) return

    const rect = elementRef.current.getBoundingClientRect()
    const localX = mousePosition.x - rect.left
    const localY = mousePosition.y - rect.top

    // Calculate rotation for each eye
    const calculateEyeRotation = (eyePos: { x: number; y: number }, maxRotation = 8) => {
      const dx = localX - eyePos.x
      const dy = localY - eyePos.y
      const distance = Math.sqrt(dx * dx + dy * dy)
      const maxDistance = 100

      const normalizedDistance = Math.min(distance / maxDistance, 1)
      return {
        x: (dx / distance) * maxRotation * normalizedDistance || 0,
        y: (dy / distance) * maxRotation * normalizedDistance || 0
      }
    }

    setSvgState(prev => ({
      ...prev,
      eyeRotation: {
        left: calculateEyeRotation(svgZones.eyes.left),
        right: calculateEyeRotation(svgZones.eyes.right)
      }
    }))
  }, [elementRef, svgZones.eyes])

  // Head rotation calculation
  const updateHeadRotation = useCallback((mousePosition: { x: number; y: number }) => {
    if (!elementRef.current) return

    const rect = elementRef.current.getBoundingClientRect()
    const localX = mousePosition.x - rect.left
    const localY = mousePosition.y - rect.top

    const dx = localX - svgZones.head.x
    const dy = localY - svgZones.head.y
    const distance = Math.sqrt(dx * dx + dy * dy)
    const maxDistance = 150
    const maxRotation = 10

    const normalizedDistance = Math.min(distance / maxDistance, 1)
    const rotationX = (dx / distance) * maxRotation * normalizedDistance || 0
    const rotationY = (dy / distance) * maxRotation * normalizedDistance || 0

    setSvgState(prev => ({
      ...prev,
      headRotation: { x: rotationX, y: rotationY }
    }))
  }, [elementRef, svgZones.head])

  // Touch target expansion for mobile accessibility
  const getExpandedTouchTarget = useCallback((part: DragonPart, expansion = INTERACTION_ZONES.touch.comfort): {
    x: number; y: number; width: number; height: number
  } => {
    const getPartBounds = (part: DragonPart) => {
      switch (part) {
        case 'head':
          return {
            x: svgZones.head.x - svgZones.head.radius,
            y: svgZones.head.y - svgZones.head.radius,
            width: svgZones.head.radius * 2,
            height: svgZones.head.radius * 2
          }
        case 'left-eye':
          const leftRadius = svgZones.eyes.left.radius || 15
          return {
            x: svgZones.eyes.left.x - leftRadius,
            y: svgZones.eyes.left.y - leftRadius,
            width: leftRadius * 2,
            height: leftRadius * 2
          }
        case 'right-eye':
          const rightRadius = svgZones.eyes.right.radius || 15
          return {
            x: svgZones.eyes.right.x - rightRadius,
            y: svgZones.eyes.right.y - rightRadius,
            width: rightRadius * 2,
            height: rightRadius * 2
          }
        case 'body':
          return svgZones.body.segments[0] || { x: 200, y: 200, width: 100, height: 150 }
        case 'left-arm':
          return svgZones.limbs.frontArms[0]?.bounds || { x: 100, y: 250, width: 50, height: 100 }
        case 'right-arm':
          return svgZones.limbs.frontArms[1]?.bounds || { x: 350, y: 250, width: 50, height: 100 }
        case 'tail':
          return svgZones.tail.segments[0]?.bounds || { x: 300, y: 450, width: 120, height: 150 }
        default:
          return { x: 0, y: 0, width: 44, height: 44 }
      }
    }

    const bounds = getPartBounds(part)
    const halfExpansion = expansion / 2

    return {
      x: bounds.x - halfExpansion,
      y: bounds.y - halfExpansion,
      width: Math.max(bounds.width + expansion, INTERACTION_ZONES.touch.minArea),
      height: Math.max(bounds.height + expansion, INTERACTION_ZONES.touch.minArea)
    }
  }, [svgZones])

  // Update touch targets when zones change
  useEffect(() => {
    if (!enableTouchTargetExpansion) return

    const newTouchTargets = new Map<DragonPart, { x: number; y: number; width: number; height: number }>()
    
    const focusableElements = keyboardConfigRef.current.focusableElements
    focusableElements.forEach(part => {
      newTouchTargets.set(part, getExpandedTouchTarget(part))
    })

    setSvgState(prev => ({
      ...prev,
      touchTargets: newTouchTargets
    }))
  }, [svgZones, enableTouchTargetExpansion, getExpandedTouchTarget])

  // Mouse event handling with SVG awareness
  useEffect(() => {
    if (!enabled) return

    const handleMouseMove = (e: MouseEvent) => {
      const part = getElementAtPosition(e.clientX, e.clientY)
      
      setSvgState(prev => {
        if (prev.hoveredPart !== part) {
          onPartHover?.(part, e)
          return {
            ...prev,
            hoveredPart: part,
            cursorPosition: { x: e.clientX, y: e.clientY }
          }
        }
        return {
          ...prev,
          cursorPosition: { x: e.clientX, y: e.clientY }
        }
      })

      // Update eye and head tracking
      updateEyeTracking({ x: e.clientX, y: e.clientY })
      updateHeadRotation({ x: e.clientX, y: e.clientY })
    }

    const handleClick = (e: MouseEvent) => {
      const part = getElementAtPosition(e.clientX, e.clientY)
      if (part) {
        setSvgState(prev => ({ ...prev, activePart: part }))
        onPartClick?.(part, e)
      }
    }

    document.addEventListener('mousemove', handleMouseMove, { passive: true })
    document.addEventListener('click', handleClick)

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('click', handleClick)
    }
  }, [enabled, getElementAtPosition, onPartHover, onPartClick, updateEyeTracking, updateHeadRotation])

  // Keyboard navigation
  const keyboardNavigation = useMemo(() => {
    const focusableElements = keyboardConfigRef.current.focusableElements
    let currentIndex = svgState.focusedPart 
      ? focusableElements.indexOf(svgState.focusedPart) 
      : -1

    return {
      currentFocus: svgState.focusedPart,
      navigateToNext: () => {
        if (!enableKeyboardNavigation) return
        const nextIndex = (currentIndex + 1) % focusableElements.length
        const nextPart = focusableElements[nextIndex]
        setSvgState(prev => ({ ...prev, focusedPart: nextPart, isKeyboardNavigating: true }))
        onPartFocus?.(nextPart)
        currentIndex = nextIndex
      },
      navigateToPrevious: () => {
        if (!enableKeyboardNavigation) return
        const prevIndex = currentIndex <= 0 ? focusableElements.length - 1 : currentIndex - 1
        const prevPart = focusableElements[prevIndex]
        setSvgState(prev => ({ ...prev, focusedPart: prevPart, isKeyboardNavigating: true }))
        onPartFocus?.(prevPart)
        currentIndex = prevIndex
      },
      activateCurrent: () => {
        if (svgState.focusedPart && onPartClick) {
          const mockEvent = new MouseEvent('click', { 
            clientX: svgState.cursorPosition.x, 
            clientY: svgState.cursorPosition.y 
          })
          onPartClick(svgState.focusedPart, mockEvent)
        }
      }
    }
  }, [svgState.focusedPart, enableKeyboardNavigation, onPartFocus, onPartClick, svgState.cursorPosition])

  // Accessibility utilities
  const accessibility = useMemo(() => ({
    getAccessibilityProps: (part: DragonPart): SVGAccessibilityProps => ({
      role: 'button',
      'aria-label': keyboardConfigRef.current.announcements[part] || `Dragon ${part}`,
      'aria-describedby': `dragon-${part}-description`,
      'aria-live': 'polite',
      tabIndex: svgState.focusedPart === part ? 0 : -1,
      onKeyDown: (event: React.KeyboardEvent) => {
        switch (event.key) {
          case 'Tab':
            if (event.shiftKey) {
              keyboardNavigation.navigateToPrevious()
            } else {
              keyboardNavigation.navigateToNext()
            }
            event.preventDefault()
            break
          case 'Enter':
          case ' ':
            keyboardNavigation.activateCurrent()
            event.preventDefault()
            break
        }
      },
      onFocus: () => {
        setSvgState(prev => ({ ...prev, focusedPart: part, isKeyboardNavigating: true }))
        onPartFocus?.(part)
      },
      onBlur: () => {
        setSvgState(prev => ({ ...prev, isKeyboardNavigating: false }))
      }
    }),
    announceChange: (message: string) => {
      if (announcementRef.current) {
        announcementRef.current.textContent = message
      }
    }
  }), [svgState.focusedPart, keyboardNavigation, onPartFocus])

  // Enhanced return objects
  const enhancedMouseTracking: EnhancedMouseTrackingReturn = {
    ...baseMouseTracking,
    svgState,
    getElementAtPosition,
    updateEyeTracking,
    updateHeadRotation
  }

  const enhancedTouchGestures: EnhancedTouchGestureReturn = {
    ...baseTouchGestures,
    svgTouchTargets: svgState.touchTargets,
    expandTouchTarget: (part: DragonPart, expansion: number) => {
      const expandedTarget = getExpandedTouchTarget(part, expansion)
      setSvgState(prev => ({
        ...prev,
        touchTargets: new Map(prev.touchTargets.set(part, expandedTarget))
      }))
    },
    handleSVGTouch: (part: DragonPart, event: React.TouchEvent) => {
      const touch = event.touches[0]
      if (touch && onPartClick) {
        onPartClick(part, new MouseEvent('click', {
          clientX: touch.clientX,
          clientY: touch.clientY
        }))
      }
    }
  }

  return {
    mouseTracking: enhancedMouseTracking,
    touchGestures: enhancedTouchGestures,
    svgState,
    keyboardNavigation,
    accessibility,
    utils: {
      isPointInPath,
      isPointInCircle,
      isPointInRect,
      getExpandedTouchTarget
    }
  }
}

// Accessibility announcement component (invisible but available to screen readers)
export function SVGAccessibilityAnnouncer() {
  return (
    <div
      ref={(el) => {
        // This allows the announceChange function to work
        if (el) {
          el.setAttribute('aria-live', 'polite')
          el.setAttribute('aria-atomic', 'true')
        }
      }}
      className="sr-only"
      aria-live="polite"
      aria-atomic="true"
    />
  )
}
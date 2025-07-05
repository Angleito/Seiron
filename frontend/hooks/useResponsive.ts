'use client'

import { useState, useEffect } from 'react'

// Breakpoint definitions matching Tailwind defaults
export const BREAKPOINTS = {
  xs: 475,    // Extra small devices
  sm: 640,    // Small devices
  md: 768,    // Medium devices
  lg: 1024,   // Large devices
  xl: 1280,   // Extra large devices
  '2xl': 1536 // 2X large devices
} as const

export type Breakpoint = keyof typeof BREAKPOINTS

interface UseResponsiveReturn {
  // Current breakpoint
  breakpoint: Breakpoint
  // Check if current screen is at least the given breakpoint
  isAtLeast: (bp: Breakpoint) => boolean
  // Check if current screen is at most the given breakpoint
  isAtMost: (bp: Breakpoint) => boolean
  // Check if current screen is exactly the given breakpoint
  isExactly: (bp: Breakpoint) => boolean
  // Check if current screen is between two breakpoints (inclusive)
  isBetween: (min: Breakpoint, max: Breakpoint) => boolean
  // Get numeric window width
  width: number
  // Get numeric window height
  height: number
  // Check if device is in portrait orientation
  isPortrait: boolean
  // Check if device is in landscape orientation
  isLandscape: boolean
  // Check if device has touch capability
  isTouchDevice: boolean
  // Check if device prefers reduced motion
  prefersReducedMotion: boolean
  // Check if device is in high contrast mode
  isHighContrast: boolean
  // Check if device has low battery (if supported)
  isLowBattery: boolean
  // Device pixel ratio for high DPI screens
  pixelRatio: number
}

export function useResponsive(): UseResponsiveReturn {
  const [windowSize, setWindowSize] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 1024,
    height: typeof window !== 'undefined' ? window.innerHeight : 768
  })
  
  const [isTouchDevice, setIsTouchDevice] = useState(false)
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)
  const [isHighContrast, setIsHighContrast] = useState(false)
  const [isLowBattery, setIsLowBattery] = useState(false)
  const [pixelRatio, setPixelRatio] = useState(1)

  // Calculate current breakpoint
  const getBreakpoint = (width: number): Breakpoint => {
    if (width < BREAKPOINTS.xs) return 'xs'
    if (width < BREAKPOINTS.sm) return 'sm'
    if (width < BREAKPOINTS.md) return 'md'
    if (width < BREAKPOINTS.lg) return 'lg'
    if (width < BREAKPOINTS.xl) return 'xl'
    return '2xl'
  }

  const breakpoint = getBreakpoint(windowSize.width)

  // Helper functions
  const isAtLeast = (bp: Breakpoint): boolean => {
    return windowSize.width >= BREAKPOINTS[bp]
  }

  const isAtMost = (bp: Breakpoint): boolean => {
    return windowSize.width <= BREAKPOINTS[bp]
  }

  const isExactly = (bp: Breakpoint): boolean => {
    const current = getBreakpoint(windowSize.width)
    return current === bp
  }

  const isBetween = (min: Breakpoint, max: Breakpoint): boolean => {
    return windowSize.width >= BREAKPOINTS[min] && windowSize.width <= BREAKPOINTS[max]
  }

  const isPortrait = windowSize.height > windowSize.width
  const isLandscape = windowSize.width > windowSize.height

  // Set up event listeners
  useEffect(() => {
    // Handle window resize
    const handleResize = () => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight
      })
    }

    // Check touch capability
    const checkTouch = () => {
      setIsTouchDevice(
        'ontouchstart' in window ||
        navigator.maxTouchPoints > 0 ||
        (navigator as any).msMaxTouchPoints > 0
      )
    }

    // Check accessibility preferences
    const checkAccessibility = () => {
      // Reduced motion
      const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
      setPrefersReducedMotion(motionQuery.matches)
      
      // High contrast
      const contrastQuery = window.matchMedia('(prefers-contrast: high)')
      setIsHighContrast(contrastQuery.matches)
      
      // Listen for changes
      motionQuery.addEventListener('change', (e) => setPrefersReducedMotion(e.matches))
      contrastQuery.addEventListener('change', (e) => setIsHighContrast(e.matches))
    }

    // Check battery status (if supported)
    const checkBattery = async () => {
      if ('getBattery' in navigator) {
        try {
          const battery = await (navigator as any).getBattery()
          setIsLowBattery(battery.level < 0.2 && !battery.charging)
          
          battery.addEventListener('levelchange', () => {
            setIsLowBattery(battery.level < 0.2 && !battery.charging)
          })
          
          battery.addEventListener('chargingchange', () => {
            setIsLowBattery(battery.level < 0.2 && !battery.charging)
          })
        } catch (error) {
          console.log('Battery API not supported')
        }
      }
    }

    // Check pixel ratio
    const checkPixelRatio = () => {
      setPixelRatio(window.devicePixelRatio || 1)
    }

    // Initial setup
    handleResize()
    checkTouch()
    checkAccessibility()
    checkBattery()
    checkPixelRatio()

    // Add event listeners
    window.addEventListener('resize', handleResize)
    window.addEventListener('orientationchange', handleResize)
    
    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize)
      window.removeEventListener('orientationchange', handleResize)
    }
  }, [])

  return {
    breakpoint,
    isAtLeast,
    isAtMost,
    isExactly,
    isBetween,
    width: windowSize.width,
    height: windowSize.height,
    isPortrait,
    isLandscape,
    isTouchDevice,
    prefersReducedMotion,
    isHighContrast,
    isLowBattery,
    pixelRatio
  }
}

// Utility function to get responsive value based on breakpoint
export function getResponsiveValue<T>(
  breakpoint: Breakpoint,
  values: Partial<Record<Breakpoint, T>>,
  defaultValue: T
): T {
  // Try to find exact match
  if (values[breakpoint] !== undefined) {
    return values[breakpoint]!
  }
  
  // Fall back to smaller breakpoints
  const breakpointOrder: Breakpoint[] = ['xs', 'sm', 'md', 'lg', 'xl', '2xl']
  const currentIndex = breakpointOrder.indexOf(breakpoint)
  
  for (let i = currentIndex - 1; i >= 0; i--) {
    const bp = breakpointOrder[i]
    if (bp && values[bp] !== undefined) {
      return values[bp]!
    }
  }
  
  return defaultValue
}
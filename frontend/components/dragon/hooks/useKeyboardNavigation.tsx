'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import type { 
  DragonPart, 
  KeyboardNavigationConfig, 
  SVGAccessibilityProps 
} from '../types'
import { pipe } from 'fp-ts/function'
import * as O from 'fp-ts/Option'

interface UseKeyboardNavigationOptions {
  enabled?: boolean
  focusableElements?: DragonPart[]
  announcements?: Record<DragonPart, string>
  onPartFocus?: (part: DragonPart | null) => void
  onPartActivate?: (part: DragonPart, method: 'keyboard' | 'click') => void
  enableScreenReader?: boolean
  enableFocusTrapping?: boolean
  customKeyBindings?: Record<string, (part: DragonPart) => void>
}

interface KeyboardNavigationState {
  currentFocus: DragonPart | null
  focusIndex: number
  isNavigating: boolean
  lastNavigationTime: number
  navigationHistory: DragonPart[]
  focusMode: 'sequential' | 'spatial' | 'direct'
}

interface FocusIndicator {
  visible: boolean
  position: { x: number; y: number }
  size: { width: number; height: number }
  style: React.CSSProperties
}

interface ScreenReaderAnnouncement {
  id: string
  message: string
  priority: 'polite' | 'assertive'
  timestamp: number
}

// Default configuration
const DEFAULT_CONFIG: KeyboardNavigationConfig = {
  focusableElements: ['head', 'left-eye', 'right-eye', 'body', 'left-arm', 'right-arm', 'tail'],
  focusIndicatorStyle: {
    outline: '3px solid #FFD700',
    outlineOffset: '4px',
    borderRadius: '8px',
    boxShadow: '0 0 12px rgba(255, 215, 0, 0.8), inset 0 0 12px rgba(255, 215, 0, 0.3)',
    background: 'rgba(255, 215, 0, 0.1)',
    animation: 'focusPulse 1.5s ease-in-out infinite'
  },
  announcements: {
    'head': 'Dragon head - Main interaction area. Press Enter to wake the dragon.',
    'left-eye': 'Left eye - Tracks your movement. Press Enter to make it blink.',
    'right-eye': 'Right eye - Tracks your movement. Press Enter to make it blink.',
    'body': 'Dragon body - Central area. Press Enter to power up.',
    'left-arm': 'Left arm - Press Enter to activate arm movement.',
    'right-arm': 'Right arm - Press Enter to activate arm movement.',
    'left-leg': 'Left leg - Press Enter to activate leg movement.',
    'right-leg': 'Right leg - Press Enter to activate leg movement.',
    'tail': 'Dragon tail - Press Enter to make it swish.',
    'wings': 'Dragon wings - Press Enter to make them flutter.',
    'dragon-ball': 'Dragon ball - Mystical orb. Press Enter to collect.'
  },
  keyBindings: {}
}

export function useKeyboardNavigation({
  enabled = true,
  focusableElements = DEFAULT_CONFIG.focusableElements,
  announcements: announcementConfig = DEFAULT_CONFIG.announcements,
  onPartFocus,
  onPartActivate,
  enableScreenReader = true,
  enableFocusTrapping = false,
  customKeyBindings = {}
}: UseKeyboardNavigationOptions = {}) {
  
  const [navigationState, setNavigationState] = useState<KeyboardNavigationState>({
    currentFocus: null,
    focusIndex: -1,
    isNavigating: false,
    lastNavigationTime: 0,
    navigationHistory: [],
    focusMode: 'sequential'
  })

  const [focusIndicator, setFocusIndicator] = useState<FocusIndicator>({
    visible: false,
    position: { x: 0, y: 0 },
    size: { width: 0, height: 0 },
    style: DEFAULT_CONFIG.focusIndicatorStyle
  })

  const [announcements, setAnnouncements] = useState<ScreenReaderAnnouncement[]>([])

  // Refs for managing state and DOM interactions
  const lastAnnouncementRef = useRef<number>(0)
  const focusTimeoutRef = useRef<NodeJS.Timeout>()
  const navigationModeRef = useRef<'keyboard' | 'mouse'>('keyboard')
  const ariaLiveRegionRef = useRef<HTMLDivElement>(null)

  // Utility: Get element position for focus indicator
  const getElementPosition = useCallback((part: DragonPart): { x: number; y: number; width: number; height: number } | null => {
    return pipe(
      O.fromNullable(document.querySelector(`[data-dragon-part="${part}"], .dragon-${part}`)),
      O.map(element => {
        const rect = element.getBoundingClientRect()
        return {
          x: rect.left,
          y: rect.top,
          width: rect.width,
          height: rect.height
        }
      }),
      O.getOrElse<{ x: number; y: number; width: number; height: number } | null>(() => null)
    )
  }, [])

  // Utility: Announce to screen reader
  const announceToScreenReader = useCallback((message: string, priority: 'polite' | 'assertive' = 'polite') => {
    if (!enableScreenReader) return

    const now = Date.now()
    const announcementId = `announcement_${now}`

    // Throttle announcements to prevent spam
    if (now - lastAnnouncementRef.current < 200) return
    lastAnnouncementRef.current = now

    const announcement: ScreenReaderAnnouncement = {
      id: announcementId,
      message,
      priority,
      timestamp: now
    }

    setAnnouncements(prev => [...prev, announcement])

    // Update ARIA live region if available
    pipe(
      O.fromNullable(ariaLiveRegionRef.current),
      O.map(region => {
        region.textContent = message
        region.setAttribute('aria-live', priority)
        return region
      })
    )

    // Clean up old announcements
    setTimeout(() => {
      setAnnouncements(prev => prev.filter(a => a.id !== announcementId))
    }, 3000)
  }, [enableScreenReader])

  // Navigation functions
  const navigateToNext = useCallback(() => {
    if (!enabled || focusableElements.length === 0) return

    const nextIndex = (navigationState.focusIndex + 1) % focusableElements.length
    const nextPart = focusableElements[nextIndex]

    setNavigationState(prev => ({
      ...prev,
      currentFocus: nextPart,
      focusIndex: nextIndex,
      isNavigating: true,
      lastNavigationTime: Date.now(),
      navigationHistory: [...prev.navigationHistory.slice(-9), nextPart]
    }))

    // Update focus indicator
    const position = getElementPosition(nextPart)
    if (position) {
      setFocusIndicator({
        visible: true,
        position: { x: position.x, y: position.y },
        size: { width: position.width, height: position.height },
        style: DEFAULT_CONFIG.focusIndicatorStyle
      })
    }

    // Announce to screen reader
    const announcement = announcementConfig[nextPart] || `${nextPart} selected`
    announceToScreenReader(announcement)

    // Callback
    onPartFocus?.(nextPart)

    // Focus the actual element for proper accessibility
    pipe(
      O.fromNullable(document.querySelector(`[data-dragon-part="${nextPart}"], .dragon-${nextPart}`)),
      O.filter(element => 'focus' in element),
      O.map(element => {
        (element as HTMLElement).focus()
        return element
      })
    )
  }, [enabled, focusableElements, navigationState.focusIndex, getElementPosition, announcements, announceToScreenReader, onPartFocus])

  const navigateToPrevious = useCallback(() => {
    if (!enabled || focusableElements.length === 0) return

    const prevIndex = navigationState.focusIndex <= 0 
      ? focusableElements.length - 1 
      : navigationState.focusIndex - 1
    const prevPart = focusableElements[prevIndex]

    setNavigationState(prev => ({
      ...prev,
      currentFocus: prevPart,
      focusIndex: prevIndex,
      isNavigating: true,
      lastNavigationTime: Date.now(),
      navigationHistory: [...prev.navigationHistory.slice(-9), prevPart]
    }))

    // Update focus indicator
    const position = getElementPosition(prevPart)
    if (position) {
      setFocusIndicator({
        visible: true,
        position: { x: position.x, y: position.y },
        size: { width: position.width, height: position.height },
        style: DEFAULT_CONFIG.focusIndicatorStyle
      })
    }

    // Announce to screen reader
    const announcement = announcementConfig[prevPart] || `${prevPart} selected`
    announceToScreenReader(announcement)

    // Callback
    onPartFocus?.(prevPart)

    // Focus the actual element
    pipe(
      O.fromNullable(document.querySelector(`[data-dragon-part="${prevPart}"], .dragon-${prevPart}`)),
      O.filter(element => 'focus' in element),
      O.map(element => {
        (element as HTMLElement).focus()
        return element
      })
    )
  }, [enabled, focusableElements, navigationState.focusIndex, getElementPosition, announcements, announceToScreenReader, onPartFocus])

  const navigateToElement = useCallback((part: DragonPart) => {
    if (!enabled) return

    const index = focusableElements.indexOf(part)
    if (index === -1) return

    setNavigationState(prev => ({
      ...prev,
      currentFocus: part,
      focusIndex: index,
      isNavigating: true,
      lastNavigationTime: Date.now(),
      navigationHistory: [...prev.navigationHistory.slice(-9), part]
    }))

    // Update focus indicator
    const position = getElementPosition(part)
    if (position) {
      setFocusIndicator({
        visible: true,
        position: { x: position.x, y: position.y },
        size: { width: position.width, height: position.height },
        style: DEFAULT_CONFIG.focusIndicatorStyle
      })
    }

    // Announce to screen reader
    const announcement = announcementConfig[part] || `${part} selected`
    announceToScreenReader(announcement)

    // Callback
    onPartFocus?.(part)
  }, [enabled, focusableElements, getElementPosition, announcements, announceToScreenReader, onPartFocus])

  const activateCurrent = useCallback(() => {
    if (!navigationState.currentFocus) return

    announceToScreenReader(`Activating ${navigationState.currentFocus}`, 'assertive')
    onPartActivate?.(navigationState.currentFocus, 'keyboard')

    // Add visual feedback for activation
    setFocusIndicator(prev => ({
      ...prev,
      style: {
        ...prev.style,
        transform: 'scale(1.1)',
        boxShadow: '0 0 20px rgba(255, 215, 0, 1), inset 0 0 20px rgba(255, 215, 0, 0.5)'
      }
    }))

    // Reset visual feedback
    setTimeout(() => {
      setFocusIndicator(prev => ({
        ...prev,
        style: {
          ...prev.style,
          transform: 'scale(1)',
          boxShadow: DEFAULT_CONFIG.focusIndicatorStyle.boxShadow
        }
      }))
    }, 200)
  }, [navigationState.currentFocus, announceToScreenReader, onPartActivate])

  const clearFocus = useCallback(() => {
    setNavigationState(prev => ({
      ...prev,
      currentFocus: null,
      focusIndex: -1,
      isNavigating: false
    }))

    setFocusIndicator(prev => ({
      ...prev,
      visible: false
    }))

    // Clear actual DOM focus
    pipe(
      O.fromNullable(document.activeElement),
      O.filter(element => 'blur' in element),
      O.map(element => {
        (element as HTMLElement).blur()
        return element
      })
    )
  }, [])

  // Spatial navigation (arrow keys to nearest element)
  const navigateSpatial = useCallback((direction: 'up' | 'down' | 'left' | 'right') => {
    if (!navigationState.currentFocus) {
      navigateToNext()
      return
    }

    const currentPosition = getElementPosition(navigationState.currentFocus)
    if (!currentPosition) return

    let bestPart: DragonPart | null = null
    let bestDistance = Infinity

    focusableElements.forEach(part => {
      if (part === navigationState.currentFocus) return

      const position = getElementPosition(part)
      if (!position) return

      const dx = position.x - currentPosition.x
      const dy = position.y - currentPosition.y
      const distance = Math.sqrt(dx * dx + dy * dy)

      // Check if element is in the right direction
      const isInDirection = (() => {
        switch (direction) {
          case 'up': return dy < -10
          case 'down': return dy > 10
          case 'left': return dx < -10
          case 'right': return dx > 10
          default: return false
        }
      })()

      if (isInDirection && distance < bestDistance) {
        bestDistance = distance
        bestPart = part
      }
    })

    if (bestPart) {
      navigateToElement(bestPart)
    }
  }, [navigationState.currentFocus, getElementPosition, focusableElements, navigateToElement])

  // Keyboard event handler
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!enabled) return

    // Check for custom key bindings first
    const customHandler = customKeyBindings[event.key]
    if (customHandler && navigationState.currentFocus) {
      customHandler(navigationState.currentFocus)
      event.preventDefault()
      return
    }

    switch (event.key) {
      case 'Tab':
        navigationModeRef.current = 'keyboard'
        if (event.shiftKey) {
          navigateToPrevious()
        } else {
          navigateToNext()
        }
        event.preventDefault()
        break

      case 'Enter':
      case ' ':
        if (navigationState.currentFocus) {
          activateCurrent()
          event.preventDefault()
        }
        break

      case 'Escape':
        clearFocus()
        announceToScreenReader('Focus cleared')
        event.preventDefault()
        break

      case 'ArrowUp':
        navigateSpatial('up')
        event.preventDefault()
        break

      case 'ArrowDown':
        navigateSpatial('down')
        event.preventDefault()
        break

      case 'ArrowLeft':
        navigateSpatial('left')
        event.preventDefault()
        break

      case 'ArrowRight':
        navigateSpatial('right')
        event.preventDefault()
        break

      case 'Home':
        if (focusableElements.length > 0) {
          navigateToElement(focusableElements[0])
        }
        event.preventDefault()
        break

      case 'End':
        if (focusableElements.length > 0) {
          navigateToElement(focusableElements[focusableElements.length - 1])
        }
        event.preventDefault()
        break

      // Number keys for direct navigation
      case '1':
      case '2':
      case '3':
      case '4':
      case '5':
      case '6':
      case '7':
      case '8':
      case '9':
        const index = parseInt(event.key) - 1
        if (index < focusableElements.length) {
          navigateToElement(focusableElements[index])
          event.preventDefault()
        }
        break
    }
  }, [
    enabled,
    customKeyBindings,
    navigationState.currentFocus,
    navigateToNext,
    navigateToPrevious,
    activateCurrent,
    clearFocus,
    navigateSpatial,
    navigateToElement,
    focusableElements,
    announceToScreenReader
  ])

  // Mouse interaction handler (for mixed input modes)
  const handleMouseInteraction = useCallback(() => {
    navigationModeRef.current = 'mouse'
    
    // Hide focus indicator when using mouse
    if (focusIndicator.visible) {
      setFocusIndicator(prev => ({ ...prev, visible: false }))
    }
  }, [focusIndicator.visible])

  // Set up event listeners
  useEffect(() => {
    if (!enabled) return

    document.addEventListener('keydown', handleKeyDown)
    document.addEventListener('mousedown', handleMouseInteraction)
    document.addEventListener('mousemove', handleMouseInteraction)

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('mousedown', handleMouseInteraction)
      document.removeEventListener('mousemove', handleMouseInteraction)
    }
  }, [enabled, handleKeyDown, handleMouseInteraction])

  // Focus trapping (keep focus within dragon component)
  useEffect(() => {
    if (!enableFocusTrapping || !navigationState.isNavigating) return

    const handleFocusOut = (event: FocusEvent) => {
      pipe(
        O.fromNullable(document.querySelector('[data-dragon-container]')),
        O.chain(dragonContainer => 
          pipe(
            O.fromNullable(event.relatedTarget),
            O.map(target => ({ dragonContainer, target }))
          )
        ),
        O.map(({ dragonContainer, target }) => {
          const isWithinDragon = dragonContainer.contains(target as Node)
          if (!isWithinDragon && navigationState.currentFocus) {
            // Return focus to current dragon part
            setTimeout(() => {
              pipe(
                O.fromNullable(document.querySelector(`[data-dragon-part="${navigationState.currentFocus}"]`)),
                O.filter(element => 'focus' in element),
                O.map(element => {
                  (element as HTMLElement).focus()
                  return element
                })
              )
            }, 0)
          }
          return { dragonContainer, target }
        })
      )
    }

    document.addEventListener('focusout', handleFocusOut)
    return () => document.removeEventListener('focusout', handleFocusOut)
  }, [enableFocusTrapping, navigationState.isNavigating, navigationState.currentFocus])

  // Accessibility props generator
  const getAccessibilityProps = useCallback((part: DragonPart): SVGAccessibilityProps => {
    const isFocused = navigationState.currentFocus === part
    const tabIndex = isFocused ? 0 : -1

    return {
      role: 'button',
      'aria-label': announcementConfig[part] || `Dragon ${part}`,
      'aria-describedby': `dragon-${part}-description`,
      'aria-live': 'polite',
      tabIndex,
      onKeyDown: (event) => {
        // This will be handled by the global keydown listener
        event.stopPropagation()
      },
      onFocus: () => {
        if (navigationModeRef.current === 'keyboard') {
          navigateToElement(part)
        }
      },
      onBlur: () => {
        // Clear focus indicator after a delay
        focusTimeoutRef.current = setTimeout(() => {
          if (navigationState.currentFocus === part) {
            setFocusIndicator(prev => ({ ...prev, visible: false }))
          }
        }, 100)
      }
    }
  }, [navigationState.currentFocus, announcements, navigateToElement])

  // Cleanup
  useEffect(() => {
    return () => {
      if (focusTimeoutRef.current) {
        clearTimeout(focusTimeoutRef.current)
      }
    }
  }, [])

  return {
    navigationState,
    focusIndicator,
    announcements,
    actions: {
      navigateToNext,
      navigateToPrevious,
      navigateToElement,
      activateCurrent,
      clearFocus,
      announceToScreenReader
    },
    getAccessibilityProps,
    isEnabled: enabled,
    AriaLiveRegion: () => (
      <div
        ref={ariaLiveRegionRef}
        className="sr-only"
        aria-live="polite"
        aria-atomic="true"
      />
    )
  }
}
'use client'

import { useState, useEffect, useRef } from 'react'
import { ResponsiveDragonAnimation } from './ResponsiveDragonAnimation'
import { useResponsive } from '@hooks/useResponsive'

interface AccessibleDragonAnimationProps {
  className?: string
  showDragonBalls?: boolean
  interactive?: boolean
  autoScale?: boolean
  announceStateChanges?: boolean
  highContrastMode?: 'auto' | 'always' | 'never'
}

export function AccessibleDragonAnimation({
  className = '',
  showDragonBalls = true,
  interactive = true,
  autoScale = true,
  announceStateChanges = true,
  highContrastMode = 'auto'
}: AccessibleDragonAnimationProps) {
  const { prefersReducedMotion, isHighContrast } = useResponsive()
  const [dragonState] = useState<'idle' | 'active' | 'powered'>('idle')
  const [announcement, setAnnouncement] = useState('')
  const announcementTimeoutRef = useRef<NodeJS.Timeout>()

  // Determine if high contrast should be applied
  const shouldUseHighContrast = highContrastMode === 'always' || 
    (highContrastMode === 'auto' && isHighContrast)

  // Make announcements for screen readers (currently unused but available for future use)
  // const announce = (message: string) => {
  //   if (!announceStateChanges) return
  //   
  //   setAnnouncement(message)
  //   
  //   // Clear announcement after a delay to allow re-announcement of same message
  //   if (announcementTimeoutRef.current) {
  //     clearTimeout(announcementTimeoutRef.current)
  //   }
  //   
  //   announcementTimeoutRef.current = setTimeout(() => {
  //     setAnnouncement('')
  //   }, 100)
  // }

  // Keyboard navigation instructions
  const keyboardInstructions = `
    Dragon animation controls:
    - Press Space or Enter to activate the dragon
    - Use Arrow Up to increase power
    - Use Arrow Down to decrease power
    - Press Tab to navigate to other elements
  `.trim()

  // State change handler available for future use
  // const handleStateChange = useCallback((newState: 'idle' | 'active' | 'powered') => {
  //   setDragonState(newState)
  //   
  //   if (announceStateChanges) {
  //     switch (newState) {
  //       case 'idle':
  //         announce('Dragon is resting')
  //         break
  //       case 'active':
  //         announce('Dragon is awakening')
  //         break
  //       case 'powered':
  //         announce('Dragon is powered up and ready')
  //         break
  //     }
  //   }
  // }, [announceStateChanges, announce])

  // Cleanup
  useEffect(() => {
    return () => {
      if (announcementTimeoutRef.current) {
        clearTimeout(announcementTimeoutRef.current)
      }
    }
  }, [])

  return (
    <div
      className={`relative ${className}`}
      role="application"
      aria-label="Interactive dragon animation"
      aria-describedby="dragon-instructions"
    >
      {/* Skip link for keyboard users */}
      <a 
        href="#skip-dragon-animation" 
        className="sr-only focus:not-sr-only focus:absolute focus:top-0 focus:left-0 focus:z-50 focus:p-2 focus:bg-white focus:text-black focus:rounded"
      >
        Skip dragon animation
      </a>

      {/* Instructions for screen reader users */}
      <div id="dragon-instructions" className="sr-only">
        {keyboardInstructions}
      </div>

      {/* High contrast overlay if needed */}
      {shouldUseHighContrast && (
        <div 
          className="absolute inset-0 pointer-events-none z-20"
          style={{
            mixBlendMode: 'multiply',
            backgroundColor: 'rgba(0, 0, 0, 0.1)'
          }}
        />
      )}

      {/* Main dragon animation */}
      <div className={shouldUseHighContrast ? 'contrast-150' : ''}>
        <ResponsiveDragonAnimation
          className={prefersReducedMotion ? 'motion-safe:animate-none' : ''}
          showDragonBalls={showDragonBalls && !prefersReducedMotion}
          interactive={interactive}
          autoScale={autoScale}
          performanceMode={prefersReducedMotion ? 'low' : 'auto'}
        />
        {/* handleStateChange is available for future state change handling */}
      </div>

      {/* Visual focus indicator for keyboard navigation */}
      <style>{`
        :focus-visible {
          outline: 3px solid ${shouldUseHighContrast ? '#000' : '#FCD34D'};
          outline-offset: 4px;
        }
      `}</style>

      {/* Status announcements for screen readers */}
      <div 
        role="status" 
        aria-live="polite" 
        aria-atomic="true"
        className="sr-only"
      >
        {announcement}
      </div>

      {/* Additional status region for important updates */}
      <div 
        role="status" 
        aria-live="assertive" 
        aria-atomic="true"
        className="sr-only"
      >
        Current dragon state: {dragonState}
      </div>

      {/* Skip target */}
      <div id="skip-dragon-animation" tabIndex={-1} className="sr-only">
        Dragon animation skipped
      </div>

      {/* Alternative text description for non-interactive mode */}
      {!interactive && (
        <div className="sr-only">
          A mystical dragon animation with floating dragon balls circling around it. 
          The dragon glows with magical energy and particles float around it.
        </div>
      )}
    </div>
  )
}
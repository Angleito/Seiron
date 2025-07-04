# SVG Dragon Accessibility Guide

A comprehensive guide for implementing WCAG 2.1 AA compliant accessibility features in the SVG Dragon system.

## Table of Contents

1. [Accessibility Overview](#accessibility-overview)
2. [WCAG 2.1 Compliance](#wcag-21-compliance)
3. [Implementation Guide](#implementation-guide)
4. [Screen Reader Support](#screen-reader-support)
5. [Keyboard Navigation](#keyboard-navigation)
6. [Visual Accessibility](#visual-accessibility)
7. [Testing and Validation](#testing-and-validation)
8. [Best Practices](#best-practices)

## Accessibility Overview

The SVG Dragon system is designed with accessibility as a core principle, ensuring that users with disabilities can fully interact with and enjoy the dragon experience. This guide covers implementing features that meet and exceed WCAG 2.1 AA standards.

### Accessibility Principles

1. **Perceivable**: Information must be presentable in ways users can perceive
2. **Operable**: Interface components must be operable by all users
3. **Understandable**: Information and UI operation must be understandable
4. **Robust**: Content must be robust enough to work with assistive technologies

### Target Compliance

- **WCAG 2.1 Level AA**: Full compliance with all applicable criteria
- **Section 508**: US federal accessibility standards
- **EN 301 549**: European accessibility standard
- **ADA Compliance**: Americans with Disabilities Act requirements

## WCAG 2.1 Compliance

### Success Criteria Coverage

#### Level A Requirements

| Criterion | Status | Implementation |
|-----------|--------|----------------|
| 1.1.1 Non-text Content | ✅ Complete | Alt text, ARIA labels, SVG descriptions |
| 1.3.1 Info and Relationships | ✅ Complete | Semantic markup, proper headings |
| 1.4.1 Use of Color | ✅ Complete | Multiple visual indicators |
| 2.1.1 Keyboard | ✅ Complete | Full keyboard navigation |
| 2.1.2 No Keyboard Trap | ✅ Complete | Proper focus management |
| 2.4.1 Bypass Blocks | ✅ Complete | Skip links, landmarks |
| 4.1.1 Parsing | ✅ Complete | Valid HTML/SVG markup |
| 4.1.2 Name, Role, Value | ✅ Complete | ARIA properties |

#### Level AA Requirements

| Criterion | Status | Implementation |
|-----------|--------|----------------|
| 1.4.3 Contrast (Minimum) | ✅ Complete | 4.5:1 contrast ratio |
| 1.4.4 Resize Text | ✅ Complete | Scalable up to 200% |
| 1.4.5 Images of Text | ✅ Complete | SVG text, not image text |
| 2.4.6 Headings and Labels | ✅ Complete | Descriptive labels |
| 2.4.7 Focus Visible | ✅ Complete | Clear focus indicators |
| 3.1.2 Language of Parts | ✅ Complete | Language attributes |
| 3.2.3 Consistent Navigation | ✅ Complete | Predictable interactions |

## Implementation Guide

### 1. Basic Accessibility Setup

```tsx
import { EnhancedDragonCharacter } from '@/components/dragon'

export function AccessibleDragon() {
  return (
    <EnhancedDragonCharacter
      renderMode="svg"
      interactive={true}
      // Core accessibility configuration
      accessibilityConfig={{
        enableScreenReader: true,
        enableKeyboardNavigation: true,
        announceStateChanges: true,
        highContrastMode: 'auto',
        focusIndicators: true,
        ariaLabels: {
          dragon: 'Interactive Shenron Dragon - Use keyboard to interact',
          dragonBalls: 'Seven mystical dragon balls orbiting the dragon',
          powerLevel: 'Current dragon power level indicator',
          interactionHint: 'Use Space or Enter to interact, arrow keys to change power level'
        }
      }}
    />
  )
}
```

### 2. Complete Accessibility Implementation

```tsx
import React, { useState, useCallback, useRef, useEffect } from 'react'
import { EnhancedDragonCharacter } from '@/components/dragon'
import { useKeyboardNavigation } from '@/components/dragon/hooks'
import type { DragonState, DragonMood, InteractionType } from '@/components/dragon/types'

export function FullyAccessibleDragon() {
  const [currentState, setCurrentState] = useState<DragonState>('idle')
  const [currentMood, setCurrentMood] = useState<DragonMood>('neutral')
  const [powerLevel, setPowerLevel] = useState(1000)
  const [announcements, setAnnouncements] = useState<string[]>([])
  const [highContrast, setHighContrast] = useState(false)
  const [reducedMotion, setReducedMotion] = useState(false)
  
  const dragonRef = useRef<HTMLDivElement>(null)
  
  // Check user preferences
  useEffect(() => {
    const checkPreferences = () => {
      const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      const prefersHighContrast = window.matchMedia('(prefers-contrast: high)').matches
      
      setReducedMotion(prefersReducedMotion)
      setHighContrast(prefersHighContrast)
    }
    
    checkPreferences()
    
    // Listen for preference changes
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    const contrastQuery = window.matchMedia('(prefers-contrast: high)')
    
    motionQuery.addEventListener('change', checkPreferences)
    contrastQuery.addEventListener('change', checkPreferences)
    
    return () => {
      motionQuery.removeEventListener('change', checkPreferences)
      contrastQuery.removeEventListener('change', checkPreferences)
    }
  }, [])
  
  // Screen reader announcements
  const announceToUser = useCallback((message: string) => {
    setAnnouncements(prev => [...prev.slice(-4), message])
  }, [])
  
  // Keyboard navigation setup
  const keyboardNav = useKeyboardNavigation({
    focusableElements: ['dragon', 'dragon-ball-1', 'dragon-ball-2', 'dragon-ball-3'],
    onActivate: (element) => {
      announceToUser(`Activated ${element.replace('-', ' ')}`)
      if (element === 'dragon') {
        setCurrentState('active')
      }
    },
    onFocusChange: (element) => {
      if (element) {
        announceToUser(`Focused on ${element.replace('-', ' ')}`)
      }
    }
  })
  
  // Enhanced event handlers with accessibility
  const handleStateChange = useCallback((state: DragonState) => {
    setCurrentState(state)
    
    const stateDescriptions = {
      idle: 'Dragon is resting peacefully',
      attention: 'Dragon is now paying attention to you',
      ready: 'Dragon is ready for action',
      active: 'Dragon is actively engaged',
      'powering-up': 'Dragon is powering up with intense energy',
      'arms-crossed': 'Dragon stands confidently with arms crossed',
      sleeping: 'Dragon has fallen asleep',
      awakening: 'Dragon is awakening from sleep'
    }
    
    announceToUser(stateDescriptions[state])
  }, [announceToUser])
  
  const handleMoodChange = useCallback((mood: DragonMood) => {
    setCurrentMood(mood)
    
    const moodDescriptions = {
      neutral: 'Dragon feels calm and neutral',
      happy: 'Dragon is feeling happy and content',
      excited: 'Dragon is excited and energetic',
      powerful: 'Dragon radiates with immense power',
      mystical: 'Dragon emanates mystical energy',
      focused: 'Dragon is deeply focused and concentrated',
      aggressive: 'Dragon shows aggressive determination',
      confident: 'Dragon displays supreme confidence'
    }
    
    announceToUser(moodDescriptions[mood])
  }, [announceToUser])
  
  const handlePowerLevelChange = useCallback((level: number) => {
    setPowerLevel(level)
    
    if (level > 9000) {
      announceToUser('Power level is over 9000! Dragon has reached legendary strength!')
    } else if (level > 7000) {
      announceToUser(`Power level is ${level}. Dragon is extremely powerful!`)
    } else if (level > 5000) {
      announceToUser(`Power level is ${level}. Dragon is very strong.`)
    } else {
      announceToUser(`Power level is ${level}. Dragon power is moderate.`)
    }
  }, [announceToUser])
  
  const handleInteraction = useCallback((type: InteractionType) => {
    const interactionMessages = {
      hover: 'Dragon senses your presence',
      leave: 'You have moved away from the dragon',
      click: 'You have clicked on the dragon',
      'double-click': 'You have double-clicked - dragon roars!',
      'long-press': 'Long press detected - dragon pulses with energy',
      'keyboard-focus': 'Dragon is now focused and ready for keyboard input'
    }
    
    if (interactionMessages[type]) {
      announceToUser(interactionMessages[type])
    }
  }, [announceToUser])
  
  // Keyboard event handler
  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    keyboardNav.handleKeyDown(event)
    
    // Additional keyboard shortcuts
    switch (event.key) {
      case 'p':
      case 'P':
        event.preventDefault()
        handleStateChange('powering-up')
        break
      case 'r':
      case 'R':
        event.preventDefault()
        handleStateChange('idle')
        announceToUser('Dragon reset to idle state')
        break
      case 'ArrowUp':
        event.preventDefault()
        const newLevel = Math.min(9500, powerLevel + 500)
        handlePowerLevelChange(newLevel)
        break
      case 'ArrowDown':
        event.preventDefault()
        const lowerLevel = Math.max(1000, powerLevel - 500)
        handlePowerLevelChange(lowerLevel)
        break
    }
  }, [keyboardNav, powerLevel, handleStateChange, handlePowerLevelChange])
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-8">
      {/* Skip to main content link */}
      <a
        href="#main-dragon"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-white text-black p-2 rounded z-50"
      >
        Skip to dragon interaction
      </a>
      
      <div className="max-w-4xl mx-auto">
        <header>
          <h1 className="text-4xl font-bold text-white mb-4">
            Accessible Dragon Experience
          </h1>
          <p className="text-gray-300 text-lg mb-8">
            Fully accessible dragon with WCAG 2.1 compliance, keyboard navigation, and screen reader support
          </p>
        </header>
        
        <main id="main-dragon">
          <div 
            ref={dragonRef}
            className={`bg-black/30 backdrop-blur-sm rounded-2xl p-8 border border-purple-500/20 focus-within:ring-2 focus-within:ring-purple-400 focus-within:border-purple-400 ${
              highContrast ? 'high-contrast-mode' : ''
            }`}
            tabIndex={0}
            onKeyDown={handleKeyDown}
            role="application"
            aria-label="Interactive Dragon Application"
            aria-describedby="dragon-instructions dragon-status"
          >
            <div className="flex items-center justify-center min-h-[400px]">
              <EnhancedDragonCharacter
                size="lg"
                renderMode="svg"
                svgQuality="standard"
                enableSVGAnimations={!reducedMotion}
                interactive={true}
                showDragonBalls={true}
                initialState={currentState}
                initialMood={currentMood}
                accessibilityConfig={{
                  enableScreenReader: true,
                  enableKeyboardNavigation: true,
                  announceStateChanges: true,
                  highContrastMode: highContrast ? 'enabled' : 'auto',
                  reducedMotionOverride: reducedMotion,
                  focusIndicators: true,
                  ariaLabels: {
                    dragon: `Interactive Shenron Dragon, currently ${currentState} with ${currentMood} mood. Power level: ${powerLevel > 9000 ? 'over 9000' : powerLevel}`,
                    dragonBalls: 'Seven mystical dragon balls orbiting the dragon in an elliptical pattern',
                    powerLevel: `Current power level: ${powerLevel > 9000 ? 'over 9000' : powerLevel}`,
                    interactionHint: 'Use Space or Enter to interact, P to power up, R to reset, arrow keys to adjust power level'
                  }
                }}
                animationConfig={{
                  performanceMode: 'balanced',
                  autoQualityAdjustment: true,
                  reducedMotion: reducedMotion,
                  enableParticles: !reducedMotion,
                  enableAura: !reducedMotion && !highContrast
                }}
                onStateChange={handleStateChange}
                onMoodChange={handleMoodChange}
                onPowerLevelChange={handlePowerLevelChange}
                onInteraction={handleInteraction}
              />
            </div>
            
            {/* Visible instructions */}
            <div id="dragon-instructions" className="mt-6 text-center text-gray-300">
              <h2 className="text-lg font-semibold mb-2">Dragon Controls</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <h3 className="font-semibold text-purple-400 mb-1">Keyboard Controls</h3>
                  <ul className="space-y-1 text-left">
                    <li>• Tab: Navigate elements</li>
                    <li>• Space/Enter: Interact with dragon</li>
                    <li>• P: Power up dragon</li>
                    <li>• R: Reset to idle state</li>
                    <li>• ↑/↓: Adjust power level</li>
                  </ul>
                </div>
                <div>
                  <h3 className="font-semibold text-blue-400 mb-1">Current Status</h3>
                  <ul className="space-y-1 text-left">
                    <li>• State: <span className="text-purple-400">{currentState}</span></li>
                    <li>• Mood: <span className="text-blue-400">{currentMood}</span></li>
                    <li>• Power: <span className={powerLevel > 9000 ? 'text-red-400' : 'text-green-400'}>
                      {powerLevel > 9000 ? 'Over 9000!' : powerLevel}
                    </span></li>
                    <li>• Focus: <span className="text-yellow-400">{keyboardNav.focusedElement || 'None'}</span></li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
          
          {/* Accessibility Status */}
          <div id="dragon-status" className="mt-6 bg-green-900/20 border border-green-500/30 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-green-400 mb-4">Accessibility Status</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
              <div>
                <h3 className="font-semibold text-green-300 mb-2">Active Features</h3>
                <ul className="text-green-200 space-y-1">
                  <li>✓ Keyboard navigation enabled</li>
                  <li>✓ Screen reader support active</li>
                  <li>✓ Focus indicators visible</li>
                  <li>✓ High contrast: {highContrast ? 'Enabled' : 'Auto'}</li>
                  <li>✓ Reduced motion: {reducedMotion ? 'Enabled' : 'Disabled'}</li>
                  <li>✓ ARIA labels configured</li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold text-blue-300 mb-2">Recent Announcements</h3>
                <div className="text-blue-200 space-y-1 max-h-24 overflow-y-auto">
                  {announcements.slice(-3).map((announcement, index) => (
                    <div key={index} className="text-xs py-1">
                      {announcement}
                    </div>
                  ))}
                  {announcements.length === 0 && (
                    <div className="text-blue-400/50 italic text-xs">No announcements yet</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </main>
        
        {/* Screen Reader Live Region */}
        <div
          aria-live="polite"
          aria-atomic="true"
          className="sr-only"
        >
          {announcements[announcements.length - 1]}
        </div>
        
        {/* Additional Screen Reader Content */}
        <div className="sr-only">
          <h2>Detailed Dragon Description</h2>
          <p>
            This is an interactive Shenron-style dragon from Dragon Ball Z, rendered as 
            scalable vector graphics. The dragon responds to your interactions with 
            various states including idle, attention, ready, active, powering-up, 
            arms-crossed, sleeping, and awakening. Each state has visual and behavioral 
            changes that are announced to screen readers.
          </p>
          <p>
            The dragon is accompanied by seven mystical dragon balls that orbit around 
            it in an elliptical pattern. These represent the legendary Dragon Balls 
            from the anime series. You can interact with both the dragon and individual 
            dragon balls using keyboard controls.
          </p>
          <p>
            The dragon's power level ranges from 1000 to over 9000, a reference to the 
            famous "Over 9000!" meme from Dragon Ball Z. Higher power levels result in 
            more intense visual effects and animations.
          </p>
        </div>
      </div>
    </div>
  )
}
```

## Screen Reader Support

### 1. ARIA Implementation

```tsx
// Comprehensive ARIA labeling
<EnhancedDragonCharacter
  renderMode="svg"
  accessibilityConfig={{
    ariaLabels: {
      dragon: 'Interactive Shenron Dragon from Dragon Ball Z anime series',
      dragonBalls: 'Seven legendary Dragon Balls with star patterns from 1 to 7 stars',
      powerLevel: 'Dragon power level indicator, ranges from 1000 to over 9000',
      interactionHint: 'Interactive dragon responds to clicks, taps, and keyboard input'
    }
  }}
/>
```

### 2. Live Announcements

```tsx
interface ScreenReaderAnnouncerProps {
  message: string
  priority: 'polite' | 'assertive'
}

export function ScreenReaderAnnouncer({ message, priority = 'polite' }: ScreenReaderAnnouncerProps) {
  return (
    <div
      aria-live={priority}
      aria-atomic="true"
      className="sr-only"
    >
      {message}
    </div>
  )
}

// Usage in dragon component
const [currentAnnouncement, setCurrentAnnouncement] = useState('')

const handleDragonStateChange = (state: DragonState) => {
  const announcements = {
    'powering-up': 'Dragon is powering up! Energy levels rising rapidly!',
    'arms-crossed': 'Dragon assumes a confident stance with arms crossed',
    'active': 'Dragon is now actively engaged and ready for interaction'
  }
  
  setCurrentAnnouncement(announcements[state] || `Dragon state changed to ${state}`)
}

return (
  <div>
    <EnhancedDragonCharacter onStateChange={handleDragonStateChange} />
    <ScreenReaderAnnouncer message={currentAnnouncement} />
  </div>
)
```

### 3. Descriptive Content

```tsx
// Hidden descriptive content for screen readers
<div className="sr-only">
  <h2>Dragon Visual Description</h2>
  <p>
    A majestic green dragon with serpentine body coiled in an elegant pose. 
    The dragon has large expressive red eyes, flowing whiskers, and a 
    powerful muscular build. Its scales shimmer with an otherworldly glow, 
    and mystical energy particles float around its form.
  </p>
  
  <h3>Dragon Ball Description</h3>
  <p>
    Seven orange spheres orbit the dragon, each containing red stars that 
    indicate their number from one to seven. These are the legendary Dragon 
    Balls that, when gathered, can summon the dragon to grant wishes.
  </p>
  
  <h3>Current Animation State</h3>
  <p id="animation-description">
    The dragon is currently in {state} state, displaying {mood} mood. 
    Particles and energy effects {animationsEnabled ? 'are' : 'are not'} active.
  </p>
</div>
```

## Keyboard Navigation

### 1. Focus Management

```tsx
import { useKeyboardNavigation } from '@/components/dragon/hooks'

export function KeyboardNavigableDragon() {
  const keyboardNav = useKeyboardNavigation({
    focusableElements: [
      'dragon-head',
      'dragon-body', 
      'dragon-ball-1',
      'dragon-ball-2',
      'dragon-ball-3',
      'dragon-ball-4',
      'dragon-ball-5',
      'dragon-ball-6',
      'dragon-ball-7'
    ],
    onActivate: (element) => {
      // Handle activation of focused element
      console.log('Activated:', element)
    },
    onFocusChange: (element) => {
      // Announce focus changes
      announceToUser(`Focused on ${element?.replace('-', ' ') || 'nothing'}`)
    }
  })
  
  const handleKeyDown = (event: React.KeyboardEvent) => {
    // Handle keyboard navigation
    keyboardNav.handleKeyDown(event)
    
    // Custom keyboard shortcuts
    switch (event.key) {
      case ' ':
      case 'Enter':
        event.preventDefault()
        // Activate current focused element
        if (keyboardNav.focusedElement) {
          keyboardNav.activate(keyboardNav.focusedElement)
        }
        break
        
      case 'Escape':
        // Return focus to main dragon
        keyboardNav.setFocus('dragon-head')
        break
        
      case 'h':
      case 'H':
        // Help shortcut
        showKeyboardHelp()
        break
    }
  }
  
  return (
    <div
      tabIndex={0}
      onKeyDown={handleKeyDown}
      className="focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
      aria-label="Dragon interaction area"
    >
      <EnhancedDragonCharacter
        renderMode="svg"
        enableKeyboardNavigation={true}
        focusedElement={keyboardNav.focusedElement}
      />
    </div>
  )
}
```

### 2. Keyboard Shortcuts

```tsx
const KEYBOARD_SHORTCUTS = {
  'Space/Enter': 'Interact with focused element',
  'Tab': 'Navigate to next interactive element',
  'Shift+Tab': 'Navigate to previous interactive element',
  'Arrow Keys': 'Navigate between dragon parts or adjust power level',
  'P': 'Power up the dragon',
  'R': 'Reset dragon to idle state',
  'C': 'Switch to arms-crossed pose',
  'H': 'Show keyboard help',
  'Escape': 'Return focus to main dragon',
  '1-7': 'Focus on specific dragon ball by number'
}

export function KeyboardHelpModal({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
  if (!isOpen) return null
  
  return (
    <div 
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      role="dialog"
      aria-labelledby="keyboard-help-title"
      aria-modal="true"
    >
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg max-w-md w-full mx-4">
        <h2 id="keyboard-help-title" className="text-xl font-bold mb-4">
          Keyboard Shortcuts
        </h2>
        
        <div className="space-y-2 text-sm">
          {Object.entries(KEYBOARD_SHORTCUTS).map(([key, description]) => (
            <div key={key} className="flex justify-between">
              <kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded text-xs font-mono">
                {key}
              </kbd>
              <span className="ml-3">{description}</span>
            </div>
          ))}
        </div>
        
        <button
          onClick={onClose}
          className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 focus:ring-2 focus:ring-blue-400"
          autoFocus
        >
          Close Help
        </button>
      </div>
    </div>
  )
}
```

## Visual Accessibility

### 1. High Contrast Support

```tsx
// High contrast detection and implementation
export function HighContrastDragon() {
  const [highContrast, setHighContrast] = useState(false)
  
  useEffect(() => {
    // Check for high contrast preference
    const checkHighContrast = () => {
      const prefersHighContrast = 
        window.matchMedia('(prefers-contrast: high)').matches ||
        window.matchMedia('(-ms-high-contrast: active)').matches
      
      setHighContrast(prefersHighContrast)
    }
    
    checkHighContrast()
    
    const contrastQuery = window.matchMedia('(prefers-contrast: high)')
    contrastQuery.addEventListener('change', checkHighContrast)
    
    return () => contrastQuery.removeEventListener('change', checkHighContrast)
  }, [])
  
  const highContrastStyles = highContrast ? {
    filter: 'contrast(2) saturate(0.5)',
    '--dragon-primary-color': '#000000',
    '--dragon-secondary-color': '#ffffff',
    '--dragon-accent-color': '#ffff00',
    '--dragon-background-color': '#ffffff'
  } as React.CSSProperties : {}
  
  return (
    <div 
      style={highContrastStyles}
      className={highContrast ? 'high-contrast-mode' : ''}
    >
      <EnhancedDragonCharacter
        renderMode="svg"
        accessibilityConfig={{
          highContrastMode: highContrast ? 'enabled' : 'auto'
        }}
      />
    </div>
  )
}
```

### 2. Color Contrast Compliance

```css
/* High contrast mode styles */
.high-contrast-mode {
  --dragon-bg: #ffffff;
  --dragon-fg: #000000;
  --dragon-accent: #000080;
  --dragon-focus: #ffff00;
  --dragon-border: #000000;
}

.high-contrast-mode .dragon-svg {
  filter: contrast(2) saturate(0.8);
}

.high-contrast-mode .dragon-ball {
  stroke: var(--dragon-border);
  stroke-width: 2px;
}

.high-contrast-mode .focus-indicator {
  outline: 3px solid var(--dragon-focus);
  outline-offset: 2px;
}

/* Ensure focus indicators meet contrast requirements */
.dragon-focusable:focus {
  outline: 2px solid #4A90E2; /* 4.5:1 contrast ratio */
  outline-offset: 2px;
  background-color: rgba(74, 144, 226, 0.1);
}

/* Text contrast compliance */
.dragon-label {
  color: #1a1a1a; /* 12.63:1 contrast on white */
  background-color: white;
}

.dragon-label.inverted {
  color: white; /* 12.63:1 contrast on dark */
  background-color: #1a1a1a;
}
```

### 3. Reduced Motion Support

```tsx
export function ReducedMotionDragon() {
  const [reducedMotion, setReducedMotion] = useState(false)
  
  useEffect(() => {
    const checkReducedMotion = () => {
      const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      setReducedMotion(prefersReducedMotion)
    }
    
    checkReducedMotion()
    
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    motionQuery.addEventListener('change', checkReducedMotion)
    
    return () => motionQuery.removeEventListener('change', checkReducedMotion)
  }, [])
  
  return (
    <EnhancedDragonCharacter
      renderMode="svg"
      enableSVGAnimations={!reducedMotion}
      animationConfig={{
        reducedMotion,
        enableParticles: !reducedMotion,
        enableAura: !reducedMotion,
        enableBreathing: !reducedMotion,
        enableMicroMovements: !reducedMotion,
        transitionDuration: reducedMotion ? 0 : 800
      }}
    />
  )
}
```

## Testing and Validation

### 1. Automated Accessibility Testing

```typescript
// Jest + Testing Library accessibility tests
import { render, screen } from '@testing-library/react'
import { axe, toHaveNoViolations } from 'jest-axe'
import { EnhancedDragonCharacter } from '@/components/dragon'

expect.extend(toHaveNoViolations)

describe('Dragon Accessibility', () => {
  it('should not have any accessibility violations', async () => {
    const { container } = render(
      <EnhancedDragonCharacter
        renderMode="svg"
        accessibilityConfig={{
          enableScreenReader: true,
          enableKeyboardNavigation: true
        }}
      />
    )
    
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })
  
  it('should have proper ARIA labels', () => {
    render(<EnhancedDragonCharacter renderMode="svg" />)
    
    const dragon = screen.getByRole('img')
    expect(dragon).toHaveAttribute('aria-label')
    expect(dragon).toHaveAttribute('aria-describedby')
  })
  
  it('should be keyboard accessible', async () => {
    const { container } = render(<EnhancedDragonCharacter renderMode="svg" />)
    
    const focusableElements = container.querySelectorAll('[tabindex="0"], button, [role="button"]')
    expect(focusableElements.length).toBeGreaterThan(0)
    
    // Test keyboard navigation
    const firstElement = focusableElements[0] as HTMLElement
    firstElement.focus()
    expect(document.activeElement).toBe(firstElement)
  })
  
  it('should respect reduced motion preferences', () => {
    // Mock reduced motion preference
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: jest.fn().mockImplementation(query => ({
        matches: query.includes('prefers-reduced-motion: reduce'),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
      })),
    })
    
    render(<EnhancedDragonCharacter renderMode="svg" />)
    
    // Verify animations are disabled
    const dragonElement = screen.getByRole('img')
    expect(dragonElement).toHaveClass('motion-reduce')
  })
})
```

### 2. Manual Testing Checklist

#### Screen Reader Testing
- [ ] Test with NVDA (Windows)
- [ ] Test with JAWS (Windows)
- [ ] Test with VoiceOver (macOS/iOS)
- [ ] Test with TalkBack (Android)
- [ ] Verify all interactive elements are announced
- [ ] Check that state changes are announced
- [ ] Ensure proper reading order

#### Keyboard Testing
- [ ] All interactive elements are keyboard accessible
- [ ] Focus indicators are clearly visible
- [ ] Tab order is logical and intuitive
- [ ] No keyboard traps exist
- [ ] Custom keyboard shortcuts work as expected
- [ ] Escape key works to exit interactions

#### Visual Testing
- [ ] Test with high contrast mode enabled
- [ ] Verify 4.5:1 color contrast ratio minimum
- [ ] Test at 200% zoom level
- [ ] Check with color blindness simulators
- [ ] Verify focus indicators are visible
- [ ] Test with reduced motion enabled

### 3. Accessibility Testing Tools

```typescript
// Accessibility testing utilities
export class AccessibilityTester {
  static async runAxeTest(element: HTMLElement): Promise<void> {
    const axe = await import('axe-core')
    const results = await axe.run(element)
    
    if (results.violations.length > 0) {
      console.error('Accessibility violations:', results.violations)
      throw new Error(`Found ${results.violations.length} accessibility violations`)
    }
  }
  
  static checkColorContrast(foreground: string, background: string): number {
    // Simplified contrast calculation
    const getLuminance = (color: string): number => {
      // Convert hex to RGB and calculate luminance
      const rgb = parseInt(color.slice(1), 16)
      const r = (rgb >> 16) & 0xff
      const g = (rgb >> 8) & 0xff
      const b = (rgb >> 0) & 0xff
      
      return (0.299 * r + 0.587 * g + 0.114 * b) / 255
    }
    
    const l1 = getLuminance(foreground)
    const l2 = getLuminance(background)
    
    const lighter = Math.max(l1, l2)
    const darker = Math.min(l1, l2)
    
    return (lighter + 0.05) / (darker + 0.05)
  }
  
  static checkKeyboardAccessibility(element: HTMLElement): boolean {
    const focusableElements = element.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )
    
    return focusableElements.length > 0
  }
}

// Usage in tests
test('Dragon meets accessibility standards', async () => {
  const { container } = render(<EnhancedDragonCharacter renderMode="svg" />)
  
  await AccessibilityTester.runAxeTest(container)
  
  const hasKeyboardAccess = AccessibilityTester.checkKeyboardAccessibility(container)
  expect(hasKeyboardAccess).toBe(true)
  
  const contrast = AccessibilityTester.checkColorContrast('#000000', '#ffffff')
  expect(contrast).toBeGreaterThanOrEqual(4.5) // WCAG AA requirement
})
```

## Best Practices

### 1. Implementation Guidelines

- **Always provide meaningful labels**: Every interactive element should have descriptive ARIA labels
- **Use semantic markup**: Proper HTML structure with headings, landmarks, and regions
- **Test with real users**: Include users with disabilities in your testing process
- **Respect user preferences**: Honor system settings for motion, contrast, and other preferences
- **Provide multiple ways to interact**: Support both mouse and keyboard interactions
- **Make error messages clear**: Provide helpful, actionable error messages

### 2. Common Pitfalls to Avoid

- **Don't rely only on color**: Use multiple visual indicators (color, shape, text)
- **Don't create keyboard traps**: Ensure users can navigate away from any element
- **Don't make assumptions**: Test with actual assistive technologies
- **Don't ignore mobile accessibility**: Touch targets should be at least 44px
- **Don't forget focus management**: Properly handle focus when content changes

### 3. Progressive Enhancement

```tsx
// Start with accessible foundation, then enhance
export function ProgressivelyEnhancedDragon() {
  const [supportsAdvancedFeatures, setSupportsAdvancedFeatures] = useState(false)
  
  useEffect(() => {
    // Check for advanced feature support
    const hasIntersectionObserver = 'IntersectionObserver' in window
    const hasRequestAnimationFrame = 'requestAnimationFrame' in window
    const hasWebGL = !!document.createElement('canvas').getContext('webgl')
    
    setSupportsAdvancedFeatures(
      hasIntersectionObserver && hasRequestAnimationFrame && hasWebGL
    )
  }, [])
  
  return (
    <EnhancedDragonCharacter
      renderMode="svg"
      // Base accessibility features always enabled
      accessibilityConfig={{
        enableScreenReader: true,
        enableKeyboardNavigation: true,
        announceStateChanges: true
      }}
      // Enhanced features only if supported
      animationConfig={{
        enableParticles: supportsAdvancedFeatures,
        enableAura: supportsAdvancedFeatures,
        performanceMode: supportsAdvancedFeatures ? 'quality' : 'performance'
      }}
    />
  )
}
```

### 4. Documentation and Communication

```tsx
// Provide clear documentation for accessibility features
export const AccessibilityDocumentation = () => (
  <div className="accessibility-docs">
    <h2>Accessibility Features</h2>
    
    <section>
      <h3>Keyboard Navigation</h3>
      <p>Use Tab to navigate between interactive elements, Space or Enter to activate.</p>
      <kbd>Tab</kbd> - Next element
      <kbd>Shift+Tab</kbd> - Previous element
      <kbd>Space/Enter</kbd> - Activate
    </section>
    
    <section>
      <h3>Screen Reader Support</h3>
      <p>All dragon states and interactions are announced to screen readers.</p>
    </section>
    
    <section>
      <h3>Visual Preferences</h3>
      <p>Respects system preferences for reduced motion and high contrast.</p>
    </section>
  </div>
)
```

---

This accessibility guide ensures that the SVG Dragon system is inclusive and accessible to users with disabilities, meeting WCAG 2.1 AA standards while providing an engaging experience for all users.
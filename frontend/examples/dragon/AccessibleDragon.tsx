/**
 * Accessible SVG Dragon Example
 * 
 * Demonstrates comprehensive accessibility features including
 * WCAG 2.1 compliance, keyboard navigation, and screen reader support.
 */

import React, { useState, useCallback, useRef, useEffect } from 'react'
import { EnhancedDragonCharacter } from '@/components/dragon'
import { useKeyboardNavigation } from '@/components/dragon/hooks'
import type { DragonState, DragonMood, InteractionType } from '@/components/dragon/types'

export function AccessibleDragon() {
  const [currentState, setCurrentState] = useState<DragonState>('idle')
  const [currentMood, setCurrentMood] = useState<DragonMood>('neutral')
  const [powerLevel, setPowerLevel] = useState(1000)
  const [announcements, setAnnouncements] = useState<string[]>([])
  const [highContrast, setHighContrast] = useState(false)
  const [reducedMotion, setReducedMotion] = useState(false)
  const [enableSounds, setEnableSounds] = useState(false)
  
  const dragonRef = useRef<HTMLDivElement>(null)
  const announcementRef = useRef<HTMLDivElement>(null)

  // Check system preferences
  useEffect(() => {
    const checkPreferences = () => {
      const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      const prefersHighContrast = window.matchMedia('(prefers-contrast: high)').matches
      
      setReducedMotion(prefersReducedMotion)
      setHighContrast(prefersHighContrast)
    }

    checkPreferences()
    
    // Listen for changes in system preferences
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    const contrastQuery = window.matchMedia('(prefers-contrast: high)')
    
    motionQuery.addEventListener('change', checkPreferences)
    contrastQuery.addEventListener('change', checkPreferences)
    
    return () => {
      motionQuery.removeEventListener('change', checkPreferences)
      contrastQuery.removeEventListener('change', checkPreferences)
    }
  }, [])

  // Keyboard navigation
  const keyboardNav = useKeyboardNavigation({
    focusableElements: ['dragon', 'dragon-ball-1', 'dragon-ball-2', 'dragon-ball-3'],
    onActivate: (element) => {
      announceToUser(`Activated ${element.replace('-', ' ')}`)
      
      if (element === 'dragon') {
        handleStateChange('active')
      }
    },
    onFocusChange: (element) => {
      if (element) {
        announceToUser(`Focused on ${element.replace('-', ' ')}`)
      }
    }
  })

  // Announcement system for screen readers
  const announceToUser = useCallback((message: string) => {
    setAnnouncements(prev => [...prev.slice(-4), message]) // Keep last 5 announcements
    
    // Optional audio feedback
    if (enableSounds) {
      // In a real implementation, this would play appropriate sounds
      console.log('🔊 Audio feedback:', message)
    }
  }, [enableSounds])

  // Enhanced event handlers with accessibility feedback
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
    } else if (level > 3000) {
      announceToUser(`Power level is ${level}. Dragon is moderately powered.`)
    } else {
      announceToUser(`Power level is ${level}. Dragon is in base form.`)
    }
  }, [announceToUser])

  const handleInteraction = useCallback((type: InteractionType) => {
    const interactionMessages = {
      hover: 'Dragon senses your presence',
      leave: 'You have moved away from the dragon',
      click: 'You have clicked on the dragon',
      'double-click': 'You have double-clicked - dragon roars!',
      'long-press': 'Long press detected - dragon pulses with energy',
      'keyboard-focus': 'Dragon is now focused and ready for keyboard input',
      'proximity-enter': 'You are approaching the dragon',
      'proximity-leave': 'You are moving away from the dragon'
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
      case 'c':
      case 'C':
        event.preventDefault()
        handleStateChange('arms-crossed')
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
  }, [keyboardNav, currentState, powerLevel, handleStateChange, handlePowerLevelChange])

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-4">
            Accessible SVG Dragon
          </h1>
          <p className="text-gray-300 text-lg">
            Fully accessible dragon with WCAG 2.1 compliance, keyboard navigation, and screen reader support
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Dragon Display */}
          <div className="lg:col-span-2">
            <div 
              ref={dragonRef}
              className={`bg-black/30 backdrop-blur-sm rounded-2xl p-8 border border-purple-500/20 focus-within:ring-2 focus-within:ring-purple-400 focus-within:border-purple-400 ${
                highContrast ? 'high-contrast' : ''
              }`}
              tabIndex={0}
              onKeyDown={handleKeyDown}
              role="application"
              aria-label="Interactive Dragon Application"
              aria-describedby="dragon-instructions"
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
                      dragon: 'Interactive Shenron Dragon - Use keyboard to interact',
                      dragonBalls: 'Seven mystical dragon balls orbiting the dragon',
                      powerLevel: `Current power level: ${powerLevel}`,
                      interactionHint: 'Use Space or Enter to interact, arrow keys to change power level'
                    }
                  }}
                  animationConfig={{
                    performanceMode: 'balanced',
                    autoQualityAdjustment: true,
                    reducedMotion: reducedMotion,
                    enableParticles: !reducedMotion,
                    enableAura: !reducedMotion
                  }}
                  onStateChange={handleStateChange}
                  onMoodChange={handleMoodChange}
                  onPowerLevelChange={handlePowerLevelChange}
                  onInteraction={handleInteraction}
                />
              </div>

              {/* Instructions */}
              <div id="dragon-instructions" className="mt-6 text-center text-gray-300">
                <p className="text-sm mb-2">
                  <strong>Keyboard Controls:</strong> Tab to navigate • Space/Enter to interact • P to power up • R to reset • ↑↓ arrows for power level
                </p>
                <p className="text-xs">
                  Current State: <span className="text-purple-400 font-semibold">{currentState}</span> • 
                  Mood: <span className="text-blue-400 font-semibold">{currentMood}</span> • 
                  Power: <span className={`font-semibold ${powerLevel > 9000 ? 'text-red-400' : 'text-green-400'}`}>
                    {powerLevel > 9000 ? 'Over 9000!' : powerLevel}
                  </span>
                </p>
              </div>
            </div>
          </div>

          {/* Accessibility Controls */}
          <div className="space-y-6">
            {/* Accessibility Settings */}
            <div className="bg-black/30 backdrop-blur-sm rounded-xl p-6 border border-purple-500/20">
              <h3 className="text-lg font-semibold text-white mb-4">Accessibility Settings</h3>
              <div className="space-y-3">
                <label className="flex items-center text-white">
                  <input
                    type="checkbox"
                    checked={highContrast}
                    onChange={(e) => setHighContrast(e.target.checked)}
                    className="mr-3 rounded"
                  />
                  High Contrast Mode
                </label>
                <label className="flex items-center text-white">
                  <input
                    type="checkbox"
                    checked={reducedMotion}
                    onChange={(e) => setReducedMotion(e.target.checked)}
                    className="mr-3 rounded"
                  />
                  Reduced Motion
                </label>
                <label className="flex items-center text-white">
                  <input
                    type="checkbox"
                    checked={enableSounds}
                    onChange={(e) => setEnableSounds(e.target.checked)}
                    className="mr-3 rounded"
                  />
                  Audio Feedback
                </label>
              </div>
            </div>

            {/* Current Status */}
            <div className="bg-black/30 backdrop-blur-sm rounded-xl p-6 border border-purple-500/20">
              <h3 className="text-lg font-semibold text-white mb-4">Current Status</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">State:</span>
                  <span className="text-purple-400 font-semibold">{currentState}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Mood:</span>
                  <span className="text-blue-400 font-semibold">{currentMood}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Power Level:</span>
                  <span className={`font-semibold ${powerLevel > 9000 ? 'text-red-400' : 'text-green-400'}`}>
                    {powerLevel > 9000 ? 'Over 9000!' : powerLevel}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Focused Element:</span>
                  <span className="text-yellow-400 font-semibold">
                    {keyboardNav.focusedElement || 'None'}
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-black/30 backdrop-blur-sm rounded-xl p-6 border border-purple-500/20">
              <h3 className="text-lg font-semibold text-white mb-4">Quick Actions</h3>
              <div className="grid grid-cols-1 gap-2">
                <button
                  onClick={() => handleStateChange('powering-up')}
                  className="p-2 bg-red-600 hover:bg-red-700 text-white rounded text-sm transition-colors focus:ring-2 focus:ring-red-400"
                  aria-describedby="power-up-desc"
                >
                  Power Up Dragon
                </button>
                <div id="power-up-desc" className="sr-only">
                  Triggers the dragon's power-up state with intense energy effects
                </div>
                
                <button
                  onClick={() => handleStateChange('arms-crossed')}
                  className="p-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded text-sm transition-colors focus:ring-2 focus:ring-yellow-400"
                  aria-describedby="confident-desc"
                >
                  Confident Pose
                </button>
                <div id="confident-desc" className="sr-only">
                  Dragon assumes a confident arms-crossed stance
                </div>
                
                <button
                  onClick={() => {
                    handleStateChange('idle')
                    handlePowerLevelChange(1000)
                  }}
                  className="p-2 bg-gray-600 hover:bg-gray-700 text-white rounded text-sm transition-colors focus:ring-2 focus:ring-gray-400"
                  aria-describedby="reset-desc"
                >
                  Reset to Idle
                </button>
                <div id="reset-desc" className="sr-only">
                  Resets dragon to idle state with base power level
                </div>
              </div>
            </div>

            {/* Screen Reader Announcements */}
            <div className="bg-blue-900/20 border border-blue-500/30 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-blue-400 mb-4">Recent Announcements</h3>
              <div className="space-y-1 text-sm text-blue-300 max-h-32 overflow-y-auto">
                {announcements.slice(-5).map((announcement, index) => (
                  <div key={index} className="py-1 border-b border-blue-500/20 last:border-b-0">
                    {announcement}
                  </div>
                ))}
                {announcements.length === 0 && (
                  <div className="text-blue-400/50 italic">No announcements yet</div>
                )}
              </div>
            </div>

            {/* WCAG Compliance Info */}
            <div className="bg-green-900/20 border border-green-500/30 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-green-400 mb-4">WCAG 2.1 Features</h3>
              <ul className="text-green-300 text-sm space-y-1">
                <li>✓ Keyboard navigation support</li>
                <li>✓ Screen reader compatibility</li>
                <li>✓ High contrast mode support</li>
                <li>✓ Reduced motion preferences</li>
                <li>✓ Focus indicators</li>
                <li>✓ ARIA labels and descriptions</li>
                <li>✓ Semantic HTML structure</li>
                <li>✓ Color contrast compliance</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Screen Reader Live Region */}
        <div
          ref={announcementRef}
          aria-live="polite"
          aria-atomic="true"
          className="sr-only"
        >
          {announcements[announcements.length - 1]}
        </div>

        {/* Additional Screen Reader Content */}
        <div className="sr-only">
          <h2>Dragon Interaction Instructions</h2>
          <p>
            This is an interactive dragon that responds to keyboard and mouse input. 
            Use Tab to navigate between interactive elements, Space or Enter to activate, 
            and arrow keys to adjust the dragon's power level. The dragon has various 
            states and moods that change based on your interactions.
          </p>
        </div>
      </div>
    </div>
  )
}

export default AccessibleDragon
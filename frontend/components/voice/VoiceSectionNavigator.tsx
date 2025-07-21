import React, { useCallback, useEffect, useState, useMemo } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useSecureElevenLabsTTS } from '../../hooks/voice/useSecureElevenLabsTTS'
import { useSpeechRecognitionLazy } from '../../hooks/voice/lazy'
import { logger } from '../../lib/logger'
import { DragonBallLoadingStates } from '../chat/parts/DragonBallLoadingStates'

export interface VoiceSectionNavigatorProps {
  voiceConfig: {
    voiceId: string
    modelId?: string
    voiceSettings?: {
      stability?: number
      similarityBoost?: number
      style?: number
      useSpeakerBoost?: boolean
    }
  }
  enabledSections?: string[]
  onSectionChange?: (section: string) => void
  className?: string
  enabled?: boolean
}

interface NavigationSection {
  id: string
  name: string
  commands: string[]
  path?: string
  element?: string
  description: string
  voiceResponse: string
}

export const VoiceSectionNavigator: React.FC<VoiceSectionNavigatorProps> = ({
  voiceConfig,
  enabledSections = ['all'],
  onSectionChange,
  className = '',
  enabled = true
}) => {
  const navigate = useNavigate()
  const location = useLocation()
  const [currentSection, setCurrentSection] = useState<string>('')
  const [isNavigating, setIsNavigating] = useState(false)
  const [speechRecognition, setSpeechRecognition] = useState<any>(null)
  const [speechHookLoading, setSpeechHookLoading] = useState(true)

  // Load speech recognition
  useEffect(() => {
    const loadSpeechRecognition = async () => {
      try {
        const hook = await useSpeechRecognitionLazy()
        setSpeechRecognition(() => hook)
        setSpeechHookLoading(false)
      } catch (error) {
        logger.error('Failed to load speech recognition for section navigation', error)
        setSpeechHookLoading(false)
      }
    }
    if (enabled) {
      loadSpeechRecognition()
    }
  }, [enabled])

  const speechRecognitionResult = speechRecognition ? speechRecognition() : {
    isListening: false,
    transcript: '',
    isSupported: false
  }

  const { transcript, isSupported: isSpeechSupported } = speechRecognitionResult
  const { speak, isSpeaking } = useSecureElevenLabsTTS(voiceConfig)

  // Define navigation sections with DBZ theming
  const navigationSections: NavigationSection[] = useMemo(() => [
    {
      id: 'hero',
      name: 'Hero Section',
      commands: ['hero', 'top', 'beginning', 'start', 'main title'],
      element: '[data-voice-id="hero-section"]',
      description: 'Navigate to main title area',
      voiceResponse: 'Focusing on the main Seiron portal! This is where your legendary journey begins!'
    },
    {
      id: 'power-level',
      name: 'Power Level',
      commands: ['power level', 'scouter', 'energy reading', 'power scanner'],
      element: '[data-voice-id="power-level"]',
      description: 'Navigate to power level display',
      voiceResponse: 'Scouter activated! Analyzing Seiron\'s current power level readings!'
    },
    {
      id: 'features',
      name: 'Training Features',
      commands: ['features', 'training', 'power levels', 'tiers', 'warrior levels'],
      element: '.grid',
      description: 'Navigate to feature cards section',
      voiceResponse: 'Accessing warrior training programs! Choose your power level and begin your transformation!'
    },
    {
      id: 'elite-warrior',
      name: 'Elite Warrior',
      commands: ['elite warrior', 'elite', 'first tier', 'beginner training'],
      element: '[data-voice-feature="elite-warrior"]',
      description: 'Navigate to Elite Warrior feature',
      voiceResponse: 'Elite Warrior training grounds activated! Perfect for mastering basic DeFi techniques!'
    },
    {
      id: 'super-saiyan',
      name: 'Super Saiyan',
      commands: ['super saiyan', 'saiyan', 'second tier', 'transformation'],
      element: '[data-voice-feature="super-saiyan"]',
      description: 'Navigate to Super Saiyan feature',
      voiceResponse: 'Super Saiyan transformation chamber ready! Prepare for devastating DeFi combinations!'
    },
    {
      id: 'fusion-master',
      name: 'Fusion Master',
      commands: ['fusion master', 'fusion', 'third tier', 'advanced training'],
      element: '[data-voice-feature="fusion-master"]',
      description: 'Navigate to Fusion Master feature',
      voiceResponse: 'Fusion Master dojo accessed! Advanced portfolio strategies await!'
    },
    {
      id: 'legendary-saiyan',
      name: 'Legendary Saiyan',
      commands: ['legendary saiyan', 'legendary', 'final tier', 'ultimate power'],
      element: '[data-voice-feature="legendary-saiyan"]',
      description: 'Navigate to Legendary Saiyan feature',
      voiceResponse: 'Legendary Saiyan temple activated! Ultimate portfolio warrior status awaits!'
    },
    {
      id: 'summon-button',
      name: 'Dragon Summon',
      commands: ['summon button', 'power up button', 'dragon button', 'main button'],
      element: '[data-voice-id="summon-button"]',
      description: 'Navigate to dragon summon button',
      voiceResponse: 'Dragon summoning altar located! Ready to unleash the portfolio dragon!'
    },
    {
      id: 'navigation',
      name: 'Navigation Links',
      commands: ['navigation', 'nav links', 'menu', 'links'],
      element: '.flex.justify-center.gap-8',
      description: 'Navigate to navigation links',
      voiceResponse: 'Navigation constellation activated! Access different aspects of Seiron\'s power!'
    },
    {
      id: 'footer',
      name: 'Footer Section',
      commands: ['footer', 'bottom', 'end', 'conclusion'],
      element: '.text-center.pb-12',
      description: 'Navigate to footer area',
      voiceResponse: 'Footer section reached! Final preparations before your DeFi journey!'
    },
    // Page navigation
    {
      id: 'chat-page',
      name: 'Chat Interface',
      commands: ['chat', 'conversation', 'talk to dragon', 'chat page'],
      path: '/chat',
      description: 'Navigate to chat page',
      voiceResponse: 'Opening the chat dimension! Prepare to commune with the portfolio dragon!'
    },
    {
      id: 'about-page',
      name: 'About Page',
      commands: ['about', 'information', 'about page', 'learn more'],
      path: '/about',
      description: 'Navigate to about page',
      voiceResponse: 'Accessing the sacred scrolls! Learn about Seiron\'s legendary origins!'
    }
  ], [])

  // Filter sections based on enabled sections
  const availableSections = useMemo(() => {
    if (enabledSections.includes('all')) {
      return navigationSections
    }
    return navigationSections.filter(section => enabledSections.includes(section.id))
  }, [navigationSections, enabledSections])

  // Navigate to section
  const navigateToSection = useCallback(async (section: NavigationSection) => {
    setIsNavigating(true)
    setCurrentSection(section.id)
    
    logger.debug('🧭 Voice section navigation', { 
      sectionId: section.id,
      sectionName: section.name,
      hasPath: !!section.path,
      hasElement: !!section.element
    })

    try {
      // Page navigation
      if (section.path) {
        navigate(section.path)
        await new Promise(resolve => setTimeout(resolve, 500)) // Wait for navigation
      }
      
      // Element navigation (scroll to element)
      if (section.element) {
        const element = document.querySelector(section.element)
        if (element) {
          element.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'center',
            inline: 'nearest'
          })
          
          // Highlight the element briefly
          element.classList.add('voice-navigation-highlight')
          setTimeout(() => {
            element.classList.remove('voice-navigation-highlight')
          }, 2000)
        } else {
          logger.warn('Voice navigation element not found', { 
            selector: section.element,
            sectionId: section.id
          })
        }
      }

      // Provide voice feedback
      const result = await speak(section.voiceResponse)()
      if (result._tag === 'Left') {
        logger.error('Voice navigation feedback failed', result.left)
      }

      // Notify parent component
      onSectionChange?.(section.id)
      
    } catch (error) {
      logger.error('Voice section navigation failed', error)
    } finally {
      setIsNavigating(false)
    }
  }, [navigate, speak, onSectionChange])

  // Process voice navigation commands
  const processNavigationCommand = useCallback(async (command: string) => {
    if (!command.trim() || isNavigating) return

    logger.debug('🎙️ Processing navigation command', { command })

    // Find matching section
    const matchingSection = availableSections.find(section =>
      section.commands.some(cmd => 
        command.toLowerCase().includes(cmd.toLowerCase())
      )
    )

    if (matchingSection) {
      logger.debug('🎯 Navigation command matched', { 
        sectionId: matchingSection.id,
        matchedCommand: matchingSection.commands.find(cmd => 
          command.toLowerCase().includes(cmd.toLowerCase())
        )
      })

      await navigateToSection(matchingSection)
    } else {
      // Provide help if no match found
      logger.debug('❓ No matching navigation command', { command })
      
      try {
        const helpResponse = "Navigation command not recognized. Try saying 'features' for training areas, 'hero' for the top, or 'chat' to begin your journey!"
        const result = await speak(helpResponse)()
        if (result._tag === 'Left') {
          logger.error('Navigation help feedback failed', result.left)
        }
      } catch (error) {
        logger.error('Navigation help feedback error', error)
      }
    }
  }, [availableSections, isNavigating, navigateToSection, speak])

  // Handle transcript changes
  useEffect(() => {
    if (transcript && transcript.length > 0) {
      const processingTimer = setTimeout(() => {
        processNavigationCommand(transcript)
      }, 1500)

      return () => clearTimeout(processingTimer)
    }
  }, [transcript, processNavigationCommand])

  // Update current section based on location
  useEffect(() => {
    const pathToSection: Record<string, string> = {
      '/': 'hero',
      '/chat': 'chat-page',
      '/about': 'about-page'
    }
    
    const section = pathToSection[location.pathname] || 'hero'
    setCurrentSection(section)
  }, [location.pathname])

  // Add CSS for highlight effect
  useEffect(() => {
    if (!enabled) return

    const style = document.createElement('style')
    style.textContent = `
      .voice-navigation-highlight {
        outline: 3px solid #fbbf24 !important;
        outline-offset: 4px !important;
        border-radius: 8px !important;
        box-shadow: 0 0 20px rgba(251, 191, 36, 0.5) !important;
        transition: all 0.3s ease !important;
        animation: voice-navigation-pulse 2s ease-in-out !important;
      }
      
      @keyframes voice-navigation-pulse {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.02); }
      }
    `
    document.head.appendChild(style)

    return () => {
      document.head.removeChild(style)
    }
  }, [enabled])

  // Global event listeners for section navigation
  useEffect(() => {
    if (!enabled) return

    const handleNavigationRequest = (event: CustomEvent) => {
      const { sectionId } = event.detail || {}
      const section = availableSections.find(s => s.id === sectionId)
      if (section) {
        navigateToSection(section)
      }
    }

    const handleListSections = () => {
      const sectionList = availableSections
        .map(section => `"${section.commands[0]}" for ${section.name}`)
        .join(', ')
      
      const listResponse = `Available navigation commands: ${sectionList}`
      speak(listResponse)()
    }

    window.addEventListener('voiceNavigateToSection', handleNavigationRequest as EventListener)
    window.addEventListener('voiceListSections', handleListSections)

    return () => {
      window.removeEventListener('voiceNavigateToSection', handleNavigationRequest as EventListener)
      window.removeEventListener('voiceListSections', handleListSections)
    }
  }, [enabled, availableSections, navigateToSection, speak])

  if (!enabled || speechHookLoading || !isSpeechSupported) {
    return null
  }

  return (
    <div className={`voice-section-navigator ${className}`}>
      {/* Navigation Status Indicator */}
      {isNavigating && (
        <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50">
          <div className="bg-orange-900/90 border border-orange-500/50 rounded-lg p-4 flex items-center space-x-3">
            <DragonBallLoadingStates.KiCharging size="md" color="orange" />
            <span className="text-orange-300 font-medium">
              🧭 Navigating to section...
            </span>
          </div>
        </div>
      )}

      {/* Current Section Indicator */}
      {currentSection && !isNavigating && (
        <div className="fixed top-6 right-1/2 transform translate-x-1/2 z-40">
          <div className="bg-gray-900/80 border border-blue-500/30 rounded-lg px-3 py-1 text-xs">
            <span className="text-blue-400">
              📍 {availableSections.find(s => s.id === currentSection)?.name || 'Current Section'}
            </span>
          </div>
        </div>
      )}

      {/* Voice Response Indicator */}
      {isSpeaking && (
        <div className="fixed bottom-36 right-6 z-40">
          <div className="bg-purple-900/90 border border-purple-500/50 rounded-lg p-2 flex items-center space-x-2">
            <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse" />
            <span className="text-purple-300 text-xs">
              🗣️ Navigation feedback
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

export default VoiceSectionNavigator

// Utility functions for external navigation
export const navigateToSectionByVoice = (sectionId: string) => {
  const event = new CustomEvent('voiceNavigateToSection', {
    detail: { sectionId }
  })
  window.dispatchEvent(event)
}

export const listAvailableSections = () => {
  const event = new CustomEvent('voiceListSections')
  window.dispatchEvent(event)
}
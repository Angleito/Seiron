'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { VoiceAnimationState } from '../../components/dragon/DragonRenderer'
import { logger } from '@lib/logger'

// ASCII Dragon poses
export type ASCIIPose = 'coiled' | 'flying' | 'attacking' | 'sleeping' | 'listening' | 'breathing'

// ASCII Dragon configuration
export interface ASCIIDragonConfig {
  initialPose: ASCIIPose
  enableVoiceReactivity: boolean
  enableBreathing: boolean
  enableEnergyEffects: boolean
  animationSpeed: number // 0-10 (10 being fastest)
  characterIntensity: number // 0-10 (10 being most intense)
}

// ASCII Dragon state
export interface ASCIIDragonState {
  currentPose: ASCIIPose
  animationFrame: number
  energyLevel: number // 0-100
  characterSet: 'basic' | 'medium' | 'intense' | 'max'
  isAnimating: boolean
  breathingPhase: number // 0-1 for breathing cycle
}

// ASCII character sets based on intensity
const characterSets = {
  basic: {
    body: '~',
    energy: '·',
    border: '-',
    accent: '.',
    fire: '^',
    water: '~',
    dragon: '🐉'
  },
  medium: {
    body: '≈',
    energy: '°',
    border: '=',
    accent: '•',
    fire: '∧',
    water: '≈',
    dragon: '🐲'
  },
  intense: {
    body: '≋',
    energy: '◦',
    border: '═',
    accent: '●',
    fire: '▲',
    water: '≋',
    dragon: '🐉'
  },
  max: {
    body: '≋',
    energy: '◉',
    border: '█',
    accent: '█',
    fire: '▲',
    water: '≋',
    dragon: '🔥🐉🔥'
  }
}

// ASCII dragon art templates
const dragonPoses = {
  coiled: (chars: typeof characterSets.basic) => `
    ${chars.energy.repeat(3)} ${chars.dragon} ${chars.energy.repeat(3)}
    ${chars.border.repeat(9)}
    ${chars.body.repeat(3)} ${chars.accent} ${chars.body.repeat(3)}
    ${chars.border.repeat(9)}
  `,
  
  flying: (chars: typeof characterSets.basic) => `
    ${chars.energy.repeat(5)} ${chars.dragon} ${chars.energy.repeat(5)}
    ${chars.body.repeat(4)} ${chars.fire} ${chars.body.repeat(4)}
    ${chars.border.repeat(13)}
    ${chars.water.repeat(6)} ${chars.accent} ${chars.water.repeat(6)}
  `,
  
  attacking: (chars: typeof characterSets.basic) => `
    ${chars.fire.repeat(3)} ${chars.dragon} ${chars.fire.repeat(3)}
    ${chars.energy.repeat(9)}
    ${chars.border.repeat(5)} ${chars.accent} ${chars.border.repeat(5)}
    ${chars.fire.repeat(4)} ${chars.accent} ${chars.fire.repeat(4)}
    ${chars.energy.repeat(9)}
  `,
  
  sleeping: (chars: typeof characterSets.basic) => `
    ${chars.energy} ${chars.dragon} ${chars.energy}
    ${chars.water.repeat(5)}
    ${chars.body.repeat(3)}
    ${chars.water.repeat(5)}
  `,
  
  listening: (chars: typeof characterSets.basic) => `
    ${chars.energy.repeat(2)} 👂 ${chars.dragon} 👂 ${chars.energy.repeat(2)}
    ${chars.border.repeat(11)}
    ${chars.body.repeat(5)} ${chars.accent} ${chars.body.repeat(5)}
    ${chars.water.repeat(11)}
  `,
  
  breathing: (chars: typeof characterSets.basic) => `
    ${chars.energy.repeat(4)} ${chars.dragon} ${chars.energy.repeat(4)}
    ${chars.fire.repeat(2)} ${chars.body.repeat(5)} ${chars.fire.repeat(2)}
    ${chars.border.repeat(13)}
    ${chars.water.repeat(6)} ${chars.accent} ${chars.water.repeat(6)}
    ${chars.energy.repeat(13)}
  `
}

// Default configuration
const defaultConfig: ASCIIDragonConfig = {
  initialPose: 'coiled',
  enableVoiceReactivity: true,
  enableBreathing: true,
  enableEnergyEffects: true,
  animationSpeed: 5,
  characterIntensity: 5
}

// Utility functions
const getCharacterSetFromIntensity = (intensity: number): keyof typeof characterSets => {
  if (intensity <= 2) return 'basic'
  if (intensity <= 5) return 'medium'
  if (intensity <= 8) return 'intense'
  return 'max'
}

const getCharacterSetFromVoiceState = (voiceState: VoiceAnimationState): keyof typeof characterSets => {
  if (voiceState.isSpeaking && voiceState.volume > 0.8) return 'max'
  if (voiceState.isSpeaking) return 'intense'
  if (voiceState.isListening) return 'medium'
  if (voiceState.isProcessing) return 'medium'
  return 'basic'
}

const getVoiceBasedPose = (voiceState: VoiceAnimationState): ASCIIPose => {
  if (voiceState.isSpeaking) return 'attacking'
  if (voiceState.isListening) return 'listening'
  if (voiceState.isProcessing) return 'breathing'
  if (voiceState.isIdle) return 'sleeping'
  return 'coiled'
}

const getVoiceBasedAnimationSpeed = (voiceState: VoiceAnimationState): number => {
  if (voiceState.isSpeaking) return 8 + (voiceState.volume * 2)
  if (voiceState.isListening) return 6
  if (voiceState.isProcessing) return 4
  return 2
}

const getVoiceBasedEnergyLevel = (voiceState: VoiceAnimationState): number => {
  if (voiceState.isSpeaking) return 80 + (voiceState.volume * 20)
  if (voiceState.isListening) return 60
  if (voiceState.isProcessing) return 40
  return 20
}

// Main hook
export const useASCIIDragon = (config: Partial<ASCIIDragonConfig> = {}) => {
  const fullConfig = { ...defaultConfig, ...config }
  
  const [dragonState, setDragonState] = useState<ASCIIDragonState>({
    currentPose: fullConfig.initialPose,
    animationFrame: 0,
    energyLevel: 50,
    characterSet: 'basic',
    isAnimating: false,
    breathingPhase: 0
  })
  
  const [currentVoiceState, setCurrentVoiceState] = useState<VoiceAnimationState>({
    isListening: false,
    isSpeaking: false,
    isProcessing: false,
    isIdle: true,
    volume: 0.5
  })
  
  // Animation loop
  useEffect(() => {
    if (!fullConfig.enableBreathing && !dragonState.isAnimating) return
    
    const animationSpeed = fullConfig.animationSpeed * 100 // Convert to milliseconds
    const interval = setInterval(() => {
      setDragonState(prev => ({
        ...prev,
        animationFrame: (prev.animationFrame + 1) % 10,
        breathingPhase: (prev.breathingPhase + 0.1) % 1
      }))
    }, animationSpeed)
    
    return () => clearInterval(interval)
  }, [fullConfig.animationSpeed, fullConfig.enableBreathing, dragonState.isAnimating])
  
  // Update character set based on energy level
  useEffect(() => {
    const newCharacterSet = getCharacterSetFromIntensity(fullConfig.characterIntensity)
    if (newCharacterSet !== dragonState.characterSet) {
      setDragonState(prev => ({ ...prev, characterSet: newCharacterSet }))
    }
  }, [fullConfig.characterIntensity, dragonState.characterSet])
  
  // Generate current ASCII art
  const currentArt = useMemo(() => {
    const chars = characterSets[dragonState.characterSet]
    let baseArt = dragonPoses[dragonState.currentPose](chars)
    
    // Add breathing effect
    if (fullConfig.enableBreathing) {
      const breathingIntensity = Math.sin(dragonState.breathingPhase * Math.PI * 2) * 0.5 + 0.5
      
      // Add breathing spaces
      if (breathingIntensity > 0.7) {
        baseArt = baseArt.replace(/~/g, '≈')
      } else if (breathingIntensity > 0.3) {
        baseArt = baseArt.replace(/~/g, '~')
      }
    }
    
    // Add energy effects
    if (fullConfig.enableEnergyEffects && dragonState.energyLevel > 60) {
      const energyBorder = chars.energy.repeat(Math.floor(dragonState.energyLevel / 10))
      baseArt = `${energyBorder}\n${baseArt}\n${energyBorder}`
    }
    
    // Add animation frame variations
    if (dragonState.isAnimating) {
      if (dragonState.animationFrame % 2 === 0) {
        baseArt = baseArt.replace(/🐉/g, '🔥🐉🔥')
      }
    }
    
    return baseArt
  }, [
    dragonState.currentPose,
    dragonState.characterSet,
    dragonState.breathingPhase,
    dragonState.energyLevel,
    dragonState.isAnimating,
    dragonState.animationFrame,
    fullConfig.enableBreathing,
    fullConfig.enableEnergyEffects
  ])
  
  // Update voice state
  const updateVoiceState = useCallback((voiceState: VoiceAnimationState) => {
    setCurrentVoiceState(voiceState)
    
    if (fullConfig.enableVoiceReactivity) {
      const newPose = getVoiceBasedPose(voiceState)
      const newCharacterSet = getCharacterSetFromVoiceState(voiceState)
      const newEnergyLevel = getVoiceBasedEnergyLevel(voiceState)
      
      setDragonState(prev => ({
        ...prev,
        currentPose: newPose,
        characterSet: newCharacterSet,
        energyLevel: newEnergyLevel,
        isAnimating: voiceState.isSpeaking || voiceState.isListening
      }))
      
      logger.debug('ASCII Dragon voice state updated', {
        pose: newPose,
        characterSet: newCharacterSet,
        energyLevel: newEnergyLevel,
        voiceState
      })
    }
  }, [fullConfig.enableVoiceReactivity])
  
  // Get voice-based pose
  const getVoiceBasedPoseFunction = useCallback(() => {
    return getVoiceBasedPose(currentVoiceState)
  }, [currentVoiceState])
  
  // Get voice-based animation speed
  const getVoiceBasedSpeedFunction = useCallback(() => {
    return getVoiceBasedAnimationSpeed(currentVoiceState)
  }, [currentVoiceState])
  
  // Manual pose control
  const setPose = useCallback((pose: ASCIIPose) => {
    setDragonState(prev => ({ ...prev, currentPose: pose }))
    logger.debug(`ASCII Dragon pose set to: ${pose}`)
  }, [])
  
  // Manual energy level control
  const setEnergyLevel = useCallback((level: number) => {
    const clampedLevel = Math.max(0, Math.min(100, level))
    setDragonState(prev => ({ ...prev, energyLevel: clampedLevel }))
    logger.debug(`ASCII Dragon energy level set to: ${clampedLevel}`)
  }, [])
  
  // Start/stop animation
  const startAnimation = useCallback(() => {
    setDragonState(prev => ({ ...prev, isAnimating: true }))
    logger.debug('ASCII Dragon animation started')
  }, [])
  
  const stopAnimation = useCallback(() => {
    setDragonState(prev => ({ ...prev, isAnimating: false }))
    logger.debug('ASCII Dragon animation stopped')
  }, [])
  
  // Trigger special effect
  const triggerSpecialEffect = useCallback((effect: 'fire' | 'water' | 'energy' | 'sleep') => {
    logger.debug(`ASCII Dragon triggering special effect: ${effect}`)
    
    const originalPose = dragonState.currentPose
    const originalCharacterSet = dragonState.characterSet
    
    switch (effect) {
      case 'fire':
        setDragonState(prev => ({
          ...prev,
          currentPose: 'attacking',
          characterSet: 'max',
          energyLevel: 100,
          isAnimating: true
        }))
        break
      case 'water':
        setDragonState(prev => ({
          ...prev,
          currentPose: 'breathing',
          characterSet: 'medium',
          energyLevel: 60
        }))
        break
      case 'energy':
        setDragonState(prev => ({
          ...prev,
          characterSet: 'intense',
          energyLevel: 90,
          isAnimating: true
        }))
        break
      case 'sleep':
        setDragonState(prev => ({
          ...prev,
          currentPose: 'sleeping',
          characterSet: 'basic',
          energyLevel: 10,
          isAnimating: false
        }))
        break
    }
    
    // Return to original state after effect
    setTimeout(() => {
      setDragonState(prev => ({
        ...prev,
        currentPose: originalPose,
        characterSet: originalCharacterSet,
        isAnimating: false
      }))
    }, 3000)
  }, [dragonState.currentPose, dragonState.characterSet])
  
  // Get available poses
  const availablePoses = useMemo(() => {
    return Object.keys(dragonPoses) as ASCIIPose[]
  }, [])
  
  // Get available character sets
  const availableCharacterSets = useMemo(() => {
    return Object.keys(characterSets) as (keyof typeof characterSets)[]
  }, [])
  
  return {
    // State
    dragonState,
    currentArt,
    currentVoiceState,
    
    // Voice integration
    updateVoiceState,
    getVoiceBasedPose: getVoiceBasedPoseFunction,
    getVoiceBasedSpeed: getVoiceBasedSpeedFunction,
    
    // Manual controls
    setPose,
    setEnergyLevel,
    startAnimation,
    stopAnimation,
    triggerSpecialEffect,
    
    // Available options
    availablePoses,
    availableCharacterSets,
    
    // Utility
    characterSets
  }
}

export default useASCIIDragon
/**
 * Voice-Dragon State Mapping Utilities
 * 
 * This module provides utilities for mapping voice states to dragon animations
 * and visual feedback across different dragon types (2D, 3D, ASCII).
 */

import { VoiceAnimationState } from '../components/dragon/DragonRenderer'

// Voice intensity levels for different operations
export const VOICE_INTENSITY = {
  IDLE: 0.0,
  LISTENING: 0.8,
  SPEAKING: 1.0,
  PROCESSING: 0.6,
  ERROR: 0.9
} as const

// Voice emotion mapping based on system state
export const VOICE_EMOTIONS = {
  NEUTRAL: 'neutral',
  HAPPY: 'happy',
  EXCITED: 'excited',
  ANGRY: 'angry',
  SLEEPING: 'sleeping'
} as const

// Dragon pose mapping for ASCII dragons
export const DRAGON_POSES = {
  IDLE: 'coiled',
  LISTENING: 'flying',
  SPEAKING: 'attacking',
  PROCESSING: 'coiled',
  SLEEPING: 'sleeping',
  ERROR: 'attacking'
} as const

// Animation speed mapping
export const ANIMATION_SPEEDS = {
  IDLE: 'slow',
  LISTENING: 'normal',
  SPEAKING: 'fast',
  PROCESSING: 'normal',
  ERROR: 'fast'
} as const

/**
 * Creates a voice animation state from speech recognition and TTS states
 */
export function createVoiceAnimationState(
  isListening: boolean,
  isSpeaking: boolean,
  isProcessing: boolean,
  hasError: boolean,
  volume?: number
): VoiceAnimationState {
  // Determine primary state
  const isIdle = !isListening && !isSpeaking && !isProcessing && !hasError
  
  // Calculate volume based on state
  const calculatedVolume = volume ?? (
    hasError ? VOICE_INTENSITY.ERROR :
    isSpeaking ? VOICE_INTENSITY.SPEAKING :
    isListening ? VOICE_INTENSITY.LISTENING :
    isProcessing ? VOICE_INTENSITY.PROCESSING :
    VOICE_INTENSITY.IDLE
  )

  // Determine emotion based on state priority
  const emotion = hasError ? VOICE_EMOTIONS.ANGRY :
                 isSpeaking ? VOICE_EMOTIONS.EXCITED :
                 isListening ? VOICE_EMOTIONS.HAPPY :
                 isIdle ? VOICE_EMOTIONS.NEUTRAL :
                 VOICE_EMOTIONS.NEUTRAL

  return {
    isListening,
    isSpeaking,
    isProcessing,
    isIdle,
    volume: calculatedVolume,
    emotion: emotion as 'neutral' | 'happy' | 'angry' | 'sleeping' | 'excited'
  }
}

/**
 * Maps voice state to ASCII dragon pose
 */
export function voiceStateToASCIIPose(voiceState: VoiceAnimationState): 'coiled' | 'flying' | 'attacking' | 'sleeping' {
  if (voiceState.emotion === 'sleeping') return DRAGON_POSES.SLEEPING as 'sleeping'
  if (voiceState.isSpeaking) return DRAGON_POSES.SPEAKING as 'attacking'
  if (voiceState.isListening) return DRAGON_POSES.LISTENING as 'flying'
  if (voiceState.isProcessing) return DRAGON_POSES.PROCESSING as 'coiled'
  return DRAGON_POSES.IDLE as 'coiled'
}

/**
 * Maps voice state to animation speed
 */
export function voiceStateToAnimationSpeed(voiceState: VoiceAnimationState): 'slow' | 'normal' | 'fast' {
  if (voiceState.emotion === 'angry') return ANIMATION_SPEEDS.ERROR as 'fast'
  if (voiceState.isSpeaking) return ANIMATION_SPEEDS.SPEAKING as 'fast'
  if (voiceState.isListening) return ANIMATION_SPEEDS.LISTENING as 'normal'
  if (voiceState.isProcessing) return ANIMATION_SPEEDS.PROCESSING as 'normal'
  return ANIMATION_SPEEDS.IDLE as 'slow'
}

/**
 * Maps voice state to 2D sprite animation properties
 */
export function voiceStateTo2DProps(voiceState: VoiceAnimationState) {
  const scale = voiceState.isSpeaking ? 1.1 : 
                voiceState.isListening ? 1.05 : 
                voiceState.isProcessing ? 1.02 : 1.0

  const shouldPulse = voiceState.isSpeaking || voiceState.isListening
  const shouldGlow = (voiceState.volume ?? 0) > 0.5

  return {
    scale,
    shouldPulse,
    shouldGlow,
    glowIntensity: voiceState.volume ?? 0,
    rotationSpeed: voiceState.isProcessing ? 'normal' : 'slow'
  }
}

/**
 * Maps voice state to 3D dragon properties
 */
export function voiceStateTo3DProps(voiceState: VoiceAnimationState) {
  const baseSpeed = 1.0
  const animationSpeed = voiceState.isSpeaking ? baseSpeed * 2.0 : 
                        voiceState.isListening ? baseSpeed * 1.5 : 
                        voiceState.isProcessing ? baseSpeed * 1.2 : 
                        baseSpeed * 0.8

  const showParticles = voiceState.isSpeaking || voiceState.isListening
  const particleIntensity = voiceState.volume ?? 0.5
  const autoRotate = voiceState.isProcessing

  return {
    animationSpeed,
    showParticles,
    particleIntensity,
    autoRotate,
    glowIntensity: voiceState.volume ?? 0,
    breathingIntensity: voiceState.isIdle ? 0.8 : 1.0
  }
}

/**
 * Determines if dragon should show breathing animation
 */
export function shouldShowBreathing(voiceState: VoiceAnimationState): boolean {
  return voiceState.isIdle || voiceState.isListening || voiceState.isProcessing
}

/**
 * Determines if dragon should show floating animation
 */
export function shouldShowFloating(voiceState: VoiceAnimationState): boolean {
  return voiceState.isListening || voiceState.isProcessing
}

/**
 * Determines if dragon should show fire/energy effects
 */
export function shouldShowEnergyEffects(voiceState: VoiceAnimationState): boolean {
  return voiceState.isSpeaking || voiceState.emotion === 'excited'
}

/**
 * Gets the appropriate dragon type based on voice state and performance
 */
export function getOptimalDragonType(
  voiceState: VoiceAnimationState,
  performanceMode: 'auto' | 'high' | 'low' = 'auto',
  is3DSupported: boolean = true
): '2d' | '3d' | 'ascii' {
  if (performanceMode === 'low') {
    return 'ascii'
  }
  
  if (performanceMode === 'high' && is3DSupported) {
    return '3d'
  }
  
  if (performanceMode === 'auto') {
    // Use 3D for high-intensity voice states if supported
    if (is3DSupported && (voiceState.isSpeaking || voiceState.emotion === 'excited')) {
      return '3d'
    }
    
    // Use 2D for moderate activity
    if (voiceState.isListening || voiceState.isProcessing) {
      return '2d'
    }
    
    // Use ASCII for idle states to save resources
    return 'ascii'
  }
  
  return '2d' // Default fallback
}

/**
 * Creates comprehensive dragon configuration from voice state
 */
export function createDragonConfig(
  voiceState: VoiceAnimationState,
  dragonType: '2d' | '3d' | 'ascii' = '2d'
) {
  const baseConfig = {
    voiceState,
    size: 'lg' as const,
    enableHover: true,
    enableFallback: true,
    fallbackType: '2d' as const,
    performanceMode: 'auto' as const
  }

  switch (dragonType) {
    case 'ascii':
      return {
        ...baseConfig,
        asciiProps: {
          pose: voiceStateToASCIIPose(voiceState),
          speed: voiceStateToAnimationSpeed(voiceState),
          enableBreathing: shouldShowBreathing(voiceState),
          enableFloating: shouldShowFloating(voiceState),
          enableTypewriter: false // Disable for voice responsiveness
        }
      }
    
    case '3d':
      return {
        ...baseConfig,
        threeDProps: voiceStateTo3DProps(voiceState)
      }
    
    case '2d':
    default:
      return {
        ...baseConfig,
        spriteProps: voiceStateTo2DProps(voiceState)
      }
  }
}

/**
 * Advanced voice analysis utilities
 */
export const voiceAnalysis = {
  /**
   * Analyzes transcript content for emotional context
   */
  analyzeTranscriptEmotion(transcript: string): 'neutral' | 'happy' | 'angry' | 'excited' {
    const text = transcript.toLowerCase()
    
    // Excited patterns
    const excitedPatterns = [
      'awesome', 'amazing', 'fantastic', 'incredible', 'wow', 'yes!', 'great!',
      'excellent', 'perfect', 'brilliant', '!', 'love', 'super'
    ]
    
    // Angry patterns  
    const angryPatterns = [
      'angry', 'mad', 'frustrated', 'damn', 'hate', 'terrible', 'awful',
      'stupid', 'ridiculous', 'annoying', 'furious'
    ]
    
    // Happy patterns
    const happyPatterns = [
      'happy', 'good', 'nice', 'thanks', 'thank you', 'pleased', 'glad',
      'wonderful', 'lovely', 'beautiful', 'smile', 'fun'
    ]
    
    let excitedScore = 0
    let angryScore = 0
    let happyScore = 0
    
    excitedPatterns.forEach(pattern => {
      if (text.includes(pattern)) excitedScore++
    })
    
    angryPatterns.forEach(pattern => {
      if (text.includes(pattern)) angryScore++
    })
    
    happyPatterns.forEach(pattern => {
      if (text.includes(pattern)) happyScore++
    })
    
    // Return the highest scoring emotion
    if (excitedScore > angryScore && excitedScore > happyScore) return 'excited'
    if (angryScore > happyScore) return 'angry'
    if (happyScore > 0) return 'happy'
    
    return 'neutral'
  },

  /**
   * Calculates speech intensity based on various factors
   */
  calculateSpeechIntensity(
    transcript: string,
    isListening: boolean,
    isSpeaking: boolean,
    duration: number = 0
  ): number {
    let intensity = 0
    
    // Base intensity from activity
    if (isSpeaking) intensity += 0.8
    if (isListening) intensity += 0.6
    
    // Transcript-based intensity
    const transcriptIntensity = Math.min(transcript.length / 50, 1.0)
    intensity += transcriptIntensity * 0.4
    
    // Punctuation intensity boost
    const exclamations = (transcript.match(/[!?]/g) || []).length
    intensity += Math.min(exclamations * 0.1, 0.3)
    
    // Capital letters intensity boost
    const capitals = (transcript.match(/[A-Z]/g) || []).length
    const capitalRatio = transcript.length > 0 ? capitals / transcript.length : 0
    intensity += Math.min(capitalRatio * 0.5, 0.2)
    
    // Duration-based intensity decay
    if (duration > 5000) {
      intensity *= Math.max(0.5, 1 - (duration - 5000) / 10000)
    }
    
    return Math.max(0, Math.min(1, intensity))
  },

  /**
   * Detects if user is asking a question
   */
  isQuestion(transcript: string): boolean {
    const text = transcript.toLowerCase().trim()
    
    // Direct question patterns
    const questionWords = ['what', 'where', 'when', 'why', 'who', 'how', 'which', 'is', 'are', 'can', 'will', 'would', 'could', 'should']
    const startsWithQuestion = questionWords.some(word => text.startsWith(word))
    
    // Ends with question mark
    const endsWithQuestion = text.endsWith('?')
    
    return startsWithQuestion || endsWithQuestion
  },

  /**
   * Detects if user is giving a command
   */
  isCommand(transcript: string): boolean {
    const text = transcript.toLowerCase().trim()
    
    const commandWords = ['play', 'stop', 'start', 'go', 'show', 'tell', 'help', 'open', 'close', 'create', 'delete', 'move', 'copy']
    const startsWithCommand = commandWords.some(word => text.startsWith(word))
    
    // Imperative tone indicators
    const hasImperativeWords = ['please', 'now', 'immediately', 'quickly'].some(word => text.includes(word))
    
    return startsWithCommand || hasImperativeWords
  }
}

/**
 * Voice state transition utilities
 */
export const voiceStateTransitions = {
  /**
   * Smooth transition between voice states
   */
  interpolate(
    from: VoiceAnimationState,
    to: VoiceAnimationState,
    progress: number
  ): VoiceAnimationState {
    const t = Math.max(0, Math.min(1, progress))
    
    return {
      isListening: progress > 0.5 ? to.isListening : from.isListening,
      isSpeaking: progress > 0.5 ? to.isSpeaking : from.isSpeaking,
      isProcessing: progress > 0.5 ? to.isProcessing : from.isProcessing,
      isIdle: progress > 0.5 ? to.isIdle : from.isIdle,
      volume: from.volume ? from.volume * (1 - t) + (to.volume || 0) * t : to.volume,
      emotion: progress > 0.5 ? to.emotion : from.emotion
    }
  },

  /**
   * Determines if a voice state transition should trigger animation
   */
  shouldAnimate(from: VoiceAnimationState, to: VoiceAnimationState): boolean {
    return from.isListening !== to.isListening ||
           from.isSpeaking !== to.isSpeaking ||
           from.isProcessing !== to.isProcessing ||
           from.emotion !== to.emotion ||
           Math.abs((from.volume || 0) - (to.volume || 0)) > 0.1
  },

  /**
   * Creates a timed sequence of voice states
   */
  createSequence(states: VoiceAnimationState[], durations: number[]): {
    state: VoiceAnimationState
    duration: number
  }[] {
    if (states.length !== durations.length) {
      throw new Error('States and durations arrays must have the same length')
    }
    
    return states.map((state, index) => ({
      state,
      duration: durations[index]
    }))
  },

  /**
   * Blends multiple voice states with different weights
   */
  blend(states: VoiceAnimationState[], weights: number[]): VoiceAnimationState {
    if (states.length !== weights.length) {
      throw new Error('States and weights arrays must have the same length')
    }
    
    const totalWeight = weights.reduce((sum, weight) => sum + weight, 0)
    if (totalWeight === 0) {
      return createVoiceAnimationState(false, false, false, false)
    }
    
    const normalizedWeights = weights.map(w => w / totalWeight)
    
    // Blend volumes
    const blendedVolume = states.reduce((sum, state, index) => 
      sum + (state.volume || 0) * normalizedWeights[index], 0
    )
    
    // Choose dominant emotion based on weights
    let maxWeight = 0
    let dominantEmotion: VoiceAnimationState['emotion'] = 'neutral'
    states.forEach((state, index) => {
      if (normalizedWeights[index] > maxWeight) {
        maxWeight = normalizedWeights[index]
        dominantEmotion = state.emotion
      }
    })
    
    // Blend boolean states (true if any weighted state is true)
    const isListening = states.some((state, index) => state.isListening && normalizedWeights[index] > 0.3)
    const isSpeaking = states.some((state, index) => state.isSpeaking && normalizedWeights[index] > 0.3)
    const isProcessing = states.some((state, index) => state.isProcessing && normalizedWeights[index] > 0.3)
    
    return {
      isListening,
      isSpeaking,
      isProcessing,
      isIdle: !isListening && !isSpeaking && !isProcessing,
      volume: blendedVolume,
      emotion: dominantEmotion
    }
  }
}

/**
 * Enhanced voice state factory with context analysis
 */
export function createEnhancedVoiceAnimationState(
  isListening: boolean,
  isSpeaking: boolean,
  isProcessing: boolean,
  hasError: boolean,
  transcript: string = '',
  duration: number = 0,
  volume?: number
): VoiceAnimationState {
  // Analyze transcript for enhanced emotion detection
  const transcriptEmotion = voiceAnalysis.analyzeTranscriptEmotion(transcript)
  
  // Calculate enhanced volume based on speech intensity
  const enhancedVolume = volume ?? voiceAnalysis.calculateSpeechIntensity(
    transcript, isListening, isSpeaking, duration
  )
  
  // Determine final emotion with transcript context
  let finalEmotion: VoiceAnimationState['emotion'] = 'neutral'
  
  if (hasError) {
    finalEmotion = 'angry'
  } else if (isSpeaking) {
    finalEmotion = transcriptEmotion === 'neutral' ? 'excited' : transcriptEmotion
  } else if (isListening) {
    finalEmotion = transcriptEmotion === 'neutral' ? 'happy' : transcriptEmotion
  } else if (transcript.length === 0) {
    finalEmotion = 'sleeping'
  } else {
    finalEmotion = transcriptEmotion
  }
  
  return {
    isListening,
    isSpeaking,
    isProcessing,
    isIdle: !isListening && !isSpeaking && !isProcessing,
    volume: enhancedVolume,
    emotion: finalEmotion
  }
}

/**
 * Dragon behavior patterns based on voice context
 */
export const dragonBehaviorPatterns = {
  /**
   * Gets appropriate dragon behavior for question context
   */
  forQuestion(transcript: string): Partial<VoiceAnimationState> {
    return {
      emotion: 'happy',
      volume: 0.7
    }
  },

  /**
   * Gets appropriate dragon behavior for command context
   */
  forCommand(transcript: string): Partial<VoiceAnimationState> {
    return {
      emotion: 'excited',
      volume: 0.9
    }
  },

  /**
   * Gets appropriate dragon behavior for conversation context
   */
  forConversation(transcript: string): Partial<VoiceAnimationState> {
    const emotion = voiceAnalysis.analyzeTranscriptEmotion(transcript)
    return {
      emotion,
      volume: 0.6
    }
  },

  /**
   * Gets behavior pattern based on transcript analysis
   */
  analyze(transcript: string): Partial<VoiceAnimationState> {
    if (voiceAnalysis.isQuestion(transcript)) {
      return this.forQuestion(transcript)
    }
    
    if (voiceAnalysis.isCommand(transcript)) {
      return this.forCommand(transcript)
    }
    
    return this.forConversation(transcript)
  }
}
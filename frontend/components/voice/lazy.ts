import { lazy } from 'react'

/**
 * Lazy-loaded voice feature components
 * These components are loaded on demand to reduce initial bundle size
 */

// Main voice interface component
export const LazyVoiceInterface = lazy(() =>
  import('./VoiceInterface').then(module => ({
    default: module.default
  }))
)

// Voice interface example
export const LazyVoiceInterfaceExample = lazy(() =>
  import('./VoiceInterfaceExample').then(module => ({
    default: module.default
  }))
)

/**
 * Voice feature availability checker
 */
export const checkVoiceFeatureAvailability = () => {
  if (typeof window === 'undefined') return {
    hasWebSpeech: false,
    hasAudioContext: false,
    hasMediaDevices: false,
    isSupported: false
  }
  
  const hasWebSpeech = 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window
  const hasAudioContext = 'AudioContext' in window || 'webkitAudioContext' in window
  const hasMediaDevices = navigator.mediaDevices && navigator.mediaDevices.getUserMedia
  
  return {
    hasWebSpeech,
    hasAudioContext,
    hasMediaDevices,
    isSupported: hasWebSpeech && hasAudioContext && hasMediaDevices
  }
}

/**
 * Preloader for voice components
 */
export const preloadVoiceComponents = () => {
  // Only preload if voice features are supported
  const availability = checkVoiceFeatureAvailability()
  
  if (availability.isSupported) {
    // Preload voice interface
    import('./VoiceInterface')
    
    // Preload voice hooks
    import('../../hooks/voice/useSpeechRecognition')
    import('../../hooks/voice/useElevenLabsTTS')
  }
}

/**
 * Utility to check if voice components are loaded
 */
export const isVoiceComponentsLoaded = () => {
  return typeof window !== 'undefined' && 
         (window as any).__VOICE_COMPONENTS_LOADED__ === true
}

/**
 * Mark voice components as loaded
 */
export const markVoiceComponentsLoaded = () => {
  if (typeof window !== 'undefined') {
    (window as any).__VOICE_COMPONENTS_LOADED__ = true
  }
}

/**
 * Voice loading progress tracker
 */
export const getVoiceLoadingProgress = () => {
  const components = [
    'VoiceInterface',
    'useSpeechRecognition',
    'useElevenLabsTTS'
  ]
  
  const loaded = components.filter(comp => 
    typeof window !== 'undefined' && 
    (window as any).__VOICE_LOADED__?.[comp]
  ).length
  
  return {
    loaded,
    total: components.length,
    progress: Math.round((loaded / components.length) * 100)
  }
}

// Type augmentation for window object
declare global {
  interface Window {
    __VOICE_COMPONENTS_LOADED__?: boolean
    __VOICE_LOADED__?: Record<string, boolean>
  }
}
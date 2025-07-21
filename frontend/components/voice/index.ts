// Voice component exports
export { default as VoiceInterface } from './VoiceInterface'
export type { VoiceInterfaceProps, VoiceInterfaceState } from './VoiceInterface'
export { useVoiceInterfaceAudio } from './VoiceInterface'

// Homepage voice integration components
export { default as VoiceNavigationShortcuts } from './VoiceNavigationShortcuts'
export { default as VoiceFeatureDescriptor, triggerFeatureDescription, describeAllFeatures, stopVoiceDescription } from './VoiceFeatureDescriptor'
export { default as VoiceHomepageIntegration, enableVoiceHomepage, disableVoiceHomepage, triggerVoiceDragonSummon } from './VoiceHomepageIntegration'
export { default as VoicePerformanceOptimizer, optimizeVoicePerformance, getVoicePerformanceMetrics } from './VoicePerformanceOptimizer'
export { default as VoiceSectionNavigator, navigateToSectionByVoice, listAvailableSections } from './VoiceSectionNavigator'
export { default as VoiceInteractionFeedback, triggerInteractionFeedback, clearFeedbackQueue } from './VoiceInteractionFeedback'

// Debug components
export { default as VoiceConfigDebugger } from './VoiceConfigDebugger'

// Lazy loading utilities
export * from './lazy';
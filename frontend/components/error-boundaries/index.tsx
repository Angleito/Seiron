import React from 'react'
import { DragonBallErrorBoundary } from './DragonBallErrorBoundary'
import { DragonWebGLErrorBoundary } from './WebGLErrorBoundary'
import { DragonWalletErrorBoundary } from './WalletErrorBoundary'
import { VoiceErrorBoundary } from './VoiceErrorBoundary'
import { errorRecoveryUtils } from '@utils/errorRecovery'

// Core error boundary components
export { ErrorBoundary, withErrorBoundary, useErrorHandler } from '@components/ErrorBoundary'
export { DragonBallErrorBoundary, ChatComponentErrorBoundary, ChatFeatureErrorBoundary, ChatPageErrorBoundary } from './DragonBallErrorBoundary'

// Specialized error boundaries
export { WebGLErrorBoundary, withWebGLErrorBoundary, DragonWebGLErrorBoundary } from './WebGLErrorBoundary'
export { WalletErrorBoundary, withWalletErrorBoundary, DragonWalletErrorBoundary } from './WalletErrorBoundary'
export { VoiceErrorBoundary, SpeechRecognitionErrorBoundary, TTSErrorBoundary } from './VoiceErrorBoundary'

// Existing error boundaries
export { ChatErrorBoundary } from './ChatErrorBoundary'
export { PageErrorBoundary } from './PageErrorBoundary'
export { RootErrorBoundary } from './RootErrorBoundary'

// Error monitoring
export { ErrorMonitoringDashboard, useErrorMonitoring } from './ErrorMonitoringDashboard'

// Error recovery utilities
export { errorRecoveryUtils } from '@utils/errorRecovery'

// Common error boundary patterns
export const createErrorBoundary = (name: string, level: 'component' | 'feature' | 'page' | 'app' = 'component') => {
  return ({ children }: { children: React.ReactNode }) => (
    <DragonBallErrorBoundary
      name={name}
      level={level}
      enableDragonAnimation={level !== 'component'}
    >
      {children}
    </DragonBallErrorBoundary>
  )
}

// Enhanced error boundary with monitoring
export const createMonitoredErrorBoundary = (
  name: string,
  level: 'component' | 'feature' | 'page' | 'app' = 'component'
) => {
  return ({ children }: { children: React.ReactNode }) => (
    <DragonBallErrorBoundary
      name={name}
      level={level}
      enableDragonAnimation={level !== 'component'}
      onError={(error: Error, errorInfo: React.ErrorInfo) => {
        errorRecoveryUtils.monitor.recordError(error, name, false)
      }}
    >
      {children}
    </DragonBallErrorBoundary>
  )
}

// Web3/Wallet specific error boundary
export const createWalletErrorBoundary = (componentName: string) => {
  return ({ children }: { children: React.ReactNode }) => (
    <DragonWalletErrorBoundary>
      {children}
    </DragonWalletErrorBoundary>
  )
}

// WebGL/3D specific error boundary
export const createWebGLErrorBoundary = (componentName: string) => {
  return ({ children }: { children: React.ReactNode }) => (
    <DragonWebGLErrorBoundary>
      {children}
    </DragonWebGLErrorBoundary>
  )
}

// Voice/Audio specific error boundary
export const createVoiceErrorBoundary = (componentName: string) => {
  return ({ children, onRecovery }: { children: React.ReactNode; onRecovery?: () => void }) => (
    <VoiceErrorBoundary onReset={onRecovery}>
      {children}
    </VoiceErrorBoundary>
  )
}
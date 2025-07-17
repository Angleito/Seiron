/**
 * Enhanced Voice Error Boundary with automatic recovery and intelligent fallbacks
 */

import React, { Component, ErrorInfo, ReactNode } from 'react'
import { DragonBallErrorBoundary } from './DragonBallErrorBoundary'
import { DragonRenderer } from '@components/dragon/DragonRenderer'
import { Button } from '@components/ui/forms/Button'
import { voiceErrorRecovery, VoiceErrorDetails, VoiceErrorType, VoiceRecoveryStrategy } from '@lib/voice-error-recovery'
import { errorRecoveryUtils } from '@utils/errorRecovery'
import { logger } from '@lib/logger'

interface EnhancedVoiceErrorBoundaryProps {
  children: ReactNode
  onError?: (error: VoiceErrorDetails) => void
  onRecovery?: () => void
  enableAutoRecovery?: boolean
  fallbackToTextMode?: boolean
  showDetailedErrors?: boolean
  className?: string
}

interface EnhancedVoiceErrorBoundaryState {
  hasError: boolean
  errorDetails: VoiceErrorDetails | null
  isRecovering: boolean
  recoveryAttempts: number
  textModeEnabled: boolean
  showTechnicalDetails: boolean
}

export class EnhancedVoiceErrorBoundary extends Component<
  EnhancedVoiceErrorBoundaryProps,
  EnhancedVoiceErrorBoundaryState
> {
  private recoveryTimeout?: NodeJS.Timeout
  private readonly maxRecoveryAttempts = 3
  private readonly recoveryDelay = 2000

  constructor(props: EnhancedVoiceErrorBoundaryProps) {
    super(props)
    this.state = {
      hasError: false,
      errorDetails: null,
      isRecovering: false,
      recoveryAttempts: 0,
      textModeEnabled: false,
      showTechnicalDetails: false
    }
  }

  static getDerivedStateFromError(error: Error): Partial<EnhancedVoiceErrorBoundaryState> {
    return {
      hasError: true,
      errorDetails: null // Will be set in componentDidCatch
    }
  }

  override async componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    try {
      // Classify and handle the voice error
      const errorDetails = await voiceErrorRecovery.handleError(error)
      
      this.setState({ errorDetails })
      
      // Notify parent component
      this.props.onError?.(errorDetails)
      
      // Log detailed error information
      logger.error('Voice Error Boundary caught error:', {
        errorType: errorDetails.type,
        severity: errorDetails.severity,
        message: errorDetails.message,
        retryable: errorDetails.retryable,
        requiresUserAction: errorDetails.requiresUserAction,
        componentStack: errorInfo.componentStack
      })
      
      // Attempt automatic recovery if enabled and appropriate
      if (this.props.enableAutoRecovery && errorDetails.retryable && !errorDetails.requiresUserAction) {
        this.attemptAutoRecovery(errorDetails)
      }
      
      // Enable text mode fallback if appropriate
      if (this.props.fallbackToTextMode && this.shouldFallbackToTextMode(errorDetails)) {
        this.setState({ textModeEnabled: true })
      }
      
    } catch (classificationError) {
      logger.error('Failed to classify voice error:', classificationError)
      
      // Create a fallback error details object
      const fallbackErrorDetails: VoiceErrorDetails = {
        type: VoiceErrorType.UNKNOWN_ERROR,
        severity: 'medium' as any,
        message: error.message || 'Unknown voice error',
        userMessage: 'An unexpected error occurred with voice features.',
        recoveryStrategy: VoiceRecoveryStrategy.RETRY,
        retryable: true,
        requiresUserAction: false,
        troubleshootingSteps: [
          { icon: '🔄', text: 'Try refreshing the page' },
          { icon: '💬', text: 'Continue with text chat' }
        ]
      }
      
      this.setState({ errorDetails: fallbackErrorDetails })
    }
  }

  override componentWillUnmount() {
    if (this.recoveryTimeout) {
      clearTimeout(this.recoveryTimeout)
    }
  }

  private shouldFallbackToTextMode(errorDetails: VoiceErrorDetails): boolean {
    const textModeFallbackErrors = [
      VoiceErrorType.MICROPHONE_PERMISSION_DENIED,
      VoiceErrorType.MICROPHONE_NOT_FOUND,
      VoiceErrorType.BROWSER_NOT_SUPPORTED,
      VoiceErrorType.HTTPS_REQUIRED,
      VoiceErrorType.TTS_API_ERROR,
      VoiceErrorType.SPEECH_RECOGNITION_NOT_SUPPORTED
    ]
    
    return textModeFallbackErrors.includes(errorDetails.type)
  }

  private async attemptAutoRecovery(errorDetails: VoiceErrorDetails) {
    if (this.state.recoveryAttempts >= this.maxRecoveryAttempts) {
      logger.warn(`Max recovery attempts reached for ${errorDetails.type}`)
      return
    }

    this.setState({ 
      isRecovering: true,
      recoveryAttempts: this.state.recoveryAttempts + 1
    })

    logger.info(`Attempting auto-recovery for ${errorDetails.type} (attempt ${this.state.recoveryAttempts + 1})`)

    this.recoveryTimeout = setTimeout(async () => {
      try {
        const recoveryManager = voiceErrorRecovery.getRecoveryManager()
        const recovered = await recoveryManager.attemptRecovery(errorDetails)

        if (recovered) {
          logger.info(`Auto-recovery successful for ${errorDetails.type}`)
          this.handleRecovery()
        } else {
          logger.warn(`Auto-recovery failed for ${errorDetails.type}`)
          this.setState({ isRecovering: false })
          
          // Try text mode fallback if recovery failed
          if (this.props.fallbackToTextMode && this.shouldFallbackToTextMode(errorDetails)) {
            this.setState({ textModeEnabled: true })
          }
        }
      } catch (recoveryError) {
        logger.error('Auto-recovery threw error:', recoveryError)
        this.setState({ isRecovering: false })
      }
    }, this.recoveryDelay)
  }

  private handleRecovery = () => {
    this.setState({
      hasError: false,
      errorDetails: null,
      isRecovering: false,
      recoveryAttempts: 0,
      textModeEnabled: false
    })
    
    this.props.onRecovery?.()
    
    if (this.recoveryTimeout) {
      clearTimeout(this.recoveryTimeout)
    }
  }

  private handleManualRetry = async () => {
    if (!this.state.errorDetails) return

    this.setState({ isRecovering: true })

    try {
      const recoveryManager = voiceErrorRecovery.getRecoveryManager()
      const recovered = await recoveryManager.attemptRecovery(this.state.errorDetails)

      if (recovered) {
        this.handleRecovery()
      } else {
        this.setState({ isRecovering: false })
      }
    } catch (error) {
      logger.error('Manual retry failed:', error)
      this.setState({ isRecovering: false })
    }
  }

  private handleEnableTextMode = () => {
    this.setState({ textModeEnabled: true })
  }

  private handleToggleTechnicalDetails = () => {
    this.setState({ showTechnicalDetails: !this.state.showTechnicalDetails })
  }

  private renderErrorFallback() {
    const { errorDetails, isRecovering, textModeEnabled, showTechnicalDetails } = this.state
    
    if (!errorDetails) {
      return (
        <div className="flex flex-col items-center p-6 bg-gray-900/50 rounded-lg border border-red-800/50">
          <div className="text-red-400 text-xl mb-2">⚠️</div>
          <h3 className="text-lg font-semibold text-red-300 mb-2">Voice System Error</h3>
          <p className="text-gray-400 text-center">An unknown error occurred with the voice system.</p>
        </div>
      )
    }

    const getStatusColor = (severity: string) => {
      switch (severity) {
        case 'low': return 'text-yellow-400 border-yellow-800/50'
        case 'medium': return 'text-orange-400 border-orange-800/50'
        case 'high': return 'text-red-400 border-red-800/50'
        case 'critical': return 'text-red-500 border-red-900/50'
        default: return 'text-gray-400 border-gray-800/50'
      }
    }

    const statusColorClass = getStatusColor(errorDetails.severity)

    return (
      <div className={`flex flex-col items-center p-6 bg-gray-900/50 rounded-lg border ${statusColorClass} max-w-2xl mx-auto`}>
        {/* Dragon with Error State */}
        <div className="mb-4 relative">
          <DragonRenderer
            size="md"
            voiceState={{
              isListening: false,
              isSpeaking: false,
              isProcessing: isRecovering,
              isIdle: !isRecovering,
              volume: 0,
              emotion: isRecovering ? 'focused' : 'angry'
            }}
          />
          {isRecovering && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-orange-400 opacity-75"></div>
            </div>
          )}
        </div>

        {/* Error Title */}
        <h3 className="text-xl font-bold text-orange-300 mb-2 text-center">
          {isRecovering ? 'Restoring Dragon Voice...' : this.getErrorTitle(errorDetails.type)}
        </h3>

        {/* Error Message */}
        <p className="text-gray-400 text-center mb-4 max-w-md">
          {isRecovering ? 'The dragon is working to restore its voice powers...' : errorDetails.userMessage}
        </p>

        {/* Recovery Status */}
        {isRecovering && (
          <div className="w-full max-w-xs mb-4">
            <div className="bg-gray-800 rounded-full h-2 overflow-hidden">
              <div className="bg-orange-500 h-full animate-pulse rounded-full transition-all duration-500"></div>
            </div>
            <p className="text-center text-sm text-gray-500 mt-2">
              Recovery attempt {this.state.recoveryAttempts}/{this.maxRecoveryAttempts}
            </p>
          </div>
        )}

        {/* Troubleshooting Steps */}
        {!isRecovering && errorDetails.troubleshootingSteps.length > 0 && (
          <div className="w-full max-w-md mb-4">
            <h4 className="text-sm font-semibold text-gray-300 mb-2">Quick Fixes:</h4>
            <div className="space-y-2">
              {errorDetails.troubleshootingSteps.map((step, index) => (
                <div key={index} className="flex items-center gap-2 text-sm text-gray-400">
                  <span className="text-base">{step.icon}</span>
                  <span>{step.text}</span>
                  {step.action && (
                    <button
                      onClick={step.action}
                      className="ml-auto text-orange-400 hover:text-orange-300 text-xs underline"
                    >
                      Try Now
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 w-full max-w-md">
          {errorDetails.retryable && !isRecovering && (
            <Button
              onClick={this.handleManualRetry}
              className="bg-orange-600 hover:bg-orange-700 text-white"
            >
              🐉 Retry Dragon Voice
            </Button>
          )}
          
          {!textModeEnabled && this.shouldFallbackToTextMode(errorDetails) && (
            <Button
              onClick={this.handleEnableTextMode}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              💬 Continue with Text
            </Button>
          )}

          {textModeEnabled && (
            <div className="text-center p-3 bg-blue-900/30 border border-blue-800/50 rounded">
              <p className="text-blue-300 text-sm">
                ✅ Text mode enabled - You can continue chatting without voice features
              </p>
            </div>
          )}
        </div>

        {/* Technical Details (Development Mode) */}
        {(this.props.showDetailedErrors || process.env.NODE_ENV === 'development') && (
          <div className="w-full max-w-md mt-4">
            <button
              onClick={this.handleToggleTechnicalDetails}
              className="text-xs text-gray-500 hover:text-gray-400 underline"
            >
              {showTechnicalDetails ? 'Hide' : 'Show'} Technical Details
            </button>
            
            {showTechnicalDetails && (
              <div className="mt-2 p-3 bg-gray-800 rounded border border-gray-700 text-xs">
                <div className="space-y-1">
                  <div><strong>Error Type:</strong> {errorDetails.type}</div>
                  <div><strong>Severity:</strong> {errorDetails.severity}</div>
                  <div><strong>Recovery Strategy:</strong> {errorDetails.recoveryStrategy}</div>
                  <div><strong>Retryable:</strong> {errorDetails.retryable ? 'Yes' : 'No'}</div>
                  <div><strong>User Action Required:</strong> {errorDetails.requiresUserAction ? 'Yes' : 'No'}</div>
                  <div><strong>Recovery Attempts:</strong> {this.state.recoveryAttempts}/{this.maxRecoveryAttempts}</div>
                  {errorDetails.metadata && (
                    <div><strong>Metadata:</strong> {JSON.stringify(errorDetails.metadata, null, 2)}</div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  private getErrorTitle(errorType: VoiceErrorType): string {
    switch (errorType) {
      case VoiceErrorType.MICROPHONE_PERMISSION_DENIED:
        return "Dragon Needs Your Voice!"
      case VoiceErrorType.MICROPHONE_NOT_FOUND:
        return "Dragon Can't Find Your Voice!"
      case VoiceErrorType.TTS_API_ERROR:
        return "Dragon's Voice is Muted!"
      case VoiceErrorType.TTS_RATE_LIMIT:
        return "Dragon Needs a Moment!"
      case VoiceErrorType.NETWORK_OFFLINE:
        return "Dragon Lost Connection!"
      case VoiceErrorType.BROWSER_NOT_SUPPORTED:
        return "Dragon Needs Better Portal!"
      case VoiceErrorType.HTTPS_REQUIRED:
        return "Dragon Needs Secure Portal!"
      case VoiceErrorType.WEBGL_CONTEXT_LOST:
        return "Dragon Temporarily Invisible!"
      default:
        return "Dragon Voice Malfunction!"
    }
  }

  override render() {
    if (this.state.hasError) {
      return this.renderErrorFallback()
    }

    return this.props.children
  }
}

// ============================================================================
// Specialized Voice Error Boundaries
// ============================================================================

interface VoiceComponentErrorBoundaryProps {
  children: ReactNode
  componentName: string
  onError?: (error: VoiceErrorDetails) => void
  enableAutoRecovery?: boolean
  className?: string
}

/**
 * Speech Recognition specific error boundary
 */
export const SpeechRecognitionErrorBoundary: React.FC<VoiceComponentErrorBoundaryProps> = ({
  children,
  componentName,
  onError,
  enableAutoRecovery = true,
  className = ''
}) => {
  return (
    <EnhancedVoiceErrorBoundary
      onError={onError}
      enableAutoRecovery={enableAutoRecovery}
      fallbackToTextMode={true}
      className={className}
    >
      {children}
    </EnhancedVoiceErrorBoundary>
  )
}

/**
 * Text-to-Speech specific error boundary
 */
export const TextToSpeechErrorBoundary: React.FC<VoiceComponentErrorBoundaryProps> = ({
  children,
  componentName,
  onError,
  enableAutoRecovery = true,
  className = ''
}) => {
  return (
    <EnhancedVoiceErrorBoundary
      onError={onError}
      enableAutoRecovery={enableAutoRecovery}
      fallbackToTextMode={false} // TTS errors shouldn't disable text mode
      className={className}
    >
      {children}
    </EnhancedVoiceErrorBoundary>
  )
}

/**
 * Voice Interface wrapper with comprehensive error handling
 */
export const VoiceInterfaceErrorBoundary: React.FC<VoiceComponentErrorBoundaryProps> = ({
  children,
  componentName,
  onError,
  enableAutoRecovery = true,
  className = ''
}) => {
  const handleVoiceError = (error: VoiceErrorDetails) => {
    // Register recovery callbacks based on error type
    const recoveryManager = voiceErrorRecovery.getRecoveryManager()
    
    switch (error.type) {
      case VoiceErrorType.AUDIO_CONTEXT_SUSPENDED:
        recoveryManager.registerRecoveryCallback(error.type, async () => {
          if (typeof window !== 'undefined' && window.AudioContext) {
            const context = new window.AudioContext()
            if (context.state === 'suspended') {
              await context.resume()
            }
          }
        })
        break
        
      case VoiceErrorType.WEBGL_CONTEXT_LOST:
        recoveryManager.registerRecoveryCallback(error.type, async () => {
          // Trigger WebGL context recovery
          errorRecoveryUtils.webgl.registerContextLossRecovery(
            document.querySelector('canvas') as HTMLCanvasElement,
            () => logger.info('WebGL context lost'),
            () => logger.info('WebGL context restored')
          )
        })
        break
    }
    
    onError?.(error)
  }

  return (
    <EnhancedVoiceErrorBoundary
      onError={handleVoiceError}
      enableAutoRecovery={enableAutoRecovery}
      fallbackToTextMode={true}
      showDetailedErrors={process.env.NODE_ENV === 'development'}
      className={className}
    >
      {children}
    </EnhancedVoiceErrorBoundary>
  )
}

export default EnhancedVoiceErrorBoundary
/**
 * User-Friendly Error Messages and Recovery Guidance for Voice Features
 */

import React, { useState, useEffect } from 'react'
import { DragonRenderer } from '@components/dragon/DragonRenderer'
import { Button } from '@components/ui/forms/Button'
import { VoiceErrorDetails, VoiceErrorType, VoiceRecoveryStrategy } from '@lib/voice-error-recovery'
import { audioPermissionUtils } from '@lib/audio-device-manager'
import { voiceNetworkUtils } from '@lib/network-monitor'
import { logger } from '@lib/logger'

// ============================================================================
// Voice Error Guidance Components
// ============================================================================

interface VoiceErrorGuidanceProps {
  error: VoiceErrorDetails
  onRetry?: () => void
  onDismiss?: () => void
  onEnableTextMode?: () => void
  className?: string
}

interface TroubleshootingStep {
  icon: string
  title: string
  description: string
  action?: () => void
  actionText?: string
  isCompleted?: boolean
}

export const VoiceErrorGuidance: React.FC<VoiceErrorGuidanceProps> = ({
  error,
  onRetry,
  onDismiss,
  onEnableTextMode,
  className = ''
}) => {
  const [expandedStep, setExpandedStep] = useState<number | null>(null)
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set())
  const [isTestingInProgress, setIsTestingInProgress] = useState(false)

  const troubleshootingSteps = generateTroubleshootingSteps(error)

  const handleStepAction = async (stepIndex: number, action?: () => void) => {
    if (action) {
      setIsTestingInProgress(true)
      try {
        await action()
        setCompletedSteps(prev => new Set([...prev, stepIndex]))
      } catch (error) {
        logger.error('Troubleshooting step failed:', error)
      } finally {
        setIsTestingInProgress(false)
      }
    }
  }

  const handleRetryWithGuidance = async () => {
    // Run pre-flight checks before retry
    setIsTestingInProgress(true)
    
    try {
      // Test basic voice system availability
      const voiceAvailability = audioPermissionUtils.checkAudioSupport()
      const networkConnectivity = await voiceNetworkUtils.testVoiceConnectivity()
      
      if (voiceAvailability.supported && networkConnectivity.recommendVoice) {
        onRetry?.()
      } else {
        // Show specific guidance for remaining issues
        logger.warn('Voice system still has issues:', {
          audioSupport: voiceAvailability,
          network: networkConnectivity
        })
      }
    } finally {
      setIsTestingInProgress(false)
    }
  }

  return (
    <div className={`bg-gray-900/95 rounded-lg border border-orange-800/50 overflow-hidden ${className}`}>
      {/* Header */}
      <div className="bg-gradient-to-r from-orange-900/30 to-red-900/30 px-6 py-4 border-b border-orange-800/50">
        <div className="flex items-center gap-4">
          <div className="relative">
            <DragonRenderer
              size="sm"
              voiceState={{
                isListening: false,
                isSpeaking: false,
                isProcessing: isTestingInProgress,
                isIdle: !isTestingInProgress,
                volume: 0,
                emotion: 'concerned'
              }}
            />
            {isTestingInProgress && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-400"></div>
              </div>
            )}
          </div>
          
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-orange-300">
              {getErrorTitle(error.type)}
            </h3>
            <p className="text-gray-400 text-sm">
              {error.userMessage}
            </p>
          </div>
          
          {onDismiss && (
            <button
              onClick={onDismiss}
              className="text-gray-500 hover:text-gray-300 transition-colors"
              aria-label="Dismiss"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Error Details */}
      <div className="p-6">
        {/* Impact Assessment */}
        <div className="mb-6 p-4 bg-gray-800/50 rounded-lg border border-gray-700/50">
          <h4 className="text-sm font-semibold text-gray-300 mb-2">What This Means:</h4>
          <div className="text-sm text-gray-400 space-y-1">
            <div className="flex items-center gap-2">
              <span className={getImpactIcon(error.severity)}></span>
              <span>Impact Level: {error.severity.charAt(0).toUpperCase() + error.severity.slice(1)}</span>
            </div>
            <div className="flex items-center gap-2">
              <span>🔄</span>
              <span>Can Retry: {error.retryable ? 'Yes' : 'No'}</span>
            </div>
            <div className="flex items-center gap-2">
              <span>👤</span>
              <span>Requires Action: {error.requiresUserAction ? 'Yes' : 'No'}</span>
            </div>
          </div>
        </div>

        {/* Troubleshooting Steps */}
        {troubleshootingSteps.length > 0 && (
          <div className="mb-6">
            <h4 className="text-sm font-semibold text-gray-300 mb-3">
              Step-by-Step Guide to Fix This:
            </h4>
            <div className="space-y-3">
              {troubleshootingSteps.map((step, index) => (
                <TroubleshootingStepCard
                  key={index}
                  step={step}
                  stepNumber={index + 1}
                  isExpanded={expandedStep === index}
                  isCompleted={completedSteps.has(index)}
                  onToggle={() => setExpandedStep(expandedStep === index ? null : index)}
                  onAction={() => handleStepAction(index, step.action)}
                  isTestingInProgress={isTestingInProgress}
                />
              ))}
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="flex flex-col sm:flex-row gap-3">
          {error.retryable && (
            <Button
              onClick={handleRetryWithGuidance}
              disabled={isTestingInProgress}
              className="bg-orange-600 hover:bg-orange-700 text-white"
            >
              {isTestingInProgress ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Testing...
                </>
              ) : (
                <>
                  🐉 Try Dragon Voice Again
                </>
              )}
            </Button>
          )}
          
          {onEnableTextMode && shouldShowTextModeOption(error.type) && (
            <Button
              onClick={onEnableTextMode}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              💬 Continue with Text Chat
            </Button>
          )}
          
          <Button
            onClick={() => window.open('https://support.seiron.app/voice-troubleshooting', '_blank')}
            className="bg-gray-600 hover:bg-gray-700 text-white"
          >
            📚 More Help
          </Button>
        </div>

        {/* Technical Details (Collapsible) */}
        {process.env.NODE_ENV === 'development' && (
          <details className="mt-6 text-xs">
            <summary className="text-gray-500 hover:text-gray-400 cursor-pointer">
              Technical Details (Development)
            </summary>
            <div className="mt-2 p-3 bg-gray-800 rounded border border-gray-700">
              <div className="space-y-1 text-gray-400">
                <div><strong>Error Type:</strong> {error.type}</div>
                <div><strong>Recovery Strategy:</strong> {error.recoveryStrategy}</div>
                <div><strong>Severity:</strong> {error.severity}</div>
                {error.metadata && (
                  <div><strong>Metadata:</strong> {JSON.stringify(error.metadata, null, 2)}</div>
                )}
              </div>
            </div>
          </details>
        )}
      </div>
    </div>
  )
}

// ============================================================================
// Troubleshooting Step Card
// ============================================================================

interface TroubleshootingStepCardProps {
  step: TroubleshootingStep
  stepNumber: number
  isExpanded: boolean
  isCompleted: boolean
  onToggle: () => void
  onAction?: () => void
  isTestingInProgress: boolean
}

const TroubleshootingStepCard: React.FC<TroubleshootingStepCardProps> = ({
  step,
  stepNumber,
  isExpanded,
  isCompleted,
  onToggle,
  onAction,
  isTestingInProgress
}) => {
  return (
    <div className={`border rounded-lg transition-all duration-200 ${
      isCompleted 
        ? 'border-green-800/50 bg-green-900/20' 
        : 'border-gray-700/50 bg-gray-800/30'
    }`}>
      <button
        onClick={onToggle}
        className="w-full px-4 py-3 text-left flex items-center gap-3 hover:bg-gray-700/30 transition-colors"
      >
        <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold ${
          isCompleted 
            ? 'bg-green-600 text-white' 
            : 'bg-gray-600 text-gray-200'
        }`}>
          {isCompleted ? '✓' : stepNumber}
        </div>
        
        <span className="text-lg mr-2">{step.icon}</span>
        
        <div className="flex-1">
          <h5 className="font-semibold text-gray-200">{step.title}</h5>
        </div>
        
        <div className={`transform transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
          ▼
        </div>
      </button>
      
      {isExpanded && (
        <div className="px-4 pb-4">
          <p className="text-gray-400 text-sm mb-3 ml-9">
            {step.description}
          </p>
          
          {step.action && step.actionText && (
            <div className="ml-9">
              <Button
                onClick={onAction}
                disabled={isTestingInProgress || isCompleted}
                size="sm"
                className="bg-orange-600 hover:bg-orange-700 text-white"
              >
                {isCompleted ? '✓ Completed' : step.actionText}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ============================================================================
// Helper Functions
// ============================================================================

function getErrorTitle(errorType: VoiceErrorType): string {
  switch (errorType) {
    case VoiceErrorType.MICROPHONE_PERMISSION_DENIED:
      return "🎤 Dragon Needs Your Voice Permission"
    case VoiceErrorType.MICROPHONE_NOT_FOUND:
      return "🎤 No Microphone Detected"
    case VoiceErrorType.MICROPHONE_HARDWARE_ERROR:
      return "🎤 Microphone Hardware Issue"
    case VoiceErrorType.SPEAKER_NOT_FOUND:
      return "🔊 Speaker Not Available"
    case VoiceErrorType.TTS_API_ERROR:
      return "🐉 Dragon Voice Temporarily Unavailable"
    case VoiceErrorType.TTS_RATE_LIMIT:
      return "⏱️ Dragon Needs a Quick Rest"
    case VoiceErrorType.TTS_QUOTA_EXCEEDED:
      return "📊 Voice Usage Limit Reached"
    case VoiceErrorType.NETWORK_OFFLINE:
      return "🌐 Internet Connection Lost"
    case VoiceErrorType.NETWORK_SLOW:
      return "🐌 Slow Internet Connection"
    case VoiceErrorType.BROWSER_NOT_SUPPORTED:
      return "🌐 Browser Compatibility Issue"
    case VoiceErrorType.HTTPS_REQUIRED:
      return "🔒 Secure Connection Required"
    case VoiceErrorType.WEBGL_CONTEXT_LOST:
      return "🎨 Dragon Graphics Temporarily Down"
    case VoiceErrorType.MEMORY_EXHAUSTED:
      return "💾 Device Memory Full"
    case VoiceErrorType.USER_CANCELLED:
      return "❌ Voice Feature Cancelled"
    default:
      return "⚠️ Voice System Issue"
  }
}

function getImpactIcon(severity: string): string {
  switch (severity) {
    case 'low': return '🟢'
    case 'medium': return '🟡'
    case 'high': return '🟠'
    case 'critical': return '🔴'
    default: return '⚪'
  }
}

function shouldShowTextModeOption(errorType: VoiceErrorType): boolean {
  const textModeErrors = [
    VoiceErrorType.MICROPHONE_PERMISSION_DENIED,
    VoiceErrorType.MICROPHONE_NOT_FOUND,
    VoiceErrorType.BROWSER_NOT_SUPPORTED,
    VoiceErrorType.HTTPS_REQUIRED,
    VoiceErrorType.TTS_API_ERROR,
    VoiceErrorType.SPEECH_RECOGNITION_NOT_SUPPORTED
  ]
  
  return textModeErrors.includes(errorType)
}

function generateTroubleshootingSteps(error: VoiceErrorDetails): TroubleshootingStep[] {
  const baseSteps = error.troubleshootingSteps.map((step, index) => ({
    icon: step.icon,
    title: step.text,
    description: getStepDescription(error.type, index),
    action: step.action,
    actionText: step.action ? getActionText(error.type, index) : undefined
  }))

  // Add universal test step at the end
  baseSteps.push({
    icon: '🧪',
    title: 'Test Voice System',
    description: 'Run a comprehensive test of your voice setup to identify any remaining issues.',
    action: testVoiceSystem,
    actionText: 'Run Voice Test'
  })

  return baseSteps
}

function getStepDescription(errorType: VoiceErrorType, stepIndex: number): string {
  switch (errorType) {
    case VoiceErrorType.MICROPHONE_PERMISSION_DENIED:
      switch (stepIndex) {
        case 0: return 'Look for a microphone icon in your browser\'s address bar and click it to manage permissions.'
        case 1: return 'Grant permission for this site to access your microphone. This is required for voice features.'
        case 2: return 'Reload the page to apply the new permission settings and try voice features again.'
        default: return 'Follow this step to resolve the microphone permission issue.'
      }
    case VoiceErrorType.MICROPHONE_NOT_FOUND:
      switch (stepIndex) {
        case 0: return 'Ensure a microphone is connected to your device and properly recognized by your system.'
        case 1: return 'Check device manager or system audio settings to verify microphone is detected.'
        case 2: return 'Close and reopen your browser to refresh audio device detection.'
        default: return 'This step helps ensure your microphone is properly connected.'
      }
    case VoiceErrorType.TTS_API_ERROR:
      switch (stepIndex) {
        case 0: return 'Wait a moment for the voice service to recover. Temporary outages usually resolve quickly.'
        case 1: return 'You can continue chatting normally using text while voice features are restored.'
        case 2: return 'If the issue persists, try refreshing the page to reconnect to voice services.'
        default: return 'This step helps restore voice synthesis functionality.'
      }
    default:
      return 'Follow this step to help resolve the voice system issue.'
  }
}

function getActionText(errorType: VoiceErrorType, stepIndex: number): string {
  switch (errorType) {
    case VoiceErrorType.MICROPHONE_PERMISSION_DENIED:
      return stepIndex === 0 ? 'Check Browser Settings' : 'Test Microphone'
    case VoiceErrorType.MICROPHONE_NOT_FOUND:
      return 'Detect Microphones'
    case VoiceErrorType.TTS_API_ERROR:
      return 'Test Voice Service'
    default:
      return 'Test This Step'
  }
}

async function testVoiceSystem(): Promise<void> {
  logger.info('Running comprehensive voice system test')
  
  try {
    // Test microphone access
    const micTest = await audioPermissionUtils.checkAudioSupport()
    logger.info('Microphone test result:', micTest)
    
    // Test network connectivity for voice services
    const networkTest = await voiceNetworkUtils.testVoiceConnectivity()
    logger.info('Voice network test result:', networkTest)
    
    // Test browser support
    const voiceAvailability = voiceNetworkUtils.isVoiceReady()
    logger.info('Voice availability:', voiceAvailability)
    
  } catch (error) {
    logger.error('Voice system test failed:', error)
    throw error
  }
}

// ============================================================================
// Quick Recovery Actions Component
// ============================================================================

interface QuickRecoveryActionsProps {
  errorType: VoiceErrorType
  onAction: (action: string) => void
  className?: string
}

export const QuickRecoveryActions: React.FC<QuickRecoveryActionsProps> = ({
  errorType,
  onAction,
  className = ''
}) => {
  const actions = getQuickActions(errorType)
  
  if (actions.length === 0) return null
  
  return (
    <div className={`bg-gray-800/50 rounded-lg p-4 ${className}`}>
      <h4 className="text-sm font-semibold text-gray-300 mb-3">Quick Fixes:</h4>
      <div className="flex flex-wrap gap-2">
        {actions.map((action, index) => (
          <Button
            key={index}
            onClick={() => onAction(action.id)}
            size="sm"
            className="bg-orange-600/80 hover:bg-orange-600 text-white text-xs"
          >
            <span className="mr-1">{action.icon}</span>
            {action.label}
          </Button>
        ))}
      </div>
    </div>
  )
}

function getQuickActions(errorType: VoiceErrorType): Array<{ id: string; icon: string; label: string }> {
  switch (errorType) {
    case VoiceErrorType.MICROPHONE_PERMISSION_DENIED:
      return [
        { id: 'request-permission', icon: '🔓', label: 'Request Permission' },
        { id: 'browser-settings', icon: '⚙️', label: 'Browser Settings' }
      ]
    case VoiceErrorType.NETWORK_OFFLINE:
      return [
        { id: 'check-connection', icon: '🌐', label: 'Check Connection' },
        { id: 'offline-mode', icon: '📱', label: 'Offline Mode' }
      ]
    case VoiceErrorType.TTS_RATE_LIMIT:
      return [
        { id: 'wait-cooldown', icon: '⏰', label: 'Wait & Retry' },
        { id: 'text-mode', icon: '💬', label: 'Text Mode' }
      ]
    default:
      return [
        { id: 'refresh', icon: '🔄', label: 'Refresh' },
        { id: 'help', icon: '❓', label: 'Get Help' }
      ]
  }
}

export default VoiceErrorGuidance
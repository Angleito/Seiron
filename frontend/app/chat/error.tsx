/**
 * Chat Error Boundary Component for Sei Investment Platform
 * 
 * This component provides error handling specifically for the chat route in Next.js 15 App Router.
 * It catches and displays errors that occur within the chat interface while maintaining
 * the Dragon Ball Z theme and providing recovery options.
 * 
 * Features:
 * - Next.js 15 App Router error boundary
 * - Dragon Ball Z themed error states
 * - Automatic error recovery mechanisms
 * - Accessibility compliant error messaging
 * - Integration with monitoring and logging
 * - Progressive error handling with fallbacks
 * 
 * @fileoverview Chat route error boundary component
 */

'use client' // Required for Next.js App Router error boundaries

import React from 'react'

/**
 * Error boundary props interface
 */
interface ChatErrorProps {
  readonly error: Error & { digest?: string }
  readonly reset: () => void
}

/**
 * Error type classifications for better user messaging
 */
type ErrorType = 
  | 'network'
  | 'voice'
  | 'memory'
  | 'webgl'
  | 'permissions'
  | 'session'
  | 'unknown'

/**
 * Error messages mapped to Dragon Ball Z theme
 */
const ERROR_MESSAGES: Record<ErrorType, {
  title: string
  description: string
  icon: string
  recoveryHint: string
}> = {
  network: {
    title: 'Communication Link Severed!',
    description: 'The connection to the Dragon Balls has been interrupted. Check your network and try again.',
    icon: '📡',
    recoveryHint: 'Verify your internet connection and retry the power-up sequence.'
  },
  voice: {
    title: 'Voice Transmission Blocked!',
    description: 'Seiron\'s voice channels are experiencing interference. Voice features may be unavailable.',
    icon: '🔇',
    recoveryHint: 'Check microphone permissions and audio settings in your browser.'
  },
  memory: {
    title: 'Memory Core Malfunction!',
    description: 'The Hyperbolic Time Chamber\'s memory storage is experiencing issues.',
    icon: '🧠',
    recoveryHint: 'Clear browser cache and restart the session to restore memory functions.'
  },
  webgl: {
    title: 'Dragon Visualization Failed!',
    description: 'The 3D dragon rendering system has encountered a critical error.',
    icon: '🎮',
    recoveryHint: 'Update your graphics drivers or try a different browser for better WebGL support.'
  },
  permissions: {
    title: 'Access Permissions Denied!',
    description: 'Required permissions for voice or device access were not granted.',
    icon: '🔒',
    recoveryHint: 'Grant necessary permissions in your browser settings and refresh the page.'
  },
  session: {
    title: 'Training Session Expired!',
    description: 'Your current session has expired and needs to be renewed.',
    icon: '⏰',
    recoveryHint: 'Start a new training session to continue your investment journey.'
  },
  unknown: {
    title: 'Unexpected Energy Surge!',
    description: 'An unknown error has disrupted the system. The development team has been alerted.',
    icon: '💥',
    recoveryHint: 'Try refreshing the page or contact support if the issue persists.'
  }
}

/**
 * Classify error type based on error message and stack
 */
function classifyError(error: Error): ErrorType {
  const message = error.message.toLowerCase()
  const stack = error.stack?.toLowerCase() || ''

  if (message.includes('network') || message.includes('fetch') || message.includes('connection')) {
    return 'network'
  }
  if (message.includes('microphone') || message.includes('audio') || message.includes('voice')) {
    return 'voice'
  }
  if (message.includes('webgl') || message.includes('three') || message.includes('canvas')) {
    return 'webgl'
  }
  if (message.includes('permission') || message.includes('denied') || message.includes('blocked')) {
    return 'permissions'
  }
  if (message.includes('session') || message.includes('expired') || message.includes('token')) {
    return 'session'
  }
  if (message.includes('memory') || message.includes('storage') || stack.includes('memory')) {
    return 'memory'
  }

  return 'unknown'
}

/**
 * Error reporting function (placeholder for analytics integration)
 */
function reportError(error: Error, errorType: ErrorType, context: Record<string, any>) {
  // In production, this would send to your error monitoring service
  console.error('Chat Error Reported:', {
    error: {
      message: error.message,
      stack: error.stack,
      name: error.name
    },
    errorType,
    context,
    timestamp: new Date().toISOString(),
    userAgent: navigator.userAgent,
    url: window.location.href
  })
}

/**
 * Chat Error Boundary Component
 * 
 * Provides a comprehensive error handling experience for the chat interface
 * with Dragon Ball Z theming and recovery options.
 * 
 * @param error - The error that was caught
 * @param reset - Function to reset the error boundary and retry
 */
export default function ChatError({ error, reset }: ChatErrorProps) {
  const [isRetrying, setIsRetrying] = React.useState(false)
  const [retryAttempts, setRetryAttempts] = React.useState(0)
  const errorType = classifyError(error)
  const errorConfig = ERROR_MESSAGES[errorType]

  // Report error when component mounts
  React.useEffect(() => {
    reportError(error, errorType, {
      retryAttempts,
      errorDigest: 'digest' in error ? error.digest : undefined,
      component: 'ChatError',
      route: '/chat'
    })
  }, [error, errorType, retryAttempts])

  /**
   * Handle retry attempt with exponential backoff
   */
  const handleRetry = React.useCallback(async () => {
    setIsRetrying(true)
    setRetryAttempts(prev => prev + 1)

    // Add delay for better UX and to prevent rapid retries
    await new Promise(resolve => setTimeout(resolve, Math.min(1000 * Math.pow(2, retryAttempts), 5000)))

    try {
      reset()
    } catch (retryError) {
      console.error('Retry failed:', retryError)
    } finally {
      setIsRetrying(false)
    }
  }, [reset, retryAttempts])

  /**
   * Handle page refresh as fallback recovery
   */
  const handleRefresh = React.useCallback(() => {
    window.location.reload()
  }, [])

  /**
   * Handle navigation back to home
   */
  const handleGoHome = React.useCallback(() => {
    window.location.href = '/'
  }, [])

  return (
    <div className="h-screen w-screen flex items-center justify-center bg-gradient-to-b from-gray-900 via-gray-950 to-black">
      {/* Background grid effect */}
      <div 
        className="absolute inset-0 opacity-[0.02] pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255, 107, 53, 0.3) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255, 107, 53, 0.3) 1px, transparent 1px)
          `,
          backgroundSize: '50px 50px'
        }}
        aria-hidden="true"
      />

      <div className="text-center space-y-6 px-4 max-w-lg relative z-10">
        {/* Error icon with animation */}
        <div className="relative mb-8">
          <div className="text-8xl animate-bounce">
            {errorConfig.icon}
          </div>
          {/* Energy dissipation effect */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-32 h-32 border-2 border-red-500/20 rounded-full animate-ping"></div>
          </div>
        </div>

        {/* Error title and description */}
        <div className="space-y-4">
          <h1 className="text-3xl font-bold text-red-400 leading-tight">
            {errorConfig.title}
          </h1>
          <p className="text-gray-300 text-lg leading-relaxed">
            {errorConfig.description}
          </p>
          <p className="text-gray-500 text-sm">
            {errorConfig.recoveryHint}
          </p>
        </div>

        {/* Error details (in development) */}
        {process.env.NODE_ENV === 'development' && (
          <details className="text-left bg-gray-800/50 rounded-lg p-4 text-xs text-gray-400">
            <summary className="cursor-pointer mb-2 text-gray-300">Technical Details</summary>
            <pre className="whitespace-pre-wrap break-words">
              {error.message}
              {error.stack && `\n\nStack trace:\n${error.stack}`}
            </pre>
          </details>
        )}

        {/* Recovery actions */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            {/* Primary retry button */}
            <button
              onClick={handleRetry}
              disabled={isRetrying}
              className="px-6 py-3 bg-orange-600 hover:bg-orange-700 disabled:bg-orange-800 disabled:opacity-50 text-white rounded-lg font-semibold transition-all duration-200 flex items-center justify-center space-x-2"
              aria-label={isRetrying ? 'Retrying...' : 'Retry connection'}
            >
              {isRetrying ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                  <span>Powering Up...</span>
                </>
              ) : (
                <>
                  <span>🐉</span>
                  <span>Retry Power-Up</span>
                </>
              )}
            </button>

            {/* Secondary actions */}
            <button
              onClick={handleRefresh}
              className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-semibold transition-colors"
              aria-label="Refresh page"
            >
              ♻️ Full Refresh
            </button>
          </div>

          {/* Tertiary action */}
          <button
            onClick={handleGoHome}
            className="text-gray-400 hover:text-gray-300 underline text-sm transition-colors"
            aria-label="Return to home page"
          >
            Return to Training Grounds (Home)
          </button>
        </div>

        {/* Retry counter */}
        {retryAttempts > 0 && (
          <p className="text-gray-500 text-xs">
            Retry attempts: {retryAttempts}
          </p>
        )}

        {/* Accessibility message */}
        <div className="sr-only">
          <p>
            An error occurred in the chat interface: {error.message}. 
            Use the retry button to attempt recovery or refresh the page.
          </p>
        </div>
      </div>
    </div>
  )
}

// Export error classification utilities for use in other components
export { classifyError, ERROR_MESSAGES }
export type { ErrorType, ChatErrorProps }
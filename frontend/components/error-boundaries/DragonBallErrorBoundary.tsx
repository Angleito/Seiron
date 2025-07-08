import React, { Component, ErrorInfo, ReactNode } from 'react'
import { logger } from '@lib/logger'
import { DragonRenderer } from '@components/dragon/DragonRenderer'

interface Props {
  children: ReactNode
  fallback?: ReactNode
  name?: string
  onError?: (error: Error, errorInfo: ErrorInfo) => void
  level?: 'component' | 'feature' | 'page' | 'app'
  enableDragonAnimation?: boolean
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
  errorCount: number
  lastErrorTime: number
}

// Dragon Ball Z themed error messages
const DBZ_ERROR_MESSAGES: Record<'component' | 'feature' | 'page' | 'app', string[]> = {
  component: [
    "This component's power level is too low!",
    "The technique failed! Need more training!",
    "Ki energy disrupted in this component!"
  ],
  feature: [
    "This feature needs to gather more Dragon Balls!",
    "The fusion dance failed! Try again!",
    "Scouter malfunction detected!"
  ],
  page: [
    "This page has been destroyed like Planet Vegeta!",
    "Critical error! Over 9000 errors detected!",
    "The page has fallen into the void!"
  ],
  app: [
    "The entire universe is at stake!",
    "Even the Dragon Balls can't fix this!",
    "Majin Buu has corrupted the system!"
  ]
}

const DBZ_RECOVERY_MESSAGES = {
  component: "Use instant transmission to reload",
  feature: "Channel your ki to try again",
  page: "Summon Shenron to restore the page",
  app: "Gather the Dragon Balls to restart"
}

export class DragonBallErrorBoundary extends Component<Props, State> {
  private retryTimeouts: Set<NodeJS.Timeout> = new Set()

  constructor(props: Props) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorCount: 0,
      lastErrorTime: 0
    }
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
      errorInfo: null,
      errorCount: 0,
      lastErrorTime: Date.now()
    }
  }

  override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const { name = 'Unknown', onError, level = 'component' } = this.props
    const { errorCount } = this.state
    
    // Log error with Dragon Ball Z context
    logger.error(`[${level.toUpperCase()}] Error in ${name}:`, {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      errorCount: errorCount + 1,
      powerLevel: this.calculateErrorPowerLevel(error)
    })

    // Update state with error info
    this.setState(prevState => ({
      error,
      errorInfo,
      errorCount: prevState.errorCount + 1
    }))

    // Call custom error handler
    if (onError) {
      onError(error, errorInfo)
    }

    // Auto-recovery for component-level errors
    if (level === 'component' && errorCount < 3) {
      this.scheduleAutoRecovery()
    }
  }

  override componentWillUnmount() {
    // Clear all timeouts
    this.retryTimeouts.forEach(timeout => clearTimeout(timeout))
    this.retryTimeouts.clear()
  }

  calculateErrorPowerLevel(error: Error): number {
    // Calculate error severity as a "power level"
    const stackDepth = (error.stack?.split('\n').length || 0) * 100
    const messageLength = error.message.length * 10
    return Math.min(stackDepth + messageLength, 9000)
  }

  scheduleAutoRecovery = () => {
    const timeout = setTimeout(() => {
      logger.info('Attempting auto-recovery...')
      this.handleReset()
    }, 5000)
    
    this.retryTimeouts.add(timeout)
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    })
  }

  handleReload = () => {
    window.location.reload()
  }

  handleGoHome = () => {
    window.location.href = '/'
  }

  getRandomMessage(level: 'component' | 'feature' | 'page' | 'app'): string {
    const messages = DBZ_ERROR_MESSAGES[level] || DBZ_ERROR_MESSAGES.component
    const selectedMessage = messages[Math.floor(Math.random() * messages.length)]
    return selectedMessage || 'A critical system error has occurred!'
  }

  override render() {
    const { hasError, error, errorCount } = this.state
    const { children, fallback, name = 'System', level = 'component', enableDragonAnimation = true } = this.props

    if (hasError) {
      // Use custom fallback if provided
      if (fallback) {
        return <>{fallback}</>
      }

      const errorMessage = this.getRandomMessage(level)
      const recoveryMessage = DBZ_RECOVERY_MESSAGES[level]
      const powerLevel = error ? this.calculateErrorPowerLevel(error) : 0

      // Different UI based on error level
      return (
        <div className={`
          ${level === 'app' ? 'min-h-screen' : 'min-h-[400px]'}
          flex items-center justify-center bg-gradient-to-b from-gray-950 to-black p-4
        `}>
          <div className={`
            ${level === 'app' || level === 'page' ? 'max-w-2xl' : 'max-w-md'}
            w-full bg-gray-900 rounded-lg shadow-xl border border-orange-800 p-6
            relative overflow-hidden
          `}>
            {/* Energy effect background */}
            <div className="absolute inset-0 opacity-10">
              <div className="absolute inset-0 bg-gradient-to-r from-orange-500 to-red-500 animate-pulse" />
            </div>

            {/* Dragon animation for higher level errors */}
            {enableDragonAnimation && (level === 'page' || level === 'app') && (
              <div className="absolute top-0 right-0 w-32 h-32 opacity-30">
                <DragonRenderer 
                  dragonType="ascii"
                  size="sm"
                  voiceState={{
                    isListening: false,
                    isSpeaking: false,
                    isProcessing: false,
                    isIdle: false,
                    volume: 0,
                    emotion: 'angry'
                  }}
                />
              </div>
            )}

            <div className="relative z-10">
              {/* Error icon with power level */}
              <div className="flex items-center justify-center mb-4">
                <div className="relative">
                  <div className="bg-orange-900/20 p-4 rounded-full">
                    <span className="text-4xl">💥</span>
                  </div>
                  <div className="absolute -top-2 -right-2 bg-red-600 text-white text-xs px-2 py-1 rounded-full">
                    {powerLevel}
                  </div>
                </div>
              </div>
              
              <h2 className="text-2xl font-bold text-orange-100 text-center mb-2">
                {errorMessage}
              </h2>
              
              <p className="text-gray-400 text-center mb-4">
                {name} has encountered a critical error!
              </p>

              {/* Error count indicator */}
              {errorCount > 1 && (
                <p className="text-orange-400 text-center text-sm mb-4">
                  Error occurred {errorCount} times
                </p>
              )}

              {/* Error details in development */}
              {process.env.NODE_ENV === 'development' && error && (
                <div className="mb-4 p-3 bg-gray-800 rounded border border-gray-700">
                  <p className="text-sm font-mono text-orange-400 break-words">
                    {error.message}
                  </p>
                  <details className="mt-2">
                    <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-400">
                      Scouter Analysis
                    </summary>
                    <pre className="mt-2 text-xs text-gray-600 overflow-auto max-h-32">
                      {error.stack}
                    </pre>
                  </details>
                </div>
              )}

              <div className="flex flex-col gap-2">
                <button
                  onClick={this.handleReset}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded transition-all transform hover:scale-105"
                >
                  <span>⚡</span>
                  {recoveryMessage}
                </button>
                
                {level !== 'component' && (
                  <>
                    <button
                      onClick={this.handleReload}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-100 rounded transition-colors"
                    >
                      <span>🔄</span>
                      Reload with Senzu Bean
                    </button>
                    
                    <button
                      onClick={this.handleGoHome}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-gray-700 hover:bg-gray-800 text-gray-300 rounded transition-colors"
                    >
                      <span>🏠</span>
                      Return to Kame House
                    </button>
                  </>
                )}
              </div>

              <p className="text-xs text-gray-500 text-center mt-4">
                Error ID: {Date.now().toString(36).toUpperCase()}-{level.toUpperCase()}
              </p>
            </div>
          </div>
        </div>
      )
    }

    return children
  }
}

// Specialized error boundaries for different parts of the app
export const ChatComponentErrorBoundary: React.FC<{ children: ReactNode }> = ({ children }) => (
  <DragonBallErrorBoundary name="Chat Component" level="component" enableDragonAnimation={false}>
    {children}
  </DragonBallErrorBoundary>
)

export const ChatFeatureErrorBoundary: React.FC<{ children: ReactNode }> = ({ children }) => (
  <DragonBallErrorBoundary name="Chat Feature" level="feature">
    {children}
  </DragonBallErrorBoundary>
)

export const ChatPageErrorBoundary: React.FC<{ children: ReactNode }> = ({ children }) => (
  <DragonBallErrorBoundary name="Chat Page" level="page">
    {children}
  </DragonBallErrorBoundary>
)
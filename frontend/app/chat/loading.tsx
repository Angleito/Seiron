/**
 * Chat Loading Component for Sei Investment Platform
 * 
 * This component provides an optimized loading state specifically for the chat interface.
 * Designed for Next.js 15 App Router with proper streaming and performance optimization.
 * 
 * Features:
 * - Dragon Ball Z themed loading animation
 * - Progressive enhancement with accessibility
 * - Memory efficient with minimal re-renders
 * - Responsive design for mobile and desktop
 * - Integration with voice system initialization
 * 
 * @fileoverview Chat-specific loading state component
 */

import React from 'react'

/**
 * Props interface for the loading component
 */
interface ChatLoadingProps {
  readonly variant?: 'default' | 'voice' | 'minimal'
  readonly message?: string
  readonly showProgress?: boolean
}

/**
 * Loading messages for different initialization phases
 */
const LOADING_MESSAGES = {
  initialization: 'Awakening Seiron\'s Voice...',
  voice: 'Calibrating Neural Voice Pathways...',
  memory: 'Loading Investment Wisdom...',
  connection: 'Establishing Blockchain Connection...',
  ready: 'Preparing Dragon Power Interface...'
} as const

/**
 * Chat Loading Component
 * 
 * Provides an engaging loading experience while the chat interface initializes.
 * Includes Dragon Ball Z theming and progressive loading indicators.
 * 
 * @param variant - Loading style variant (default: 'default')
 * @param message - Custom loading message
 * @param showProgress - Whether to show progress indicator
 */
export const ChatLoading: React.FC<ChatLoadingProps> = React.memo(({
  variant = 'default',
  message,
  showProgress = true
}) => {
  const [currentMessage, setCurrentMessage] = React.useState(LOADING_MESSAGES.initialization)
  const [progress, setProgress] = React.useState(0)

  // Simulate progressive loading phases
  React.useEffect(() => {
    const messages = Object.values(LOADING_MESSAGES)
    let index = 0
    let progressValue = 0

    const interval = setInterval(() => {
      if (index < messages.length) {
        setCurrentMessage(messages[index])
        progressValue = Math.min(((index + 1) / messages.length) * 100, 95)
        setProgress(progressValue)
        index++
      } else {
        clearInterval(interval)
      }
    }, 800)

    return () => clearInterval(interval)
  }, [])

  if (variant === 'minimal') {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-orange-500 border-t-transparent"></div>
      </div>
    )
  }

  return (
    <div 
      className="flex items-center justify-center h-screen w-screen bg-gradient-to-b from-gray-900 via-gray-950 to-black"
      role="status"
      aria-label="Loading chat interface"
    >
      <div className="text-center space-y-6 px-4 max-w-md">
        {/* Animated dragon power indicator */}
        <div className="relative mb-8">
          <div className="animate-spin rounded-full h-20 w-20 border-4 border-orange-500/30 border-t-orange-500 mx-auto">
            <div className="absolute inset-3 rounded-full border-2 border-orange-400/20 border-r-orange-400 animate-spin-slow"></div>
          </div>
          
          {/* Dragon power core */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="relative">
              <span className="text-3xl animate-pulse">🐉</span>
              {/* Power aura effect */}
              <div className="absolute inset-0 animate-ping">
                <span className="text-3xl opacity-30">🔥</span>
              </div>
            </div>
          </div>
          
          {/* Energy rings */}
          <div className="absolute -inset-4 border border-orange-400/10 rounded-full animate-pulse"></div>
          <div className="absolute -inset-6 border border-orange-300/5 rounded-full animate-pulse delay-75"></div>
        </div>
        
        {/* Loading messages */}
        <div className="space-y-3">
          <h2 className="text-2xl font-bold text-orange-300 animate-pulse">
            {message || currentMessage}
          </h2>
          <p className="text-gray-400 text-sm leading-relaxed">
            Initializing neural pathways for voice communication and loading investment wisdom from the Sei blockchain
          </p>
        </div>
        
        {/* Power level indicator */}
        {showProgress && (
          <div className="space-y-2">
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-500">Power Level</span>
              <span className="text-orange-400 font-mono">{Math.round(progress)}%</span>
            </div>
            <div className="w-full bg-gray-800 rounded-full h-3 overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-orange-600 via-orange-500 to-orange-400 rounded-full transition-all duration-500 ease-out relative"
                style={{ width: `${progress}%` }}
              >
                {/* Energy pulse effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse"></div>
              </div>
            </div>
          </div>
        )}
        
        {/* Status indicators */}
        <div className="flex justify-center space-x-4 text-xs text-gray-500">
          <div className="flex items-center space-x-1">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span>Voice System</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse delay-150"></div>
            <span>Memory Core</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse delay-300"></div>
            <span>AI Network</span>
          </div>
        </div>
      </div>
    </div>
  )
})

ChatLoading.displayName = 'ChatLoading'

/**
 * Default loading component for Next.js App Router
 * 
 * This is the default export used by Next.js when loading.tsx is present
 * in an App Router directory. It provides the loading UI for the entire
 * chat route segment.
 */
export default function Loading() {
  return <ChatLoading variant="default" showProgress={true} />
}

// Export additional variants for use in other components
export { LOADING_MESSAGES }
export type { ChatLoadingProps }
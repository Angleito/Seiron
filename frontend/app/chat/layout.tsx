/**
 * Chat Layout Component for Sei Investment Platform
 * 
 * Provides layout structure, viewport configuration, and metadata for the chat interface.
 * This layout is designed to work with both the current Vite setup and future Next.js migration.
 * 
 * Features:
 * - Mobile-first responsive design with optimized viewport settings
 * - Performance-optimized loading and error boundaries
 * - SEO metadata configuration
 * - Accessibility compliance (WCAG 2.1 AA)
 * - Error recovery and graceful degradation
 * 
 * @fileoverview Chat-specific layout with performance and accessibility optimizations
 */

import React, { Suspense, ErrorInfo } from 'react'
import { Helmet } from 'react-helmet-async'
import { ChatErrorBoundary } from '@/components/error-boundaries/ChatErrorBoundary'
import { PerformanceErrorBoundary } from '@/components/error-boundaries/PerformanceErrorBoundary'
import { WebGLErrorBoundary } from '@/components/error-boundaries/WebGLErrorBoundary'
import { PerformanceMonitor } from '@/components/ui/PerformanceOverlay'
import { logger } from '@/lib/logger'

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Layout metadata interface for SEO and browser optimization
 */
interface ChatLayoutMetadata {
  readonly title: string
  readonly description: string
  readonly keywords: readonly string[]
  readonly viewport: string
  readonly themeColor: string
  readonly robots: string
  readonly canonical: string
}

/**
 * Performance configuration for chat layout
 */
interface PerformanceConfig {
  readonly preloadVoiceAssets: boolean
  readonly enableServiceWorker: boolean
  readonly cacheStrategy: 'aggressive' | 'balanced' | 'minimal'
  readonly enableOfflineMode: boolean
}

/**
 * Props for the ChatLayout component
 */
interface ChatLayoutProps {
  readonly children: React.ReactNode
  readonly enablePerformanceMonitoring?: boolean
  readonly enableErrorRecovery?: boolean
  readonly performanceConfig?: Partial<PerformanceConfig>
}

// ============================================================================
// Configuration Constants
// ============================================================================

/**
 * Chat layout metadata optimized for voice chat and SEO
 */
const CHAT_METADATA: ChatLayoutMetadata = {
  title: 'Sei AI Voice Chat | Real-time Investment Advisory Platform',
  description: 'Voice-enabled AI investment advisor for Sei blockchain with real-time market analysis, portfolio optimization, and intelligent trading recommendations.',
  keywords: [
    'sei blockchain',
    'voice ai assistant', 
    'crypto investment',
    'portfolio management',
    'blockchain advisory',
    'defi automation',
    'voice trading',
    'sei ecosystem',
    'crypto analysis',
    'investment platform'
  ] as const,
  viewport: 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=0, viewport-fit=cover',
  themeColor: '#ff6b35',
  robots: 'noindex, nofollow', // Private investment platform
  canonical: '/chat'
} as const

/**
 * Default performance configuration
 */
const DEFAULT_PERFORMANCE_CONFIG: PerformanceConfig = {
  preloadVoiceAssets: true,
  enableServiceWorker: false, // Disabled for development
  cacheStrategy: 'balanced',
  enableOfflineMode: false
} as const

/**
 * Viewport configuration for optimal mobile/desktop experience
 */
const VIEWPORT_CONFIG = {
  // Mobile-first responsive design
  mobile: {
    width: 'device-width',
    initialScale: 1.0,
    maximumScale: 1.0,
    userScalable: 'no',
    viewportFit: 'cover'
  },
  // Desktop optimization
  desktop: {
    width: 'device-width',
    initialScale: 1.0,
    maximumScale: 2.0,
    userScalable: 'yes'
  }
} as const

// ============================================================================
// Loading Component
// ============================================================================

/**
 * Chat-specific loading component with Dragon Ball Z theming
 */
const ChatLayoutLoading: React.FC = React.memo(() => (
  <div 
    className="flex items-center justify-center h-screen w-screen bg-gradient-to-b from-gray-900 via-gray-950 to-black"
    role="status"
    aria-label="Loading chat interface"
  >
    <div className="text-center space-y-6 px-4 max-w-md">
      {/* Animated dragon power indicator */}
      <div className="relative">
        <div className="animate-spin rounded-full h-16 w-16 border-4 border-orange-500/30 border-t-orange-500 mx-auto">
          <div className="absolute inset-2 rounded-full border-2 border-orange-400/20 border-r-orange-400 animate-spin-slow"></div>
        </div>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-2xl animate-pulse">🐉</span>
        </div>
      </div>
      
      {/* Loading messages */}
      <div className="space-y-2">
        <h2 className="text-xl font-bold text-orange-300 animate-pulse">
          Awakening Seiron's Voice...
        </h2>
        <p className="text-gray-400 text-sm leading-relaxed">
          Initializing neural pathways for voice communication and loading investment wisdom from the Sei blockchain
        </p>
      </div>
      
      {/* Power level indicator */}
      <div className="w-full bg-gray-800 rounded-full h-2 overflow-hidden">
        <div className="h-full bg-gradient-to-r from-orange-600 to-orange-400 rounded-full animate-pulse"></div>
      </div>
    </div>
  </div>
))

ChatLayoutLoading.displayName = 'ChatLayoutLoading'

// ============================================================================
// Error Boundary
// ============================================================================

/**
 * Enhanced error boundary specifically for chat layout issues
 */
class ChatLayoutErrorBoundary extends React.Component<
  { children: React.ReactNode; onError?: (error: Error, errorInfo: ErrorInfo) => void },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: React.ReactNode; onError?: (error: Error, errorInfo: ErrorInfo) => void }) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    logger.error('Chat layout error boundary caught error:', {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString()
    })

    this.props.onError?.(error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="h-screen w-screen flex items-center justify-center bg-gray-950">
          <div className="text-center space-y-4 px-4 max-w-md">
            <div className="text-6xl mb-4">💥</div>
            <h1 className="text-2xl font-bold text-orange-300">
              Layout System Malfunction!
            </h1>
            <p className="text-gray-400 text-sm">
              The chat interface structure has encountered a critical error. 
              Your data remains safe in the Hyperbolic Time Chamber.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-semibold transition-colors"
            >
              🐉 Restore System
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

// ============================================================================
// Main Layout Component
// ============================================================================

/**
 * Chat Layout Component
 * 
 * Provides optimized layout structure for voice-enabled chat interface with:
 * - Progressive Web App (PWA) capabilities
 * - Performance monitoring and error recovery
 * - Mobile-first responsive design
 * - Accessibility compliance
 * - SEO optimization for chat functionality
 * 
 * @param children - Child components to render within layout
 * @param enablePerformanceMonitoring - Enable performance overlay (default: false)
 * @param enableErrorRecovery - Enable enhanced error recovery (default: true)
 * @param performanceConfig - Performance optimization settings
 */
export const ChatLayout: React.FC<ChatLayoutProps> = React.memo(({
  children,
  enablePerformanceMonitoring = false,
  enableErrorRecovery = true,
  performanceConfig = {}
}) => {
  // Merge performance configuration
  const config = { ...DEFAULT_PERFORMANCE_CONFIG, ...performanceConfig }

  // Error handler for layout-level errors
  const handleLayoutError = React.useCallback((error: Error, errorInfo: ErrorInfo) => {
    // Report to analytics/monitoring service
    logger.error('Chat layout error:', {
      error: error.message,
      componentStack: errorInfo.componentStack,
      config,
      timestamp: new Date().toISOString()
    })
  }, [config])

  return (
    <ChatLayoutErrorBoundary onError={handleLayoutError}>
      {/* SEO and metadata configuration */}
      <Helmet>
        {/* Basic metadata */}
        <title>{CHAT_METADATA.title}</title>
        <meta name="description" content={CHAT_METADATA.description} />
        <meta name="keywords" content={CHAT_METADATA.keywords.join(', ')} />
        
        {/* Viewport and mobile optimization */}
        <meta name="viewport" content={CHAT_METADATA.viewport} />
        <meta name="theme-color" content={CHAT_METADATA.themeColor} />
        <meta name="color-scheme" content="dark" />
        
        {/* iOS PWA optimization */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Sei Voice Chat" />
        
        {/* Android PWA optimization */}
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="application-name" content="Sei Voice Chat" />
        
        {/* Security headers */}
        <meta name="referrer" content="strict-origin-when-cross-origin" />
        <meta name="robots" content={CHAT_METADATA.robots} />
        
        {/* Performance hints */}
        <link rel="dns-prefetch" href="//api.elevenlabs.io" />
        <link rel="preconnect" href="https://api.elevenlabs.io" crossOrigin="anonymous" />
        
        {/* Accessibility */}
        <meta name="color-scheme" content="dark light" />
        
        {/* Canonical URL */}
        <link rel="canonical" href={CHAT_METADATA.canonical} />
        
        {/* Voice-specific meta tags */}
        <meta name="speech-recognition" content="enabled" />
        <meta name="voice-interaction" content="supported" />
      </Helmet>

      {/* Layout structure with error boundaries */}
      <div 
        className="h-screen w-screen overflow-hidden bg-gray-950 relative"
        data-chat-layout="true"
        data-performance-config={JSON.stringify(config)}
      >
        {/* Performance monitoring overlay */}
        {enablePerformanceMonitoring && (
          <PerformanceMonitor 
            enableMemoryTracking={true}
            enableNetworkTracking={true}
            enableRenderTracking={true}
          />
        )}

        {/* Nested error boundaries for different failure modes */}
        <WebGLErrorBoundary>
          <PerformanceErrorBoundary>
            <ChatErrorBoundary>
              <Suspense fallback={<ChatLayoutLoading />}>
                {/* Accessibility landmarks */}
                <div role="main" className="h-full w-full relative z-10">
                  <h1 className="sr-only">Sei AI Voice Chat Interface</h1>
                  {children}
                </div>
              </Suspense>
            </ChatErrorBoundary>
          </PerformanceErrorBoundary>
        </WebGLErrorBoundary>

        {/* Background visual effects */}
        <div 
          className="absolute inset-0 bg-gradient-to-b from-gray-900 via-gray-950 to-black opacity-90 pointer-events-none"
          aria-hidden="true"
        />
        
        {/* Energy grid pattern */}
        <div 
          className="absolute inset-0 opacity-[0.03] pointer-events-none"
          style={{
            backgroundImage: `
              linear-gradient(rgba(255, 107, 53, 0.3) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255, 107, 53, 0.3) 1px, transparent 1px)
            `,
            backgroundSize: '50px 50px'
          }}
          aria-hidden="true"
        />

        {/* Skip navigation for accessibility */}
        <a 
          href="#chat-main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-orange-600 focus:text-white focus:rounded-lg"
        >
          Skip to chat interface
        </a>
      </div>
    </ChatLayoutErrorBoundary>
  )
})

ChatLayout.displayName = 'ChatLayout'

// ============================================================================
// Default Export and Props Interface
// ============================================================================

/**
 * Default chat layout component for use in routing
 * 
 * This component provides a complete layout structure for the chat page
 * and can be used as either a layout wrapper or standalone component.
 */
export default function ChatLayoutWrapper({ children }: { children: React.ReactNode }) {
  return (
    <ChatLayout
      enablePerformanceMonitoring={process.env.NODE_ENV === 'development'}
      enableErrorRecovery={true}
      performanceConfig={{
        preloadVoiceAssets: true,
        cacheStrategy: 'balanced'
      }}
    >
      {children}
    </ChatLayout>
  )
}

// Export metadata and configuration for external use
export { CHAT_METADATA, DEFAULT_PERFORMANCE_CONFIG, VIEWPORT_CONFIG }
export type { ChatLayoutProps, ChatLayoutMetadata, PerformanceConfig }
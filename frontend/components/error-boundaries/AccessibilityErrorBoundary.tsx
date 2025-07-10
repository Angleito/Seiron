'use client'

import React, { Component, ReactNode, ErrorInfo } from 'react'
import { 
  Eye, 
  EyeOff, 
  Volume2, 
  VolumeX, 
  Keyboard, 
  Mouse, 
  Contrast, 
  Sun,
  Moon,
  RefreshCw,
  Settings,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Headphones,
  Accessibility
} from 'lucide-react'
import { logger } from '@lib/logger'

interface AccessibilitySettings {
  highContrast: boolean
  reducedMotion: boolean
  screenReader: boolean
  keyboardNavigation: boolean
  largeText: boolean
  audioDescriptions: boolean
  captions: boolean
  colorBlindFriendly: boolean
  focusVisible: boolean
  skipLinks: boolean
}

interface AccessibilityErrorBoundaryState {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
  accessibilitySettings: AccessibilitySettings
  detectedCapabilities: {
    screenReader: boolean
    keyboardNavigation: boolean
    highContrast: boolean
    reducedMotion: boolean
    forcedColors: boolean
    darkMode: boolean
  }
  showAccessibilityPanel: boolean
  isAccessibilityMode: boolean
}

interface AccessibilityErrorBoundaryProps {
  children: ReactNode
  onError?: (error: Error, errorInfo: ErrorInfo) => void
  onAccessibilityChange?: (settings: AccessibilitySettings) => void
  enableAutoDetection?: boolean
  enableAccessibilityPanel?: boolean
  fallbackToAccessible?: boolean
  accessibilityFirst?: boolean
}

// Accessibility detection utilities
const detectAccessibilityFeatures = () => {
  if (typeof window === 'undefined') {
    return {
      screenReader: false,
      keyboardNavigation: false,
      highContrast: false,
      reducedMotion: false,
      forcedColors: false,
      darkMode: false
    }
  }

  const mediaQueries = {
    screenReader: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    keyboardNavigation: document.documentElement.getAttribute('data-whatintent') === 'keyboard',
    highContrast: window.matchMedia('(prefers-contrast: high)').matches,
    reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    forcedColors: window.matchMedia('(forced-colors: active)').matches,
    darkMode: window.matchMedia('(prefers-color-scheme: dark)').matches
  }

  return mediaQueries
}

const getDefaultAccessibilitySettings = (): AccessibilitySettings => ({
  highContrast: false,
  reducedMotion: false,
  screenReader: false,
  keyboardNavigation: false,
  largeText: false,
  audioDescriptions: false,
  captions: false,
  colorBlindFriendly: false,
  focusVisible: true,
  skipLinks: true
})

export class AccessibilityErrorBoundary extends Component<
  AccessibilityErrorBoundaryProps,
  AccessibilityErrorBoundaryState
> {
  private keydownHandler: ((event: KeyboardEvent) => void) | null = null
  private mediaQueryListeners: MediaQueryList[] = []

  constructor(props: AccessibilityErrorBoundaryProps) {
    super(props)
    
    const detectedCapabilities = detectAccessibilityFeatures()
    const accessibilitySettings = getDefaultAccessibilitySettings()
    
    // Auto-configure based on detected capabilities
    if (detectedCapabilities.highContrast) {
      accessibilitySettings.highContrast = true
    }
    if (detectedCapabilities.reducedMotion) {
      accessibilitySettings.reducedMotion = true
    }
    
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      accessibilitySettings,
      detectedCapabilities,
      showAccessibilityPanel: false,
      isAccessibilityMode: props.accessibilityFirst || false
    }
  }

  static getDerivedStateFromError(error: Error): Partial<AccessibilityErrorBoundaryState> {
    return {
      hasError: true,
      error
    }
  }

  override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const { onError } = this.props
    
    logger.error('Accessibility Error Boundary caught error:', {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      accessibilitySettings: this.state.accessibilitySettings,
      detectedCapabilities: this.state.detectedCapabilities,
      timestamp: new Date().toISOString()
    })

    this.setState({ errorInfo })
    
    if (onError) {
      onError(error, errorInfo)
    }
  }

  override componentDidMount() {
    this.setupAccessibilityListeners()
    this.applyAccessibilitySettings()
    
    // Initial settings notification
    if (this.props.onAccessibilityChange) {
      this.props.onAccessibilityChange(this.state.accessibilitySettings)
    }
  }

  override componentWillUnmount() {
    this.cleanup()
  }

  private setupAccessibilityListeners = () => {
    if (typeof window === 'undefined') return

    // Keyboard navigation detection
    this.keydownHandler = (event: KeyboardEvent) => {
      if (event.key === 'Tab') {
        this.updateAccessibilitySetting('keyboardNavigation', true)
        document.body.classList.add('keyboard-navigation')
      }
      
      // Accessibility panel toggle (Alt + A)
      if (event.altKey && event.key === 'a') {
        event.preventDefault()
        this.setState(prev => ({ showAccessibilityPanel: !prev.showAccessibilityPanel }))
      }
      
      // High contrast toggle (Alt + C)
      if (event.altKey && event.key === 'c') {
        event.preventDefault()
        this.toggleAccessibilitySetting('highContrast')
      }
    }
    
    document.addEventListener('keydown', this.keydownHandler)
    
    // Mouse click detection (disable keyboard nav mode)
    document.addEventListener('click', () => {
      this.updateAccessibilitySetting('keyboardNavigation', false)
      document.body.classList.remove('keyboard-navigation')
    })
    
    // Media query listeners
    const mediaQueries = [
      { query: '(prefers-contrast: high)', setting: 'highContrast' },
      { query: '(prefers-reduced-motion: reduce)', setting: 'reducedMotion' },
      { query: '(forced-colors: active)', setting: 'colorBlindFriendly' }
    ]
    
    mediaQueries.forEach(({ query, setting }) => {
      const mediaQuery = window.matchMedia(query)
      const handler = (e: MediaQueryListEvent) => {
        this.updateAccessibilitySetting(setting as keyof AccessibilitySettings, e.matches)
      }
      
      mediaQuery.addEventListener('change', handler)
      this.mediaQueryListeners.push(mediaQuery)
      
      // Apply initial state
      if (mediaQuery.matches) {
        this.updateAccessibilitySetting(setting as keyof AccessibilitySettings, true)
      }
    })
  }

  private cleanup = () => {
    if (this.keydownHandler) {
      document.removeEventListener('keydown', this.keydownHandler)
    }
    
    this.mediaQueryListeners.forEach(mediaQuery => {
      mediaQuery.removeEventListener('change', () => {})
    })
  }

  private updateAccessibilitySetting = (setting: keyof AccessibilitySettings, value: boolean) => {
    this.setState(prev => ({
      accessibilitySettings: {
        ...prev.accessibilitySettings,
        [setting]: value
      }
    }), () => {
      this.applyAccessibilitySettings()
      if (this.props.onAccessibilityChange) {
        this.props.onAccessibilityChange(this.state.accessibilitySettings)
      }
    })
  }

  private toggleAccessibilitySetting = (setting: keyof AccessibilitySettings) => {
    this.setState(prev => ({
      accessibilitySettings: {
        ...prev.accessibilitySettings,
        [setting]: !prev.accessibilitySettings[setting]
      }
    }), () => {
      this.applyAccessibilitySettings()
      if (this.props.onAccessibilityChange) {
        this.props.onAccessibilityChange(this.state.accessibilitySettings)
      }
    })
  }

  private applyAccessibilitySettings = () => {
    const { accessibilitySettings } = this.state
    
    // Apply CSS classes and attributes
    document.body.classList.toggle('high-contrast', accessibilitySettings.highContrast)
    document.body.classList.toggle('reduced-motion', accessibilitySettings.reducedMotion)
    document.body.classList.toggle('large-text', accessibilitySettings.largeText)
    document.body.classList.toggle('colorblind-friendly', accessibilitySettings.colorBlindFriendly)
    document.body.classList.toggle('focus-visible', accessibilitySettings.focusVisible)
    
    // Set ARIA attributes
    document.documentElement.setAttribute('aria-high-contrast', accessibilitySettings.highContrast.toString())
    document.documentElement.setAttribute('aria-reduced-motion', accessibilitySettings.reducedMotion.toString())
    
    // Update CSS custom properties
    document.documentElement.style.setProperty('--animation-duration', 
      accessibilitySettings.reducedMotion ? '0s' : '0.3s')
    document.documentElement.style.setProperty('--font-size-multiplier', 
      accessibilitySettings.largeText ? '1.2' : '1')
  }

  private handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    })
  }

  private handleAccessibilityMode = () => {
    this.setState({ isAccessibilityMode: true })
    
    // Enable accessibility-first settings
    this.setState(prev => ({
      accessibilitySettings: {
        ...prev.accessibilitySettings,
        highContrast: true,
        reducedMotion: true,
        focusVisible: true,
        skipLinks: true,
        keyboardNavigation: true
      }
    }), () => {
      this.applyAccessibilitySettings()
      if (this.props.onAccessibilityChange) {
        this.props.onAccessibilityChange(this.state.accessibilitySettings)
      }
    })
  }

  private renderAccessibilityPanel = () => {
    const { accessibilitySettings } = this.state
    
    return (
      <div className="fixed top-4 right-4 z-50 bg-gray-900 border border-gray-600 rounded-lg p-4 shadow-xl max-w-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <Accessibility className="h-5 w-5" />
            Accessibility
          </h3>
          <button
            onClick={() => this.setState({ showAccessibilityPanel: false })}
            className="text-gray-400 hover:text-white transition-colors"
            aria-label="Close accessibility panel"
          >
            <XCircle className="h-5 w-5" />
          </button>
        </div>
        
        <div className="space-y-3">
          <label className="flex items-center justify-between gap-2">
            <span className="text-sm text-gray-300 flex items-center gap-2">
              <Contrast className="h-4 w-4" />
              High Contrast
            </span>
            <input
              type="checkbox"
              checked={accessibilitySettings.highContrast}
              onChange={(e) => this.updateAccessibilitySetting('highContrast', e.target.checked)}
              className="rounded"
            />
          </label>
          
          <label className="flex items-center justify-between gap-2">
            <span className="text-sm text-gray-300 flex items-center gap-2">
              <RefreshCw className="h-4 w-4" />
              Reduced Motion
            </span>
            <input
              type="checkbox"
              checked={accessibilitySettings.reducedMotion}
              onChange={(e) => this.updateAccessibilitySetting('reducedMotion', e.target.checked)}
              className="rounded"
            />
          </label>
          
          <label className="flex items-center justify-between gap-2">
            <span className="text-sm text-gray-300 flex items-center gap-2">
              <Eye className="h-4 w-4" />
              Large Text
            </span>
            <input
              type="checkbox"
              checked={accessibilitySettings.largeText}
              onChange={(e) => this.updateAccessibilitySetting('largeText', e.target.checked)}
              className="rounded"
            />
          </label>
          
          <label className="flex items-center justify-between gap-2">
            <span className="text-sm text-gray-300 flex items-center gap-2">
              <Keyboard className="h-4 w-4" />
              Keyboard Navigation
            </span>
            <input
              type="checkbox"
              checked={accessibilitySettings.keyboardNavigation}
              onChange={(e) => this.updateAccessibilitySetting('keyboardNavigation', e.target.checked)}
              className="rounded"
            />
          </label>
          
          <label className="flex items-center justify-between gap-2">
            <span className="text-sm text-gray-300 flex items-center gap-2">
              <Volume2 className="h-4 w-4" />
              Audio Descriptions
            </span>
            <input
              type="checkbox"
              checked={accessibilitySettings.audioDescriptions}
              onChange={(e) => this.updateAccessibilitySetting('audioDescriptions', e.target.checked)}
              className="rounded"
            />
          </label>
          
          <label className="flex items-center justify-between gap-2">
            <span className="text-sm text-gray-300 flex items-center gap-2">
              <Headphones className="h-4 w-4" />
              Captions
            </span>
            <input
              type="checkbox"
              checked={accessibilitySettings.captions}
              onChange={(e) => this.updateAccessibilitySetting('captions', e.target.checked)}
              className="rounded"
            />
          </label>
        </div>
        
        <div className="mt-4 pt-4 border-t border-gray-700">
          <div className="text-xs text-gray-400 space-y-1">
            <p>Keyboard shortcuts:</p>
            <p>• Alt + A: Toggle this panel</p>
            <p>• Alt + C: Toggle high contrast</p>
            <p>• Tab: Navigate with keyboard</p>
          </div>
        </div>
      </div>
    )
  }

  private renderErrorFallback = () => {
    const { error, errorInfo, accessibilitySettings, detectedCapabilities } = this.state
    
    return (
      <div className="min-h-screen bg-gray-900 text-white p-4">
        {/* Skip to content link */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-blue-600 text-white p-2 rounded z-50"
        >
          Skip to main content
        </a>
        
        <div className="max-w-4xl mx-auto">
          <div className="bg-gray-800 border border-red-500/30 rounded-lg shadow-xl">
            {/* Header */}
            <div className="bg-red-600/20 border-b border-red-500/30 p-6">
              <div className="flex items-center gap-4">
                <div className="bg-red-500/20 p-3 rounded-full">
                  <AlertTriangle className="h-8 w-8 text-red-400" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-red-100">
                    Accessibility Error
                  </h1>
                  <p className="text-red-200 mt-1">
                    An error occurred while loading the application. We've optimized the experience for accessibility.
                  </p>
                </div>
              </div>
            </div>

            {/* Main content */}
            <div id="main-content" className="p-6">
              <div className="space-y-6">
                {/* Accessibility Status */}
                <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4">
                  <h2 className="text-lg font-semibold text-blue-100 mb-4">
                    Accessibility Features Detected
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="flex items-center gap-2">
                      {detectedCapabilities.highContrast ? (
                        <CheckCircle className="h-4 w-4 text-green-400" />
                      ) : (
                        <XCircle className="h-4 w-4 text-gray-400" />
                      )}
                      <span className="text-sm text-gray-300">High Contrast Mode</span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {detectedCapabilities.reducedMotion ? (
                        <CheckCircle className="h-4 w-4 text-green-400" />
                      ) : (
                        <XCircle className="h-4 w-4 text-gray-400" />
                      )}
                      <span className="text-sm text-gray-300">Reduced Motion</span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {detectedCapabilities.screenReader ? (
                        <CheckCircle className="h-4 w-4 text-green-400" />
                      ) : (
                        <XCircle className="h-4 w-4 text-gray-400" />
                      )}
                      <span className="text-sm text-gray-300">Screen Reader</span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {detectedCapabilities.keyboardNavigation ? (
                        <CheckCircle className="h-4 w-4 text-green-400" />
                      ) : (
                        <XCircle className="h-4 w-4 text-gray-400" />
                      )}
                      <span className="text-sm text-gray-300">Keyboard Navigation</span>
                    </div>
                  </div>
                </div>

                {/* Error Details */}
                {error && (
                  <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-4">
                    <h2 className="text-lg font-semibold text-red-100 mb-2">
                      Error Details
                    </h2>
                    <div className="space-y-2">
                      <div>
                        <label className="text-sm font-medium text-red-200">Error Message:</label>
                        <p className="text-red-300 text-sm mt-1">{error.message}</p>
                      </div>
                      {process.env.NODE_ENV === 'development' && errorInfo && (
                        <div>
                          <label className="text-sm font-medium text-red-200">Component Stack:</label>
                          <pre className="text-red-300 text-xs mt-1 bg-gray-800 p-2 rounded overflow-x-auto">
                            {errorInfo.componentStack}
                          </pre>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Accessible Alternatives */}
                <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-4">
                  <h2 className="text-lg font-semibold text-green-100 mb-4">
                    Accessible Alternatives Available
                  </h2>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="bg-green-500/20 p-2 rounded">
                        <Accessibility className="h-4 w-4 text-green-400" />
                      </div>
                      <div>
                        <p className="text-green-200 font-medium">Text-Based Dragon Interface</p>
                        <p className="text-green-300 text-sm">Full keyboard navigation and screen reader support</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <div className="bg-green-500/20 p-2 rounded">
                        <Keyboard className="h-4 w-4 text-green-400" />
                      </div>
                      <div>
                        <p className="text-green-200 font-medium">Keyboard-Only Control</p>
                        <p className="text-green-300 text-sm">Complete functionality without mouse</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <div className="bg-green-500/20 p-2 rounded">
                        <Volume2 className="h-4 w-4 text-green-400" />
                      </div>
                      <div>
                        <p className="text-green-200 font-medium">Audio Descriptions</p>
                        <p className="text-green-300 text-sm">Spoken descriptions of visual elements</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={this.handleRetry}
                    className="flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Retry with Current Settings
                  </button>
                  
                  <button
                    onClick={this.handleAccessibilityMode}
                    className="flex items-center justify-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    <Accessibility className="h-4 w-4" />
                    Enable Accessibility Mode
                  </button>
                  
                  <button
                    onClick={() => this.setState({ showAccessibilityPanel: true })}
                    className="flex items-center justify-center gap-2 px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500"
                  >
                    <Settings className="h-4 w-4" />
                    Accessibility Settings
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Accessibility Panel */}
        {this.state.showAccessibilityPanel && this.renderAccessibilityPanel()}
      </div>
    )
  }

  override render() {
    const { children, fallbackToAccessible = true } = this.props
    const { hasError, isAccessibilityMode } = this.state

    if (hasError) {
      if (fallbackToAccessible) {
        return this.renderErrorFallback()
      }
    }

    return (
      <>
        {children}
        {this.props.enableAccessibilityPanel && this.state.showAccessibilityPanel && this.renderAccessibilityPanel()}
      </>
    )
  }
}

export default AccessibilityErrorBoundary
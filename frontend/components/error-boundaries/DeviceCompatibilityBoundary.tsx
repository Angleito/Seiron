'use client'

import React, { Component, ReactNode, ErrorInfo } from 'react'
import { Smartphone, Monitor, Tablet, Wifi, WifiOff, AlertTriangle, CheckCircle, XCircle, RefreshCw, Settings } from 'lucide-react'
import { logger } from '@lib/logger'

interface DeviceCapabilities {
  webgl: boolean
  webgl2: boolean
  hardwareAcceleration: boolean
  touchSupport: boolean
  deviceMemory: number
  maxTextureSize: number
  isMobile: boolean
  isTablet: boolean
  isDesktop: boolean
  networkSpeed: 'slow' | 'medium' | 'fast'
  orientation: 'portrait' | 'landscape'
  pixelRatio: number
  viewportWidth: number
  viewportHeight: number
}

interface DeviceCompatibilityBoundaryState {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
  capabilities: DeviceCapabilities | null
  isOnline: boolean
  showCompatibilityDetails: boolean
  recommendedSettings: RecommendedSettings | null
  performanceScore: number
}

interface RecommendedSettings {
  dragonType: 'glb' | '2d' | 'ascii'
  quality: 'low' | 'medium' | 'high'
  enableAnimations: boolean
  enableParticles: boolean
  enableShadows: boolean
  reason: string
}

interface DeviceCompatibilityBoundaryProps {
  children: ReactNode
  onDeviceDetected?: (capabilities: DeviceCapabilities) => void
  onRecommendedSettings?: (settings: RecommendedSettings) => void
  onError?: (error: Error, errorInfo: ErrorInfo) => void
  enableAutoOptimization?: boolean
  minimumRequirements?: {
    webgl?: boolean
    deviceMemory?: number
    maxTextureSize?: number
  }
}

// Device capability detection utilities
const detectDeviceCapabilities = (): DeviceCapabilities => {
  if (typeof window === 'undefined') {
    return {
      webgl: false,
      webgl2: false,
      hardwareAcceleration: false,
      touchSupport: false,
      deviceMemory: 0,
      maxTextureSize: 0,
      isMobile: false,
      isTablet: false,
      isDesktop: true,
      networkSpeed: 'medium',
      orientation: 'landscape',
      pixelRatio: 1,
      viewportWidth: 1920,
      viewportHeight: 1080
    }
  }

  const canvas = document.createElement('canvas')
  const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl') as WebGLRenderingContext | null
  const gl2 = canvas.getContext('webgl2') as WebGL2RenderingContext | null
  
  // Check hardware acceleration
  let hardwareAccelerated = false
  if (gl) {
    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info')
    if (debugInfo) {
      const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL)
      hardwareAccelerated = !renderer.includes('SwiftShader') && !renderer.includes('Software')
    }
  }

  // Device type detection
  const userAgent = navigator.userAgent
  const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent)
  const isTablet = /iPad|Android(?!.*Mobile)/i.test(userAgent) || (isMobile && window.innerWidth > 768)
  const isDesktop = !isMobile && !isTablet

  // Network speed estimation
  const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection
  let networkSpeed: 'slow' | 'medium' | 'fast' = 'medium'
  if (connection) {
    const effectiveType = connection.effectiveType
    if (effectiveType === 'slow-2g' || effectiveType === '2g') {
      networkSpeed = 'slow'
    } else if (effectiveType === '3g') {
      networkSpeed = 'medium'
    } else if (effectiveType === '4g') {
      networkSpeed = 'fast'
    }
  }

  return {
    webgl: !!gl,
    webgl2: !!gl2,
    hardwareAcceleration: hardwareAccelerated,
    touchSupport: 'ontouchstart' in window,
    deviceMemory: (navigator as any).deviceMemory || 4,
    maxTextureSize: gl ? gl.getParameter(gl.MAX_TEXTURE_SIZE) : 0,
    isMobile,
    isTablet,
    isDesktop,
    networkSpeed,
    orientation: window.innerWidth > window.innerHeight ? 'landscape' : 'portrait',
    pixelRatio: window.devicePixelRatio || 1,
    viewportWidth: window.innerWidth,
    viewportHeight: window.innerHeight
  }
}

const calculatePerformanceScore = (capabilities: DeviceCapabilities): number => {
  let score = 0
  
  // WebGL support
  if (capabilities.webgl) score += 30
  if (capabilities.webgl2) score += 20
  if (capabilities.hardwareAcceleration) score += 25
  
  // Device memory
  if (capabilities.deviceMemory >= 8) score += 15
  else if (capabilities.deviceMemory >= 4) score += 10
  else if (capabilities.deviceMemory >= 2) score += 5
  
  // Network speed
  if (capabilities.networkSpeed === 'fast') score += 5
  else if (capabilities.networkSpeed === 'medium') score += 3
  
  // Device type adjustments
  if (capabilities.isDesktop) score += 5
  else if (capabilities.isTablet) score += 3
  
  return Math.min(score, 100)
}

const getRecommendedSettings = (capabilities: DeviceCapabilities): RecommendedSettings => {
  const score = calculatePerformanceScore(capabilities)
  
  if (score >= 80) {
    return {
      dragonType: 'glb',
      quality: 'high',
      enableAnimations: true,
      enableParticles: true,
      enableShadows: true,
      reason: 'High-performance device detected'
    }
  } else if (score >= 60) {
    return {
      dragonType: 'glb',
      quality: 'medium',
      enableAnimations: true,
      enableParticles: true,
      enableShadows: false,
      reason: 'Medium-performance device detected'
    }
  } else if (score >= 40) {
    return {
      dragonType: 'glb',
      quality: 'low',
      enableAnimations: true,
      enableParticles: false,
      enableShadows: false,
      reason: 'Low-performance device detected'
    }
  } else if (score >= 20) {
    return {
      dragonType: '2d',
      quality: 'low',
      enableAnimations: true,
      enableParticles: false,
      enableShadows: false,
      reason: 'Limited graphics capability, using 2D fallback'
    }
  } else {
    return {
      dragonType: 'ascii',
      quality: 'low',
      enableAnimations: false,
      enableParticles: false,
      enableShadows: false,
      reason: 'Minimal graphics capability, using ASCII fallback'
    }
  }
}

export class DeviceCompatibilityBoundary extends Component<
  DeviceCompatibilityBoundaryProps,
  DeviceCompatibilityBoundaryState
> {
  private networkStatusHandler: (() => void) | null = null
  private orientationHandler: ((event: Event) => void) | null = null
  private resizeHandler: (() => void) | null = null

  constructor(props: DeviceCompatibilityBoundaryProps) {
    super(props)
    
    const capabilities = detectDeviceCapabilities()
    const performanceScore = calculatePerformanceScore(capabilities)
    
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      capabilities,
      isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
      showCompatibilityDetails: false,
      recommendedSettings: getRecommendedSettings(capabilities),
      performanceScore
    }
  }

  static getDerivedStateFromError(error: Error): Partial<DeviceCompatibilityBoundaryState> {
    return {
      hasError: true,
      error
    }
  }

  override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const { onError } = this.props
    
    logger.error('Device Compatibility Error:', {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      capabilities: this.state.capabilities,
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString()
    })

    this.setState({ errorInfo })
    
    if (onError) {
      onError(error, errorInfo)
    }
  }

  override componentDidMount() {
    const { onDeviceDetected, onRecommendedSettings } = this.props
    const { capabilities, recommendedSettings } = this.state
    
    if (capabilities && onDeviceDetected) {
      onDeviceDetected(capabilities)
    }
    
    if (recommendedSettings && onRecommendedSettings) {
      onRecommendedSettings(recommendedSettings)
    }
    
    // Set up event listeners
    this.setupEventListeners()
  }

  override componentWillUnmount() {
    this.cleanup()
  }

  private setupEventListeners = () => {
    if (typeof window === 'undefined') return

    // Network status
    this.networkStatusHandler = () => {
      this.setState({ isOnline: navigator.onLine })
    }
    window.addEventListener('online', this.networkStatusHandler)
    window.addEventListener('offline', this.networkStatusHandler)

    // Orientation changes
    this.orientationHandler = () => {
      const capabilities = detectDeviceCapabilities()
      const performanceScore = calculatePerformanceScore(capabilities)
      const recommendedSettings = getRecommendedSettings(capabilities)
      
      this.setState({
        capabilities,
        performanceScore,
        recommendedSettings
      })
    }
    window.addEventListener('orientationchange', this.orientationHandler)

    // Resize
    this.resizeHandler = () => {
      const capabilities = detectDeviceCapabilities()
      this.setState({ capabilities })
    }
    window.addEventListener('resize', this.resizeHandler)
  }

  private cleanup = () => {
    if (this.networkStatusHandler) {
      window.removeEventListener('online', this.networkStatusHandler)
      window.removeEventListener('offline', this.networkStatusHandler)
    }
    if (this.orientationHandler) {
      window.removeEventListener('orientationchange', this.orientationHandler)
    }
    if (this.resizeHandler) {
      window.removeEventListener('resize', this.resizeHandler)
    }
  }

  private handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    })
  }

  private handleOptimize = () => {
    const { capabilities } = this.state
    if (!capabilities) return
    
    const optimizedSettings = getRecommendedSettings(capabilities)
    this.setState({ recommendedSettings: optimizedSettings })
    
    if (this.props.onRecommendedSettings) {
      this.props.onRecommendedSettings(optimizedSettings)
    }
  }

  private checkMinimumRequirements = (): boolean => {
    const { minimumRequirements } = this.props
    const { capabilities } = this.state
    
    if (!capabilities || !minimumRequirements) return true
    
    if (minimumRequirements.webgl && !capabilities.webgl) return false
    if (minimumRequirements.deviceMemory && capabilities.deviceMemory < minimumRequirements.deviceMemory) return false
    if (minimumRequirements.maxTextureSize && capabilities.maxTextureSize < minimumRequirements.maxTextureSize) return false
    
    return true
  }

  private renderCompatibilityStatus = () => {
    const { capabilities, isOnline, performanceScore } = this.state
    if (!capabilities) return null

    const meetsRequirements = this.checkMinimumRequirements()
    const deviceIcon = capabilities.isMobile ? Smartphone : capabilities.isTablet ? Tablet : Monitor

    return (
      <div className="space-y-4">
        {/* Device Info */}
        <div className="flex items-center gap-4">
          <div className="bg-blue-500/20 p-3 rounded-full">
            {React.createElement(deviceIcon, { className: "h-6 w-6 text-blue-400" })}
          </div>
          <div>
            <h3 className="font-semibold text-blue-100">
              {capabilities.isMobile ? 'Mobile Device' : capabilities.isTablet ? 'Tablet Device' : 'Desktop Device'}
            </h3>
            <p className="text-sm text-blue-200">
              Performance Score: {performanceScore}/100
            </p>
          </div>
        </div>

        {/* Capabilities Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <div className="flex items-center gap-2">
            {capabilities.webgl ? (
              <CheckCircle className="h-4 w-4 text-green-400" />
            ) : (
              <XCircle className="h-4 w-4 text-red-400" />
            )}
            <span className="text-sm text-gray-300">WebGL</span>
          </div>
          
          <div className="flex items-center gap-2">
            {capabilities.webgl2 ? (
              <CheckCircle className="h-4 w-4 text-green-400" />
            ) : (
              <XCircle className="h-4 w-4 text-red-400" />
            )}
            <span className="text-sm text-gray-300">WebGL 2</span>
          </div>
          
          <div className="flex items-center gap-2">
            {capabilities.hardwareAcceleration ? (
              <CheckCircle className="h-4 w-4 text-green-400" />
            ) : (
              <XCircle className="h-4 w-4 text-red-400" />
            )}
            <span className="text-sm text-gray-300">Hardware Acceleration</span>
          </div>
          
          <div className="flex items-center gap-2">
            {isOnline ? (
              <Wifi className="h-4 w-4 text-green-400" />
            ) : (
              <WifiOff className="h-4 w-4 text-red-400" />
            )}
            <span className="text-sm text-gray-300">
              {isOnline ? 'Online' : 'Offline'}
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-300">
              Memory: {capabilities.deviceMemory}GB
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-300">
              Network: {capabilities.networkSpeed}
            </span>
          </div>
        </div>

        {/* Requirements Status */}
        <div className={`p-4 rounded-lg border ${
          meetsRequirements 
            ? 'bg-green-900/20 border-green-500/30' 
            : 'bg-red-900/20 border-red-500/30'
        }`}>
          <div className="flex items-center gap-2">
            {meetsRequirements ? (
              <CheckCircle className="h-5 w-5 text-green-400" />
            ) : (
              <XCircle className="h-5 w-5 text-red-400" />
            )}
            <span className={`font-medium ${
              meetsRequirements ? 'text-green-100' : 'text-red-100'
            }`}>
              {meetsRequirements ? 'Device Compatible' : 'Limited Compatibility'}
            </span>
          </div>
          <p className={`text-sm mt-1 ${
            meetsRequirements ? 'text-green-200' : 'text-red-200'
          }`}>
            {meetsRequirements 
              ? 'Your device meets the minimum requirements for the full experience.'
              : 'Your device has limited capabilities. The experience will be optimized automatically.'
            }
          </p>
        </div>
      </div>
    )
  }

  private renderErrorFallback = () => {
    const { error, errorInfo, capabilities, recommendedSettings } = this.state
    
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 flex items-center justify-center p-4">
        <div className="max-w-2xl w-full bg-gray-800 border border-blue-500/30 rounded-lg shadow-2xl">
          {/* Header */}
          <div className="bg-blue-600/20 border-b border-blue-500/30 p-6">
            <div className="flex items-center gap-4">
              <div className="bg-blue-500/20 p-3 rounded-full">
                <AlertTriangle className="h-8 w-8 text-blue-400" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-blue-100">
                  Device Compatibility Issue
                </h1>
                <p className="text-blue-200 mt-1">
                  Your device may have limited support for some features.
                </p>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-6">
            <div className="space-y-6">
              {/* Compatibility Status */}
              {this.renderCompatibilityStatus()}

              {/* Recommended Settings */}
              {recommendedSettings && (
                <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-4">
                  <h3 className="font-semibold text-yellow-100 mb-2">
                    Recommended Settings
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-yellow-200">Dragon Type:</span>
                      <span className="text-yellow-400 font-medium capitalize">
                        {recommendedSettings.dragonType}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-yellow-200">Quality:</span>
                      <span className="text-yellow-400 font-medium capitalize">
                        {recommendedSettings.quality}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-yellow-200">Animations:</span>
                      <span className="text-yellow-400 font-medium">
                        {recommendedSettings.enableAnimations ? 'Enabled' : 'Disabled'}
                      </span>
                    </div>
                  </div>
                  <p className="text-yellow-200 text-sm mt-3">
                    {recommendedSettings.reason}
                  </p>
                </div>
              )}

              {/* Error Details */}
              {error && (
                <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-4">
                  <h3 className="font-semibold text-red-100 mb-2">Error Details</h3>
                  <p className="text-red-200 text-sm">{error.message}</p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={this.handleRetry}
                  className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                >
                  <RefreshCw className="h-4 w-4" />
                  Continue with Optimized Settings
                </button>
                
                <button
                  onClick={this.handleOptimize}
                  className="flex items-center justify-center gap-2 px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg font-medium transition-colors"
                >
                  <Settings className="h-4 w-4" />
                  Apply Recommended Settings
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  override render() {
    const { children, enableAutoOptimization = true } = this.props
    const { hasError, capabilities, recommendedSettings } = this.state

    // Auto-optimization for compatible devices
    if (enableAutoOptimization && capabilities && recommendedSettings && !hasError) {
      if (this.props.onRecommendedSettings) {
        this.props.onRecommendedSettings(recommendedSettings)
      }
    }

    if (hasError) {
      return this.renderErrorFallback()
    }

    return children
  }
}

export default DeviceCompatibilityBoundary
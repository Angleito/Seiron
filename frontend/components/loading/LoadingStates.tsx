'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { AlertCircle, RefreshCw, Wifi, WifiOff, Monitor, Smartphone, Tablet, Eye, EyeOff, VolumeX, Volume2, Zap, Activity, Settings } from 'lucide-react'
import { useWebGLRecovery } from '../../utils/webglRecovery'

// Enhanced loading spinner with better visual feedback
export const EnhancedLoadingSpinner: React.FC<{
  className?: string
  size?: 'sm' | 'md' | 'lg'
  color?: 'primary' | 'secondary' | 'success' | 'warning' | 'error'
  showProgress?: boolean
  progress?: number
}> = ({ className = '', size = 'md', color = 'primary', showProgress = false, progress = 0 }) => {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16'
  }
  
  const colorClasses = {
    primary: 'border-blue-500 text-blue-500',
    secondary: 'border-gray-500 text-gray-500',
    success: 'border-green-500 text-green-500',
    warning: 'border-yellow-500 text-yellow-500',
    error: 'border-red-500 text-red-500'
  }
  
  return (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      <div className="relative">
        <div className={`${sizeClasses[size]} border-4 border-gray-200 rounded-full animate-spin border-t-transparent`} />
        <div className={`absolute inset-0 ${sizeClasses[size]} border-4 ${colorClasses[color]} rounded-full animate-spin border-l-transparent border-r-transparent border-b-transparent`} />
      </div>
      {showProgress && (
        <div className="mt-4 w-32">
          <div className="flex justify-between text-xs text-gray-500 mb-1">
            <span>Loading...</span>
            <span>{progress}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-1.5">
            <div 
              className={`h-1.5 rounded-full transition-all duration-300 ${colorClasses[color].replace('border-', 'bg-').replace('text-', 'bg-')}`}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}
    </div>
  )
}

// Enhanced Dragon-themed loading animation with WebGL integration
export const DragonLoadingAnimation: React.FC<{
  message?: string
  showProgress?: boolean
  progress?: number
  isWebGLRecovering?: boolean
  recoveryStage?: string
  onRetryWebGL?: () => void
  showWebGLStatus?: boolean
}> = ({ 
  message = 'Dragon is awakening...', 
  showProgress = false, 
  progress = 0,
  isWebGLRecovering = false,
  recoveryStage = '',
  onRetryWebGL,
  showWebGLStatus = false
}) => {
  const [animationPhase, setAnimationPhase] = useState(0)
  const [dragonEyes, setDragonEyes] = useState(false)
  const { diagnostics } = useWebGLRecovery()
  
  // Adjust animation based on WebGL state
  const isWebGLActive = diagnostics?.currentState === 'active'
  const webglRisk = diagnostics?.contextLossRisk || 'low'
  
  useEffect(() => {
    // Adjust animation speed based on WebGL recovery state
    const speed = isWebGLRecovering ? 200 : 500
    
    const interval = setInterval(() => {
      setAnimationPhase(phase => (phase + 1) % 4)
      setDragonEyes(Math.random() > 0.7)
    }, speed)
    
    return () => clearInterval(interval)
  }, [isWebGLRecovering])
  
  // Dynamic dragon frames based on WebGL state
  const dragonFrames = isWebGLRecovering ? [
    '⚡🐉', '🔄🐉⚡', '✨🐉🔄', '🐉✨'
  ] : [
    '🐉', '🔥🐉', '🔥🐉🔥', '✨🐉✨'
  ]
  
  return (
    <div className="flex flex-col items-center justify-center p-8">
      <div className="relative mb-6">
        {/* Dragon animation */}
        <div className="text-8xl animate-pulse">
          {dragonFrames[animationPhase]}
        </div>
        
        {/* Dragon eyes blinking */}
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 flex gap-2">
          <div className={`w-2 h-2 rounded-full bg-red-500 transition-opacity duration-100 ${dragonEyes ? 'opacity-100' : 'opacity-0'}`} />
          <div className={`w-2 h-2 rounded-full bg-red-500 transition-opacity duration-100 ${dragonEyes ? 'opacity-100' : 'opacity-0'}`} />
        </div>
        
        {/* Power aura */}
        <div className="absolute inset-0 bg-gradient-to-r from-orange-500/20 to-red-500/20 rounded-full blur-xl animate-pulse" />
      </div>
      
      <div className="text-center">
        <h3 className="text-xl font-bold text-orange-400 mb-2 animate-pulse">
          {isWebGLRecovering ? `WebGL Recovery: ${recoveryStage}` : message}
        </h3>
        
        {/* WebGL Status Indicator */}
        {showWebGLStatus && (
          <div className="mb-4 p-3 bg-black/30 rounded-lg border border-gray-600">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Activity className={`h-4 w-4 ${
                isWebGLActive ? 'text-green-400' : isWebGLRecovering ? 'text-yellow-400 animate-spin' : 'text-red-400'
              }`} />
              <span className="text-sm text-gray-300">
                WebGL: {isWebGLActive ? 'Active' : isWebGLRecovering ? 'Recovering' : 'Unavailable'}
              </span>
            </div>
            {webglRisk !== 'low' && (
              <div className="flex items-center justify-center gap-1 text-xs">
                <AlertCircle className={`h-3 w-3 ${
                  webglRisk === 'high' ? 'text-red-400' : 'text-yellow-400'
                }`} />
                <span className={webglRisk === 'high' ? 'text-red-300' : 'text-yellow-300'}>
                  Context Loss Risk: {webglRisk.toUpperCase()}
                </span>
              </div>
            )}
            {onRetryWebGL && !isWebGLActive && (
              <button
                onClick={onRetryWebGL}
                className="mt-2 px-3 py-1 bg-blue-500/20 border border-blue-500 rounded text-xs text-blue-400 hover:bg-blue-500/30 transition-colors"
              >
                Retry WebGL
              </button>
            )}
          </div>
        )}
        
        {showProgress && (
          <div className="w-64 mt-4">
            <div className="flex justify-between text-sm text-gray-400 mb-2">
              <span>{isWebGLRecovering ? 'Recovery Progress' : 'Power Level'}</span>
              <span>{progress}%</span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div 
                className={`h-2 rounded-full transition-all duration-300 ${
                  isWebGLRecovering 
                    ? 'bg-gradient-to-r from-blue-500 to-purple-500' 
                    : 'bg-gradient-to-r from-orange-500 to-red-500'
                }`}
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}
        
        {/* Loading dots */}
        <div className="flex justify-center mt-4 space-x-1">
          {[0, 1, 2].map(i => (
            <div
              key={i}
              className={`w-2 h-2 rounded-full bg-orange-500 animate-pulse`}
              style={{ animationDelay: `${i * 0.2}s` }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

// Progressive loading with multiple stages
export const ProgressiveLoader: React.FC<{
  stages: Array<{ name: string; duration: number; description?: string }>
  currentStage?: number
  onComplete?: () => void
}> = ({ stages, currentStage = 0, onComplete }) => {
  const [activeStage, setActiveStage] = useState(currentStage)
  const [progress, setProgress] = useState(0)
  const [stageProgress, setStageProgress] = useState(0)
  
  useEffect(() => {
    if (activeStage >= stages.length) {
      onComplete?.()
      return
    }
    
    const stage = stages[activeStage]
    const interval = setInterval(() => {
      setStageProgress((prev: number) => {
        if (prev >= 100) {
          setActiveStage(current => current + 1)
          setProgress((prev: number) => prev + (100 / stages.length))
          return 0
        }
        return prev + (100 / (stage?.duration || 1000) / 100)
      })
    }, 100)
    
    return () => clearInterval(interval)
  }, [activeStage, stages, onComplete])
  
  const currentStageData = stages[activeStage]
  
  return (
    <div className="max-w-md mx-auto p-6">
      <div className="text-center mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          {currentStageData?.name || 'Loading...'}
        </h3>
        {currentStageData?.description && (
          <p className="text-sm text-gray-600">
            {currentStageData.description}
          </p>
        )}
      </div>
      
      {/* Overall progress */}
      <div className="mb-4">
        <div className="flex justify-between text-sm text-gray-500 mb-1">
          <span>Overall Progress</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
      
      {/* Stage progress */}
      <div className="mb-6">
        <div className="flex justify-between text-sm text-gray-500 mb-1">
          <span>Current Stage</span>
          <span>{Math.round(stageProgress)}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-1">
          <div 
            className="bg-green-500 h-1 rounded-full transition-all duration-300"
            style={{ width: `${stageProgress}%` }}
          />
        </div>
      </div>
      
      {/* Stage list */}
      <div className="space-y-2">
        {stages.map((stage, index) => (
          <div
            key={index}
            className={`flex items-center text-sm p-2 rounded ${
              index === activeStage
                ? 'bg-blue-100 text-blue-800'
                : index < activeStage
                ? 'bg-green-100 text-green-800'
                : 'bg-gray-100 text-gray-600'
            }`}
          >
            <div className={`w-2 h-2 rounded-full mr-3 ${
              index === activeStage
                ? 'bg-blue-500 animate-pulse'
                : index < activeStage
                ? 'bg-green-500'
                : 'bg-gray-400'
            }`} />
            <span className="font-medium">{stage.name}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// Device capability loading screen
export const DeviceCapabilityLoader: React.FC<{
  onCapabilitiesDetected?: (capabilities: any) => void
}> = ({ onCapabilitiesDetected }) => {
  const [detectionStage, setDetectionStage] = useState(0)
  const [capabilities, setCapabilities] = useState<any>({})
  
  const detectionStages = [
    { name: 'Device Detection', icon: Monitor },
    { name: 'WebGL Support', icon: Eye },
    { name: 'Network Status', icon: Wifi },
    { name: 'Audio Support', icon: Volume2 },
    { name: 'Performance Check', icon: RefreshCw }
  ]
  
  useEffect(() => {
    const detectCapabilities = async () => {
      for (let i = 0; i < detectionStages.length; i++) {
        setDetectionStage(i)
        await new Promise(resolve => setTimeout(resolve, 500))
        
        // Simulate capability detection
        switch (i) {
          case 0:
            setCapabilities((prev: any) => ({ ...prev, device: 'desktop' }))
            break
          case 1:
            setCapabilities((prev: any) => ({ ...prev, webgl: true }))
            break
          case 2:
            setCapabilities((prev: any) => ({ ...prev, online: navigator.onLine }))
            break
          case 3:
            setCapabilities((prev: any) => ({ ...prev, audio: true }))
            break
          case 4:
            setCapabilities((prev: any) => ({ ...prev, performance: 'high' }))
            break
        }
      }
      
      onCapabilitiesDetected?.(capabilities)
    }
    
    detectCapabilities()
  }, [onCapabilitiesDetected])
  
  return (
    <div className="max-w-md mx-auto p-6">
      <div className="text-center mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Optimizing for Your Device
        </h3>
        <p className="text-sm text-gray-600">
          Detecting capabilities for the best experience
        </p>
      </div>
      
      <div className="space-y-3">
        {detectionStages.map((stage, index) => {
          const Icon = stage.icon
          const isActive = index === detectionStage
          const isComplete = index < detectionStage
          
          return (
            <div
              key={index}
              className={`flex items-center p-3 rounded-lg transition-all duration-300 ${
                isActive
                  ? 'bg-blue-100 border-2 border-blue-300'
                  : isComplete
                  ? 'bg-green-100 border-2 border-green-300'
                  : 'bg-gray-100 border-2 border-gray-200'
              }`}
            >
              <div className={`p-2 rounded-full mr-3 ${
                isActive
                  ? 'bg-blue-500 animate-pulse'
                  : isComplete
                  ? 'bg-green-500'
                  : 'bg-gray-400'
              }`}>
                <Icon className="w-4 h-4 text-white" />
              </div>
              <span className={`font-medium ${
                isActive
                  ? 'text-blue-800'
                  : isComplete
                  ? 'text-green-800'
                  : 'text-gray-600'
              }`}>
                {stage.name}
              </span>
              {isActive && (
                <EnhancedLoadingSpinner className="ml-auto" size="sm" />
              )}
              {isComplete && (
                <div className="ml-auto w-5 h-5 rounded-full bg-green-500 flex items-center justify-center">
                  <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// Offline indicator
export const OfflineIndicator: React.FC<{
  isOnline: boolean
  onRetry?: () => void
}> = ({ isOnline, onRetry }) => {
  if (isOnline) return null
  
  return (
    <div className="fixed top-4 right-4 z-50 bg-red-500 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2">
      <WifiOff className="w-4 h-4" />
      <span className="text-sm font-medium">Offline</span>
      {onRetry && (
        <button
          onClick={onRetry}
          className="ml-2 px-2 py-1 bg-red-600 hover:bg-red-700 rounded text-xs transition-colors"
        >
          Retry
        </button>
      )}
    </div>
  )
}

// Accessibility loading state
export const AccessibleLoader: React.FC<{
  message: string
  progress?: number
  isVisible?: boolean
}> = ({ message, progress, isVisible = true }) => {
  return (
    <div 
      className={`flex flex-col items-center justify-center p-8 ${isVisible ? '' : 'sr-only'}`}
      role="status"
      aria-live="polite"
      aria-label={`Loading: ${message}`}
    >
      <div className="relative">
        <div className="w-12 h-12 border-4 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
        <span className="sr-only">Loading...</span>
      </div>
      
      <div className="mt-4 text-center">
        <p className="text-lg font-medium text-gray-900">{message}</p>
        {progress !== undefined && (
          <>
            <div className="mt-2 w-64 bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
                aria-label={`Progress: ${progress}%`}
              />
            </div>
            <span className="sr-only">Progress: {progress}%</span>
          </>
        )}
      </div>
    </div>
  )
}

// WebGL Recovery Loading Component
export const WebGLRecoveryLoader: React.FC<{
  isRecovering: boolean
  recoveryStage: string
  progress: number
  onManualRetry?: () => void
  onFallback?: () => void
  showDiagnostics?: boolean
}> = ({ 
  isRecovering, 
  recoveryStage, 
  progress, 
  onManualRetry, 
  onFallback,
  showDiagnostics = true
}) => {
  const { diagnostics } = useWebGLRecovery()
  const [showDetails, setShowDetails] = useState(false)
  
  if (!isRecovering) return null
  
  return (
    <div 
      className="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center"
      style={{ 
        // Ensure it doesn't interfere with Canvas
        pointerEvents: 'auto',
        isolation: 'isolate'
      }}
    >
      <div className="max-w-md w-full mx-4 bg-gray-900/95 border border-blue-500/30 rounded-lg p-6 shadow-2xl">
        <div className="text-center">
          {/* Recovery Icon */}
          <div className="bg-blue-500/20 p-4 rounded-full w-20 h-20 mx-auto mb-4">
            <RefreshCw className="h-12 w-12 text-blue-400 animate-spin" />
          </div>
          
          <h2 className="text-2xl font-bold text-blue-100 mb-2">
            WebGL Recovery
          </h2>
          
          <p className="text-blue-200 mb-4">
            {recoveryStage || 'Restoring 3D rendering capabilities...'}
          </p>
          
          {/* Progress Bar */}
          <div className="w-full bg-gray-700 rounded-full h-2 mb-4">
            <div 
              className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          
          <div className="text-sm text-gray-400 mb-4">
            Recovery Progress: {progress}%
          </div>
          
          {/* Diagnostics Toggle */}
          {showDiagnostics && (
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="flex items-center gap-2 mx-auto mb-4 text-sm text-blue-400 hover:text-blue-300 transition-colors"
            >
              <Settings className="h-4 w-4" />
              {showDetails ? 'Hide Details' : 'Show Details'}
            </button>
          )}
          
          {/* Detailed Diagnostics */}
          {showDetails && diagnostics && (
            <div className="bg-black/30 border border-gray-600 rounded-lg p-4 mb-4 text-left">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Context State:</span>
                  <span className="text-white font-mono">{diagnostics.currentState}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Quality Level:</span>
                  <span className="text-white font-mono">{diagnostics.qualityLevel}/4</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Loss Risk:</span>
                  <span className={`font-mono ${
                    diagnostics.contextLossRisk === 'high' ? 'text-red-400' :
                    diagnostics.contextLossRisk === 'medium' ? 'text-yellow-400' :
                    'text-green-400'
                  }`}>
                    {diagnostics.contextLossRisk.toUpperCase()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Memory Usage:</span>
                  <span className="text-white font-mono">{diagnostics.memoryUsage.toFixed(1)} MB</span>
                </div>
              </div>
            </div>
          )}
          
          {/* Action Buttons */}
          <div className="flex flex-col gap-2">
            {onManualRetry && (
              <button
                onClick={onManualRetry}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
              >
                Manual Retry
              </button>
            )}
            {onFallback && (
              <button
                onClick={onFallback}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors"
              >
                Switch to 2D Fallback
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// Canvas-Safe Loading Overlay
export const CanvasSafeLoader: React.FC<{
  isLoading: boolean
  message?: string
  children?: React.ReactNode
  preventCanvasInterference?: boolean
}> = ({ 
  isLoading, 
  message = 'Loading...', 
  children,
  preventCanvasInterference = true
}) => {
  if (!isLoading) return <>{children}</>
  
  return (
    <div className="relative">
      {children}
      <div 
        className="absolute inset-0 z-40 bg-black/60 backdrop-blur-sm flex items-center justify-center"
        style={{
          // Prevent interference with WebGL Canvas
          isolation: preventCanvasInterference ? 'isolate' : 'auto',
          pointerEvents: 'auto',
          // Ensure proper stacking context
          transform: 'translateZ(0)'
        }}
      >
        <div className="text-center text-white">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400 mx-auto mb-4"></div>
          <p className="text-lg font-medium">{message}</p>
        </div>
      </div>
    </div>
  )
}

// Dragon System Status Indicator
export const DragonSystemStatus: React.FC<{
  webglState: 'loading' | 'active' | 'recovering' | 'failed'
  performanceScore?: number
  contextLossRisk?: 'low' | 'medium' | 'high'
  compact?: boolean
}> = ({ 
  webglState, 
  performanceScore = 0, 
  contextLossRisk = 'low',
  compact = false
}) => {
  const getStateIcon = () => {
    switch (webglState) {
      case 'loading':
        return <RefreshCw className="h-4 w-4 animate-spin text-blue-400" />
      case 'active':
        return <Zap className="h-4 w-4 text-green-400" />
      case 'recovering':
        return <Activity className="h-4 w-4 animate-pulse text-yellow-400" />
      case 'failed':
        return <AlertCircle className="h-4 w-4 text-red-400" />
    }
  }
  
  const getStateColor = () => {
    switch (webglState) {
      case 'loading':
        return 'border-blue-500/30 bg-blue-900/20'
      case 'active':
        return 'border-green-500/30 bg-green-900/20'
      case 'recovering':
        return 'border-yellow-500/30 bg-yellow-900/20'
      case 'failed':
        return 'border-red-500/30 bg-red-900/20'
    }
  }
  
  if (compact) {
    return (
      <div className={`inline-flex items-center gap-2 px-2 py-1 rounded border ${getStateColor()}`}>
        {getStateIcon()}
        <span className="text-xs font-medium capitalize">{webglState}</span>
      </div>
    )
  }
  
  return (
    <div className={`p-3 rounded-lg border ${getStateColor()}`}>
      <div className="flex items-center gap-2 mb-2">
        {getStateIcon()}
        <span className="font-medium capitalize">{webglState} State</span>
      </div>
      
      {performanceScore > 0 && (
        <div className="text-sm text-gray-300 mb-1">
          Performance: {performanceScore.toFixed(1)}%
        </div>
      )}
      
      {contextLossRisk !== 'low' && (
        <div className="flex items-center gap-1 text-sm">
          <AlertCircle className={`h-3 w-3 ${
            contextLossRisk === 'high' ? 'text-red-400' : 'text-yellow-400'
          }`} />
          <span className={contextLossRisk === 'high' ? 'text-red-300' : 'text-yellow-300'}>
            Risk: {contextLossRisk.toUpperCase()}
          </span>
        </div>
      )}
    </div>
  )
}

export default {
  EnhancedLoadingSpinner,
  DragonLoadingAnimation,
  ProgressiveLoader,
  DeviceCapabilityLoader,
  OfflineIndicator,
  AccessibleLoader,
  WebGLRecoveryLoader,
  CanvasSafeLoader,
  DragonSystemStatus
}
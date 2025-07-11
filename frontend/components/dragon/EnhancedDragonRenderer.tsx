/**
 * Enhanced Dragon Renderer with Model Configuration System
 * 
 * This component integrates the new dragon model configuration system
 * with the existing DragonRenderer for seamless backwards compatibility
 * and enhanced performance optimization.
 */

'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { DragonRenderer, VoiceAnimationState } from './DragonRenderer'
import { 
  useDragonModelConfiguration,
  EnhancedDragonRendererProps as BaseEnhancedDragonRendererProps,
  SmartModelSelector,
  ModelPerformanceOptimizer
} from '@utils/dragonModelUtils'
import { 
  DragonModelConfig,
  getOptimalQualitySettings,
  DeviceCapabilityDetector,
  createFallbackChain
} from '@config/dragonModels'
import { logger } from '@lib/logger'

// Extended props combining old and new systems
export interface EnhancedDragonRendererProps extends BaseEnhancedDragonRendererProps {
  // Legacy props for backward compatibility
  modelPath?: string
  lowQualityModel?: string
  highQualityModel?: string
  enableProgressiveLoading?: boolean
  isProgressiveLoading?: boolean
  isLoadingHighQuality?: boolean
  
  // Enhanced configuration props
  enableSmartSelection?: boolean
  enableAutoOptimization?: boolean
  enableAdaptiveQuality?: boolean
  performanceTarget?: 'battery' | 'balanced' | 'performance'
  
  // Debug and monitoring
  enableDebugInfo?: boolean
  onDebugInfo?: (info: any) => void
  
  // Additional props for compatibility
  onError?: (error: Error, type: string) => void
  performanceMonitorPosition?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
  onFallback?: (fromType: string, toType: string) => void
  onProgressiveLoadComplete?: () => void
  enableErrorRecovery?: boolean
  maxErrorRetries?: number
}

// Performance target configurations
const PERFORMANCE_TARGETS = {
  battery: {
    targetFPS: 30,
    maxMemoryMB: 32,
    preferredQuality: 'low' as const,
    enableEffects: false
  },
  balanced: {
    targetFPS: 45,
    maxMemoryMB: 64,
    preferredQuality: 'medium' as const,
    enableEffects: true
  },
  performance: {
    targetFPS: 60,
    maxMemoryMB: 128,
    preferredQuality: 'high' as const,
    enableEffects: true
  }
}

export const EnhancedDragonRenderer: React.FC<EnhancedDragonRendererProps> = (allProps) => {
  // Extract enhanced props with defaults
  const {
    // Legacy props
    modelPath,
    lowQualityModel,
    highQualityModel,
    enableProgressiveLoading = false,
    
    // Enhanced props
    enableSmartSelection = true,
    enableAutoOptimization = true,
    enableAdaptiveQuality = true,
    performanceTarget = 'balanced',
    enableDebugInfo = false,
    onDebugInfo,
    
    // Other enhanced props we need to filter out
    preferredQuality,
    useCase,
    modelId,
    enablePreloading,
    preloadStrategy,
    enablePerformanceOptimization,
    performanceThreshold,
    onPerformanceChange,
    onModelSelected,
    onModelLoaded,
    onModelError,
    onFallbackTriggered,
    onError,
    
    // DragonRenderer props that we need to pass through
    size,
    voiceState,
    enableAnimations,
    className,
    dragonType,
    enableFallback,
    fallbackType,
    enablePerformanceMonitor,
    performanceMonitorPosition,
    onFallback,
    onProgressiveLoadComplete,
    enableErrorRecovery,
    maxErrorRetries,
    
    // Any remaining props
    ...restProps
  } = allProps
  // State management
  const [currentModelPath, setCurrentModelPath] = useState<string | null>(null)
  const [currentQuality, setCurrentQuality] = useState<any>(null)
  const [performanceMetrics, setPerformanceMetrics] = useState<any>(null)
  const [debugInfo, setDebugInfo] = useState<any>(null)
  const [isOptimizing, setIsOptimizing] = useState(false)
  
  // Refs for performance monitoring
  const performanceRef = useRef<{
    frameCount: number
    lastFrameTime: number
    fpsHistory: number[]
  }>({
    frameCount: 0,
    lastFrameTime: performance.now(),
    fpsHistory: []
  })
  
  // Use the new model configuration system
  const {
    selectedModel,
    qualitySettings,
    isLoading,
    error,
    performanceMetrics: configMetrics,
    fallbackChain
  } = useDragonModelConfiguration({
    ...allProps,
    enableSmartSelection,
    enablePerformanceOptimization: enableAutoOptimization,
    enablePreloading: true,
    preferredQuality: preferredQuality || PERFORMANCE_TARGETS[performanceTarget].preferredQuality,
    onModelSelected: (model) => {
      setCurrentModelPath(model.path)
      if (onModelSelected) {
        onModelSelected(model)
      }
    },
    onModelError: (error, model) => {
      logger.error('Enhanced Dragon Renderer model error:', error)
      if (onModelError) {
        onModelError(error, model)
      }
    },
    onFallbackTriggered: (fromModel, toModel) => {
      logger.info(`Dragon model fallback: ${fromModel.displayName} → ${toModel.displayName}`)
      if (onFallbackTriggered) {
        onFallbackTriggered(fromModel, toModel)
      }
    }
  })
  
  // Performance monitoring
  useEffect(() => {
    if (!enableAutoOptimization) return
    
    const monitorPerformance = () => {
      const now = performance.now()
      const deltaTime = now - performanceRef.current.lastFrameTime
      const fps = 1000 / deltaTime
      
      performanceRef.current.frameCount++
      performanceRef.current.lastFrameTime = now
      performanceRef.current.fpsHistory.push(fps)
      
      // Keep only last 60 frames for average
      if (performanceRef.current.fpsHistory.length > 60) {
        performanceRef.current.fpsHistory.shift()
      }
      
      const averageFPS = performanceRef.current.fpsHistory.reduce((a, b) => a + b, 0) / performanceRef.current.fpsHistory.length
      
      setPerformanceMetrics({
        currentFPS: fps,
        averageFPS,
        frameCount: performanceRef.current.frameCount,
        targetFPS: PERFORMANCE_TARGETS[performanceTarget].targetFPS
      })
      
      // Auto-optimization logic
      if (performanceRef.current.frameCount > 60) { // Wait for stabilization
        const targetFPS = PERFORMANCE_TARGETS[performanceTarget].targetFPS
        
        if (averageFPS < targetFPS * 0.8 && !isOptimizing) {
          optimizePerformance(averageFPS)
        }
      }
    }
    
    const interval = setInterval(monitorPerformance, 1000 / 60) // 60 FPS monitoring
    return () => clearInterval(interval)
  }, [enableAutoOptimization, performanceTarget, isOptimizing])
  
  // Adaptive quality adjustment
  const optimizePerformance = useCallback(async (currentFPS: number) => {
    if (!selectedModel || !enableAdaptiveQuality) return
    
    setIsOptimizing(true)
    
    try {
      const optimizer = ModelPerformanceOptimizer.getInstance()
      const result = await optimizer.optimizeModel(selectedModel, currentFPS)
      
      if (result.model.id !== selectedModel.id) {
        // Model fallback was triggered
        setCurrentModelPath(result.model.path)
        logger.info(`Performance optimization triggered model change: ${selectedModel.displayName} → ${result.model.displayName}`)
      }
      
      setCurrentQuality(result.qualitySettings)
      
    } catch (error) {
      logger.error('Performance optimization failed:', error)
    } finally {
      setIsOptimizing(false)
    }
  }, [selectedModel, enableAdaptiveQuality])
  
  // Debug info collection
  useEffect(() => {
    if (!enableDebugInfo) return
    
    const debugData = {
      selectedModel: selectedModel ? {
        id: selectedModel.id,
        displayName: selectedModel.displayName,
        quality: selectedModel.quality,
        fileSize: selectedModel.fileSize,
        memoryUsage: selectedModel.performance.memoryUsageMB
      } : null,
      qualitySettings: currentQuality || qualitySettings,
      performanceMetrics,
      fallbackChain: fallbackChain.map(model => ({
        id: model.id,
        displayName: model.displayName,
        quality: model.quality
      })),
      isOptimizing,
      performanceTarget,
      enabledFeatures: {
        smartSelection: enableSmartSelection,
        autoOptimization: enableAutoOptimization,
        adaptiveQuality: enableAdaptiveQuality
      }
    }
    
    setDebugInfo(debugData)
    
    if (onDebugInfo) {
      onDebugInfo(debugData)
    }
  }, [
    selectedModel,
    qualitySettings,
    currentQuality,
    performanceMetrics,
    fallbackChain,
    isOptimizing,
    performanceTarget,
    enableSmartSelection,
    enableAutoOptimization,
    enableAdaptiveQuality,
    enableDebugInfo,
    onDebugInfo
  ])
  
  // Legacy model path handling
  useEffect(() => {
    if (!enableSmartSelection && modelPath) {
      setCurrentModelPath(modelPath)
    }
  }, [enableSmartSelection, modelPath])
  
  // Determine final model path
  const finalModelPath = enableSmartSelection 
    ? currentModelPath || selectedModel?.path
    : modelPath || currentModelPath
  
  // Enhanced error handling
  const handleError = useCallback((error: Error, type: string) => {
    logger.error('Enhanced Dragon Renderer error:', error)
    
    // If using smart selection, try fallback
    if (enableSmartSelection && selectedModel && fallbackChain.length > 1) {
      const nextModel = fallbackChain[1]
      if (nextModel) {
        setCurrentModelPath(nextModel.path)
        logger.info(`Error recovery: switching to fallback model ${nextModel.displayName}`)
      }
    }
    
    // Call error handler if available
    if (onError) {
      onError(error, type)
    }
  }, [enableSmartSelection, selectedModel, fallbackChain, onError])
  
  // Loading state
  if (isLoading && enableSmartSelection) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin text-4xl mb-2">🐉</div>
          <div className="text-sm text-gray-600">Optimizing dragon model...</div>
        </div>
      </div>
    )
  }
  
  // Error state
  if (error && enableSmartSelection) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center text-red-500">
          <div className="text-4xl mb-2">⚠️</div>
          <div className="text-sm">Dragon model error</div>
          <div className="text-xs mt-1">{error.message}</div>
        </div>
      </div>
    )
  }
  
  return (
    <div className="relative w-full h-full">
      {/* Main Dragon Renderer */}
      <DragonRenderer
        size={size}
        voiceState={voiceState}
        enableAnimations={enableAnimations}
        className={className}
        dragonType={dragonType}
        enableFallback={enableFallback}
        fallbackType={fallbackType}
        performanceMonitorPosition={performanceMonitorPosition}
        onFallback={onFallback}
        onProgressiveLoadComplete={onProgressiveLoadComplete}
        enableErrorRecovery={enableErrorRecovery}
        maxErrorRetries={maxErrorRetries}
        modelPath={finalModelPath || undefined}
        lowQualityModel={lowQualityModel}
        highQualityModel={highQualityModel}
        enableProgressiveLoading={enableProgressiveLoading}
        onError={handleError}
        enablePerformanceMonitor={enableDebugInfo || enablePerformanceMonitor}
      />
      
      {/* Performance Overlay */}
      {enableDebugInfo && performanceMetrics && (
        <div className="absolute top-2 right-2 bg-black/75 text-white text-xs p-2 rounded">
          <div className="font-semibold mb-1">Performance</div>
          <div>FPS: {performanceMetrics.currentFPS.toFixed(1)}</div>
          <div>Avg: {performanceMetrics.averageFPS.toFixed(1)}</div>
          <div>Target: {performanceMetrics.targetFPS}</div>
          {isOptimizing && (
            <div className="text-yellow-400 mt-1">Optimizing...</div>
          )}
        </div>
      )}
      
      {/* Model Info Overlay */}
      {enableDebugInfo && selectedModel && (
        <div className="absolute bottom-2 left-2 bg-black/75 text-white text-xs p-2 rounded max-w-xs">
          <div className="font-semibold mb-1">Model Info</div>
          <div>Name: {selectedModel.displayName}</div>
          <div>Quality: {selectedModel.quality}</div>
          <div>Memory: {selectedModel.performance.memoryUsageMB} MB</div>
          <div>Complexity: {selectedModel.performance.renderComplexity}/10</div>
          {currentQuality && (
            <div className="mt-1 pt-1 border-t border-gray-600">
              <div className="text-yellow-400">Quality Settings</div>
              <div>Texture: {currentQuality.textureSize}px</div>
              <div>Shadows: {currentQuality.shadowQuality}</div>
              <div>AA: {currentQuality.antialiasingLevel}x</div>
            </div>
          )}
        </div>
      )}
      
      {/* Fallback Chain Info */}
      {enableDebugInfo && fallbackChain && fallbackChain.length > 1 && (
        <div className="absolute bottom-2 right-2 bg-black/75 text-white text-xs p-2 rounded max-w-xs">
          <div className="font-semibold mb-1">Fallback Chain</div>
          {fallbackChain.slice(0, 3).map((model, index) => (
            <div key={model.id} className={`flex items-center gap-1 ${index === 0 ? 'text-green-400' : 'text-gray-400'}`}>
              <div className="w-2 h-2 rounded-full bg-current"></div>
              <span>{model.displayName}</span>
            </div>
          ))}
          {fallbackChain.length > 3 && (
            <div className="text-gray-500">... +{fallbackChain.length - 3} more</div>
          )}
        </div>
      )}
    </div>
  )
}

// Example usage component
export const EnhancedDragonRendererExample: React.FC = () => {
  const [voiceState, setVoiceState] = useState<VoiceAnimationState>({
    isListening: false,
    isSpeaking: false,
    isProcessing: false,
    isIdle: true,
    volume: 0
  })
  
  const [performanceTarget, setPerformanceTarget] = useState<'battery' | 'balanced' | 'performance'>('balanced')
  const [debugInfo, setDebugInfo] = useState<any>(null)
  
  const handleVoiceStateChange = (newState: Partial<VoiceAnimationState>) => {
    setVoiceState(prev => ({ ...prev, ...newState }))
  }
  
  return (
    <div className="w-full h-screen bg-gray-900 flex flex-col">
      {/* Controls */}
      <div className="p-4 bg-gray-800 text-white">
        <h1 className="text-xl font-bold mb-4">Enhanced Dragon Renderer</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Performance Target */}
          <div>
            <label className="block text-sm font-medium mb-2">Performance Target</label>
            <select 
              value={performanceTarget} 
              onChange={(e) => setPerformanceTarget(e.target.value as any)}
              className="w-full p-2 bg-gray-700 rounded"
            >
              <option value="battery">Battery (30 FPS)</option>
              <option value="balanced">Balanced (45 FPS)</option>
              <option value="performance">Performance (60 FPS)</option>
            </select>
          </div>
          
          {/* Voice State Controls */}
          <div>
            <label className="block text-sm font-medium mb-2">Voice State</label>
            <div className="flex gap-2">
              <button
                onClick={() => handleVoiceStateChange({ isListening: !voiceState.isListening, isSpeaking: false, isIdle: false })}
                className={`px-3 py-1 rounded text-sm ${voiceState.isListening ? 'bg-blue-600' : 'bg-gray-600'}`}
              >
                Listen
              </button>
              <button
                onClick={() => handleVoiceStateChange({ isSpeaking: !voiceState.isSpeaking, isListening: false, isIdle: false })}
                className={`px-3 py-1 rounded text-sm ${voiceState.isSpeaking ? 'bg-green-600' : 'bg-gray-600'}`}
              >
                Speak
              </button>
              <button
                onClick={() => handleVoiceStateChange({ isIdle: true, isListening: false, isSpeaking: false })}
                className={`px-3 py-1 rounded text-sm ${voiceState.isIdle ? 'bg-yellow-600' : 'bg-gray-600'}`}
              >
                Idle
              </button>
            </div>
          </div>
          
          {/* Debug Info */}
          <div>
            <label className="block text-sm font-medium mb-2">Debug Info</label>
            <div className="text-xs">
              {debugInfo && (
                <div>
                  <div>Model: {debugInfo.selectedModel?.displayName || 'None'}</div>
                  <div>Quality: {debugInfo.selectedModel?.quality || 'N/A'}</div>
                  <div>FPS: {debugInfo.performanceMetrics?.averageFPS?.toFixed(1) || 'N/A'}</div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Dragon Renderer */}
      <div className="flex-1 relative">
        <EnhancedDragonRenderer
          size="lg"
          voiceState={voiceState}
          enableAnimations={true}
          enableSmartSelection={true}
          enableAutoOptimization={true}
          enableAdaptiveQuality={true}
          performanceTarget={performanceTarget}
          enableDebugInfo={true}
          enablePreloading={true}
          preloadStrategy="moderate"
          useCase="voice-interface"
          onDebugInfo={setDebugInfo}
          onModelSelected={(model) => {
            console.log('Model selected:', model.displayName)
          }}
          onFallbackTriggered={(from, to) => {
            console.log('Fallback triggered:', from.displayName, '→', to.displayName)
          }}
        />
      </div>
    </div>
  )
}

export default EnhancedDragonRenderer
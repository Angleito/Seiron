import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { AlertTriangle } from 'lucide-react'
import { VoiceAnimationState } from '../../components/dragon/DragonRenderer'
import { usePerformanceMonitor } from '../../hooks/usePerformanceMonitor'
import { DragonMemoryManager } from '../../utils/dragonMemoryManager'
import { DeviceCompatibilityBoundary } from '../../components/error-boundaries/DeviceCompatibilityBoundary'
import { 
  CompositeErrorBoundary, 
  PerformanceErrorBoundary
} from '../../components/error-boundaries'
import { useWebGLRecovery } from '../../utils/webglRecovery'
import { DragonLoadingAnimation } from '../../components/loading/LoadingStates'

// New GLTF loading patterns and error boundaries
import { DragonModelManager, useDragonModelManager } from '../../components/dragon/DragonModelManager'

// New performance tracking imports - temporarily commented out for debugging
// import { useModelPerformanceTracking } from '../../hooks/useModelPerformanceTracking'
import { 
  DRAGON_MODELS, 
  getRecommendedModel,
  createFallbackChain,
  DragonModelConfig
} from '../../config/dragonModels'
import { logger } from '@lib/logger'

interface WebGLCapabilities {
  webgl: boolean
  webgl2: boolean
  maxTextureSize: number
  maxVertexUniforms: number
  maxFragmentUniforms: number
  extensions: string[]
  devicePixelRatio: number
  maxViewportDims: [number, number]
  maxRenderbufferSize: number
  maxCombinedTextureImageUnits: number
}

interface DeviceCapabilities {
  isMobile: boolean
  isTablet: boolean
  isLowEnd: boolean
  supportsWebGL2: boolean
  maxTextureSize: number
  concurrency: number
  memoryEstimate: number
  touchSupport: boolean
  hasBattery: boolean
  connectionType: string
  cpuCores: number
}

// Using DragonModelConfig from config/dragonModels.ts instead of local interface

interface QualitySettings {
  resolution: number
  antialiasing: boolean
  shadows: boolean
  particles: boolean
  lighting: 'basic' | 'enhanced' | 'full'
  animations: boolean
  fog: boolean
  postProcessing: boolean
  maxLights: number
  shadowMapSize: number
}

interface PerformanceState {
  quality: 'low' | 'medium' | 'high' | 'ultra'
  autoOptimize: boolean
  fpsCap: number
  memoryLimit: number
  adaptiveQuality: boolean
  lastOptimization: number
}

// Using comprehensive DRAGON_MODELS from config/dragonModels.ts
// Legacy models are now replaced with the new configuration system

// Enhanced 3D WebGL Dragon Demo with Production Optimizations
export default function WebGL3DPage() {
  // CRITICAL FIX: ALL HOOKS MUST BE CALLED AT THE TOP LEVEL BEFORE ANY CONDITIONAL LOGIC
  
  // Core state
  const [voiceState, setVoiceState] = useState<VoiceAnimationState>({
    isListening: false,
    isSpeaking: false,
    isProcessing: false,
    isIdle: true,
    volume: 0,
    emotion: 'calm'
  })
  
  // System capabilities
  const [capabilities, setCapabilities] = useState<WebGLCapabilities | null>(null)
  const [deviceCapabilities] = useState<DeviceCapabilities | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [isInitialized, setIsInitialized] = useState(false)
  
  // Performance state
  const [performanceState, setPerformanceState] = useState<PerformanceState>({
    quality: 'high',
    autoOptimize: true,
    fpsCap: 60,
    memoryLimit: 512 * 1024 * 1024, // 512MB
    adaptiveQuality: true,
    lastOptimization: 0
  })
  
  // Quality settings
  const [qualitySettings, setQualitySettings] = useState<QualitySettings>({
    resolution: 1,
    antialiasing: true,
    shadows: true,
    particles: true,
    lighting: 'full',
    animations: true,
    fog: true,
    postProcessing: true,
    maxLights: 8,
    shadowMapSize: 2048
  })
  
  // UI state
  const [showPerformanceMonitor, setShowPerformanceMonitor] = useState(false)
  const [dragonSize, setDragonSize] = useState<'sm' | 'md' | 'lg' | 'xl' | 'gigantic'>('lg')
  
  // Model management state (using new DragonModelManager)
  const [selectedModelId, setSelectedModelId] = useState('seiron-primary')
  const [modelLoading, setModelLoading] = useState(false)
  const [modelError, setModelError] = useState<string | null>(null)
  const [recommendedModel, setRecommendedModel] = useState<DragonModelConfig | null>(null)
  const [fallbackChain, setFallbackChain] = useState<DragonModelConfig[]>([])
  
  // Refs - must be called before any conditional logic
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const memoryManagerRef = useRef(DragonMemoryManager.getInstance())
  const performanceCheckIntervalRef = useRef<NodeJS.Timeout>()
  
  // WebGL Recovery integration - must be called before any conditional logic
  const {
    diagnostics: webglDiagnostics,
    isRecovering: isWebGLRecovering,
    forceRecovery: manualWebGLRecover
  } = useWebGLRecovery()
  
  // Model recommendation engine and dragon model manager - must be called before any conditional logic
  const dragonModelManager = useDragonModelManager(selectedModelId)
  
  // Initialize performance tracking hook - must be called before any conditional logic
  // Temporarily commented out for debugging
  /* const performanceTracking = useModelPerformanceTracking({
    enabled: true,
    sampleRate: 2,
    historySize: 300,
    autoOptimization: performanceState.autoOptimize,
    alertThresholds: {
      lowFps: 30,
      highMemory: performanceState.memoryLimit,
      slowLoadTime: 5000,
      highErrorRate: 0.1
    },
    modelList: Object.values(DRAGON_MODELS),
    enablePredictiveAnalysis: true
  }) */
  
  // Enhanced auto-optimization with new performance tracking - must be called before any conditional logic
  const optimizeQualitySettings = useCallback((metrics: { fps: number; memoryUsage?: { usedJSHeapSize: number } }) => {
    const { fps, memoryUsage } = metrics
    const currentTime = Date.now()
    
    // Prevent too frequent optimizations
    if (currentTime - performanceState.lastOptimization < 5000) return
    
    let newQuality = performanceState.quality
    let newSettings = { ...qualitySettings }
    
    // Aggressive optimization for poor performance
    if (fps < 20) {
      newQuality = 'low'
      newSettings = {
        ...newSettings,
        resolution: 0.5,
        antialiasing: false,
        shadows: false,
        particles: false,
        lighting: 'basic',
        animations: false,
        fog: false,
        postProcessing: false,
        maxLights: 2,
        shadowMapSize: 512
      }
    } else if (fps < 30) {
      newQuality = 'medium'
      newSettings = {
        ...newSettings,
        resolution: 0.75,
        antialiasing: true,
        shadows: true,
        particles: false,
        lighting: 'enhanced',
        animations: true,
        fog: true,
        postProcessing: false,
        maxLights: 4,
        shadowMapSize: 1024
      }
    } else if (fps > 50 && newQuality !== 'ultra') {
      // Only upgrade if we have good performance headroom
      const memoryOk = !memoryUsage || memoryUsage.usedJSHeapSize < performanceState.memoryLimit * 0.7
      if (memoryOk) {
        newQuality = fps > 55 ? 'ultra' : 'high'
        newSettings = {
          ...newSettings,
          resolution: 1,
          antialiasing: true,
          shadows: true,
          particles: true,
          lighting: 'full',
          animations: true,
          fog: true,
          postProcessing: true,
          maxLights: 8,
          shadowMapSize: 2048
        }
      }
    }
    
    if (newQuality !== performanceState.quality) {
      console.log(`Auto-optimizing quality: ${performanceState.quality} → ${newQuality} (FPS: ${fps})`)
      setPerformanceState(prev => ({ ...prev, quality: newQuality, lastOptimization: currentTime }))
      setQualitySettings(newSettings)
      
      // Update performance tracking with quality change
      // Temporarily commented out for debugging
      /* if (performanceTracking.currentMetrics) {
        performanceTracking.currentMetrics.qualityLevel = newQuality
        performanceTracking.currentMetrics.adaptiveQualityActive = true
        performanceTracking.currentMetrics.qualityReductions += 1
      } */
    }
  }, [performanceState, qualitySettings]) // removed performanceTracking dependency for debugging

  // Performance monitoring (legacy - now enhanced with new tracking) - must be called before any conditional logic
  usePerformanceMonitor({
    enabled: true,
    componentName: 'WebGL3DPage',
    sampleRate: 60,
    onPerformanceWarning: useCallback((metrics: { fps: number; memoryUsage?: { usedJSHeapSize: number } }) => {
      if (performanceState.adaptiveQuality && Date.now() - performanceState.lastOptimization > 5000) {
        console.warn('Performance warning detected:', metrics)
        optimizeQualitySettings(metrics)
        
        // Record warning in new performance tracking system
        // performanceTracking.recordWarning() // temporarily commented out for debugging
      }
    }, [performanceState, optimizeQualitySettings]), // removed performanceTracking dependency for debugging
    warningThreshold: { fps: 30 }
  })

  // Initialize WebGL capabilities and models
  useEffect(() => {
    const initializeWebGL = async () => {
      try {
        setLoading(true)
        
        // Initialize WebGL capabilities
        const canvas = document.createElement('canvas')
        const gl = canvas.getContext('webgl2') || canvas.getContext('webgl')
        
        if (gl) {
          const webglCapabilities: WebGLCapabilities = {
            webgl: !!gl,
            webgl2: !!(canvas.getContext('webgl2')),
            maxTextureSize: gl.getParameter(gl.MAX_TEXTURE_SIZE),
            maxVertexUniforms: gl.getParameter(gl.MAX_VERTEX_UNIFORM_VECTORS),
            maxFragmentUniforms: gl.getParameter(gl.MAX_FRAGMENT_UNIFORM_VECTORS),
            extensions: gl.getSupportedExtensions() || [],
            devicePixelRatio: window.devicePixelRatio || 1,
            maxViewportDims: gl.getParameter(gl.MAX_VIEWPORT_DIMS),
            maxRenderbufferSize: gl.getParameter(gl.MAX_RENDERBUFFER_SIZE),
            maxCombinedTextureImageUnits: gl.getParameter(gl.MAX_COMBINED_TEXTURE_IMAGE_UNITS)
          }
          
          // Set capabilities after a brief delay to show loading
          setTimeout(() => {
            setCapabilities(webglCapabilities)
            setLoading(false)
            setIsInitialized(true)
          }, 1500)
        } else {
          setError('WebGL not supported')
          setLoading(false)
        }
      } catch (error) {
        logger.error('Failed to initialize WebGL:', error)
        setError(error instanceof Error ? error.message : 'WebGL initialization failed')
        setLoading(false)
      }
    }
    
    initializeWebGL()
  }, [])

  // Initialize recommended model and fallback chain
  useEffect(() => {
    const initializeModels = async () => {
      try {
        const recommended = await getRecommendedModel('high', 'primary-display')
        setRecommendedModel(recommended)
        
        const chain = createFallbackChain(selectedModelId)
        setFallbackChain(chain)
      } catch (error) {
        logger.error('Failed to initialize model recommendations:', error)
        // Fallback to ASCII dragon
        const asciiModel = DRAGON_MODELS['dragon-ascii']
        if (asciiModel) {
          setRecommendedModel(asciiModel)
          setFallbackChain([asciiModel])
        }
      }
    }
    
    if (isInitialized) {
      initializeModels()
    }
  }, [selectedModelId, isInitialized])

  // CRITICAL FIX: Comprehensive cleanup on component unmount - Fixed React Error #310
  useEffect(() => {
    return () => {
      try {
        console.log('🧹 WebGL3DPage unmounting - comprehensive cleanup')
        
        // Clear all intervals with error handling
        try {
          if (performanceCheckIntervalRef.current) {
            clearInterval(performanceCheckIntervalRef.current)
            performanceCheckIntervalRef.current = undefined
          }
        } catch (error) {
          console.warn('Error clearing performance interval:', error)
        }
        
        // Stop performance tracking with error handling
        try {
          if (performanceTracking && typeof performanceTracking.stopTracking === 'function') {
            performanceTracking.stopTracking()
          }
        } catch (error) {
          console.warn('Error stopping performance tracking:', error)
        }
        
        // Cleanup Canvas renderer if it exists
        try {
          if (canvasRef.current) {
            const canvas = canvasRef.current
            const context = canvas.getContext('webgl2') || canvas.getContext('webgl')
            
            if (context && !context.isContextLost()) {
              try {
                // Get the Three.js renderer if stored
                const renderer = (context as any)._threeRenderer
                if (renderer && typeof renderer.dispose === 'function') {
                  console.log('🧹 Disposing Three.js renderer')
                  
                  // Dispose renderer and all associated resources
                  renderer.dispose()
                  
                  // Clear render targets
                  if (typeof renderer.setRenderTarget === 'function') {
                    renderer.setRenderTarget(null)
                  }
                  
                  // Clear info
                  if (renderer.info) {
                    renderer.info.memory.geometries = 0
                    renderer.info.memory.textures = 0
                    renderer.info.render.calls = 0
                    renderer.info.render.triangles = 0
                  }
                  
                  // Force context loss if available
                  if (typeof renderer.forceContextLoss === 'function') {
                    renderer.forceContextLoss()
                  }
                }
              } catch (rendererError) {
                console.warn('Error disposing Three.js renderer:', rendererError)
              }
              
              try {
                // Clean up event listeners
                if ((context as any)._contextEventCleanup) {
                  (context as any)._contextEventCleanup()
                }
              } catch (eventError) {
                console.warn('Error cleaning up WebGL event listeners:', eventError)
              }
              
              try {
                // Force context loss for complete cleanup
                const loseContext = context.getExtension('WEBGL_lose_context')
                if (loseContext && typeof loseContext.loseContext === 'function') {
                  loseContext.loseContext()
                }
              } catch (contextError) {
                console.warn('Error forcing WebGL context loss:', contextError)
              }
            }
          }
        } catch (canvasError) {
          console.warn('Error during canvas cleanup:', canvasError)
        }
        
        // Memory manager cleanup with error handling
        try {
          if (memoryManagerRef.current && typeof memoryManagerRef.current.dispose === 'function') {
            memoryManagerRef.current.dispose()
          }
        } catch (memoryError) {
          console.warn('Error disposing memory manager:', memoryError)
        }
        
        // Force garbage collection if available
        try {
          if (typeof window !== 'undefined' && window.gc) {
            window.gc()
          }
        } catch (gcError) {
          console.warn('Error forcing garbage collection:', gcError)
        }
        
        console.log('🧹 WebGL3DPage cleanup complete')
      } catch (error) {
        console.error('🚨 Critical error during WebGL3DPage cleanup:', error)
        // Don't throw - let the component unmount gracefully
      }
    }
  }, []) // Empty dependency array is correct here - cleanup should only run on unmount

  // Get current WebGL state for status display
  const getWebGLState = (): 'loading' | 'active' | 'recovering' | 'failed' => {
    if (loading) return 'loading'
    if (isWebGLRecovering) return 'recovering'
    if (webglDiagnostics?.currentState === 'failed') return 'failed'
    return 'active'
  }
  
  // CRITICAL FIX: Early returns moved to after all hooks are called
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-900 via-red-900 to-orange-900 flex items-center justify-center">
        <DragonLoadingAnimation
          message="Initializing Dragon Engine..."
          showProgress={true}
          progress={50}
          isWebGLRecovering={false}
          showWebGLStatus={true}
          onRetryWebGL={() => window.location.reload()}
        />
      </div>
    )
  }

  if (error || !capabilities?.webgl) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-900 via-red-900 to-orange-900 flex items-center justify-center p-8">
        <div className="bg-red-900/50 border border-red-500 rounded-lg p-8 max-w-md text-center text-white">
          <AlertTriangle className="h-12 w-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-4">Dragon Engine Unavailable</h2>
          <p className="text-red-200 mb-6">
            {error || 'Your device does not support WebGL, which is required for 3D dragon rendering.'}
          </p>
          <div className="text-left bg-black/20 p-4 rounded">
            <h3 className="font-semibold mb-2">Fallback Options:</h3>
            <ul className="text-sm space-y-1">
              <li>• Try a different browser (Chrome, Firefox, Edge)</li>
              <li>• Enable hardware acceleration</li>
              <li>• Update your graphics drivers</li>
              <li>• Use the 2D Sprite Dragons instead</li>
            </ul>
          </div>
        </div>
      </div>
    )
  }

  // Component is ready to render
  if (!isInitialized || !capabilities) {
    return null
  }

  return (
    <CompositeErrorBoundary
      enableAutoRecovery={true}
      enablePerformanceMonitoring={true}
      enableWebGLRecovery={true}
      enableGLTFRecovery={true}
      enableSuspenseRecovery={true}
      maxRetries={3}
      modelPath={recommendedModel?.path || DRAGON_MODELS['dragon-ascii']?.path || ''}
      webglContext={canvasRef.current || undefined}
      onError={(error, errorInfo, errorSource) => {
        console.error('🚨 Composite Error Boundary caught error:', error)
        console.error('📍 Error source:', errorSource)
        console.error('📍 Component stack:', errorInfo.componentStack)
        setError(`${errorSource}: ${error.message}`)
      }}
      onRecovery={(recoveryType) => {
        console.log('✅ Error recovery successful:', recoveryType)
        setError(null)
      }}
    >
      <PerformanceErrorBoundary
        enableAutoRecovery={true}
        enablePerformanceMonitoring={true}
        enableAdaptiveQuality={true}
        maxRetries={2}
        performanceThresholds={{
          minFPS: 20,
          maxMemoryUsage: 0.8,
          maxRenderTime: 50,
          maxLoadTime: 5000,
          maxErrorRate: 0.1
        }}
        onPerformanceDegradation={(metrics) => {
          console.warn('⚠️ Performance degradation detected:', metrics)
          optimizeQualitySettings(metrics)
        }}
        onRecovery={(recoveryType, performanceImpact) => {
          console.log('📈 Performance recovery:', recoveryType, performanceImpact)
        }}
      >
        <DeviceCompatibilityBoundary 
          onDeviceDetected={(caps) => console.log('Device detected:', caps)}
          enableAutoOptimization={true}
        >
          <div className="min-h-screen bg-gradient-to-br from-amber-900 via-red-900 to-orange-900 relative">
            {/* Enhanced content with error boundary integration */}
            <div className="relative z-10 p-6">
              <div className="max-w-7xl mx-auto">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h1 className="text-4xl font-bold text-yellow-400 mb-2">
                      3D WebGL Dragons - Enhanced Error Handling
                    </h1>
                    <p className="text-yellow-200">
                      Comprehensive error boundary system with GLTF, WebGL, and performance recovery
                    </p>
                  </div>
                </div>
                
                <div className="bg-black/20 border border-yellow-500/30 rounded-lg p-4 mb-6">
                  <h3 className="text-lg font-semibold text-yellow-400 mb-3">Enhanced Error Handling Features</h3>
                  <div className="text-sm text-white space-y-2">
                    <div>✅ Composite error boundary with multiple error source detection</div>
                    <div>✅ GLTF loading error recovery with model fallbacks</div>
                    <div>✅ WebGL context recovery and hardware acceleration detection</div>
                    <div>✅ Performance monitoring with adaptive quality adjustment</div>
                    <div>✅ Suspense boundary error handling for async components</div>
                    <div>✅ Automatic error classification and targeted recovery strategies</div>
                    <div>✅ Real-time performance metrics and optimization</div>
                  </div>
                </div>
                
                {/* Performance and Error Status Display */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <div className="bg-black/20 border border-blue-500/30 rounded-lg p-4">
                    <h4 className="text-lg font-semibold text-blue-400 mb-2">System Status</h4>
                    <div className="text-sm text-white space-y-1">
                      <div>WebGL State: {getWebGLState()}</div>
                      <div>Quality Level: {performanceState.quality}</div>
                      <div>Auto-Optimize: {performanceState.autoOptimize ? 'Enabled' : 'Disabled'}</div>
                      <div>Adaptive Quality: {performanceState.adaptiveQuality ? 'Active' : 'Inactive'}</div>
                      <div>Selected Model: {recommendedModel?.displayName || 'Loading...'}</div>
                    </div>
                  </div>
                  
                  <div className="bg-black/20 border border-green-500/30 rounded-lg p-4">
                    <h4 className="text-lg font-semibold text-green-400 mb-2">Error Recovery</h4>
                    <div className="text-sm text-white space-y-1">
                      <div>Composite Boundary: Active</div>
                      <div>Performance Monitoring: Enabled</div>
                      <div>GLTF Recovery: Enabled</div>
                      <div>WebGL Recovery: Enabled</div>
                      <div>Suspense Handling: Enabled</div>
                    </div>
                  </div>
                </div>
                
                {/* Enhanced Model Selection with New System */}
                <div className="bg-black/20 border border-purple-500/30 rounded-lg p-4 mb-6">
                  <h4 className="text-lg font-semibold text-purple-400 mb-3">Dragon Model Selection (New System)</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {Object.values(DRAGON_MODELS).slice(0, 3).map((model) => (
                      <button
                        key={model.id}
                        onClick={() => {
                          setSelectedModelId(model.id)
                          setModelLoading(true)
                          setModelError(null)
                          dragonModelManager.switchModel(model.id, 'user')
                        }}
                        className={`p-3 rounded-lg border transition-colors ${
                          selectedModelId === model.id
                            ? 'bg-purple-600 border-purple-400'
                            : 'bg-purple-800/50 border-purple-600 hover:bg-purple-700/50'
                        }`}
                      >
                        <div className="text-white font-medium">{model.displayName}</div>
                        <div className="text-purple-200 text-sm">{model.description}</div>
                        <div className="text-purple-300 text-xs mt-1">
                          Quality: {model.quality} | Size: {(model.fileSize / (1024 * 1024)).toFixed(1)} MB
                        </div>
                        <div className="text-purple-300 text-xs">
                          Status: {model.status} | Type: {model.type}
                        </div>
                      </button>
                    ))}
                  </div>
                  
                  {/* Model Information Display */}
                  {recommendedModel && (
                    <div className="mt-4 p-3 bg-black/30 rounded-lg">
                      <h5 className="text-purple-300 font-medium mb-2">Current Model: {recommendedModel.displayName}</h5>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-purple-400">Performance:</span>
                          <div className="text-white">{recommendedModel.performance.recommendedFPS} FPS</div>
                        </div>
                        <div>
                          <span className="text-purple-400">Memory:</span>
                          <div className="text-white">{recommendedModel.performance.memoryUsageMB} MB</div>
                        </div>
                        <div>
                          <span className="text-purple-400">Animations:</span>
                          <div className="text-white">{recommendedModel.features.hasAnimations ? 'Yes' : 'No'}</div>
                        </div>
                        <div>
                          <span className="text-purple-400">Voice:</span>
                          <div className="text-white">{recommendedModel.features.hasVoiceIntegration ? 'Yes' : 'No'}</div>
                        </div>
                      </div>
                      
                      {/* Fallback Chain */}
                      {fallbackChain.length > 1 && (
                        <div className="mt-2">
                          <span className="text-purple-400 text-xs">Fallback Chain:</span>
                          <div className="text-xs text-purple-200">
                            {fallbackChain.map(m => m.displayName).join(' → ')}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                
                {/* Dragon Renderer with New System */}
                <div className="bg-black/20 border border-green-500/30 rounded-lg p-4 mb-6">
                  <h4 className="text-lg font-semibold text-green-400 mb-3">3D Dragon Renderer</h4>
                  <div className="relative h-96 bg-black/30 rounded-lg overflow-hidden">
                    {selectedModelId && (
                      <DragonModelManager
                        initialModelId={selectedModelId}
                        voiceState={voiceState}
                        size={dragonSize}
                        enableAnimations={true}
                        enablePreloading={true}
                        enableAutoFallback={true}
                        performanceThreshold={performanceState.quality === 'low' ? 20 : 30}
                        onModelSwitch={(from, to) => {
                          logger.info(`Model switched: ${from.displayName} → ${to.displayName}`)
                        }}
                        onLoadProgress={(progress, modelId) => {
                          console.log(`Loading ${modelId}: ${progress}%`)
                        }}
                        onError={(error, modelId) => {
                          setModelError(`Model ${modelId}: ${error.message}`)
                        }}
                        onFallback={(fromModelId, toModelId) => {
                          console.log(`Fallback triggered: ${fromModelId} → ${toModelId}`)
                        }}
                        className="w-full h-full"
                      />
                    )}
                    
                    {/* Overlay Controls */}
                    <div className="absolute top-2 right-2 space-y-2">
                      <button
                        onClick={() => {
                          const sizes: Array<'sm' | 'md' | 'lg' | 'xl' | 'gigantic'> = ['sm', 'md', 'lg', 'xl', 'gigantic']
                          const currentIndex = sizes.indexOf(dragonSize)
                          const nextSize = sizes[(currentIndex + 1) % sizes.length]
                          if (nextSize) {
                            setDragonSize(nextSize)
                          }
                        }}
                        className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded transition-colors"
                      >
                        Size: {dragonSize}
                      </button>
                      
                      <button
                        onClick={() => {
                          setVoiceState(prev => ({
                            ...prev,
                            isListening: !prev.isListening,
                            isIdle: prev.isListening
                          }))
                        }}
                        className={`px-3 py-1 text-white text-sm rounded transition-colors ${
                          voiceState.isListening 
                            ? 'bg-green-600 hover:bg-green-700' 
                            : 'bg-gray-600 hover:bg-gray-700'
                        }`}
                      >
                        {voiceState.isListening ? 'Listening' : 'Listen'}
                      </button>
                    </div>
                    
                    {/* Error Display */}
                    {modelError && (
                      <div className="absolute bottom-2 left-2 right-2 bg-red-900/80 border border-red-500 rounded p-2">
                        <div className="text-red-300 text-sm">{modelError}</div>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Performance Controls */}
                <div className="bg-black/20 border border-orange-500/30 rounded-lg p-4">
                  <h4 className="text-lg font-semibold text-orange-400 mb-3">Performance Controls</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <button
                      onClick={() => setPerformanceState(prev => ({ 
                        ...prev, 
                        autoOptimize: !prev.autoOptimize 
                      }))}
                      className={`p-2 rounded-lg transition-colors ${
                        performanceState.autoOptimize
                          ? 'bg-green-600 text-white'
                          : 'bg-gray-600 text-gray-300'
                      }`}
                    >
                      Auto-Optimize
                    </button>
                    
                    <button
                      onClick={() => setPerformanceState(prev => ({ 
                        ...prev, 
                        adaptiveQuality: !prev.adaptiveQuality 
                      }))}
                      className={`p-2 rounded-lg transition-colors ${
                        performanceState.adaptiveQuality
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-600 text-gray-300'
                      }`}
                    >
                      Adaptive Quality
                    </button>
                    
                    <button
                      onClick={() => setShowPerformanceMonitor(!showPerformanceMonitor)}
                      className="p-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white transition-colors"
                    >
                      Performance Monitor
                    </button>
                    
                    <button
                      onClick={manualWebGLRecover}
                      className="p-2 rounded-lg bg-orange-600 hover:bg-orange-700 text-white transition-colors"
                    >
                      Force WebGL Recovery
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </DeviceCompatibilityBoundary>
      </PerformanceErrorBoundary>
    </CompositeErrorBoundary>
  )
}
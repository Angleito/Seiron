import React, { useState, useEffect, useRef, Suspense, useCallback, useMemo } from 'react'
import { Play, Pause, RotateCcw, AlertTriangle, CheckCircle, Zap, Eye, Palette, Mic, MicOff, Volume2, Monitor, Cpu, Battery } from 'lucide-react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Environment, Loader } from '@react-three/drei'
import { SeironGLBDragon } from '../../components/dragon/SeironGLBDragon'
import { VoiceAnimationState } from '../../components/dragon/DragonRenderer'
import { usePerformanceMonitor } from '../../hooks/usePerformanceMonitor'
import { DragonMemoryManager } from '../../utils/dragonMemoryManager'
import { PageErrorBoundary } from '../../components/error-boundaries/PageErrorBoundary'

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

// Enhanced 3D WebGL Dragon Demo with Production Optimizations
export default function WebGL3DPage() {
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
  const [deviceCapabilities, setDeviceCapabilities] = useState<DeviceCapabilities | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [isVisible, setIsVisible] = useState(true)
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
  const [showControls, setShowControls] = useState(true)
  const [showPerformanceMonitor, setShowPerformanceMonitor] = useState(false)
  const [dragonSize, setDragonSize] = useState<'sm' | 'md' | 'lg' | 'xl' | 'gigantic'>('lg')
  const [enableDebugMode, setEnableDebugMode] = useState(false)
  
  // Refs
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const memoryManagerRef = useRef(DragonMemoryManager.getInstance())
  const performanceCheckIntervalRef = useRef<NodeJS.Timeout>()
  const lastFrameTimeRef = useRef(0)
  const frameCountRef = useRef(0)
  const adaptiveQualityTimeoutRef = useRef<NodeJS.Timeout>()
  
  // Performance monitoring
  const performanceMonitor = usePerformanceMonitor({
    enabled: true,
    componentName: 'WebGL3DPage',
    sampleRate: 60,
    onPerformanceWarning: useCallback((metrics) => {
      if (performanceState.adaptiveQuality && Date.now() - performanceState.lastOptimization > 5000) {
        console.warn('Performance warning detected:', metrics)
        optimizeQualitySettings(metrics)
      }
    }, [performanceState]),
    warningThreshold: { fps: 30 }
  })

  // Device capability detection
  const detectDeviceCapabilities = useCallback(async (): Promise<DeviceCapabilities> => {
    const navigator = window.navigator as any
    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection
    
    return {
      isMobile: /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent),
      isTablet: /iPad|Android(?!.*Mobile)/i.test(navigator.userAgent),
      isLowEnd: navigator.deviceMemory ? navigator.deviceMemory < 4 : false,
      supportsWebGL2: !!(document.createElement('canvas').getContext('webgl2')),
      maxTextureSize: 2048, // Will be updated from WebGL context
      concurrency: navigator.hardwareConcurrency || 4,
      memoryEstimate: navigator.deviceMemory ? navigator.deviceMemory * 1024 * 1024 * 1024 : 4 * 1024 * 1024 * 1024,
      touchSupport: 'ontouchstart' in window,
      hasBattery: !!(navigator.getBattery),
      connectionType: connection ? connection.effectiveType || 'unknown' : 'unknown',
      cpuCores: navigator.hardwareConcurrency || 4
    }
  }, [])

  // Auto-optimization based on performance metrics
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
    }
  }, [performanceState, qualitySettings])

  // Check WebGL capabilities with enhanced detection
  useEffect(() => {
    const initializeCapabilities = async () => {
      try {
        const canvas = document.createElement('canvas')
        const context = canvas.getContext('webgl') || canvas.getContext('experimental-webgl') as WebGLRenderingContext | null
        
        if (!context) {
          throw new Error('WebGL not supported')
        }

        const caps: WebGLCapabilities = {
          webgl: !!context,
          webgl2: !!canvas.getContext('webgl2'),
          maxTextureSize: context.getParameter(context.MAX_TEXTURE_SIZE),
          maxVertexUniforms: context.getParameter(context.MAX_VERTEX_UNIFORM_VECTORS),
          maxFragmentUniforms: context.getParameter(context.MAX_FRAGMENT_UNIFORM_VECTORS),
          extensions: context.getSupportedExtensions() || [],
          devicePixelRatio: window.devicePixelRatio || 1,
          maxViewportDims: context.getParameter(context.MAX_VIEWPORT_DIMS) || [1920, 1080],
          maxRenderbufferSize: context.getParameter(context.MAX_RENDERBUFFER_SIZE),
          maxCombinedTextureImageUnits: context.getParameter(context.MAX_COMBINED_TEXTURE_IMAGE_UNITS)
        }

        // Detect device capabilities
        const deviceCaps = await detectDeviceCapabilities()
        deviceCaps.maxTextureSize = caps.maxTextureSize

        setCapabilities(caps)
        setDeviceCapabilities(deviceCaps)
        
        // Auto-adjust initial quality based on device capabilities
        let initialQuality: 'low' | 'medium' | 'high' | 'ultra' = 'high'
        let initialSettings = { ...qualitySettings }
        
        if (deviceCaps.isMobile || deviceCaps.isLowEnd) {
          initialQuality = 'low'
          initialSettings = {
            ...initialSettings,
            resolution: 0.5,
            antialiasing: false,
            shadows: false,
            particles: false,
            lighting: 'basic',
            postProcessing: false,
            maxLights: 2,
            shadowMapSize: 512
          }
        } else if (deviceCaps.isTablet || deviceCaps.cpuCores < 4) {
          initialQuality = 'medium'
          initialSettings = {
            ...initialSettings,
            resolution: 0.75,
            antialiasing: true,
            shadows: true,
            particles: false,
            lighting: 'enhanced',
            postProcessing: false,
            maxLights: 4,
            shadowMapSize: 1024
          }
        }
        
        setPerformanceState(prev => ({ ...prev, quality: initialQuality }))
        setQualitySettings(initialSettings)
        setLoading(false)
        setIsInitialized(true)
        
        console.log('WebGL capabilities initialized:', caps)
        console.log('Device capabilities:', deviceCaps)
        console.log('Initial quality:', initialQuality)
        
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown WebGL error')
        setLoading(false)
      }
    }
    
    initializeCapabilities()
  }, [])

  // Performance monitoring with auto-optimization
  useEffect(() => {
    if (!isInitialized || !performanceState.autoOptimize) return
    
    performanceCheckIntervalRef.current = setInterval(() => {
      const metrics = performanceMonitor.metrics
      if (metrics.fps > 0) {
        optimizeQualitySettings(metrics)
      }
    }, 5000) // Check every 5 seconds
    
    return () => {
      if (performanceCheckIntervalRef.current) {
        clearInterval(performanceCheckIntervalRef.current)
      }
    }
  }, [isInitialized, performanceState.autoOptimize, optimizeQualitySettings])

  // Enhanced memory management with progressive cleanup
  useEffect(() => {
    const cleanupMemory = () => {
      const memoryManager = memoryManagerRef.current
      if (memoryManager) {
        const stats = memoryManager.getMemoryStats()
        console.log('Memory cleanup - before:', stats)
        
        // Clean up unused models
        const activeModels = ['/models/seiron.glb']
        memoryManager.cleanupUnusedModels(activeModels)
        
        // Progressive texture cleanup based on memory usage
        if (stats.estimatedMemoryUsage > performanceState.memoryLimit * 0.8) {
          memoryManager.cleanupUnusedTextures([])
          memoryManager.cleanupUnusedGeometries([])
        }
        
        // Force garbage collection if available
        if (window.gc) {
          window.gc()
        }
        
        console.log('Memory cleanup - after:', memoryManager.getMemoryStats())
      }
    }
    
    // Adaptive memory cleanup based on usage
    const memoryCleanupInterval = setInterval(cleanupMemory, 
      deviceCapabilities?.isMobile ? 60 * 1000 : 2 * 60 * 1000 // More frequent on mobile
    )
    
    // Additional cleanup on low memory warning
    const handleMemoryWarning = () => {
      console.warn('Memory warning received, performing aggressive cleanup')
      cleanupMemory()
      // Reduce quality temporarily
      if (performanceState.quality !== 'low') {
        handleQualityChange('low')
      }
    }
    
    // Listen for memory pressure events
    if ('memory' in navigator) {
      (navigator as any).addEventListener('memorywarning', handleMemoryWarning)
    }
    
    return () => {
      clearInterval(memoryCleanupInterval)
      if ('memory' in navigator) {
        (navigator as any).removeEventListener('memorywarning', handleMemoryWarning)
      }
      // Final cleanup on unmount
      cleanupMemory()
    }
  }, [deviceCapabilities, performanceState.memoryLimit, performanceState.quality])

  // Enhanced visibility API with performance optimizations
  useEffect(() => {
    const handleVisibilityChange = () => {
      const isDocumentVisible = !document.hidden
      setIsVisible(isDocumentVisible)
      
      // Aggressive performance optimization when tab is hidden
      if (!isDocumentVisible) {
        // Pause animations and reduce quality
        console.log('Page hidden, pausing dragon animations')
        if (performanceState.autoOptimize) {
          // Temporarily store current quality
          const currentQuality = performanceState.quality
          setTimeout(() => {
            if (document.hidden) {
              // Still hidden after delay, reduce quality
              setPerformanceState(prev => ({ ...prev, quality: 'low' }))
            }
          }, 5000)
        }
      } else {
        // Page is visible again, restore quality
        console.log('Page visible, resuming dragon animations')
        if (performanceState.autoOptimize) {
          // Restore quality based on device capabilities
          const optimalQuality = deviceCapabilities?.isMobile ? 'medium' : 'high'
          setPerformanceState(prev => ({ ...prev, quality: optimalQuality }))
        }
      }
    }
    
    document.addEventListener('visibilitychange', handleVisibilityChange)
    
    // Also listen for window focus/blur for additional optimization
    const handleWindowFocus = () => {
      if (!document.hidden) {
        setIsVisible(true)
      }
    }
    
    const handleWindowBlur = () => {
      // Slight delay to prevent flickering
      setTimeout(() => {
        if (document.hidden) {
          setIsVisible(false)
        }
      }, 100)
    }
    
    window.addEventListener('focus', handleWindowFocus)
    window.addEventListener('blur', handleWindowBlur)
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('focus', handleWindowFocus)
      window.removeEventListener('blur', handleWindowBlur)
    }
  }, [performanceState.autoOptimize, deviceCapabilities])

  // Voice state handlers with performance awareness
  const handleListening = useCallback(() => {
    setVoiceState(prev => ({
      ...prev,
      isListening: !prev.isListening,
      isSpeaking: false,
      isProcessing: false,
      isIdle: false,
      emotion: 'focused'
    }))
  }, [])

  const handleSpeaking = useCallback(() => {
    setVoiceState(prev => ({
      ...prev,
      isListening: false,
      isSpeaking: !prev.isSpeaking,
      isProcessing: false,
      isIdle: false,
      volume: prev.isSpeaking ? 0 : 0.8,
      emotion: 'excited'
    }))
  }, [])

  const handleProcessing = useCallback(() => {
    setVoiceState(prev => ({
      ...prev,
      isListening: false,
      isSpeaking: false,
      isProcessing: !prev.isProcessing,
      isIdle: false,
      emotion: 'focused'
    }))
  }, [])

  const handleReset = useCallback(() => {
    setVoiceState({
      isListening: false,
      isSpeaking: false,
      isProcessing: false,
      isIdle: true,
      volume: 0,
      emotion: 'calm'
    })
  }, [])

  // Quality adjustment handlers
  const handleQualityChange = useCallback((newQuality: 'low' | 'medium' | 'high' | 'ultra') => {
    setPerformanceState(prev => ({ ...prev, quality: newQuality, autoOptimize: false }))
    
    // Update quality settings based on selection
    const qualityPresets: Record<string, QualitySettings> = {
      low: {
        resolution: 0.5,
        antialiasing: false,
        shadows: false,
        particles: false,
        lighting: 'basic',
        animations: true,
        fog: false,
        postProcessing: false,
        maxLights: 2,
        shadowMapSize: 512
      },
      medium: {
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
      },
      high: {
        resolution: 1,
        antialiasing: true,
        shadows: true,
        particles: true,
        lighting: 'full',
        animations: true,
        fog: true,
        postProcessing: true,
        maxLights: 6,
        shadowMapSize: 2048
      },
      ultra: {
        resolution: 1,
        antialiasing: true,
        shadows: true,
        particles: true,
        lighting: 'full',
        animations: true,
        fog: true,
        postProcessing: true,
        maxLights: 8,
        shadowMapSize: 4096
      }
    }
    
    setQualitySettings(qualityPresets[newQuality])
  }, [])

  const toggleAutoOptimize = useCallback(() => {
    setPerformanceState(prev => ({ ...prev, autoOptimize: !prev.autoOptimize }))
  }, [])

  const handleDragonError = useCallback((error: Error) => {
    console.error('Dragon rendering error:', error)
    setError(`Dragon rendering failed: ${error.message}`)
    
    // Auto-downgrade quality on critical errors
    if (performanceState.quality !== 'low') {
      console.log('Auto-downgrading quality due to error')
      handleQualityChange('low')
    }
  }, [performanceState.quality, handleQualityChange])

  // Memoized quality settings for performance
  const memoizedQualitySettings = useMemo(() => qualitySettings, [qualitySettings])
  
  // Memoized canvas props with performance optimizations
  const canvasProps = useMemo(() => ({
    shadows: memoizedQualitySettings.shadows,
    camera: { 
      position: [0, 2, 5], 
      fov: 50,
      near: 0.1,
      far: 1000,
      aspect: window.innerWidth / window.innerHeight
    },
    gl: {
      antialias: memoizedQualitySettings.antialiasing,
      alpha: true,
      powerPreference: deviceCapabilities?.isMobile ? 'low-power' : 'high-performance' as const,
      failIfMajorPerformanceCaveat: false,
      pixelRatio: Math.min(window.devicePixelRatio * memoizedQualitySettings.resolution, 2),
      preserveDrawingBuffer: true, // Better for screenshots and debugging
      premultipliedAlpha: true, // Better alpha blending performance
      stencil: false, // Disable stencil buffer for better performance
      depth: true,
      logarithmicDepthBuffer: false // Better compatibility
    },
    frameloop: isVisible ? 'always' : 'never', // Pause rendering when not visible
    resize: { scroll: false, debounce: { scroll: 50, resize: 0 } },
    performance: {
      current: 1,
      min: 0.5,
      max: 1,
      debounce: 200
    }
  }), [memoizedQualitySettings, deviceCapabilities, isVisible])

  // Early returns for loading and error states
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-900 via-red-900 to-orange-900 flex items-center justify-center">
        <div className="text-center text-white">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-400 mx-auto mb-4"></div>
          <p className="text-xl">Initializing Dragon Engine...</p>
          <p className="text-sm text-yellow-200 mt-2">Optimizing for your device</p>
        </div>
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
  if (!isInitialized || !capabilities || !deviceCapabilities) {
    return null
  }

  return (
    <PageErrorBoundary>
      <div className="min-h-screen bg-gradient-to-br from-amber-900 via-red-900 to-orange-900 relative">
        {/* Header */}
        <div className="relative z-10 p-6">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-4xl font-bold text-yellow-400 mb-2">
                  3D WebGL Dragons
                </h1>
                <p className="text-yellow-200">
                  Hardware-accelerated 3D dragon rendering with voice integration
                </p>
                <div className="flex items-center gap-4 mt-2 text-sm text-yellow-300">
                  <span className="flex items-center gap-1">
                    <Monitor className="h-4 w-4" />
                    Quality: {performanceState.quality}
                  </span>
                  <span className="flex items-center gap-1">
                    <Cpu className="h-4 w-4" />
                    FPS: {performanceMonitor.metrics.fps}
                  </span>
                  {deviceCapabilities.isMobile && (
                    <span className="flex items-center gap-1">
                      <Battery className="h-4 w-4" />
                      Mobile
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowPerformanceMonitor(!showPerformanceMonitor)}
                  className="p-2 bg-blue-500/20 border border-blue-500 rounded-lg text-blue-400 hover:bg-blue-500/30 transition-colors"
                  title="Toggle Performance Monitor"
                >
                  <Monitor className="h-5 w-5" />
                </button>
                <button
                  onClick={() => setShowControls(!showControls)}
                  className="p-2 bg-yellow-500/20 border border-yellow-500 rounded-lg text-yellow-400 hover:bg-yellow-500/30 transition-colors"
                  title="Toggle Controls"
                >
                  <Eye className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* System Information */}
            <div className="bg-black/20 border border-yellow-500/30 rounded-lg p-4 mb-6">
              <h3 className="text-lg font-semibold text-yellow-400 mb-3">System Information</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-400" />
                  <span className="text-white">WebGL: {capabilities.webgl ? 'Yes' : 'No'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-400" />
                  <span className="text-white">WebGL2: {capabilities.webgl2 ? 'Yes' : 'No'}</span>
                </div>
                <div className="text-white">
                  Max Texture: {capabilities.maxTextureSize}px
                </div>
                <div className="text-white">
                  Extensions: {capabilities.extensions.length}
                </div>
                <div className="text-white">
                  Device: {deviceCapabilities.isMobile ? 'Mobile' : deviceCapabilities.isTablet ? 'Tablet' : 'Desktop'}
                </div>
                <div className="text-white">
                  CPU Cores: {deviceCapabilities.cpuCores}
                </div>
                <div className="text-white">
                  Memory: {Math.round(deviceCapabilities.memoryEstimate / (1024 * 1024 * 1024))}GB
                </div>
                <div className="text-white">
                  Connection: {deviceCapabilities.connectionType}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 3D Scene - Use conditional visibility instead of unmounting */}
        <div className="absolute inset-0 z-0" style={{ 
          visibility: isVisible ? 'visible' : 'hidden',
          pointerEvents: isVisible ? 'auto' : 'none'
        }}>
          <Canvas
            ref={canvasRef}
            {...canvasProps}
            onCreated={({ gl, scene, camera }) => {
              gl.setPixelRatio(canvasProps.gl.pixelRatio)
              gl.setSize(window.innerWidth, window.innerHeight)
              
              // Enable optimizations
              gl.powerPreference = deviceCapabilities?.isMobile ? 'low-power' : 'high-performance'
              gl.debug.checkShaderErrors = false
              
              // Set up frustum culling
              gl.enable(gl.CULL_FACE)
              gl.cullFace(gl.BACK)
              
              // Enable depth testing
              gl.enable(gl.DEPTH_TEST)
              gl.depthFunc(gl.LEQUAL)
              
              // Set clear color for better performance
              gl.clearColor(0, 0, 0, 0)
              
              // Configure for better performance
              gl.getExtension('EXT_texture_filter_anisotropic')
              gl.getExtension('WEBGL_compressed_texture_s3tc')
              gl.getExtension('WEBGL_compressed_texture_pvrtc')
              gl.getExtension('WEBGL_compressed_texture_etc1')
              
              // Memory management optimizations
              scene.autoUpdate = false
              scene.matrixAutoUpdate = false
              
              // Enable WebGL state caching for performance
              gl.enable(gl.SCISSOR_TEST)
              gl.scissor(0, 0, gl.canvas.width, gl.canvas.height)
              
              console.log('Canvas created with quality:', performanceState.quality)
            }}
          >
            <Suspense fallback={null}>
              {/* Lighting based on quality settings */}
              {memoizedQualitySettings.lighting !== 'basic' && (
                <>
                  <ambientLight intensity={0.3} color="#fbbf24" />
                  <directionalLight
                    position={[10, 10, 5]}
                    intensity={voiceState.isSpeaking ? 1.5 : 1}
                    color={voiceState.isSpeaking ? "#ff6b35" : voiceState.isListening ? "#3b82f6" : "#fbbf24"}
                    castShadow={memoizedQualitySettings.shadows}
                    shadow-mapSize-width={memoizedQualitySettings.shadowMapSize}
                    shadow-mapSize-height={memoizedQualitySettings.shadowMapSize}
                  />
                  {memoizedQualitySettings.lighting === 'full' && (
                    <>
                      <pointLight
                        position={[0, 5, 0]}
                        intensity={voiceState.volume * 2}
                        color="#ff4500"
                        distance={20}
                      />
                      <pointLight
                        position={[-5, 2, 5]}
                        intensity={0.5}
                        color="#fbbf24"
                        distance={15}
                      />
                    </>
                  )}
                </>
              )}
              
              {/* Basic lighting for low quality */}
              {memoizedQualitySettings.lighting === 'basic' && (
                <>
                  <ambientLight intensity={0.5} color="#fbbf24" />
                  <directionalLight
                    position={[10, 10, 5]}
                    intensity={1}
                    color="#fbbf24"
                    castShadow={false}
                  />
                </>
              )}

              {/* Environment */}
              {memoizedQualitySettings.postProcessing && (
                <Environment preset="sunset" />
              )}

              {/* Dragon - Conditional rendering with visibility optimization */}
              <SeironGLBDragon
                voiceState={voiceState}
                size={dragonSize}
                enableAnimations={memoizedQualitySettings.animations && isVisible}
                visible={isVisible}
                qualitySettings={memoizedQualitySettings}
                onError={handleDragonError}
                onLoad={() => console.log('Dragon loaded successfully')}
                onProgress={(progress) => console.log('Dragon loading progress:', progress)}
                modelPath={'/models/seiron.glb'}
                isProgressiveLoading={true}
                deviceCapabilities={deviceCapabilities}
                performanceState={performanceState}
              />

              {/* Camera Controls */}
              <OrbitControls
                enablePan={true}
                enableZoom={true}
                enableRotate={true}
                minDistance={2}
                maxDistance={10}
                minPolarAngle={0}
                maxPolarAngle={Math.PI}
                enableDamping={true}
                dampingFactor={0.1}
              />
              
              {/* Fog for depth */}
              {memoizedQualitySettings.fog && (
                <fog attach="fog" args={['#000000', 10, 50]} />
              )}
            </Suspense>
          </Canvas>
        </div>

        {/* Performance Monitor */}
        {showPerformanceMonitor && (
          <div className="fixed top-4 right-4 z-50 bg-black/80 backdrop-blur-sm rounded-lg p-4 font-mono text-xs border border-yellow-400/20">
            <div className="text-yellow-400 font-bold mb-2">🐉 Performance Monitor</div>
            <div className="space-y-1 text-white">
              <div className="flex justify-between">
                <span>FPS:</span>
                <span className={performanceMonitor.metrics.fps >= 50 ? 'text-green-400' : performanceMonitor.metrics.fps >= 30 ? 'text-yellow-400' : 'text-red-400'}>
                  {performanceMonitor.metrics.fps}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Frame Time:</span>
                <span>{performanceMonitor.metrics.frameTime.toFixed(2)}ms</span>
              </div>
              <div className="flex justify-between">
                <span>Quality:</span>
                <span className="text-yellow-400">{performanceState.quality}</span>
              </div>
              <div className="flex justify-between">
                <span>Auto-Optimize:</span>
                <span className={performanceState.autoOptimize ? 'text-green-400' : 'text-red-400'}>
                  {performanceState.autoOptimize ? 'ON' : 'OFF'}
                </span>
              </div>
              {performanceMonitor.metrics.memoryUsage && (
                <div className="flex justify-between">
                  <span>Memory:</span>
                  <span>{(performanceMonitor.metrics.memoryUsage.usedJSHeapSize / 1048576).toFixed(1)}MB</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>Visible:</span>
                <span className={isVisible ? 'text-green-400' : 'text-red-400'}>
                  {isVisible ? 'YES' : 'NO'}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Controls Panel */}
        {showControls && (
          <div className="absolute bottom-6 left-6 right-6 z-10">
            <div className="max-w-4xl mx-auto bg-black/40 backdrop-blur-lg border border-yellow-500/30 rounded-lg p-6">
              {/* Voice Controls */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-yellow-400 mb-3">Voice Integration</h3>
                <div className="flex flex-wrap gap-3">
                <button
                  onClick={handleListening}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                    voiceState.isListening
                      ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/25'
                      : 'bg-blue-500/20 text-blue-400 border border-blue-500/50 hover:bg-blue-500/30'
                  }`}
                >
                  {voiceState.isListening ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
                  {voiceState.isListening ? 'Listening...' : 'Start Listening'}
                </button>

                <button
                  onClick={handleSpeaking}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                    voiceState.isSpeaking
                      ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/25'
                      : 'bg-orange-500/20 text-orange-400 border border-orange-500/50 hover:bg-orange-500/30'
                  }`}
                >
                  <Volume2 className="h-4 w-4" />
                  {voiceState.isSpeaking ? 'Speaking...' : 'Test Speaking'}
                </button>

                <button
                  onClick={handleProcessing}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                    voiceState.isProcessing
                      ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/25'
                      : 'bg-purple-500/20 text-purple-400 border border-purple-500/50 hover:bg-purple-500/30'
                  }`}
                >
                  <Zap className="h-4 w-4" />
                  {voiceState.isProcessing ? 'Processing...' : 'Test Processing'}
                </button>

                <button
                  onClick={handleReset}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-500/20 text-gray-400 border border-gray-500/50 rounded-lg font-medium hover:bg-gray-500/30 transition-all"
                >
                  <RotateCcw className="h-4 w-4" />
                  Reset
                </button>
              </div>

              {/* Voice State Display */}
              <div className="mt-3 text-sm text-gray-300">
                <span className="mr-4">
                  State: <span className="text-yellow-400 font-medium">
                    {voiceState.isListening ? 'Listening' : voiceState.isSpeaking ? 'Speaking' : voiceState.isProcessing ? 'Processing' : 'Idle'}
                  </span>
                </span>
                <span className="mr-4">
                  Volume: <span className="text-yellow-400 font-medium">{Math.round(voiceState.volume * 100)}%</span>
                </span>
                <span>
                  Emotion: <span className="text-yellow-400 font-medium capitalize">{voiceState.emotion}</span>
                </span>
              </div>
            </div>

              {/* Performance Controls */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* Quality */}
                <div>
                  <label className="block text-sm font-medium text-yellow-400 mb-2">
                    Quality Level
                  </label>
                  <select
                    value={performanceState.quality}
                    onChange={(e) => handleQualityChange(e.target.value as any)}
                    className="w-full p-2 bg-black/30 border border-yellow-500/30 rounded text-white"
                  >
                    <option value="low">Low (Mobile)</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="ultra">Ultra (Desktop)</option>
                  </select>
                </div>

                {/* Dragon Size */}
                <div>
                  <label className="block text-sm font-medium text-yellow-400 mb-2">
                    Dragon Size
                  </label>
                  <select
                    value={dragonSize}
                    onChange={(e) => setDragonSize(e.target.value as any)}
                    className="w-full p-2 bg-black/30 border border-yellow-500/30 rounded text-white"
                  >
                    <option value="sm">Small</option>
                    <option value="md">Medium</option>
                    <option value="lg">Large</option>
                    <option value="xl">Extra Large</option>
                    <option value="gigantic">Gigantic</option>
                  </select>
                </div>

                {/* Performance Options */}
                <div>
                  <label className="block text-sm font-medium text-yellow-400 mb-2">
                    Performance
                  </label>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-sm text-white">
                      <input
                        type="checkbox"
                        checked={performanceState.autoOptimize}
                        onChange={toggleAutoOptimize}
                        className="rounded"
                      />
                      Auto-Optimize
                    </label>
                    <label className="flex items-center gap-2 text-sm text-white">
                      <input
                        type="checkbox"
                        checked={showPerformanceMonitor}
                        onChange={(e) => setShowPerformanceMonitor(e.target.checked)}
                        className="rounded"
                      />
                      Show Monitor
                    </label>
                  </div>
                </div>

                {/* Effects */}
                <div>
                  <label className="block text-sm font-medium text-yellow-400 mb-2">
                    Effects
                  </label>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-sm text-white">
                      <input
                        type="checkbox"
                        checked={memoizedQualitySettings.particles}
                        onChange={(e) => setQualitySettings(prev => ({ ...prev, particles: e.target.checked }))}
                        className="rounded"
                      />
                      Particles
                    </label>
                    <label className="flex items-center gap-2 text-sm text-white">
                      <input
                        type="checkbox"
                        checked={memoizedQualitySettings.shadows}
                        onChange={(e) => setQualitySettings(prev => ({ ...prev, shadows: e.target.checked }))}
                        className="rounded"
                      />
                      Shadows
                    </label>
                  </div>
                </div>
              </div>
              
              {/* Performance Information */}
              <div className="mt-4 p-3 bg-black/20 rounded text-xs">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-gray-300">
                  <div>
                    <span className="text-yellow-400">Resolution:</span> {Math.round(memoizedQualitySettings.resolution * 100)}%
                  </div>
                  <div>
                    <span className="text-yellow-400">Shadows:</span> {memoizedQualitySettings.shadows ? 'ON' : 'OFF'}
                  </div>
                  <div>
                    <span className="text-yellow-400">Lighting:</span> {memoizedQualitySettings.lighting.toUpperCase()}
                  </div>
                  <div>
                    <span className="text-yellow-400">Post-FX:</span> {memoizedQualitySettings.postProcessing ? 'ON' : 'OFF'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Loading indicator for the 3D scene */}
        <Loader />
      </div>
    </PageErrorBoundary>
  )
}
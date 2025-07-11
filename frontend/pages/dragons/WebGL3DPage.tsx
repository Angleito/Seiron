import React, { useState, useEffect, useRef, Suspense, useCallback, useMemo } from 'react'
import { RotateCcw, AlertTriangle, CheckCircle, Zap, Eye, Mic, MicOff, Volume2, Monitor, Cpu, Battery, Download, BarChart3, TrendingUp, Settings, Brain } from 'lucide-react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Environment, Loader } from '@react-three/drei'
import * as THREE from 'three'
import { SeironGLBDragon } from '../../components/dragon/SeironGLBDragon'
import { VoiceAnimationState } from '../../components/dragon/DragonRenderer'
import { usePerformanceMonitor } from '../../hooks/usePerformanceMonitor'
import { DragonMemoryManager } from '../../utils/dragonMemoryManager'
import { ProductionWebGLErrorBoundary } from '../../components/webgl/ProductionWebGLErrorBoundary'
import { DeviceCompatibilityBoundary } from '../../components/error-boundaries/DeviceCompatibilityBoundary'
import ReactError310Handler from '../../components/error-boundaries/ReactError310Handler'
import WebGLPerformanceMonitor from '../../components/webgl/WebGLPerformanceMonitor'
import { useWebGLRecovery } from '../../utils/webglRecovery'
import { 
  WebGLRecoveryLoader, 
  CanvasSafeLoader, 
  DragonSystemStatus,
  DragonLoadingAnimation 
} from '../../components/loading/LoadingStates'

// New performance tracking imports
import useModelPerformanceTracking from '../../hooks/useModelPerformanceTracking'
import ModelPerformanceComparison from '../../components/ModelPerformanceComparison'
import PerformanceDashboard from '../../components/PerformanceDashboard'
import PerformanceMetricsDisplay from '../../components/PerformanceMetricsDisplay'
import { ModelRecommendationEngine } from '../../utils/ModelRecommendationEngine'
import { DRAGON_MODELS, getModelConfig } from '../../config/dragonModels'

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

interface DragonModel {
  id: string
  name: string
  path: string
  type: 'GLB' | 'GLTF'
  description: string
  estimatedSize: string
  features: string[]
  compatibility: 'high' | 'medium' | 'low'
  recommended: boolean
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

// Legacy models mapping - now we use the comprehensive dragonModels config
const LEGACY_DRAGON_MODELS: DragonModel[] = [
  {
    id: 'seiron_primary',
    name: 'Seiron Primary',
    path: '/models/seiron.glb',
    type: 'GLB',
    description: 'Main optimized dragon model with full features',
    estimatedSize: '8.5 MB',
    features: ['Animations', 'Textures', 'Optimized LOD'],
    compatibility: 'high',
    recommended: true
  },
  {
    id: 'seiron_animated',
    name: 'Seiron Animated',
    path: '/models/seiron_animated.gltf',
    type: 'GLTF',
    description: 'High-quality animated dragon with advanced rigging',
    estimatedSize: '12.3 MB',
    features: ['Complex Animations', 'Morphing', 'Particle Effects'],
    compatibility: 'medium',
    recommended: false
  },
  {
    id: 'seiron_hd',
    name: 'Seiron HD',
    path: '/models/seiron_animated_lod_high.gltf',
    type: 'GLTF',
    description: 'High-resolution model with detailed geometry',
    estimatedSize: '15.7 MB',
    features: ['High-poly', 'Detailed Textures', 'Advanced Materials'],
    compatibility: 'low',
    recommended: false
  },
  {
    id: 'dragon_head',
    name: 'Dragon Head',
    path: '/models/dragon_head.glb',
    type: 'GLB',
    description: 'Focused head model for close-up views',
    estimatedSize: '3.2 MB',
    features: ['Detailed Head', 'Facial Animations', 'Compact Size'],
    compatibility: 'high',
    recommended: true
  },
  {
    id: 'dragon_head_optimized',
    name: 'Dragon Head Optimized',
    path: '/models/dragon_head_optimized.glb',
    type: 'GLB',
    description: 'Optimized head model for mobile devices',
    estimatedSize: '1.8 MB',
    features: ['Mobile Optimized', 'Low-poly', 'Fast Loading'],
    compatibility: 'high',
    recommended: false
  }
]

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
  const [webglRecoveryStage, setWebglRecoveryStage] = useState('')
  const [webglRecoveryProgress, setWebglRecoveryProgress] = useState(0)
  
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
  
  // Model selector state
  const [selectedModel, setSelectedModel] = useState('/models/seiron.glb')
  const [modelLoading, setModelLoading] = useState(false)
  const [modelError, setModelError] = useState<string | null>(null)
  
  // Performance tracking state
  const [showPerformanceDashboard, setShowPerformanceDashboard] = useState(false)
  const [showModelComparison, setShowModelComparison] = useState(false)
  const [showRecommendations, setShowRecommendations] = useState(false)
  const [comparisonModelA, setComparisonModelA] = useState<string | null>(null)
  const [comparisonModelB, setComparisonModelB] = useState<string | null>(null)
  
  // Initialize performance tracking hook
  const performanceTracking = useModelPerformanceTracking({
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
  })
  
  // Model recommendation engine
  const recommendationEngine = useMemo(() => ModelRecommendationEngine.getInstance(), [])
  // Refs
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const memoryManagerRef = useRef(DragonMemoryManager.getInstance())
  const performanceCheckIntervalRef = useRef<NodeJS.Timeout>()
  
  // WebGL Recovery integration
  const {
    diagnostics: webglDiagnostics,
    isRecovering: isWebGLRecovering,
    forceRecovery: manualWebGLRecover,
    shouldFallback
  } = useWebGLRecovery()
  
  // Fallback request function
  const requestWebGLFallback = useCallback(() => {
    console.log('WebGL fallback requested, redirecting to 2D dragons')
    window.location.href = '/dragons/sprite-2d'
  }, [])
  
  // Performance monitoring (legacy - now enhanced with new tracking)
  const performanceMonitor = usePerformanceMonitor({
    enabled: true,
    componentName: 'WebGL3DPage',
    sampleRate: 60,
    onPerformanceWarning: useCallback((metrics: { fps: number; memoryUsage?: { usedJSHeapSize: number } }) => {
      if (performanceState.adaptiveQuality && Date.now() - performanceState.lastOptimization > 5000) {
        console.warn('Performance warning detected:', metrics)
        optimizeQualitySettings(metrics)
        
        // Record warning in new performance tracking system
        performanceTracking.recordWarning()
      }
    }, [performanceState, performanceTracking]),
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

  // Enhanced auto-optimization with new performance tracking
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
      if (performanceTracking.currentMetrics) {
        performanceTracking.currentMetrics.qualityLevel = newQuality
        performanceTracking.currentMetrics.adaptiveQualityActive = true
        performanceTracking.currentMetrics.qualityReductions += 1
      }
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
        
        // Start performance tracking
        const currentModelId = Object.values(DRAGON_MODELS).find(m => m.path === selectedModel)?.id || 'seiron-primary'
        performanceTracking.startTracking(currentModelId, context)
        
        console.log('WebGL capabilities initialized:', caps)
        console.log('Device capabilities:', deviceCaps)
        console.log('Initial quality:', initialQuality)
        console.log('Performance tracking started for model:', currentModelId)
        
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

  // Model comparison renderer component moved outside to fix React Error #310
  const ModelComparisonRenderer = React.useMemo(() => {
    return ({ modelAId, modelBId }: { modelAId: string; modelBId: string }) => {
      const modelAData = getModelComparisonData(modelAId)
      const modelBData = getModelComparisonData(modelBId)
      const comparison = performanceTracking.compareModels(modelAId, modelBId)
      
      if (!modelAData || !modelBData) {
        return <div className="text-yellow-400 p-4">Please select both models to compare</div>
      }
      
      return (
        <ModelPerformanceComparison
          modelA={modelAData}
          modelB={modelBData}
          comparison={comparison || undefined}
          onModelSelect={(modelId) => {
            const modelConfig = getModelConfig(modelId)
            if (modelConfig) {
              handleModelChange(modelConfig.path)
              setShowModelComparison(false)
            }
          }}
          onRefreshComparison={() => console.log('Refresh comparison')}
          onExportData={() => {
            const data = performanceTracking.exportPerformanceData()
            const blob = new Blob([data], { type: 'application/json' })
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `model-comparison-${Date.now()}.json`
            a.click()
            URL.revokeObjectURL(url)
          }}
        />
      )
    }
  }, [performanceTracking, getModelComparisonData, handleModelChange, setShowModelComparison])

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
  }, [deviceCapabilities?.isMobile, performanceState.memoryLimit, performanceState.quality])

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
          // Temporarily store current quality for later restoration
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
  }, [performanceState.autoOptimize, deviceCapabilities?.isMobile])

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
    
    const newSettings = qualityPresets[newQuality]
    if (newSettings) {
      setQualitySettings(newSettings)
    }
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

  // Enhanced model selector functions with performance tracking
  const handleModelChange = useCallback((newModelPath: string) => {
    const legacyModel = LEGACY_DRAGON_MODELS.find(m => m.path === newModelPath)
    const modelConfig = Object.values(DRAGON_MODELS).find(m => m.path === newModelPath)
    
    if (!legacyModel) return
    
    setModelLoading(true)
    setModelError(null)
    setSelectedModel(newModelPath)
    
    // Start tracking new model
    const modelId = modelConfig?.id || legacyModel.id
    performanceTracking.stopTracking()
    performanceTracking.startTracking(modelId)
    performanceTracking.markModelLoadStart()
    
    console.log(`Switching to model: ${legacyModel.name} (${legacyModel.estimatedSize})`)
    
    // Auto-adjust quality based on model complexity
    if (legacyModel.compatibility === 'low' && performanceState.quality === 'ultra') {
      console.log('Auto-adjusting quality for complex model')
      handleQualityChange('high')
    } else if (legacyModel.compatibility === 'high' && deviceCapabilities?.isMobile && performanceState.quality === 'high') {
      console.log('Auto-adjusting quality for mobile-optimized model')
      handleQualityChange('medium')
    }
  }, [performanceState.quality, deviceCapabilities?.isMobile])

  const handleModelLoadStart = useCallback(() => {
    setModelLoading(true)
    setModelError(null)
    performanceTracking.markModelLoadStart()
  }, [performanceTracking])

  const handleModelLoadComplete = useCallback(() => {
    setModelLoading(false)
    setModelError(null)
    
    // Mark load complete and record performance
    const modelConfig = Object.values(DRAGON_MODELS).find(m => m.path === selectedModel)
    performanceTracking.markModelLoadComplete(modelConfig)
    
    console.log('Model loaded successfully')
  }, [performanceTracking, selectedModel])

  const handleModelLoadError = useCallback((error: Error) => {
    setModelLoading(false)
    setModelError(error.message)
    
    // Record error in performance tracking
    performanceTracking.recordError()
    
    console.error('Model loading error:', error)
  }, [performanceTracking])

  // Get current model info (legacy and new config)
  const currentModel = useMemo(() => 
    LEGACY_DRAGON_MODELS.find(m => m.path === selectedModel) || LEGACY_DRAGON_MODELS[0], 
    [selectedModel]
  )
  
  const currentModelConfig = useMemo(() => 
    Object.values(DRAGON_MODELS).find(m => m.path === selectedModel), 
    [selectedModel]
  )

  // Filter models based on device capabilities
  const availableModels = useMemo(() => {
    if (!deviceCapabilities) return LEGACY_DRAGON_MODELS
    
    return LEGACY_DRAGON_MODELS.filter(model => {
      if (deviceCapabilities.isMobile) {
        // Mobile devices: prefer high compatibility models
        return model.compatibility === 'high' || model.compatibility === 'medium'
      } else if (deviceCapabilities.isLowEnd) {
        // Low-end devices: only high compatibility models
        return model.compatibility === 'high'
      }
      // Desktop: all models available
      return true
    })
  }, [deviceCapabilities?.isMobile, deviceCapabilities?.isLowEnd])
  
  // Model performance comparison helper
  const getModelComparisonData = useCallback((modelId: string) => {
    const config = getModelConfig(modelId)
    const metrics = performanceTracking.performanceHistory.filter(p => p.modelId === modelId).map(p => p.metrics)
    const currentMetrics = performanceTracking.currentModelId === modelId ? performanceTracking.currentMetrics : undefined
    
    return config ? {
      id: modelId,
      name: config.displayName,
      config,
      metrics,
      currentMetrics: currentMetrics || undefined
    } : null
  }, [performanceTracking])
  
  // Handle AI-powered model recommendations
  const handleGetRecommendations = useCallback(async () => {
    if (!deviceCapabilities) return
    
    try {
      const recommendations = await recommendationEngine.generateRecommendations(
        performanceTracking.performanceHistory,
        {
          deviceProfile: {
            cpuCores: deviceCapabilities.cpuCores,
            totalMemoryGB: deviceCapabilities.memoryEstimate / (1024 * 1024 * 1024),
            isDesktop: !deviceCapabilities.isMobile && !deviceCapabilities.isTablet,
            isMobile: deviceCapabilities.isMobile,
            isTablet: deviceCapabilities.isTablet,
            isLowEnd: deviceCapabilities.isLowEnd,
            webglSupport: deviceCapabilities.supportsWebGL2 ? 'webgl2' : 'webgl1',
            maxTextureSize: deviceCapabilities.maxTextureSize,
            gpuTier: deviceCapabilities.isLowEnd ? 'low' : deviceCapabilities.isMobile ? 'medium' : 'high',
            hardwareAcceleration: true,
            connectionSpeed: deviceCapabilities.connectionType === '4g' ? 'fast' : 'medium',
            onBatteryPower: deviceCapabilities.hasBattery,
            preferPerformance: !deviceCapabilities.isMobile,
            preferQuality: !deviceCapabilities.isLowEnd,
            preferBatteryLife: deviceCapabilities.isMobile,
            prioritizeLoadTime: deviceCapabilities.connectionType === 'slow-2g'
          }
        }
      )
      
      console.log('AI Model Recommendations:', recommendations)
      
      // Show recommendations UI
      setShowRecommendations(true)
      
      return recommendations
    } catch (error) {
      console.error('Failed to get model recommendations:', error)
      return null
    }
  }, [deviceCapabilities?.isMobile, deviceCapabilities?.isLowEnd, performanceTracking.currentModelId])

  // Memoized quality settings for performance
  const memoizedQualitySettings = useMemo(() => qualitySettings, [qualitySettings])
  
  // Memoized canvas props with performance optimizations
  const canvasProps = useMemo(() => ({
    shadows: memoizedQualitySettings.shadows,
    camera: { 
      position: [0, 0, 6] as [number, number, number], 
      fov: 50,
      near: 0.1,
      far: 1000
    },
    gl: {
      antialias: memoizedQualitySettings.antialiasing,
      alpha: true,
      powerPreference: (deviceCapabilities?.isMobile ? 'low-power' : 'high-performance') as WebGLPowerPreference,
      failIfMajorPerformanceCaveat: false,
      // pixelRatio is handled by dpr prop below
      preserveDrawingBuffer: true, // Better for screenshots and debugging
      premultipliedAlpha: true, // Better alpha blending performance
      stencil: false, // Disable stencil buffer for better performance
      depth: true,
      logarithmicDepthBuffer: false // Better compatibility
    },
    frameloop: isVisible ? 'always' : 'never' as 'always' | 'never' | 'demand', // Pause rendering when not visible
    dpr: [1, Math.min(window.devicePixelRatio * memoizedQualitySettings.resolution, 2)] as [number, number], // Limit pixel ratio to prevent excessive memory usage
    resize: { scroll: false, debounce: { scroll: 50, resize: 0 } },
    performance: {
      current: 1,
      min: 0.5,
      max: 1,
      debounce: 200
    }
  }), [memoizedQualitySettings, deviceCapabilities, isVisible])

  // Enhanced recovery stage tracking
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null
    
    if (isWebGLRecovering) {
      const stages = [
        'Detecting context loss...',
        'Clearing GPU resources...',
        'Reinitializing WebGL context...',
        'Restoring dragon model...',
        'Finalizing recovery...'
      ]
      
      let currentStage = 0
      interval = setInterval(() => {
        if (currentStage < stages.length) {
          setWebglRecoveryStage(stages[currentStage] || '')
          setWebglRecoveryProgress((currentStage + 1) * 20)
          currentStage++
        } else {
          if (interval) {
            clearInterval(interval)
          }
        }
      }, 1000)
    } else {
      setWebglRecoveryStage('')
      setWebglRecoveryProgress(0)
    }
    
    return () => {
      if (interval) {
        clearInterval(interval)
      }
    }
  }, [isWebGLRecovering])
  
  // Get current WebGL state for status display
  const getWebGLState = (): 'loading' | 'active' | 'recovering' | 'failed' => {
    if (loading) return 'loading'
    if (isWebGLRecovering) return 'recovering'
    if (webglDiagnostics?.currentState === 'failed') return 'failed'
    return 'active'
  }
  
  // Early returns for loading and error states
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

  // Cleanup performance tracking on unmount
  useEffect(() => {
    return () => {
      performanceTracking.stopTracking()
    }
  }, [])

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
  
  // Component is ready to render
  if (!isInitialized || !capabilities || !deviceCapabilities) {
    return null
  }

  return (
    <ReactError310Handler
      onError={(error, errorInfo) => {
        console.error('🚨 React Error #310 caught in WebGL3DPage:', error)
        console.error('📍 Component stack:', errorInfo.componentStack)
        setError(`React Error #310: ${error.message}`)
      }}
    >
      <DeviceCompatibilityBoundary 
        onDeviceDetected={(caps) => console.log('Device detected:', caps)}
        enableAutoOptimization={true}
      >
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
                  <span className="flex items-center gap-1">
                    🐉 Model: {currentModel?.name || 'Unknown'}
                  </span>
                  {deviceCapabilities.isMobile && (
                    <span className="flex items-center gap-1">
                      <Battery className="h-4 w-4" />
                      Mobile
                    </span>
                  )}
                  {/* WebGL Status */}
                  <DragonSystemStatus
                    webglState={getWebGLState()}
                    performanceScore={webglDiagnostics?.performanceScore}
                    contextLossRisk={webglDiagnostics?.contextLossRisk}
                    compact={true}
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                {/* Quick Model Selector */}
                <select
                  value={selectedModel}
                  onChange={(e) => handleModelChange(e.target.value)}
                  className="p-2 bg-black/30 border border-yellow-500/30 rounded-lg text-yellow-400 text-sm hover:border-yellow-500/50 focus:border-yellow-500 focus:outline-none transition-colors"
                  disabled={modelLoading}
                  title="Quick Model Selection"
                >
                  {availableModels.map((model) => (
                    <option key={model.id} value={model.path}>
                      {model.name} {model.recommended ? '⭐' : ''}
                    </option>
                  ))}
                </select>
                
                {/* AI Recommendations Button */}
                <button
                  onClick={handleGetRecommendations}
                  className="p-2 bg-purple-500/20 border border-purple-500 rounded-lg text-purple-400 hover:bg-purple-500/30 transition-colors"
                  title="AI Model Recommendations"
                >
                  <Brain className="h-5 w-5" />
                </button>
                
                {/* Performance Dashboard Button */}
                <button
                  onClick={() => setShowPerformanceDashboard(!showPerformanceDashboard)}
                  className="p-2 bg-green-500/20 border border-green-500 rounded-lg text-green-400 hover:bg-green-500/30 transition-colors"
                  title="Performance Dashboard"
                >
                  <BarChart3 className="h-5 w-5" />
                </button>
                
                {/* Model Comparison Button */}
                <button
                  onClick={() => setShowModelComparison(!showModelComparison)}
                  className="p-2 bg-orange-500/20 border border-orange-500 rounded-lg text-orange-400 hover:bg-orange-500/30 transition-colors"
                  title="Model Performance Comparison"
                >
                  <TrendingUp className="h-5 w-5" />
                </button>
                
                <button
                  onClick={() => setShowPerformanceMonitor(!showPerformanceMonitor)}
                  className="p-2 bg-blue-500/20 border border-blue-500 rounded-lg text-blue-400 hover:bg-blue-500/30 transition-colors"
                  title="Legacy Performance Monitor"
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
              
              {/* WebGL Recovery Status */}
              {webglDiagnostics && (
                <div className="mt-4 pt-4 border-t border-yellow-500/20">
                  <h4 className="text-md font-medium text-yellow-400 mb-2">WebGL Recovery System</h4>
                  <DragonSystemStatus
                    webglState={getWebGLState()}
                    performanceScore={webglDiagnostics.performanceScore}
                    contextLossRisk={webglDiagnostics.contextLossRisk}
                    compact={false}
                  />
                  <div className="mt-2 grid grid-cols-2 gap-4 text-xs">
                    <div>
                      <span className="text-gray-400">Context Losses:</span>
                      <span className="ml-2 text-white font-mono">{webglDiagnostics.contextLossCount}</span>
                    </div>
                    <div>
                      <span className="text-gray-400">Recovery Rate:</span>
                      <span className="ml-2 text-white font-mono">
                        {webglDiagnostics.recoveryAttempts > 0 
                          ? `${((webglDiagnostics.successfulRecoveries / webglDiagnostics.recoveryAttempts) * 100).toFixed(1)}%`
                          : 'N/A'
                        }
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 3D Scene - Use conditional visibility instead of unmounting */}
        <ProductionWebGLErrorBoundary
          fallbackComponent={() => (
            <div className="absolute inset-0 z-0 flex items-center justify-center bg-gradient-to-br from-amber-900 via-red-900 to-orange-900">
              <div className="text-center text-white">
                <div className="text-6xl mb-4">🐉</div>
                <h2 className="text-2xl font-bold mb-4">3D Dragon Unavailable</h2>
                <p className="text-gray-300 mb-4">The 3D dragon renderer encountered an issue.</p>
                <button 
                  onClick={() => window.location.href = '/dragons/sprite-2d'}
                  className="px-6 py-3 bg-yellow-500 text-black rounded-lg hover:bg-yellow-400 transition-colors"
                >
                  Try 2D Dragons Instead
                </button>
              </div>
            </div>
          )}
        >
          <div className="absolute inset-0 z-0" style={{ 
            visibility: isVisible ? 'visible' : 'hidden',
            pointerEvents: isVisible ? 'auto' : 'none'
          }}>
            <Canvas
              ref={canvasRef}
              {...canvasProps}
              onCreated={({ gl, scene }) => {
                try {
                  // Set pixel ratio and size
                  gl.setPixelRatio(Math.min(window.devicePixelRatio * memoizedQualitySettings.resolution, 2))
                  gl.setSize(window.innerWidth, window.innerHeight, false)
                  
                  // Get WebGL context for low-level operations
                  const glContext = gl.getContext()
                  
                  // Enable optimizations through WebGL context
                  if (glContext) {
                    // Set up frustum culling
                    glContext.enable(glContext.CULL_FACE)
                    glContext.cullFace(glContext.BACK)
                    
                    // Enable depth testing
                    glContext.enable(glContext.DEPTH_TEST)
                    glContext.depthFunc(glContext.LEQUAL)
                    
                    // Set clear color for better performance
                    glContext.clearColor(0, 0, 0, 0)
                    
                    // Configure extensions for better performance
                    glContext.getExtension('EXT_texture_filter_anisotropic')
                    glContext.getExtension('WEBGL_compressed_texture_s3tc')
                    glContext.getExtension('WEBGL_compressed_texture_pvrtc')
                    glContext.getExtension('WEBGL_compressed_texture_etc1')
                    
                    // Enable WebGL state caching for performance
                    glContext.enable(glContext.SCISSOR_TEST)
                    glContext.scissor(0, 0, glContext.canvas.width, glContext.canvas.height)
                    
                    // CRITICAL FIX: Set up WebGL context loss/restore event listeners
                    const handleContextLoss = (event: WebGLContextEvent) => {
                      event.preventDefault()
                      console.warn('🔴 WebGL context lost in main Canvas')
                      
                      // Cleanup Three.js resources immediately
                      if (scene) {
                        scene.traverse((child) => {
                          if (child instanceof THREE.Mesh) {
                            if (child.geometry) {
                              child.geometry.dispose()
                            }
                            if (child.material) {
                              if (Array.isArray(child.material)) {
                                child.material.forEach(material => {
                                  material.dispose()
                                  // Dispose textures
                                  Object.values(material).forEach(value => {
                                    if (value && typeof value === 'object' && 'dispose' in value && typeof value.dispose === 'function') {
                                      value.dispose()
                                    }
                                  })
                                })
                              } else {
                                child.material.dispose()
                                // Dispose textures
                                Object.values(child.material).forEach(value => {
                                  if (value && typeof value === 'object' && 'dispose' in value && typeof value.dispose === 'function') {
                                    value.dispose()
                                  }
                                })
                              }
                            }
                          }
                        })
                      }
                      
                      // Clear renderer state
                      gl.dispose()
                      gl.forceContextLoss()
                      
                      // Trigger recovery through existing system
                      if (manualWebGLRecover) {
                        setTimeout(() => manualWebGLRecover(), 100)
                      }
                    }
                    
                    const handleContextRestore = (event: WebGLContextEvent) => {
                      console.log('🟢 WebGL context restored in main Canvas')
                      
                      // Reinitialize WebGL state
                      if (glContext && !glContext.isContextLost()) {
                        // Reset WebGL state
                        glContext.enable(glContext.CULL_FACE)
                        glContext.cullFace(glContext.BACK)
                        glContext.enable(glContext.DEPTH_TEST)
                        glContext.depthFunc(glContext.LEQUAL)
                        glContext.clearColor(0, 0, 0, 0)
                        
                        // Re-enable extensions
                        glContext.getExtension('EXT_texture_filter_anisotropic')
                        glContext.getExtension('WEBGL_compressed_texture_s3tc')
                        glContext.getExtension('WEBGL_compressed_texture_pvrtc')
                        glContext.getExtension('WEBGL_compressed_texture_etc1')
                        
                        // Reinitialize renderer
                        gl.setPixelRatio(Math.min(window.devicePixelRatio * memoizedQualitySettings.resolution, 2))
                        gl.setSize(window.innerWidth, window.innerHeight, false)
                        gl.shadowMap.enabled = memoizedQualitySettings.shadows
                        gl.shadowMap.type = THREE.PCFSoftShadowMap
                        
                        console.log('🟢 WebGL context and renderer fully restored')
                      }
                    }
                    
                    // Add context loss/restore event listeners
                    const canvas = glContext.canvas
                    canvas.addEventListener('webglcontextlost', handleContextLoss as EventListener)
                    canvas.addEventListener('webglcontextrestored', handleContextRestore as EventListener)
                    
                    // Store cleanup function and renderer reference for later disposal
                    ;(glContext as any)._contextEventCleanup = () => {
                      canvas.removeEventListener('webglcontextlost', handleContextLoss as EventListener)
                      canvas.removeEventListener('webglcontextrestored', handleContextRestore as EventListener)
                    }
                    ;(glContext as any)._threeRenderer = gl
                  }
                  
                  // Memory management optimizations on Three.js objects
                  // Note: Scene autoUpdate is managed by React Three Fiber
                  if (scene) {
                    scene.matrixAutoUpdate = false
                  }
                  
                  // Configure renderer-specific optimizations
                  gl.shadowMap.enabled = memoizedQualitySettings.shadows
                  gl.shadowMap.type = THREE.PCFSoftShadowMap
                  
                  console.log('Canvas created with quality:', performanceState.quality)
                } catch (error) {
                  console.error('Error during canvas creation:', error)
                  // Don't throw here - let the error boundary handle it
                }
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

                {/* Dragon - Wrapped in Canvas-Safe Loading */}
                <CanvasSafeLoader
                  isLoading={loading && !isInitialized}
                  message="Loading Dragon Model..."
                  preventCanvasInterference={true}
                >
                  <SeironGLBDragon
                    voiceState={voiceState}
                    size={dragonSize}
                    enableAnimations={memoizedQualitySettings.animations && isVisible}
                    visible={isVisible}
                    qualitySettings={memoizedQualitySettings}
                    onError={handleModelLoadError}
                    onLoad={handleModelLoadComplete}
                    onProgress={(progress) => console.log('Dragon loading progress:', progress)}
                    modelPath={selectedModel}
                    isProgressiveLoading={true}
                    deviceCapabilities={deviceCapabilities}
                    performanceState={performanceState}
                  />
                </CanvasSafeLoader>

                {/* Camera Controls */}
                <OrbitControls
                  enablePan={true}
                  enableZoom={true}
                  enableRotate={true}
                  minDistance={3}
                  maxDistance={15}
                  minPolarAngle={0}
                  maxPolarAngle={Math.PI}
                  enableDamping={true}
                  dampingFactor={0.1}
                  target={[0, 0, 0]}
                />
                
                {/* Fog for depth */}
                {memoizedQualitySettings.fog && (
                  <fog attach="fog" args={['#000000', 10, 50]} />
                )}
              </Suspense>
            </Canvas>
          </div>
        </ProductionWebGLErrorBoundary>

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
              <div className="flex justify-between">
                <span>Model:</span>
                <span className={modelLoading ? 'text-yellow-400' : 'text-green-400'}>
                  {modelLoading ? 'LOADING' : 'READY'}
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

              {/* Model Selection */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-yellow-400 mb-3">Dragon Model Selection</h3>
                
                {/* Model Selector Dropdown */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-yellow-400 mb-2">
                    Select Dragon Model
                  </label>
                  <select
                    value={selectedModel}
                    onChange={(e) => handleModelChange(e.target.value)}
                    className="w-full p-3 bg-black/30 border border-yellow-500/30 rounded-lg text-white hover:border-yellow-500/50 focus:border-yellow-500 focus:outline-none transition-colors"
                    disabled={modelLoading}
                  >
                    {availableModels.map((model) => (
                      <option key={model.id} value={model.path}>
                        {model.name} ({model.estimatedSize}) {model.recommended ? '⭐' : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Current Model Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-black/20 border border-yellow-500/20 rounded-lg p-4">
                    <h4 className="text-yellow-400 font-medium mb-2 flex items-center gap-2">
                      {currentModel?.name || 'Unknown Model'}
                      {currentModel?.recommended && <span className="text-yellow-300">⭐</span>}
                      {modelLoading && (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-yellow-400"></div>
                      )}
                    </h4>
                    <p className="text-gray-300 text-sm mb-2">{currentModel?.description || 'No description available'}</p>
                    <div className="text-xs text-gray-400">
                      <div className="flex justify-between mb-1">
                        <span>Type:</span>
                        <span className="text-yellow-400">{currentModel?.type || 'Unknown'}</span>
                      </div>
                      <div className="flex justify-between mb-1">
                        <span>Size:</span>
                        <span className="text-yellow-400">{currentModel?.estimatedSize || 'Unknown'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Compatibility:</span>
                        <span className={`font-medium ${
                          currentModel?.compatibility === 'high' ? 'text-green-400' :
                          currentModel?.compatibility === 'medium' ? 'text-yellow-400' : 'text-red-400'
                        }`}>
                          {currentModel?.compatibility?.toUpperCase() || 'UNKNOWN'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-black/20 border border-yellow-500/20 rounded-lg p-4">
                    <h4 className="text-yellow-400 font-medium mb-2">Model Features</h4>
                    <div className="space-y-1">
                      {currentModel?.features?.map((feature, index) => (
                        <div key={index} className="flex items-center gap-2 text-sm">
                          <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
                          <span className="text-gray-300">{feature}</span>
                        </div>
                      )) || (
                        <div className="text-sm text-gray-400">No features available</div>
                      )}
                    </div>
                    
                    {/* Model Status */}
                    <div className="mt-3 pt-3 border-t border-yellow-500/20">
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-gray-400">Status:</span>
                        {modelLoading ? (
                          <span className="text-blue-400 flex items-center gap-1">
                            <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-400"></div>
                            Loading...
                          </span>
                        ) : modelError ? (
                          <span className="text-red-400">Error: {modelError}</span>
                        ) : (
                          <span className="text-green-400">Ready</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Model Recommendations */}
                {deviceCapabilities && (
                  <div className="mt-3 p-3 bg-blue-900/20 border border-blue-500/30 rounded-lg">
                    <h5 className="text-blue-400 font-medium mb-2 text-sm">
                      💡 Device Recommendations
                    </h5>
                    <div className="text-xs text-blue-200">
                      {deviceCapabilities.isMobile ? (
                        <p>Mobile device detected: Consider using "Dragon Head Optimized" for best performance.</p>
                      ) : deviceCapabilities.isLowEnd ? (
                        <p>Low-end device detected: High compatibility models are recommended.</p>
                      ) : (
                        <p>Desktop device detected: All models are available for testing.</p>
                      )}
                    </div>
                  </div>
                )}
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
        
        {/* WebGL Recovery Overlay */}
        <WebGLRecoveryLoader
          isRecovering={isWebGLRecovering}
          recoveryStage={webglRecoveryStage}
          progress={webglRecoveryProgress}
          onManualRetry={manualWebGLRecover}
          onFallback={requestWebGLFallback}
          showDiagnostics={true}
        />
        
        {/* Legacy Performance Monitor Component */}
        <WebGLPerformanceMonitor 
          enabled={showPerformanceMonitor}
          showNotifications={true}
          allowManualQualityControl={true}
        />
        
        {/* New Performance Metrics Display */}
        <PerformanceMetricsDisplay
          currentMetrics={performanceTracking.currentMetrics}
          alerts={performanceTracking.activeAlerts}
          isTracking={performanceTracking.isTracking}
          compact={false}
          showAdvanced={true}
          position="top-right"
          onAcknowledgeAlert={performanceTracking.acknowledgeAlert}
        />
        
        {/* Performance Dashboard Modal */}
        {showPerformanceDashboard && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="w-full max-w-6xl max-h-[90vh] overflow-auto">
              <div className="bg-gray-900 border border-yellow-500/30 rounded-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-2xl font-bold text-yellow-400">Performance Analytics Dashboard</h2>
                  <button
                    onClick={() => setShowPerformanceDashboard(false)}
                    className="p-2 bg-red-500/20 border border-red-500 rounded-lg text-red-400 hover:bg-red-500/30 transition-colors"
                  >
                    ✕
                  </button>
                </div>
                <PerformanceDashboard
                  currentMetrics={performanceTracking.currentMetrics}
                  performanceHistory={performanceTracking.performanceHistory}
                  activeAlerts={performanceTracking.activeAlerts}
                  isTracking={performanceTracking.isTracking}
                  currentModelId={performanceTracking.currentModelId}
                  onExportData={performanceTracking.exportPerformanceData}
                  onClearAlerts={performanceTracking.clearOldAlerts}
                  onAcknowledgeAlert={performanceTracking.acknowledgeAlert}
                  onRefreshData={() => console.log('Refresh data')}
                />
              </div>
            </div>
          </div>
        )}
        
        {/* Model Performance Comparison Modal */}
        {showModelComparison && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="w-full max-w-6xl max-h-[90vh] overflow-auto">
              <div className="bg-gray-900 border border-yellow-500/30 rounded-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-2xl font-bold text-yellow-400">Model Performance Comparison</h2>
                  <button
                    onClick={() => setShowModelComparison(false)}
                    className="p-2 bg-red-500/20 border border-red-500 rounded-lg text-red-400 hover:bg-red-500/30 transition-colors"
                  >
                    ✕
                  </button>
                </div>
                
                {/* Model Selection for Comparison */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-yellow-400 mb-2">Model A</label>
                    <select
                      value={comparisonModelA || ''}
                      onChange={(e) => setComparisonModelA(e.target.value || null)}
                      className="w-full p-2 bg-black/30 border border-yellow-500/30 rounded text-yellow-400"
                    >
                      <option value="">Select Model A</option>
                      {Object.values(DRAGON_MODELS).map(model => (
                        <option key={model.id} value={model.id}>{model.displayName}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-yellow-400 mb-2">Model B</label>
                    <select
                      value={comparisonModelB || ''}
                      onChange={(e) => setComparisonModelB(e.target.value || null)}
                      className="w-full p-2 bg-black/30 border border-yellow-500/30 rounded text-yellow-400"
                    >
                      <option value="">Select Model B</option>
                      {Object.values(DRAGON_MODELS).map(model => (
                        <option key={model.id} value={model.id}>{model.displayName}</option>
                      ))}
                    </select>
                  </div>
                </div>
                
                {/* Comparison Component */}
                {comparisonModelA && comparisonModelB && (
                  <ModelComparisonRenderer
                    modelAId={comparisonModelA}
                    modelBId={comparisonModelB}
                  />
                )}
              </div>
            </div>
          </div>
        )}
        
        {/* WebGL Recovery Status Indicator */}
        {isWebGLRecovering && (
          <div className="fixed top-4 left-4 z-50">
            <DragonSystemStatus
              webglState="recovering"
              performanceScore={webglDiagnostics?.performanceScore}
              contextLossRisk={webglDiagnostics?.contextLossRisk}
              compact={true}
            />
          </div>
        )}
      </div>
    </DeviceCompatibilityBoundary>
    </ReactError310Handler>
  )
}
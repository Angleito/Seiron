/**
 * Dragon Model Configuration System Tests
 * 
 * Comprehensive tests for the dragon model configuration system including:
 * - Model selection logic
 * - Device capability detection
 * - Performance optimization
 * - Fallback chain generation
 * - Preloading strategies
 */

import {
  DRAGON_MODELS,
  DRAGON_MODEL_CONSTANTS,
  DeviceCapabilityDetector,
  DragonModelSelector,
  ModelPreloader,
  ModelPerformanceMonitor,
  getRecommendedModel,
  getOptimalQualitySettings,
  createFallbackChain,
  getModelsByDeviceCapability,
  getModelsByQuality,
  getModelsByType,
  getModelsByUseCase,
  getModelConfig,
  getAllModelIds,
  DragonModelConfig,
  DeviceCapability
} from '@config/dragonModels'

import {
  SmartModelSelector,
  ModelPreloadingStrategy,
  ModelPerformanceOptimizer,
  getLegacyModelPath,
  getModelMetadata,
  isModelPreloaded
} from '@utils/dragonModelUtils'

// Mock logger
jest.mock('@lib/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn()
  }
}))

// Mock fetch for model availability checks
global.fetch = jest.fn()

describe('Dragon Model Configuration System', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      headers: {
        get: jest.fn().mockReturnValue('1048576') // 1MB
      }
    })
  })

  describe('Model Configuration Validation', () => {
    test('should have all required models defined', () => {
      const requiredModels = [
        'seiron-primary',
        'seiron-animated',
        'seiron-lod-high',
        'dragon-head',
        'dragon-head-optimized',
        'dragon-2d-sprite',
        'dragon-ascii'
      ]

      requiredModels.forEach(modelId => {
        expect(DRAGON_MODELS[modelId]).toBeDefined()
        expect(DRAGON_MODELS[modelId].id).toBe(modelId)
      })
    })

    test('should have valid model configurations', () => {
      Object.values(DRAGON_MODELS).forEach(model => {
        // Basic properties
        expect(model.id).toBeTruthy()
        expect(model.name).toBeTruthy()
        expect(model.displayName).toBeTruthy()
        expect(model.path).toBeTruthy()
        expect(['glb', 'gltf', 'obj']).toContain(model.format)
        expect(['low', 'medium', 'high', 'ultra']).toContain(model.quality)

        // Performance profile
        expect(model.performance.renderComplexity).toBeGreaterThanOrEqual(0)
        expect(model.performance.renderComplexity).toBeLessThanOrEqual(10)
        expect(model.performance.memoryUsageMB).toBeGreaterThanOrEqual(0)
        expect(model.performance.loadTimeMs).toBeGreaterThanOrEqual(0)

        // Compatibility
        expect(model.compatibility.desktop).toBeDefined()
        expect(model.compatibility.mobile).toBeDefined()
        expect(model.compatibility.tablet).toBeDefined()
        expect(model.compatibility.lowEndDevice).toBeDefined()

        // Features
        expect(typeof model.features.hasAnimations).toBe('boolean')
        expect(typeof model.features.hasVoiceIntegration).toBe('boolean')

        // Quality settings
        expect(model.qualitySettings.low).toBeDefined()
        expect(model.qualitySettings.medium).toBeDefined()
        expect(model.qualitySettings.high).toBeDefined()
        expect(model.qualitySettings.ultra).toBeDefined()
      })
    })

    test('should have valid fallback chains', () => {
      Object.values(DRAGON_MODELS).forEach(model => {
        model.fallbackModels.forEach(fallbackId => {
          expect(DRAGON_MODELS[fallbackId]).toBeDefined()
        })
      })
    })
  })

  describe('Device Capability Detection', () => {
    let detector: DeviceCapabilityDetector

    beforeEach(() => {
      detector = DeviceCapabilityDetector.getInstance()
      
      // Mock browser APIs
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        configurable: true
      })
      Object.defineProperty(navigator, 'hardwareConcurrency', {
        value: 8,
        configurable: true
      })
    })

    test('should detect device capabilities', async () => {
      const capabilities = await detector.detectCapabilities()

      expect(capabilities).toBeDefined()
      expect(typeof capabilities.webgl1).toBe('boolean')
      expect(typeof capabilities.webgl2).toBe('boolean')
      expect(typeof capabilities.memoryMB).toBe('number')
      expect(typeof capabilities.isDesktop).toBe('boolean')
      expect(typeof capabilities.isMobile).toBe('boolean')
      expect(typeof capabilities.isTablet).toBe('boolean')
      expect(['low', 'medium', 'high']).toContain(capabilities.gpuTier)
    })

    test('should return singleton instance', () => {
      const detector1 = DeviceCapabilityDetector.getInstance()
      const detector2 = DeviceCapabilityDetector.getInstance()
      expect(detector1).toBe(detector2)
    })
  })

  describe('Model Selection', () => {
    let selector: DragonModelSelector

    beforeEach(() => {
      selector = DragonModelSelector.getInstance()
    })

    test('should select recommended model', async () => {
      const model = await getRecommendedModel('medium', 'voice-interface')
      
      expect(model).toBeDefined()
      expect(model.features.hasVoiceIntegration).toBe(true)
    })

    test('should filter models by device capability', async () => {
      const mockCapabilities: DeviceCapability = {
        webgl1: true,
        webgl2: false,
        memoryMB: 1024,
        maxTextureSize: 2048,
        maxVertexCount: 16,
        isDesktop: true,
        isMobile: false,
        isTablet: false,
        supportsHDR: false,
        supportsFloat: false,
        cpuCores: 4,
        gpuTier: 'medium'
      }

      const compatibleModels = getModelsByDeviceCapability(mockCapabilities)
      
      expect(compatibleModels.length).toBeGreaterThan(0)
      compatibleModels.forEach(model => {
        expect(model.compatibility.desktop.supported).toBe(true)
        expect(model.performance.minDeviceMemoryMB).toBeLessThanOrEqual(1024)
      })
    })

    test('should filter models by quality', () => {
      const highQualityModels = getModelsByQuality('high')
      
      expect(highQualityModels.length).toBeGreaterThan(0)
      highQualityModels.forEach(model => {
        expect(model.quality).toBe('high')
      })
    })

    test('should filter models by type', () => {
      const headModels = getModelsByType('head')
      
      expect(headModels.length).toBeGreaterThan(0)
      headModels.forEach(model => {
        expect(model.type).toBe('head')
      })
    })

    test('should filter models by use case', () => {
      const voiceModels = getModelsByUseCase('voice-interface')
      
      expect(voiceModels.length).toBeGreaterThan(0)
      voiceModels.forEach(model => {
        expect(model.recommendedUseCases).toContain('voice-interface')
      })
    })
  })

  describe('Quality Settings Optimization', () => {
    test('should return optimal quality settings', async () => {
      const model = DRAGON_MODELS['seiron-primary']
      const mockCapabilities: DeviceCapability = {
        webgl1: true,
        webgl2: true,
        memoryMB: 2048,
        maxTextureSize: 4096,
        maxVertexCount: 32,
        isDesktop: true,
        isMobile: false,
        isTablet: false,
        supportsHDR: true,
        supportsFloat: true,
        cpuCores: 8,
        gpuTier: 'high'
      }

      const qualitySettings = getOptimalQualitySettings(model, mockCapabilities)
      
      expect(qualitySettings).toBeDefined()
      expect(qualitySettings.enabled).toBe(true)
      expect(qualitySettings.textureSize).toBeGreaterThan(0)
      expect(['none', 'low', 'medium', 'high']).toContain(qualitySettings.shadowQuality)
    })

    test('should adjust quality for low-end devices', async () => {
      const model = DRAGON_MODELS['seiron-animated']
      const mockCapabilities: DeviceCapability = {
        webgl1: true,
        webgl2: false,
        memoryMB: 512,
        maxTextureSize: 1024,
        maxVertexCount: 16,
        isDesktop: false,
        isMobile: true,
        isTablet: false,
        supportsHDR: false,
        supportsFloat: false,
        cpuCores: 2,
        gpuTier: 'low'
      }

      const qualitySettings = getOptimalQualitySettings(model, mockCapabilities)
      
      expect(qualitySettings.textureSize).toBeLessThanOrEqual(1024)
      expect(qualitySettings.shadowQuality).toBe('none')
    })
  })

  describe('Fallback Chain Generation', () => {
    test('should create valid fallback chain', () => {
      const chain = createFallbackChain('seiron-animated')
      
      expect(chain.length).toBeGreaterThan(1)
      expect(chain[0].id).toBe('seiron-animated')
      expect(chain[chain.length - 1].id).toBe('dragon-ascii') // Ultimate fallback
    })

    test('should handle missing primary model', () => {
      const chain = createFallbackChain('non-existent-model')
      
      expect(chain.length).toBe(1)
      expect(chain[0].id).toBe('dragon-ascii')
    })
  })

  describe('Model Preloading', () => {
    let preloader: ModelPreloader

    beforeEach(() => {
      preloader = ModelPreloader.getInstance()
    })

    test('should preload single model', async () => {
      const model = DRAGON_MODELS['dragon-head-optimized']
      
      await preloader.preloadModel(model)
      
      expect(preloader.isModelPreloaded(model.id)).toBe(true)
    })

    test('should handle preload errors gracefully', async () => {
      ;(global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'))
      
      const model = DRAGON_MODELS['seiron-primary']
      
      await expect(preloader.preloadModel(model)).rejects.toThrow('Network error')
      expect(preloader.isModelPreloaded(model.id)).toBe(false)
    })
  })

  describe('Performance Monitoring', () => {
    let monitor: ModelPerformanceMonitor

    beforeEach(() => {
      monitor = ModelPerformanceMonitor.getInstance()
    })

    test('should record performance metrics', () => {
      const modelId = 'seiron-primary'
      const metrics = {
        loadTimeMs: 1500,
        memoryUsageMB: 25,
        frameTimeMs: 16,
        renderComplexity: 6,
        vertexCount: 12000,
        triangleCount: 24000,
        textureMemoryMB: 8,
        recommendedFPS: 60,
        minDeviceMemoryMB: 256,
        cpuIntensity: 4,
        gpuIntensity: 5,
        batteryImpact: 'medium' as const
      }

      monitor.recordModelPerformance(modelId, metrics)
      
      const recorded = monitor.getModelPerformance(modelId)
      expect(recorded).toEqual(metrics)
    })

    test('should calculate average performance', () => {
      const monitor = ModelPerformanceMonitor.getInstance()
      
      // Record some performance data
      monitor.recordModelPerformance('model1', { loadTimeMs: 1000, memoryUsageMB: 20 } as any)
      monitor.recordModelPerformance('model2', { loadTimeMs: 2000, memoryUsageMB: 30 } as any)
      
      const average = monitor.getAveragePerformance()
      expect(average.loadTimeMs).toBe(1500)
      expect(average.memoryUsageMB).toBe(25)
    })
  })

  describe('Smart Model Selection', () => {
    let smartSelector: SmartModelSelector

    beforeEach(() => {
      smartSelector = SmartModelSelector.getInstance()
    })

    test('should select model based on props', async () => {
      const props = {
        size: 'lg' as const,
        voiceState: {
          isListening: true,
          isSpeaking: false,
          isProcessing: false,
          isIdle: false,
          volume: 0.5
        },
        preferredQuality: 'high' as const,
        useCase: 'voice-interface',
        enableSmartSelection: true
      }

      const model = await smartSelector.selectOptimalModel(props)
      
      expect(model).toBeDefined()
      expect(model.features.hasVoiceIntegration).toBe(true)
    })

    test('should use specific model when provided', async () => {
      const props = {
        modelId: 'dragon-head-optimized',
        enableSmartSelection: true
      }

      const model = await smartSelector.selectOptimalModel(props)
      
      expect(model.id).toBe('dragon-head-optimized')
    })
  })

  describe('Performance Optimization', () => {
    let optimizer: ModelPerformanceOptimizer

    beforeEach(() => {
      optimizer = ModelPerformanceOptimizer.getInstance()
    })

    test('should detect when optimization is needed', () => {
      const modelId = 'test-model'
      
      // Record poor performance
      optimizer.recordPerformance(modelId, 25) // Below 30 FPS threshold
      optimizer.recordPerformance(modelId, 28)
      optimizer.recordPerformance(modelId, 22)
      
      expect(optimizer.shouldOptimize(modelId)).toBe(true)
    })

    test('should not optimize when performance is good', () => {
      const modelId = 'test-model'
      
      // Record good performance
      optimizer.recordPerformance(modelId, 45)
      optimizer.recordPerformance(modelId, 50)
      optimizer.recordPerformance(modelId, 48)
      
      expect(optimizer.shouldOptimize(modelId)).toBe(false)
    })
  })

  describe('Utility Functions', () => {
    test('should get model config by ID', () => {
      const model = getModelConfig('seiron-primary')
      
      expect(model).toBeDefined()
      expect(model!.id).toBe('seiron-primary')
    })

    test('should return undefined for non-existent model', () => {
      const model = getModelConfig('non-existent')
      
      expect(model).toBeUndefined()
    })

    test('should get all model IDs', () => {
      const modelIds = getAllModelIds()
      
      expect(modelIds).toContain('seiron-primary')
      expect(modelIds).toContain('dragon-ascii')
      expect(modelIds.length).toBe(Object.keys(DRAGON_MODELS).length)
    })

    test('should get legacy model path', () => {
      const path = getLegacyModelPath('glb', 'lg')
      
      expect(path).toBe(DRAGON_MODELS['seiron-primary'].path)
    })

    test('should get model metadata by path', () => {
      const path = '/models/seiron.glb'
      const metadata = getModelMetadata(path)
      
      expect(metadata).toBeDefined()
      expect(metadata!.path).toBe(path)
    })
  })

  describe('Constants and Configuration', () => {
    test('should have valid constants', () => {
      expect(DRAGON_MODEL_CONSTANTS.DEFAULT_CACHE_SIZE).toBeGreaterThan(0)
      expect(DRAGON_MODEL_CONSTANTS.DEFAULT_PRELOAD_TIMEOUT).toBeGreaterThan(0)
      expect(DRAGON_MODEL_CONSTANTS.DEFAULT_QUALITY_FALLBACK_THRESHOLD).toBeGreaterThan(0)
      expect(DRAGON_MODEL_CONSTANTS.MAX_CONCURRENT_LOADS).toBeGreaterThan(0)
    })

    test('should have consistent model data', () => {
      Object.values(DRAGON_MODELS).forEach(model => {
        // Check that fallback models exist
        model.fallbackModels.forEach(fallbackId => {
          expect(DRAGON_MODELS[fallbackId]).toBeDefined()
        })

        // Check that alternative models exist
        model.alternativeModels.forEach(altId => {
          expect(DRAGON_MODELS[altId]).toBeDefined()
        })

        // Check that quality settings are consistent
        const qualities = Object.keys(model.qualitySettings)
        expect(qualities).toContain('low')
        expect(qualities).toContain('medium')
        expect(qualities).toContain('high')
        expect(qualities).toContain('ultra')
      })
    })
  })

  describe('Integration Tests', () => {
    test('should handle complete model selection workflow', async () => {
      // 1. Detect capabilities
      const capabilities = await DeviceCapabilityDetector.getInstance().detectCapabilities()
      
      // 2. Get recommended model
      const model = await getRecommendedModel('medium', 'voice-interface')
      
      // 3. Get optimal quality settings
      const qualitySettings = getOptimalQualitySettings(model, capabilities)
      
      // 4. Create fallback chain
      const fallbackChain = createFallbackChain(model.id)
      
      // 5. Preload model
      await ModelPreloader.getInstance().preloadModel(model)
      
      expect(capabilities).toBeDefined()
      expect(model).toBeDefined()
      expect(qualitySettings).toBeDefined()
      expect(fallbackChain.length).toBeGreaterThan(0)
      expect(ModelPreloader.getInstance().isModelPreloaded(model.id)).toBe(true)
    })

    test('should handle error scenarios gracefully', async () => {
      // Mock network failure
      ;(global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'))
      
      // Should still return a model (fallback)
      const model = await getRecommendedModel('high', 'voice-interface')
      expect(model).toBeDefined()
      
      // Should handle preload failure
      await expect(
        ModelPreloader.getInstance().preloadModel(model)
      ).rejects.toThrow('Network error')
    })
  })
})

// Property-based tests for model validation
describe('Property-based Model Validation', () => {
  test('all models should have valid performance profiles', () => {
    Object.values(DRAGON_MODELS).forEach(model => {
      // Performance values should be within reasonable ranges
      expect(model.performance.renderComplexity).toBeGreaterThanOrEqual(0)
      expect(model.performance.renderComplexity).toBeLessThanOrEqual(10)
      
      expect(model.performance.memoryUsageMB).toBeGreaterThanOrEqual(0)
      expect(model.performance.memoryUsageMB).toBeLessThan(1000) // Reasonable upper bound
      
      expect(model.performance.loadTimeMs).toBeGreaterThanOrEqual(0)
      expect(model.performance.loadTimeMs).toBeLessThan(30000) // 30 seconds max
      
      expect(model.performance.frameTimeMs).toBeGreaterThanOrEqual(4) // 240 FPS max
      expect(model.performance.frameTimeMs).toBeLessThan(100) // 10 FPS min
      
      expect(model.performance.cpuIntensity).toBeGreaterThanOrEqual(0)
      expect(model.performance.cpuIntensity).toBeLessThanOrEqual(10)
      
      expect(model.performance.gpuIntensity).toBeGreaterThanOrEqual(0)
      expect(model.performance.gpuIntensity).toBeLessThanOrEqual(10)
    })
  })

  test('fallback chains should never be circular', () => {
    Object.values(DRAGON_MODELS).forEach(model => {
      const visited = new Set<string>()
      const chain = createFallbackChain(model.id)
      
      chain.forEach(chainModel => {
        expect(visited.has(chainModel.id)).toBe(false)
        visited.add(chainModel.id)
      })
    })
  })

  test('quality settings should be progressive', () => {
    Object.values(DRAGON_MODELS).forEach(model => {
      const { low, medium, high, ultra } = model.qualitySettings
      
      // Texture sizes should increase with quality
      if (low.enabled && medium.enabled) {
        expect(medium.textureSize).toBeGreaterThanOrEqual(low.textureSize)
      }
      if (medium.enabled && high.enabled) {
        expect(high.textureSize).toBeGreaterThanOrEqual(medium.textureSize)
      }
      if (high.enabled && ultra.enabled) {
        expect(ultra.textureSize).toBeGreaterThanOrEqual(high.textureSize)
      }
    })
  })
})
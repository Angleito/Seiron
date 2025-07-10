/**
 * Comprehensive Dragon Model Configuration System
 * 
 * This file provides centralized configuration for all dragon models with:
 * - Performance profiles and device compatibility
 * - Quality settings and optimization parameters
 * - Model metadata and fallback chains
 * - Device-based recommendations and preloading strategies
 */

import { logger } from '@lib/logger'

// Core types for dragon model configuration
export type DragonModelFormat = 'glb' | 'gltf' | 'obj'
export type DragonModelQuality = 'low' | 'medium' | 'high' | 'ultra'
export type DragonModelSize = 'sm' | 'md' | 'lg' | 'xl' | 'gigantic'
export type DragonModelType = 'full' | 'head' | 'animated' | 'static'

// Device capability levels
export interface DeviceCapability {
  webgl2: boolean
  webgl1: boolean
  memoryMB: number
  maxTextureSize: number
  maxVertexCount: number
  isDesktop: boolean
  isMobile: boolean
  isTablet: boolean
  supportsHDR: boolean
  supportsFloat: boolean
  cpuCores: number
  gpuTier: 'low' | 'medium' | 'high'
}

// Performance profile for each model
export interface PerformanceProfile {
  renderComplexity: number // 1-10 scale
  memoryUsageMB: number
  loadTimeMs: number
  frameTimeMs: number
  vertexCount: number
  triangleCount: number
  textureMemoryMB: number
  recommendedFPS: number
  minDeviceMemoryMB: number
  cpuIntensity: number // 1-10 scale
  gpuIntensity: number // 1-10 scale
  batteryImpact: 'low' | 'medium' | 'high'
}

// Device compatibility ratings
export interface DeviceCompatibility {
  desktop: {
    supported: boolean
    performance: 'excellent' | 'good' | 'fair' | 'poor'
    fallbackRequired: boolean
  }
  mobile: {
    supported: boolean
    performance: 'excellent' | 'good' | 'fair' | 'poor'
    fallbackRequired: boolean
  }
  tablet: {
    supported: boolean
    performance: 'excellent' | 'good' | 'fair' | 'poor'
    fallbackRequired: boolean
  }
  lowEndDevice: {
    supported: boolean
    performance: 'excellent' | 'good' | 'fair' | 'poor'
    fallbackRequired: boolean
  }
}

// Model animation capabilities
export interface AnimationCapabilities {
  hasIdleAnimation: boolean
  hasVoiceReactiveAnimation: boolean
  hasEmotionAnimations: boolean
  hasSpecialEffects: boolean
  supportsMorphTargets: boolean
  supportsKeyframes: boolean
  maxConcurrentAnimations: number
  animationComplexity: number // 1-10 scale
}

// Scaling configuration for different sizes
export interface ScalingConfig {
  sm: { scale: number; position: [number, number, number] }
  md: { scale: number; position: [number, number, number] }
  lg: { scale: number; position: [number, number, number] }
  xl: { scale: number; position: [number, number, number] }
  gigantic: { scale: number; position: [number, number, number] }
}

// Material optimization settings
export interface MaterialConfig {
  diffuseTexture: string | null
  normalTexture: string | null
  metallicRoughnessTexture: string | null
  emissiveTexture: string | null
  hasTransparency: boolean
  supportsPBR: boolean
  materialComplexity: number // 1-10 scale
  shaderRequirements: string[]
  textureCompressionFormat: 'basis' | 'dds' | 'astc' | 'none'
}

// Quality settings per model
export interface QualitySettings {
  low: {
    enabled: boolean
    polygonReduction: number // 0-1 scale
    textureSize: number
    shadowQuality: 'none' | 'low' | 'medium' | 'high'
    antialiasingLevel: number
    effectsLevel: 'none' | 'minimal' | 'basic' | 'full'
  }
  medium: {
    enabled: boolean
    polygonReduction: number
    textureSize: number
    shadowQuality: 'none' | 'low' | 'medium' | 'high'
    antialiasingLevel: number
    effectsLevel: 'none' | 'minimal' | 'basic' | 'full'
  }
  high: {
    enabled: boolean
    polygonReduction: number
    textureSize: number
    shadowQuality: 'none' | 'low' | 'medium' | 'high'
    antialiasingLevel: number
    effectsLevel: 'none' | 'minimal' | 'basic' | 'full'
  }
  ultra: {
    enabled: boolean
    polygonReduction: number
    textureSize: number
    shadowQuality: 'none' | 'low' | 'medium' | 'high'
    antialiasingLevel: number
    effectsLevel: 'none' | 'minimal' | 'basic' | 'full'
  }
}

// Model features
export interface ModelFeatures {
  hasLevelOfDetail: boolean
  hasAnimations: boolean
  hasVoiceIntegration: boolean
  hasEmotionSystem: boolean
  hasParticleEffects: boolean
  hasPhysics: boolean
  hasCollisions: boolean
  hasEnvironmentMapping: boolean
  supportsMorphing: boolean
  supportsDeformation: boolean
  hasCustomShaders: boolean
  hasProceduralTextures: boolean
}

// Preloading strategy
export interface PreloadingStrategy {
  priority: 'low' | 'medium' | 'high' | 'critical'
  preloadOnHover: boolean
  preloadOnVisible: boolean
  preloadOnIdle: boolean
  preloadDependencies: string[]
  cacheStrategy: 'aggressive' | 'moderate' | 'conservative'
  maxCacheSize: number
  cacheEviction: 'lru' | 'lfu' | 'fifo'
}

// Main model configuration interface
export interface DragonModelConfig {
  id: string
  name: string
  displayName: string
  description: string
  path: string
  format: DragonModelFormat
  fileSize: number
  quality: DragonModelQuality
  type: DragonModelType
  version: string
  lastUpdated: string
  
  // Core configuration
  compatibility: DeviceCompatibility
  performance: PerformanceProfile
  features: ModelFeatures
  scaling: ScalingConfig
  animations: AnimationCapabilities
  materials: MaterialConfig
  qualitySettings: QualitySettings
  preloading: PreloadingStrategy
  
  // Use case specifications
  recommendedUseCases: string[]
  fallbackModels: string[]
  alternativeModels: string[]
  
  // Development metadata
  status: 'stable' | 'beta' | 'experimental' | 'deprecated'
  maintainer: string
  documentation: string
  changelog: string
}

// Global configuration constants
export const DRAGON_MODEL_CONSTANTS = {
  DEFAULT_CACHE_SIZE: 50, // MB
  DEFAULT_PRELOAD_TIMEOUT: 10000, // 10 seconds
  DEFAULT_QUALITY_FALLBACK_THRESHOLD: 30, // FPS
  DEFAULT_MEMORY_THRESHOLD: 512, // MB
  DEFAULT_TEXTURE_SIZE: 1024,
  MAX_CONCURRENT_LOADS: 3,
  PERFORMANCE_SAMPLE_RATE: 1000, // ms
  FALLBACK_DELAY: 500, // ms
  ERROR_RECOVERY_TIMEOUT: 2000, // ms
} as const

// Comprehensive model configurations
export const DRAGON_MODELS: Record<string, DragonModelConfig> = {
  // Primary optimized GLB model - Production ready
  'seiron-primary': {
    id: 'seiron-primary',
    name: 'seiron.glb',
    displayName: 'Seiron Primary',
    description: 'Main production-ready dragon model with optimal performance',
    path: '/models/seiron.glb',
    format: 'glb',
    fileSize: 1024 * 1024, // 1MB estimate
    quality: 'high',
    type: 'full',
    version: '1.2.0',
    lastUpdated: '2024-01-15',
    status: 'stable',
    maintainer: 'Seiron Team',
    documentation: '/docs/models/seiron-primary.md',
    changelog: '/docs/models/seiron-primary-changelog.md',
    
    compatibility: {
      desktop: { supported: true, performance: 'excellent', fallbackRequired: false },
      mobile: { supported: true, performance: 'good', fallbackRequired: false },
      tablet: { supported: true, performance: 'good', fallbackRequired: false },
      lowEndDevice: { supported: true, performance: 'fair', fallbackRequired: false }
    },
    
    performance: {
      renderComplexity: 6,
      memoryUsageMB: 24,
      loadTimeMs: 1500,
      frameTimeMs: 16,
      vertexCount: 12000,
      triangleCount: 24000,
      textureMemoryMB: 8,
      recommendedFPS: 60,
      minDeviceMemoryMB: 256,
      cpuIntensity: 4,
      gpuIntensity: 5,
      batteryImpact: 'medium'
    },
    
    features: {
      hasLevelOfDetail: false,
      hasAnimations: true,
      hasVoiceIntegration: true,
      hasEmotionSystem: true,
      hasParticleEffects: false,
      hasPhysics: false,
      hasCollisions: false,
      hasEnvironmentMapping: true,
      supportsMorphing: false,
      supportsDeformation: false,
      hasCustomShaders: false,
      hasProceduralTextures: false
    },
    
    scaling: {
      sm: { scale: 0.8, position: [0, -0.5, 0] },
      md: { scale: 1.0, position: [0, -0.8, 0] },
      lg: { scale: 1.3, position: [0, -1.0, 0] },
      xl: { scale: 1.6, position: [0, -1.2, 0] },
      gigantic: { scale: 2.0, position: [0, -1.5, 0] }
    },
    
    animations: {
      hasIdleAnimation: true,
      hasVoiceReactiveAnimation: true,
      hasEmotionAnimations: true,
      hasSpecialEffects: false,
      supportsMorphTargets: false,
      supportsKeyframes: true,
      maxConcurrentAnimations: 2,
      animationComplexity: 4
    },
    
    materials: {
      diffuseTexture: '/models/textures/Material.002_baseColor.webp',
      normalTexture: '/models/textures/Material.002_normal.webp',
      metallicRoughnessTexture: '/models/textures/Material.002_metallicRoughness.webp',
      emissiveTexture: '/models/textures/Material.002_emissive.webp',
      hasTransparency: false,
      supportsPBR: true,
      materialComplexity: 6,
      shaderRequirements: ['standard', 'pbr'],
      textureCompressionFormat: 'basis'
    },
    
    qualitySettings: {
      low: {
        enabled: true,
        polygonReduction: 0.5,
        textureSize: 512,
        shadowQuality: 'none',
        antialiasingLevel: 0,
        effectsLevel: 'minimal'
      },
      medium: {
        enabled: true,
        polygonReduction: 0.2,
        textureSize: 1024,
        shadowQuality: 'low',
        antialiasingLevel: 2,
        effectsLevel: 'basic'
      },
      high: {
        enabled: true,
        polygonReduction: 0.0,
        textureSize: 2048,
        shadowQuality: 'medium',
        antialiasingLevel: 4,
        effectsLevel: 'full'
      },
      ultra: {
        enabled: false,
        polygonReduction: 0.0,
        textureSize: 4096,
        shadowQuality: 'high',
        antialiasingLevel: 8,
        effectsLevel: 'full'
      }
    },
    
    preloading: {
      priority: 'critical',
      preloadOnHover: false,
      preloadOnVisible: true,
      preloadOnIdle: true,
      preloadDependencies: [],
      cacheStrategy: 'aggressive',
      maxCacheSize: 32,
      cacheEviction: 'lru'
    },
    
    recommendedUseCases: [
      'primary-display',
      'voice-interface',
      'mobile-optimized',
      'production-ready'
    ],
    fallbackModels: ['dragon-head-optimized', 'dragon-2d-sprite'],
    alternativeModels: ['seiron-animated', 'seiron-lod-high']
  },
  
  // High-quality animated model
  'seiron-animated': {
    id: 'seiron-animated',
    name: 'seiron_animated.gltf',
    displayName: 'Seiron Animated',
    description: 'High-quality animated dragon with advanced features',
    path: '/models/seiron_animated.gltf',
    format: 'gltf',
    fileSize: 2048 * 1024, // 2MB estimate
    quality: 'ultra',
    type: 'animated',
    version: '1.1.0',
    lastUpdated: '2024-01-10',
    status: 'stable',
    maintainer: 'Seiron Team',
    documentation: '/docs/models/seiron-animated.md',
    changelog: '/docs/models/seiron-animated-changelog.md',
    
    compatibility: {
      desktop: { supported: true, performance: 'excellent', fallbackRequired: false },
      mobile: { supported: false, performance: 'poor', fallbackRequired: true },
      tablet: { supported: true, performance: 'fair', fallbackRequired: false },
      lowEndDevice: { supported: false, performance: 'poor', fallbackRequired: true }
    },
    
    performance: {
      renderComplexity: 9,
      memoryUsageMB: 48,
      loadTimeMs: 3000,
      frameTimeMs: 20,
      vertexCount: 25000,
      triangleCount: 50000,
      textureMemoryMB: 16,
      recommendedFPS: 45,
      minDeviceMemoryMB: 512,
      cpuIntensity: 7,
      gpuIntensity: 8,
      batteryImpact: 'high'
    },
    
    features: {
      hasLevelOfDetail: true,
      hasAnimations: true,
      hasVoiceIntegration: true,
      hasEmotionSystem: true,
      hasParticleEffects: true,
      hasPhysics: true,
      hasCollisions: true,
      hasEnvironmentMapping: true,
      supportsMorphing: true,
      supportsDeformation: true,
      hasCustomShaders: true,
      hasProceduralTextures: false
    },
    
    scaling: {
      sm: { scale: 0.9, position: [0, -0.6, 0] },
      md: { scale: 1.1, position: [0, -0.9, 0] },
      lg: { scale: 1.4, position: [0, -1.1, 0] },
      xl: { scale: 1.7, position: [0, -1.3, 0] },
      gigantic: { scale: 2.1, position: [0, -1.6, 0] }
    },
    
    animations: {
      hasIdleAnimation: true,
      hasVoiceReactiveAnimation: true,
      hasEmotionAnimations: true,
      hasSpecialEffects: true,
      supportsMorphTargets: true,
      supportsKeyframes: true,
      maxConcurrentAnimations: 5,
      animationComplexity: 9
    },
    
    materials: {
      diffuseTexture: '/models/textures/Material.002_baseColor.webp',
      normalTexture: '/models/textures/Material.002_normal.webp',
      metallicRoughnessTexture: '/models/textures/Material.002_metallicRoughness.webp',
      emissiveTexture: '/models/textures/Material.002_emissive.webp',
      hasTransparency: true,
      supportsPBR: true,
      materialComplexity: 8,
      shaderRequirements: ['standard', 'pbr', 'custom'],
      textureCompressionFormat: 'basis'
    },
    
    qualitySettings: {
      low: {
        enabled: false,
        polygonReduction: 0.7,
        textureSize: 512,
        shadowQuality: 'none',
        antialiasingLevel: 0,
        effectsLevel: 'none'
      },
      medium: {
        enabled: true,
        polygonReduction: 0.3,
        textureSize: 1024,
        shadowQuality: 'low',
        antialiasingLevel: 2,
        effectsLevel: 'basic'
      },
      high: {
        enabled: true,
        polygonReduction: 0.1,
        textureSize: 2048,
        shadowQuality: 'medium',
        antialiasingLevel: 4,
        effectsLevel: 'full'
      },
      ultra: {
        enabled: true,
        polygonReduction: 0.0,
        textureSize: 4096,
        shadowQuality: 'high',
        antialiasingLevel: 8,
        effectsLevel: 'full'
      }
    },
    
    preloading: {
      priority: 'medium',
      preloadOnHover: true,
      preloadOnVisible: false,
      preloadOnIdle: true,
      preloadDependencies: ['seiron_animated.bin'],
      cacheStrategy: 'moderate',
      maxCacheSize: 64,
      cacheEviction: 'lru'
    },
    
    recommendedUseCases: [
      'desktop-showcase',
      'high-end-devices',
      'detailed-interactions',
      'premium-experience'
    ],
    fallbackModels: ['seiron-primary', 'dragon-head-optimized'],
    alternativeModels: ['seiron-lod-high', 'seiron-primary']
  },
  
  // Ultra-high quality LOD model
  'seiron-lod-high': {
    id: 'seiron-lod-high',
    name: 'seiron_animated_lod_high.gltf',
    displayName: 'Seiron LOD High',
    description: 'Ultra-high quality model with level-of-detail optimization',
    path: '/models/seiron_animated_lod_high.gltf',
    format: 'gltf',
    fileSize: 3072 * 1024, // 3MB estimate
    quality: 'ultra',
    type: 'animated',
    version: '1.0.0',
    lastUpdated: '2024-01-05',
    status: 'beta',
    maintainer: 'Seiron Team',
    documentation: '/docs/models/seiron-lod-high.md',
    changelog: '/docs/models/seiron-lod-high-changelog.md',
    
    compatibility: {
      desktop: { supported: true, performance: 'good', fallbackRequired: false },
      mobile: { supported: false, performance: 'poor', fallbackRequired: true },
      tablet: { supported: false, performance: 'poor', fallbackRequired: true },
      lowEndDevice: { supported: false, performance: 'poor', fallbackRequired: true }
    },
    
    performance: {
      renderComplexity: 10,
      memoryUsageMB: 72,
      loadTimeMs: 4500,
      frameTimeMs: 25,
      vertexCount: 45000,
      triangleCount: 90000,
      textureMemoryMB: 24,
      recommendedFPS: 30,
      minDeviceMemoryMB: 1024,
      cpuIntensity: 8,
      gpuIntensity: 9,
      batteryImpact: 'high'
    },
    
    features: {
      hasLevelOfDetail: true,
      hasAnimations: true,
      hasVoiceIntegration: true,
      hasEmotionSystem: true,
      hasParticleEffects: true,
      hasPhysics: true,
      hasCollisions: true,
      hasEnvironmentMapping: true,
      supportsMorphing: true,
      supportsDeformation: true,
      hasCustomShaders: true,
      hasProceduralTextures: true
    },
    
    scaling: {
      sm: { scale: 1.0, position: [0, -0.7, 0] },
      md: { scale: 1.2, position: [0, -1.0, 0] },
      lg: { scale: 1.5, position: [0, -1.2, 0] },
      xl: { scale: 1.8, position: [0, -1.4, 0] },
      gigantic: { scale: 2.2, position: [0, -1.7, 0] }
    },
    
    animations: {
      hasIdleAnimation: true,
      hasVoiceReactiveAnimation: true,
      hasEmotionAnimations: true,
      hasSpecialEffects: true,
      supportsMorphTargets: true,
      supportsKeyframes: true,
      maxConcurrentAnimations: 8,
      animationComplexity: 10
    },
    
    materials: {
      diffuseTexture: '/models/textures/Material.002_baseColor.webp',
      normalTexture: '/models/textures/Material.002_normal.webp',
      metallicRoughnessTexture: '/models/textures/Material.002_metallicRoughness.webp',
      emissiveTexture: '/models/textures/Material.002_emissive.webp',
      hasTransparency: true,
      supportsPBR: true,
      materialComplexity: 10,
      shaderRequirements: ['standard', 'pbr', 'custom', 'advanced'],
      textureCompressionFormat: 'basis'
    },
    
    qualitySettings: {
      low: {
        enabled: false,
        polygonReduction: 0.8,
        textureSize: 512,
        shadowQuality: 'none',
        antialiasingLevel: 0,
        effectsLevel: 'none'
      },
      medium: {
        enabled: false,
        polygonReduction: 0.5,
        textureSize: 1024,
        shadowQuality: 'low',
        antialiasingLevel: 2,
        effectsLevel: 'basic'
      },
      high: {
        enabled: true,
        polygonReduction: 0.2,
        textureSize: 2048,
        shadowQuality: 'medium',
        antialiasingLevel: 4,
        effectsLevel: 'full'
      },
      ultra: {
        enabled: true,
        polygonReduction: 0.0,
        textureSize: 4096,
        shadowQuality: 'high',
        antialiasingLevel: 8,
        effectsLevel: 'full'
      }
    },
    
    preloading: {
      priority: 'low',
      preloadOnHover: false,
      preloadOnVisible: false,
      preloadOnIdle: true,
      preloadDependencies: [],
      cacheStrategy: 'conservative',
      maxCacheSize: 96,
      cacheEviction: 'lfu'
    },
    
    recommendedUseCases: [
      'high-end-desktop',
      'showcase-mode',
      'professional-demos',
      'premium-tier'
    ],
    fallbackModels: ['seiron-animated', 'seiron-primary'],
    alternativeModels: ['seiron-animated', 'seiron-primary']
  },
  
  // Head-only model for focused interactions
  'dragon-head': {
    id: 'dragon-head',
    name: 'dragon_head.glb',
    displayName: 'Dragon Head',
    description: 'Focused dragon head model for close-up interactions',
    path: '/models/dragon_head.glb',
    format: 'glb',
    fileSize: 1536 * 1024, // 1.5MB estimate
    quality: 'high',
    type: 'head',
    version: '1.0.0',
    lastUpdated: '2024-01-01',
    status: 'stable',
    maintainer: 'Seiron Team',
    documentation: '/docs/models/dragon-head.md',
    changelog: '/docs/models/dragon-head-changelog.md',
    
    compatibility: {
      desktop: { supported: true, performance: 'excellent', fallbackRequired: false },
      mobile: { supported: true, performance: 'good', fallbackRequired: false },
      tablet: { supported: true, performance: 'good', fallbackRequired: false },
      lowEndDevice: { supported: true, performance: 'fair', fallbackRequired: false }
    },
    
    performance: {
      renderComplexity: 7,
      memoryUsageMB: 32,
      loadTimeMs: 2000,
      frameTimeMs: 18,
      vertexCount: 18000,
      triangleCount: 36000,
      textureMemoryMB: 12,
      recommendedFPS: 55,
      minDeviceMemoryMB: 256,
      cpuIntensity: 5,
      gpuIntensity: 6,
      batteryImpact: 'medium'
    },
    
    features: {
      hasLevelOfDetail: false,
      hasAnimations: true,
      hasVoiceIntegration: true,
      hasEmotionSystem: true,
      hasParticleEffects: false,
      hasPhysics: false,
      hasCollisions: false,
      hasEnvironmentMapping: true,
      supportsMorphing: true,
      supportsDeformation: false,
      hasCustomShaders: false,
      hasProceduralTextures: false
    },
    
    scaling: {
      sm: { scale: 1.2, position: [0, -0.3, 0] },
      md: { scale: 1.5, position: [0, -0.4, 0] },
      lg: { scale: 1.8, position: [0, -0.5, 0] },
      xl: { scale: 2.1, position: [0, -0.6, 0] },
      gigantic: { scale: 2.5, position: [0, -0.7, 0] }
    },
    
    animations: {
      hasIdleAnimation: true,
      hasVoiceReactiveAnimation: true,
      hasEmotionAnimations: true,
      hasSpecialEffects: false,
      supportsMorphTargets: true,
      supportsKeyframes: true,
      maxConcurrentAnimations: 3,
      animationComplexity: 6
    },
    
    materials: {
      diffuseTexture: '/models/textures/Material.002_baseColor.webp',
      normalTexture: '/models/textures/Material.002_normal.webp',
      metallicRoughnessTexture: '/models/textures/Material.002_metallicRoughness.webp',
      emissiveTexture: '/models/textures/Material.002_emissive.webp',
      hasTransparency: false,
      supportsPBR: true,
      materialComplexity: 7,
      shaderRequirements: ['standard', 'pbr'],
      textureCompressionFormat: 'basis'
    },
    
    qualitySettings: {
      low: {
        enabled: true,
        polygonReduction: 0.4,
        textureSize: 512,
        shadowQuality: 'none',
        antialiasingLevel: 0,
        effectsLevel: 'minimal'
      },
      medium: {
        enabled: true,
        polygonReduction: 0.2,
        textureSize: 1024,
        shadowQuality: 'low',
        antialiasingLevel: 2,
        effectsLevel: 'basic'
      },
      high: {
        enabled: true,
        polygonReduction: 0.0,
        textureSize: 2048,
        shadowQuality: 'medium',
        antialiasingLevel: 4,
        effectsLevel: 'full'
      },
      ultra: {
        enabled: false,
        polygonReduction: 0.0,
        textureSize: 4096,
        shadowQuality: 'high',
        antialiasingLevel: 8,
        effectsLevel: 'full'
      }
    },
    
    preloading: {
      priority: 'medium',
      preloadOnHover: true,
      preloadOnVisible: true,
      preloadOnIdle: false,
      preloadDependencies: [],
      cacheStrategy: 'moderate',
      maxCacheSize: 40,
      cacheEviction: 'lru'
    },
    
    recommendedUseCases: [
      'voice-interface',
      'close-up-interactions',
      'portrait-mode',
      'conversation-focus'
    ],
    fallbackModels: ['dragon-head-optimized', 'dragon-2d-sprite'],
    alternativeModels: ['dragon-head-optimized', 'seiron-primary']
  },
  
  // Optimized head model for mobile
  'dragon-head-optimized': {
    id: 'dragon-head-optimized',
    name: 'dragon_head_optimized.glb',
    displayName: 'Dragon Head Optimized',
    description: 'Mobile-optimized dragon head with reduced polygon count',
    path: '/models/dragon_head_optimized.glb',
    format: 'glb',
    fileSize: 512 * 1024, // 512KB estimate
    quality: 'medium',
    type: 'head',
    version: '1.1.0',
    lastUpdated: '2024-01-12',
    status: 'stable',
    maintainer: 'Seiron Team',
    documentation: '/docs/models/dragon-head-optimized.md',
    changelog: '/docs/models/dragon-head-optimized-changelog.md',
    
    compatibility: {
      desktop: { supported: true, performance: 'excellent', fallbackRequired: false },
      mobile: { supported: true, performance: 'excellent', fallbackRequired: false },
      tablet: { supported: true, performance: 'excellent', fallbackRequired: false },
      lowEndDevice: { supported: true, performance: 'good', fallbackRequired: false }
    },
    
    performance: {
      renderComplexity: 4,
      memoryUsageMB: 16,
      loadTimeMs: 800,
      frameTimeMs: 12,
      vertexCount: 6000,
      triangleCount: 12000,
      textureMemoryMB: 4,
      recommendedFPS: 60,
      minDeviceMemoryMB: 128,
      cpuIntensity: 3,
      gpuIntensity: 3,
      batteryImpact: 'low'
    },
    
    features: {
      hasLevelOfDetail: false,
      hasAnimations: true,
      hasVoiceIntegration: true,
      hasEmotionSystem: true,
      hasParticleEffects: false,
      hasPhysics: false,
      hasCollisions: false,
      hasEnvironmentMapping: false,
      supportsMorphing: false,
      supportsDeformation: false,
      hasCustomShaders: false,
      hasProceduralTextures: false
    },
    
    scaling: {
      sm: { scale: 1.0, position: [0, -0.2, 0] },
      md: { scale: 1.3, position: [0, -0.3, 0] },
      lg: { scale: 1.6, position: [0, -0.4, 0] },
      xl: { scale: 1.9, position: [0, -0.5, 0] },
      gigantic: { scale: 2.3, position: [0, -0.6, 0] }
    },
    
    animations: {
      hasIdleAnimation: true,
      hasVoiceReactiveAnimation: true,
      hasEmotionAnimations: true,
      hasSpecialEffects: false,
      supportsMorphTargets: false,
      supportsKeyframes: true,
      maxConcurrentAnimations: 2,
      animationComplexity: 3
    },
    
    materials: {
      diffuseTexture: '/models/textures/Material.002_baseColor.webp',
      normalTexture: null,
      metallicRoughnessTexture: null,
      emissiveTexture: null,
      hasTransparency: false,
      supportsPBR: false,
      materialComplexity: 3,
      shaderRequirements: ['standard'],
      textureCompressionFormat: 'basis'
    },
    
    qualitySettings: {
      low: {
        enabled: true,
        polygonReduction: 0.3,
        textureSize: 256,
        shadowQuality: 'none',
        antialiasingLevel: 0,
        effectsLevel: 'none'
      },
      medium: {
        enabled: true,
        polygonReduction: 0.1,
        textureSize: 512,
        shadowQuality: 'none',
        antialiasingLevel: 0,
        effectsLevel: 'minimal'
      },
      high: {
        enabled: true,
        polygonReduction: 0.0,
        textureSize: 1024,
        shadowQuality: 'low',
        antialiasingLevel: 2,
        effectsLevel: 'basic'
      },
      ultra: {
        enabled: false,
        polygonReduction: 0.0,
        textureSize: 2048,
        shadowQuality: 'medium',
        antialiasingLevel: 4,
        effectsLevel: 'full'
      }
    },
    
    preloading: {
      priority: 'high',
      preloadOnHover: false,
      preloadOnVisible: true,
      preloadOnIdle: true,
      preloadDependencies: [],
      cacheStrategy: 'aggressive',
      maxCacheSize: 20,
      cacheEviction: 'lru'
    },
    
    recommendedUseCases: [
      'mobile-primary',
      'low-end-devices',
      'battery-conservation',
      'quick-loading'
    ],
    fallbackModels: ['dragon-2d-sprite', 'dragon-ascii'],
    alternativeModels: ['dragon-head', 'seiron-primary']
  },
  
  // 2D sprite fallback
  'dragon-2d-sprite': {
    id: 'dragon-2d-sprite',
    name: 'dragon-2d-sprite',
    displayName: 'Dragon 2D Sprite',
    description: 'CSS-based 2D dragon sprite for broad compatibility',
    path: 'internal://2d-sprite',
    format: 'obj', // Placeholder - this is actually CSS
    fileSize: 0,
    quality: 'low',
    type: 'static',
    version: '1.0.0',
    lastUpdated: '2024-01-01',
    status: 'stable',
    maintainer: 'Seiron Team',
    documentation: '/docs/models/dragon-2d-sprite.md',
    changelog: '/docs/models/dragon-2d-sprite-changelog.md',
    
    compatibility: {
      desktop: { supported: true, performance: 'excellent', fallbackRequired: false },
      mobile: { supported: true, performance: 'excellent', fallbackRequired: false },
      tablet: { supported: true, performance: 'excellent', fallbackRequired: false },
      lowEndDevice: { supported: true, performance: 'excellent', fallbackRequired: false }
    },
    
    performance: {
      renderComplexity: 1,
      memoryUsageMB: 1,
      loadTimeMs: 100,
      frameTimeMs: 8,
      vertexCount: 0,
      triangleCount: 0,
      textureMemoryMB: 0,
      recommendedFPS: 60,
      minDeviceMemoryMB: 64,
      cpuIntensity: 1,
      gpuIntensity: 1,
      batteryImpact: 'low'
    },
    
    features: {
      hasLevelOfDetail: false,
      hasAnimations: true,
      hasVoiceIntegration: true,
      hasEmotionSystem: true,
      hasParticleEffects: false,
      hasPhysics: false,
      hasCollisions: false,
      hasEnvironmentMapping: false,
      supportsMorphing: false,
      supportsDeformation: false,
      hasCustomShaders: false,
      hasProceduralTextures: false
    },
    
    scaling: {
      sm: { scale: 0.6, position: [0, 0, 0] },
      md: { scale: 0.8, position: [0, 0, 0] },
      lg: { scale: 1.0, position: [0, 0, 0] },
      xl: { scale: 1.2, position: [0, 0, 0] },
      gigantic: { scale: 1.5, position: [0, 0, 0] }
    },
    
    animations: {
      hasIdleAnimation: true,
      hasVoiceReactiveAnimation: true,
      hasEmotionAnimations: true,
      hasSpecialEffects: false,
      supportsMorphTargets: false,
      supportsKeyframes: false,
      maxConcurrentAnimations: 1,
      animationComplexity: 1
    },
    
    materials: {
      diffuseTexture: null,
      normalTexture: null,
      metallicRoughnessTexture: null,
      emissiveTexture: null,
      hasTransparency: false,
      supportsPBR: false,
      materialComplexity: 1,
      shaderRequirements: [],
      textureCompressionFormat: 'none'
    },
    
    qualitySettings: {
      low: {
        enabled: true,
        polygonReduction: 0.0,
        textureSize: 0,
        shadowQuality: 'none',
        antialiasingLevel: 0,
        effectsLevel: 'none'
      },
      medium: {
        enabled: true,
        polygonReduction: 0.0,
        textureSize: 0,
        shadowQuality: 'none',
        antialiasingLevel: 0,
        effectsLevel: 'minimal'
      },
      high: {
        enabled: true,
        polygonReduction: 0.0,
        textureSize: 0,
        shadowQuality: 'none',
        antialiasingLevel: 0,
        effectsLevel: 'basic'
      },
      ultra: {
        enabled: false,
        polygonReduction: 0.0,
        textureSize: 0,
        shadowQuality: 'none',
        antialiasingLevel: 0,
        effectsLevel: 'basic'
      }
    },
    
    preloading: {
      priority: 'critical',
      preloadOnHover: false,
      preloadOnVisible: false,
      preloadOnIdle: false,
      preloadDependencies: [],
      cacheStrategy: 'aggressive',
      maxCacheSize: 1,
      cacheEviction: 'lru'
    },
    
    recommendedUseCases: [
      'fallback-rendering',
      'ultra-low-end',
      'emergency-fallback',
      'accessibility-mode'
    ],
    fallbackModels: ['dragon-ascii'],
    alternativeModels: ['dragon-ascii']
  },
  
  // ASCII fallback
  'dragon-ascii': {
    id: 'dragon-ascii',
    name: 'dragon-ascii',
    displayName: 'Dragon ASCII',
    description: 'Terminal-style ASCII dragon art for maximum compatibility',
    path: 'internal://ascii-dragon',
    format: 'obj', // Placeholder - this is actually text
    fileSize: 0,
    quality: 'low',
    type: 'static',
    version: '1.0.0',
    lastUpdated: '2024-01-01',
    status: 'stable',
    maintainer: 'Seiron Team',
    documentation: '/docs/models/dragon-ascii.md',
    changelog: '/docs/models/dragon-ascii-changelog.md',
    
    compatibility: {
      desktop: { supported: true, performance: 'excellent', fallbackRequired: false },
      mobile: { supported: true, performance: 'excellent', fallbackRequired: false },
      tablet: { supported: true, performance: 'excellent', fallbackRequired: false },
      lowEndDevice: { supported: true, performance: 'excellent', fallbackRequired: false }
    },
    
    performance: {
      renderComplexity: 0,
      memoryUsageMB: 0,
      loadTimeMs: 50,
      frameTimeMs: 4,
      vertexCount: 0,
      triangleCount: 0,
      textureMemoryMB: 0,
      recommendedFPS: 60,
      minDeviceMemoryMB: 32,
      cpuIntensity: 0,
      gpuIntensity: 0,
      batteryImpact: 'low'
    },
    
    features: {
      hasLevelOfDetail: false,
      hasAnimations: true,
      hasVoiceIntegration: true,
      hasEmotionSystem: true,
      hasParticleEffects: false,
      hasPhysics: false,
      hasCollisions: false,
      hasEnvironmentMapping: false,
      supportsMorphing: false,
      supportsDeformation: false,
      hasCustomShaders: false,
      hasProceduralTextures: false
    },
    
    scaling: {
      sm: { scale: 0.7, position: [0, 0, 0] },
      md: { scale: 0.9, position: [0, 0, 0] },
      lg: { scale: 1.1, position: [0, 0, 0] },
      xl: { scale: 1.3, position: [0, 0, 0] },
      gigantic: { scale: 1.6, position: [0, 0, 0] }
    },
    
    animations: {
      hasIdleAnimation: true,
      hasVoiceReactiveAnimation: true,
      hasEmotionAnimations: true,
      hasSpecialEffects: false,
      supportsMorphTargets: false,
      supportsKeyframes: false,
      maxConcurrentAnimations: 1,
      animationComplexity: 0
    },
    
    materials: {
      diffuseTexture: null,
      normalTexture: null,
      metallicRoughnessTexture: null,
      emissiveTexture: null,
      hasTransparency: false,
      supportsPBR: false,
      materialComplexity: 0,
      shaderRequirements: [],
      textureCompressionFormat: 'none'
    },
    
    qualitySettings: {
      low: {
        enabled: true,
        polygonReduction: 0.0,
        textureSize: 0,
        shadowQuality: 'none',
        antialiasingLevel: 0,
        effectsLevel: 'none'
      },
      medium: {
        enabled: true,
        polygonReduction: 0.0,
        textureSize: 0,
        shadowQuality: 'none',
        antialiasingLevel: 0,
        effectsLevel: 'none'
      },
      high: {
        enabled: true,
        polygonReduction: 0.0,
        textureSize: 0,
        shadowQuality: 'none',
        antialiasingLevel: 0,
        effectsLevel: 'none'
      },
      ultra: {
        enabled: false,
        polygonReduction: 0.0,
        textureSize: 0,
        shadowQuality: 'none',
        antialiasingLevel: 0,
        effectsLevel: 'none'
      }
    },
    
    preloading: {
      priority: 'critical',
      preloadOnHover: false,
      preloadOnVisible: false,
      preloadOnIdle: false,
      preloadDependencies: [],
      cacheStrategy: 'aggressive',
      maxCacheSize: 1,
      cacheEviction: 'lru'
    },
    
    recommendedUseCases: [
      'ultimate-fallback',
      'text-only-mode',
      'accessibility-maximum',
      'emergency-rendering'
    ],
    fallbackModels: [],
    alternativeModels: ['dragon-2d-sprite']
  }
}

// Device capability detection utilities
export class DeviceCapabilityDetector {
  private static instance: DeviceCapabilityDetector
  private capabilities: DeviceCapability | null = null
  
  static getInstance(): DeviceCapabilityDetector {
    if (!DeviceCapabilityDetector.instance) {
      DeviceCapabilityDetector.instance = new DeviceCapabilityDetector()
    }
    return DeviceCapabilityDetector.instance
  }
  
  async detectCapabilities(): Promise<DeviceCapability> {
    if (this.capabilities) {
      return this.capabilities
    }
    
    // Detect WebGL capabilities
    const canvas = document.createElement('canvas')
    const webgl2 = !!canvas.getContext('webgl2')
    const webgl1 = !!canvas.getContext('webgl') || !!canvas.getContext('experimental-webgl')
    
    // Estimate device memory
    const memoryMB = (navigator as any).deviceMemory 
      ? (navigator as any).deviceMemory * 1024 
      : this.estimateDeviceMemory()
    
    // Detect device type
    const userAgent = navigator.userAgent
    const isDesktop = !/Mobile|Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent)
    const isMobile = /Mobile|Android|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent)
    const isTablet = /iPad|Android(?!.*Mobile)/i.test(userAgent)
    
    // Detect GPU tier
    const gpuTier = await this.detectGPUTier()
    
    // Detect CPU cores
    const cpuCores = navigator.hardwareConcurrency || 4
    
    // Get WebGL context info
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl')
    const maxTextureSize = gl ? gl.getParameter(gl.MAX_TEXTURE_SIZE) : 2048
    const maxVertexCount = gl ? gl.getParameter(gl.MAX_VERTEX_ATTRIBS) : 16
    
    // Detect HDR and float support
    const supportsHDR = webgl2 && gl ? this.checkHDRSupport(gl) : false
    const supportsFloat = webgl1 && gl ? this.checkFloatSupport(gl) : false
    
    this.capabilities = {
      webgl2,
      webgl1,
      memoryMB,
      maxTextureSize,
      maxVertexCount,
      isDesktop,
      isMobile,
      isTablet,
      supportsHDR,
      supportsFloat,
      cpuCores,
      gpuTier
    }
    
    return this.capabilities
  }
  
  private estimateDeviceMemory(): number {
    // Fallback memory estimation based on device type
    const userAgent = navigator.userAgent
    
    if (/iPhone|iPad|iPod/i.test(userAgent)) {
      return 2048 // iOS devices typically have 2-4GB
    } else if (/Android/i.test(userAgent)) {
      return 1536 // Android devices vary widely
    } else {
      return 4096 // Desktop fallback
    }
  }
  
  private async detectGPUTier(): Promise<'low' | 'medium' | 'high'> {
    const canvas = document.createElement('canvas')
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl')
    
    if (!gl) return 'low'
    
    // Get GPU info
    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info')
    const renderer = debugInfo ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) : ''
    
    // Simple GPU classification
    if (renderer.includes('GTX') || renderer.includes('RTX') || renderer.includes('Radeon')) {
      return 'high'
    } else if (renderer.includes('Intel') || renderer.includes('Iris')) {
      return 'medium'
    } else {
      return 'low'
    }
  }
  
  private checkHDRSupport(gl: WebGLRenderingContext | WebGL2RenderingContext): boolean {
    return gl.getExtension('EXT_color_buffer_float') !== null
  }
  
  private checkFloatSupport(gl: WebGLRenderingContext | WebGL2RenderingContext): boolean {
    return gl.getExtension('OES_texture_float') !== null
  }
}

// Model selection utilities
export class DragonModelSelector {
  private static instance: DragonModelSelector
  private capabilityDetector: DeviceCapabilityDetector
  
  static getInstance(): DragonModelSelector {
    if (!DragonModelSelector.instance) {
      DragonModelSelector.instance = new DragonModelSelector()
    }
    return DragonModelSelector.instance
  }
  
  constructor() {
    this.capabilityDetector = DeviceCapabilityDetector.getInstance()
  }
  
  async getRecommendedModel(
    preferredQuality: DragonModelQuality = 'medium',
    useCase: string = 'general'
  ): Promise<DragonModelConfig> {
    const capabilities = await this.capabilityDetector.detectCapabilities()
    
    // Filter models by device capabilities
    const compatibleModels = this.getCompatibleModels(capabilities)
    
    // Filter by use case
    const useCaseModels = compatibleModels.filter(model =>
      model.recommendedUseCases.includes(useCase) ||
      model.recommendedUseCases.includes('general')
    )
    
    // Sort by quality preference and performance
    const sortedModels = this.sortModelsByPreference(
      useCaseModels,
      preferredQuality,
      capabilities
    )
    
    // Return the best match
    return sortedModels[0] || DRAGON_MODELS['dragon-ascii']
  }
  
  getCompatibleModels(capabilities: DeviceCapability): DragonModelConfig[] {
    return Object.values(DRAGON_MODELS).filter(model => {
      // Check basic compatibility
      if (capabilities.isDesktop && model.compatibility.desktop.supported) {
        return model.compatibility.desktop.performance !== 'poor'
      } else if (capabilities.isMobile && model.compatibility.mobile.supported) {
        return model.compatibility.mobile.performance !== 'poor'
      } else if (capabilities.isTablet && model.compatibility.tablet.supported) {
        return model.compatibility.tablet.performance !== 'poor'
      }
      
      // Check memory requirements
      if (capabilities.memoryMB < model.performance.minDeviceMemoryMB) {
        return false
      }
      
      // Check WebGL requirements
      if (model.format === 'glb' || model.format === 'gltf') {
        return capabilities.webgl1 || capabilities.webgl2
      }
      
      return true
    })
  }
  
  private sortModelsByPreference(
    models: DragonModelConfig[],
    preferredQuality: DragonModelQuality,
    capabilities: DeviceCapability
  ): DragonModelConfig[] {
    return models.sort((a, b) => {
      // Priority 1: Quality match
      const aQualityMatch = a.quality === preferredQuality ? 2 : 0
      const bQualityMatch = b.quality === preferredQuality ? 2 : 0
      
      // Priority 2: Performance compatibility
      const aPerformanceScore = this.getPerformanceScore(a, capabilities)
      const bPerformanceScore = this.getPerformanceScore(b, capabilities)
      
      // Priority 3: Feature richness
      const aFeatureScore = this.getFeatureScore(a)
      const bFeatureScore = this.getFeatureScore(b)
      
      const aScore = aQualityMatch + aPerformanceScore + aFeatureScore
      const bScore = bQualityMatch + bPerformanceScore + bFeatureScore
      
      return bScore - aScore
    })
  }
  
  private getPerformanceScore(model: DragonModelConfig, capabilities: DeviceCapability): number {
    let score = 0
    
    // Memory efficiency
    if (model.performance.memoryUsageMB < capabilities.memoryMB * 0.1) {
      score += 3
    } else if (model.performance.memoryUsageMB < capabilities.memoryMB * 0.2) {
      score += 2
    } else if (model.performance.memoryUsageMB < capabilities.memoryMB * 0.3) {
      score += 1
    }
    
    // GPU efficiency
    if (capabilities.gpuTier === 'high' && model.performance.gpuIntensity <= 8) {
      score += 2
    } else if (capabilities.gpuTier === 'medium' && model.performance.gpuIntensity <= 6) {
      score += 2
    } else if (capabilities.gpuTier === 'low' && model.performance.gpuIntensity <= 4) {
      score += 2
    }
    
    // Battery efficiency for mobile
    if (capabilities.isMobile && model.performance.batteryImpact === 'low') {
      score += 2
    }
    
    return score
  }
  
  private getFeatureScore(model: DragonModelConfig): number {
    let score = 0
    
    // Voice integration
    if (model.features.hasVoiceIntegration) score += 1
    
    // Animations
    if (model.features.hasAnimations) score += 1
    
    // Emotion system
    if (model.features.hasEmotionSystem) score += 1
    
    // Advanced features
    if (model.features.hasParticleEffects) score += 0.5
    if (model.features.hasCustomShaders) score += 0.5
    
    return score
  }
  
  createFallbackChain(primaryModel: DragonModelConfig): DragonModelConfig[] {
    const chain: DragonModelConfig[] = [primaryModel]
    
    // Add explicit fallback models
    for (const fallbackId of primaryModel.fallbackModels) {
      const fallbackModel = DRAGON_MODELS[fallbackId]
      if (fallbackModel) {
        chain.push(fallbackModel)
      }
    }
    
    // Ensure we have ASCII as ultimate fallback
    if (!chain.find(model => model.id === 'dragon-ascii')) {
      chain.push(DRAGON_MODELS['dragon-ascii'])
    }
    
    return chain
  }
  
  getOptimalQualitySettings(
    model: DragonModelConfig,
    capabilities: DeviceCapability
  ): QualitySettings[keyof QualitySettings] {
    // Determine optimal quality level based on capabilities
    let targetQuality: keyof QualitySettings = 'medium'
    
    if (capabilities.gpuTier === 'high' && capabilities.memoryMB >= 2048) {
      targetQuality = 'high'
    } else if (capabilities.gpuTier === 'medium' && capabilities.memoryMB >= 1024) {
      targetQuality = 'medium'
    } else {
      targetQuality = 'low'
    }
    
    // Check if the model supports the target quality
    const qualitySettings = model.qualitySettings[targetQuality]
    if (!qualitySettings.enabled) {
      // Find the highest available quality
      const availableQualities = Object.entries(model.qualitySettings)
        .filter(([_, settings]) => settings.enabled)
        .map(([quality, _]) => quality as keyof QualitySettings)
      
      if (availableQualities.length > 0) {
        targetQuality = availableQualities[availableQualities.length - 1]
      }
    }
    
    return model.qualitySettings[targetQuality]
  }
}

// Model preloading utilities
export class ModelPreloader {
  private static instance: ModelPreloader
  private preloadedModels: Map<string, Promise<any>> = new Map()
  private cacheSize: number = 0
  private maxCacheSize: number = DRAGON_MODEL_CONSTANTS.DEFAULT_CACHE_SIZE * 1024 * 1024 // Convert to bytes
  
  static getInstance(): ModelPreloader {
    if (!ModelPreloader.instance) {
      ModelPreloader.instance = new ModelPreloader()
    }
    return ModelPreloader.instance
  }
  
  async preloadModel(model: DragonModelConfig): Promise<void> {
    const modelId = model.id
    
    if (this.preloadedModels.has(modelId)) {
      return this.preloadedModels.get(modelId)
    }
    
    const preloadPromise = this.performPreload(model)
    this.preloadedModels.set(modelId, preloadPromise)
    
    try {
      await preloadPromise
      this.cacheSize += model.fileSize
      this.checkCacheSize()
    } catch (error) {
      // Remove failed preload
      this.preloadedModels.delete(modelId)
      logger.error(`Failed to preload model ${modelId}:`, error)
      throw error
    }
  }
  
  private async performPreload(model: DragonModelConfig): Promise<void> {
    if (model.path.startsWith('internal://')) {
      // Internal models don't need preloading
      return Promise.resolve()
    }
    
    // Preload the main model file
    const response = await fetch(model.path, {
      method: 'GET',
      headers: {
        'Cache-Control': 'max-age=31536000' // 1 year
      }
    })
    
    if (!response.ok) {
      throw new Error(`Failed to preload model ${model.id}: ${response.status}`)
    }
    
    // Preload dependencies
    for (const depPath of model.preloading.preloadDependencies) {
      await fetch(depPath, {
        method: 'GET',
        headers: {
          'Cache-Control': 'max-age=31536000'
        }
      })
    }
    
    // Preload textures
    const texturePromises: Promise<void>[] = []
    
    if (model.materials.diffuseTexture) {
      texturePromises.push(this.preloadTexture(model.materials.diffuseTexture))
    }
    if (model.materials.normalTexture) {
      texturePromises.push(this.preloadTexture(model.materials.normalTexture))
    }
    if (model.materials.metallicRoughnessTexture) {
      texturePromises.push(this.preloadTexture(model.materials.metallicRoughnessTexture))
    }
    if (model.materials.emissiveTexture) {
      texturePromises.push(this.preloadTexture(model.materials.emissiveTexture))
    }
    
    await Promise.all(texturePromises)
  }
  
  private async preloadTexture(texturePath: string): Promise<void> {
    const response = await fetch(texturePath, {
      method: 'GET',
      headers: {
        'Cache-Control': 'max-age=31536000'
      }
    })
    
    if (!response.ok) {
      logger.warn(`Failed to preload texture ${texturePath}: ${response.status}`)
    }
  }
  
  private checkCacheSize(): void {
    if (this.cacheSize > this.maxCacheSize) {
      // Implement LRU cache eviction
      const models = Array.from(this.preloadedModels.entries())
      const modelsToEvict = models.slice(0, Math.floor(models.length * 0.3))
      
      for (const [modelId, _] of modelsToEvict) {
        this.preloadedModels.delete(modelId)
        
        // Estimate and subtract file size
        const model = Object.values(DRAGON_MODELS).find(m => m.id === modelId)
        if (model) {
          this.cacheSize -= model.fileSize
        }
      }
      
      logger.info(`Evicted ${modelsToEvict.length} models from cache`)
    }
  }
  
  async preloadModelSet(modelIds: string[]): Promise<void> {
    const preloadPromises = modelIds.map(id => {
      const model = DRAGON_MODELS[id]
      if (model) {
        return this.preloadModel(model)
      }
      return Promise.resolve()
    })
    
    await Promise.all(preloadPromises)
  }
  
  isModelPreloaded(modelId: string): boolean {
    return this.preloadedModels.has(modelId)
  }
  
  clearCache(): void {
    this.preloadedModels.clear()
    this.cacheSize = 0
  }
}

// Utility functions for model management
export function getModelsByDeviceCapability(capabilities: DeviceCapability): DragonModelConfig[] {
  const selector = DragonModelSelector.getInstance()
  return selector.getCompatibleModels(capabilities)
}

export async function getRecommendedModel(
  preferredQuality: DragonModelQuality = 'medium',
  useCase: string = 'general'
): Promise<DragonModelConfig> {
  const selector = DragonModelSelector.getInstance()
  return selector.getRecommendedModel(preferredQuality, useCase)
}

export function getOptimalQualitySettings(
  model: DragonModelConfig,
  capabilities: DeviceCapability
): QualitySettings[keyof QualitySettings] {
  const selector = DragonModelSelector.getInstance()
  return selector.getOptimalQualitySettings(model, capabilities)
}

export function createFallbackChain(primaryModelId: string): DragonModelConfig[] {
  const primaryModel = DRAGON_MODELS[primaryModelId]
  if (!primaryModel) {
    return [DRAGON_MODELS['dragon-ascii']]
  }
  
  const selector = DragonModelSelector.getInstance()
  return selector.createFallbackChain(primaryModel)
}

export async function preloadModelSet(modelIds: string[]): Promise<void> {
  const preloader = ModelPreloader.getInstance()
  return preloader.preloadModelSet(modelIds)
}

export function getModelConfig(modelId: string): DragonModelConfig | undefined {
  return DRAGON_MODELS[modelId]
}

export function getAllModelIds(): string[] {
  return Object.keys(DRAGON_MODELS)
}

export function getModelsByQuality(quality: DragonModelQuality): DragonModelConfig[] {
  return Object.values(DRAGON_MODELS).filter(model => model.quality === quality)
}

export function getModelsByType(type: DragonModelType): DragonModelConfig[] {
  return Object.values(DRAGON_MODELS).filter(model => model.type === type)
}

export function getModelsByUseCase(useCase: string): DragonModelConfig[] {
  return Object.values(DRAGON_MODELS).filter(model =>
    model.recommendedUseCases.includes(useCase)
  )
}

// Performance monitoring for models
export class ModelPerformanceMonitor {
  private static instance: ModelPerformanceMonitor
  private performanceData: Map<string, PerformanceProfile> = new Map()
  
  static getInstance(): ModelPerformanceMonitor {
    if (!ModelPerformanceMonitor.instance) {
      ModelPerformanceMonitor.instance = new ModelPerformanceMonitor()
    }
    return ModelPerformanceMonitor.instance
  }
  
  recordModelPerformance(modelId: string, metrics: Partial<PerformanceProfile>): void {
    const existing = this.performanceData.get(modelId)
    const updated = { ...existing, ...metrics } as PerformanceProfile
    this.performanceData.set(modelId, updated)
  }
  
  getModelPerformance(modelId: string): PerformanceProfile | undefined {
    return this.performanceData.get(modelId)
  }
  
  getAveragePerformance(): PerformanceProfile {
    const allMetrics = Array.from(this.performanceData.values())
    
    if (allMetrics.length === 0) {
      return {
        renderComplexity: 0,
        memoryUsageMB: 0,
        loadTimeMs: 0,
        frameTimeMs: 0,
        vertexCount: 0,
        triangleCount: 0,
        textureMemoryMB: 0,
        recommendedFPS: 60,
        minDeviceMemoryMB: 0,
        cpuIntensity: 0,
        gpuIntensity: 0,
        batteryImpact: 'low'
      }
    }
    
    const avg = allMetrics.reduce((acc, metrics) => ({
      renderComplexity: acc.renderComplexity + metrics.renderComplexity,
      memoryUsageMB: acc.memoryUsageMB + metrics.memoryUsageMB,
      loadTimeMs: acc.loadTimeMs + metrics.loadTimeMs,
      frameTimeMs: acc.frameTimeMs + metrics.frameTimeMs,
      vertexCount: acc.vertexCount + metrics.vertexCount,
      triangleCount: acc.triangleCount + metrics.triangleCount,
      textureMemoryMB: acc.textureMemoryMB + metrics.textureMemoryMB,
      recommendedFPS: acc.recommendedFPS + metrics.recommendedFPS,
      minDeviceMemoryMB: acc.minDeviceMemoryMB + metrics.minDeviceMemoryMB,
      cpuIntensity: acc.cpuIntensity + metrics.cpuIntensity,
      gpuIntensity: acc.gpuIntensity + metrics.gpuIntensity,
      batteryImpact: acc.batteryImpact // Keep last value
    }))
    
    const count = allMetrics.length
    
    return {
      renderComplexity: avg.renderComplexity / count,
      memoryUsageMB: avg.memoryUsageMB / count,
      loadTimeMs: avg.loadTimeMs / count,
      frameTimeMs: avg.frameTimeMs / count,
      vertexCount: avg.vertexCount / count,
      triangleCount: avg.triangleCount / count,
      textureMemoryMB: avg.textureMemoryMB / count,
      recommendedFPS: avg.recommendedFPS / count,
      minDeviceMemoryMB: avg.minDeviceMemoryMB / count,
      cpuIntensity: avg.cpuIntensity / count,
      gpuIntensity: avg.gpuIntensity / count,
      batteryImpact: avg.batteryImpact
    }
  }
}

// Export the main configuration and utilities
export default {
  DRAGON_MODELS,
  DRAGON_MODEL_CONSTANTS,
  DeviceCapabilityDetector,
  DragonModelSelector,
  ModelPreloader,
  ModelPerformanceMonitor,
  getModelsByDeviceCapability,
  getRecommendedModel,
  getOptimalQualitySettings,
  createFallbackChain,
  preloadModelSet,
  getModelConfig,
  getAllModelIds,
  getModelsByQuality,
  getModelsByType,
  getModelsByUseCase
}
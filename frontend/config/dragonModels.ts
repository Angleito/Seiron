/**
 * Simplified Dragon Model Configuration System
 * 
 * Focused on Seiron Animated model with basic fallbacks
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

// Simplified model configurations - Focus on Seiron Animated
export const DRAGON_MODELS: Record<string, DragonModelConfig> = {
  // Primary animated model - MAIN MODEL
  'seiron-animated': {
    id: 'seiron-animated',
    name: 'seiron_animated.gltf',
    displayName: 'Seiron Animated',
    description: 'Primary animated dragon with voice integration and advanced features',
    path: '/models/seiron_animated.gltf',
    format: 'gltf',
    fileSize: 2048 * 1024, // 2MB estimate
    quality: 'high',
    type: 'animated',
    version: '1.1.0',
    lastUpdated: '2024-01-10',
    status: 'stable',
    maintainer: 'Seiron Team',
    documentation: '/docs/models/seiron-animated.md',
    changelog: '/docs/models/seiron-animated-changelog.md',
    
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
      frameTimeMs: 16,
      vertexCount: 20000,
      triangleCount: 40000,
      textureMemoryMB: 12,
      recommendedFPS: 60,
      minDeviceMemoryMB: 256,
      cpuIntensity: 5,
      gpuIntensity: 6,
      batteryImpact: 'medium'
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
      diffuseTexture: '/models/textures/Material.002_baseColor.png',
      normalTexture: '/models/textures/Material.002_normal.png',
      metallicRoughnessTexture: '/models/textures/Material.002_metallicRoughness.png',
      emissiveTexture: '/models/textures/Material.002_emissive.png',
      hasTransparency: true,
      supportsPBR: true,
      materialComplexity: 8,
      shaderRequirements: ['standard', 'pbr', 'custom'],
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
      priority: 'critical',
      preloadOnHover: false,
      preloadOnVisible: true,
      preloadOnIdle: true,
      preloadDependencies: ['seiron_animated.bin'],
      cacheStrategy: 'aggressive',
      maxCacheSize: 64,
      cacheEviction: 'lru'
    },
    
    recommendedUseCases: [
      'primary-display',
      'voice-interface',
      'animation-showcase',
      'desktop-experience',
      'mobile-experience'
    ],
    fallbackModels: ['seiron-backup', 'dragon-2d-sprite'],
    alternativeModels: ['seiron-backup']
  },
  
  // Fallback GLB model - Simple backup
  'seiron-backup': {
    id: 'seiron-backup',
    name: 'seiron.glb',
    displayName: 'Seiron Backup',
    description: 'Simple GLB fallback model for compatibility',
    path: '/models/seiron.glb',
    format: 'glb',
    fileSize: 1024 * 1024, // 1MB estimate
    quality: 'medium',
    type: 'static',
    version: '1.0.0',
    lastUpdated: '2024-01-15',
    status: 'stable',
    maintainer: 'Seiron Team',
    documentation: '/docs/models/seiron-backup.md',
    changelog: '/docs/models/seiron-backup-changelog.md',
    
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
      vertexCount: 8000,
      triangleCount: 16000,
      textureMemoryMB: 6,
      recommendedFPS: 60,
      minDeviceMemoryMB: 128,
      cpuIntensity: 3,
      gpuIntensity: 4,
      batteryImpact: 'low'
    },
    
    features: {
      hasLevelOfDetail: false,
      hasAnimations: false,
      hasVoiceIntegration: true,
      hasEmotionSystem: false,
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
      sm: { scale: 0.8, position: [0, -0.5, 0] },
      md: { scale: 1.0, position: [0, -0.8, 0] },
      lg: { scale: 1.3, position: [0, -1.0, 0] },
      xl: { scale: 1.6, position: [0, -1.2, 0] },
      gigantic: { scale: 2.0, position: [0, -1.5, 0] }
    },
    
    animations: {
      hasIdleAnimation: false,
      hasVoiceReactiveAnimation: true,
      hasEmotionAnimations: false,
      hasSpecialEffects: false,
      supportsMorphTargets: false,
      supportsKeyframes: false,
      maxConcurrentAnimations: 1,
      animationComplexity: 2
    },
    
    materials: {
      diffuseTexture: '/models/textures/Material.002_baseColor.png',
      normalTexture: '/models/textures/Material.002_normal.png',
      metallicRoughnessTexture: '/models/textures/Material.002_metallicRoughness.png',
      emissiveTexture: '/models/textures/Material.002_emissive.png',
      hasTransparency: false,
      supportsPBR: true,
      materialComplexity: 4,
      shaderRequirements: ['standard', 'pbr'],
      textureCompressionFormat: 'basis'
    },
    
    qualitySettings: {
      low: {
        enabled: true,
        polygonReduction: 0.3,
        textureSize: 512,
        shadowQuality: 'none',
        antialiasingLevel: 0,
        effectsLevel: 'minimal'
      },
      medium: {
        enabled: true,
        polygonReduction: 0.1,
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
      preloadOnHover: false,
      preloadOnVisible: true,
      preloadOnIdle: true,
      preloadDependencies: [],
      cacheStrategy: 'moderate',
      maxCacheSize: 20,
      cacheEviction: 'lru'
    },
    
    recommendedUseCases: [
      'fallback-rendering',
      'mobile-optimized',
      'low-end-devices',
      'battery-conservation'
    ],
    fallbackModels: ['dragon-2d-sprite', 'dragon-ascii'],
    alternativeModels: ['dragon-2d-sprite']
  },

  // Additional optimized models based on actual files
  'seiron-animated-optimized': {
    id: 'seiron-animated-optimized',
    name: 'seiron_animated_optimized.gltf',
    displayName: 'Seiron Animated (Optimized)',
    description: 'Optimized animated dragon for better performance',
    path: '/models/seiron_animated_optimized.gltf',
    format: 'gltf',
    fileSize: 917 * 1024, // 917KB
    quality: 'high',
    type: 'animated',
    version: '1.0.0',
    lastUpdated: '2024-07-08',
    status: 'stable',
    maintainer: 'Seiron Team',
    documentation: '/docs/models/seiron-animated-optimized.md',
    changelog: '/docs/models/seiron-animated-optimized-changelog.md',
    
    compatibility: {
      desktop: { supported: true, performance: 'excellent', fallbackRequired: false },
      mobile: { supported: true, performance: 'excellent', fallbackRequired: false },
      tablet: { supported: true, performance: 'excellent', fallbackRequired: false },
      lowEndDevice: { supported: true, performance: 'good', fallbackRequired: false }
    },
    
    performance: {
      renderComplexity: 5,
      memoryUsageMB: 24,
      loadTimeMs: 1500,
      frameTimeMs: 14,
      vertexCount: 12000,
      triangleCount: 24000,
      textureMemoryMB: 8,
      recommendedFPS: 60,
      minDeviceMemoryMB: 128,
      cpuIntensity: 4,
      gpuIntensity: 5,
      batteryImpact: 'low'
    },
    
    features: {
      hasLevelOfDetail: true,
      hasAnimations: true,
      hasVoiceIntegration: true,
      hasEmotionSystem: true,
      hasParticleEffects: true,
      hasPhysics: false,
      hasCollisions: false,
      hasEnvironmentMapping: true,
      supportsMorphing: true,
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
      hasSpecialEffects: true,
      supportsMorphTargets: true,
      supportsKeyframes: true,
      maxConcurrentAnimations: 3,
      animationComplexity: 7
    },
    
    materials: {
      diffuseTexture: '/models/textures/Material.002_baseColor.png',
      normalTexture: '/models/textures/Material.002_normal.png',
      metallicRoughnessTexture: '/models/textures/Material.002_metallicRoughness.png',
      emissiveTexture: '/models/textures/Material.002_emissive.png',
      hasTransparency: true,
      supportsPBR: true,
      materialComplexity: 6,
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
      priority: 'high',
      preloadOnHover: false,
      preloadOnVisible: true,
      preloadOnIdle: true,
      preloadDependencies: [],
      cacheStrategy: 'aggressive',
      maxCacheSize: 32,
      cacheEviction: 'lru'
    },
    
    recommendedUseCases: [
      'primary-display-optimized',
      'mobile-experience',
      'performance-mode',
      'battery-conservation'
    ],
    fallbackModels: ['seiron-optimized', 'dragon-head-optimized'],
    alternativeModels: ['seiron-backup', 'seiron-optimized']
  },

  'seiron-lod-high': {
    id: 'seiron-lod-high',
    name: 'seiron_animated_lod_high.gltf',
    displayName: 'Seiron LOD High',
    description: 'High level-of-detail animated dragon',
    path: '/models/seiron_animated_lod_high.gltf',
    format: 'gltf',
    fileSize: 998 * 1024, // 998KB
    quality: 'ultra',
    type: 'animated',
    version: '1.0.0',
    lastUpdated: '2024-07-08',
    status: 'stable',
    maintainer: 'Seiron Team',
    documentation: '/docs/models/seiron-lod-high.md',
    changelog: '/docs/models/seiron-lod-high-changelog.md',
    
    compatibility: {
      desktop: { supported: true, performance: 'excellent', fallbackRequired: false },
      mobile: { supported: true, performance: 'good', fallbackRequired: false },
      tablet: { supported: true, performance: 'good', fallbackRequired: false },
      lowEndDevice: { supported: false, performance: 'poor', fallbackRequired: true }
    },
    
    performance: {
      renderComplexity: 8,
      memoryUsageMB: 40,
      loadTimeMs: 2500,
      frameTimeMs: 18,
      vertexCount: 25000,
      triangleCount: 50000,
      textureMemoryMB: 16,
      recommendedFPS: 45,
      minDeviceMemoryMB: 512,
      cpuIntensity: 6,
      gpuIntensity: 7,
      batteryImpact: 'medium'
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
      maxConcurrentAnimations: 6,
      animationComplexity: 9
    },
    
    materials: {
      diffuseTexture: '/models/textures/Material.002_baseColor.png',
      normalTexture: '/models/textures/Material.002_normal.png',
      metallicRoughnessTexture: '/models/textures/Material.002_metallicRoughness.png',
      emissiveTexture: '/models/textures/Material.002_emissive.png',
      hasTransparency: true,
      supportsPBR: true,
      materialComplexity: 8,
      shaderRequirements: ['standard', 'pbr', 'custom'],
      textureCompressionFormat: 'basis'
    },
    
    qualitySettings: {
      low: {
        enabled: false,
        polygonReduction: 0.6,
        textureSize: 512,
        shadowQuality: 'none',
        antialiasingLevel: 0,
        effectsLevel: 'minimal'
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
      preloadOnHover: false,
      preloadOnVisible: false,
      preloadOnIdle: true,
      preloadDependencies: [],
      cacheStrategy: 'moderate',
      maxCacheSize: 64,
      cacheEviction: 'lru'
    },
    
    recommendedUseCases: [
      'desktop-experience',
      'high-end-mobile',
      'showcase-mode',
      'maximum-quality'
    ],
    fallbackModels: ['seiron-animated', 'seiron-animated-optimized'],
    alternativeModels: ['seiron-animated']
  },

  'seiron-optimized': {
    id: 'seiron-optimized',
    name: 'seiron_optimized.glb',
    displayName: 'Seiron (Optimized)',
    description: 'Optimized static dragon for maximum performance',
    path: '/models/seiron_optimized.glb',
    format: 'glb',
    fileSize: 167 * 1024, // 167KB
    quality: 'medium',
    type: 'static',
    version: '1.0.0',
    lastUpdated: '2024-07-08',
    status: 'stable',
    maintainer: 'Seiron Team',
    documentation: '/docs/models/seiron-optimized.md',
    changelog: '/docs/models/seiron-optimized-changelog.md',
    
    compatibility: {
      desktop: { supported: true, performance: 'excellent', fallbackRequired: false },
      mobile: { supported: true, performance: 'excellent', fallbackRequired: false },
      tablet: { supported: true, performance: 'excellent', fallbackRequired: false },
      lowEndDevice: { supported: true, performance: 'excellent', fallbackRequired: false }
    },
    
    performance: {
      renderComplexity: 2,
      memoryUsageMB: 8,
      loadTimeMs: 400,
      frameTimeMs: 8,
      vertexCount: 4000,
      triangleCount: 8000,
      textureMemoryMB: 3,
      recommendedFPS: 60,
      minDeviceMemoryMB: 64,
      cpuIntensity: 2,
      gpuIntensity: 2,
      batteryImpact: 'low'
    },
    
    features: {
      hasLevelOfDetail: false,
      hasAnimations: false,
      hasVoiceIntegration: true,
      hasEmotionSystem: false,
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
      sm: { scale: 0.7, position: [0, -0.4, 0] },
      md: { scale: 0.9, position: [0, -0.7, 0] },
      lg: { scale: 1.2, position: [0, -0.9, 0] },
      xl: { scale: 1.5, position: [0, -1.1, 0] },
      gigantic: { scale: 1.9, position: [0, -1.4, 0] }
    },
    
    animations: {
      hasIdleAnimation: false,
      hasVoiceReactiveAnimation: true,
      hasEmotionAnimations: false,
      hasSpecialEffects: false,
      supportsMorphTargets: false,
      supportsKeyframes: false,
      maxConcurrentAnimations: 1,
      animationComplexity: 1
    },
    
    materials: {
      diffuseTexture: '/models/textures/Material.002_baseColor.png',
      normalTexture: '/models/textures/Material.002_normal.png',
      metallicRoughnessTexture: '/models/textures/Material.002_metallicRoughness.png',
      emissiveTexture: '/models/textures/Material.002_emissive.png',
      hasTransparency: false,
      supportsPBR: true,
      materialComplexity: 3,
      shaderRequirements: ['standard'],
      textureCompressionFormat: 'basis'
    },
    
    qualitySettings: {
      low: {
        enabled: true,
        polygonReduction: 0.2,
        textureSize: 256,
        shadowQuality: 'none',
        antialiasingLevel: 0,
        effectsLevel: 'none'
      },
      medium: {
        enabled: true,
        polygonReduction: 0.0,
        textureSize: 512,
        shadowQuality: 'low',
        antialiasingLevel: 2,
        effectsLevel: 'minimal'
      },
      high: {
        enabled: true,
        polygonReduction: 0.0,
        textureSize: 1024,
        shadowQuality: 'medium',
        antialiasingLevel: 4,
        effectsLevel: 'basic'
      },
      ultra: {
        enabled: false,
        polygonReduction: 0.0,
        textureSize: 2048,
        shadowQuality: 'high',
        antialiasingLevel: 8,
        effectsLevel: 'basic'
      }
    },
    
    preloading: {
      priority: 'critical',
      preloadOnHover: false,
      preloadOnVisible: true,
      preloadOnIdle: true,
      preloadDependencies: [],
      cacheStrategy: 'aggressive',
      maxCacheSize: 16,
      cacheEviction: 'lru'
    },
    
    recommendedUseCases: [
      'performance-mode',
      'mobile-experience',
      'low-end-devices',
      'battery-conservation',
      'emergency-fallback'
    ],
    fallbackModels: ['dragon-head-optimized', 'dragon-2d-sprite'],
    alternativeModels: ['dragon-head-optimized']
  },

  'dragon-head-optimized': {
    id: 'dragon-head-optimized',
    name: 'dragon_head_optimized.glb',
    displayName: 'Dragon Head (Optimized)',
    description: 'Optimized dragon head for maximum compatibility',
    path: '/models/dragon_head_optimized.glb',
    format: 'glb',
    fileSize: 109 * 1024, // 109KB
    quality: 'low',
    type: 'static',
    version: '1.0.0',
    lastUpdated: '2024-07-08',
    status: 'stable',
    maintainer: 'Seiron Team',
    documentation: '/docs/models/dragon-head-optimized.md',
    changelog: '/docs/models/dragon-head-optimized-changelog.md',
    
    compatibility: {
      desktop: { supported: true, performance: 'excellent', fallbackRequired: false },
      mobile: { supported: true, performance: 'excellent', fallbackRequired: false },
      tablet: { supported: true, performance: 'excellent', fallbackRequired: false },
      lowEndDevice: { supported: true, performance: 'excellent', fallbackRequired: false }
    },
    
    performance: {
      renderComplexity: 1,
      memoryUsageMB: 4,
      loadTimeMs: 200,
      frameTimeMs: 6,
      vertexCount: 2000,
      triangleCount: 4000,
      textureMemoryMB: 2,
      recommendedFPS: 60,
      minDeviceMemoryMB: 32,
      cpuIntensity: 1,
      gpuIntensity: 1,
      batteryImpact: 'low'
    },
    
    features: {
      hasLevelOfDetail: false,
      hasAnimations: false,
      hasVoiceIntegration: true,
      hasEmotionSystem: false,
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
      sm: { scale: 0.6, position: [0, -0.3, 0] },
      md: { scale: 0.8, position: [0, -0.5, 0] },
      lg: { scale: 1.0, position: [0, -0.7, 0] },
      xl: { scale: 1.3, position: [0, -0.9, 0] },
      gigantic: { scale: 1.6, position: [0, -1.2, 0] }
    },
    
    animations: {
      hasIdleAnimation: false,
      hasVoiceReactiveAnimation: true,
      hasEmotionAnimations: false,
      hasSpecialEffects: false,
      supportsMorphTargets: false,
      supportsKeyframes: false,
      maxConcurrentAnimations: 1,
      animationComplexity: 0
    },
    
    materials: {
      diffuseTexture: '/models/textures/Material.002_baseColor.png',
      normalTexture: null,
      metallicRoughnessTexture: null,
      emissiveTexture: null,
      hasTransparency: false,
      supportsPBR: false,
      materialComplexity: 1,
      shaderRequirements: ['basic'],
      textureCompressionFormat: 'none'
    },
    
    qualitySettings: {
      low: {
        enabled: true,
        polygonReduction: 0.0,
        textureSize: 256,
        shadowQuality: 'none',
        antialiasingLevel: 0,
        effectsLevel: 'none'
      },
      medium: {
        enabled: true,
        polygonReduction: 0.0,
        textureSize: 512,
        shadowQuality: 'none',
        antialiasingLevel: 0,
        effectsLevel: 'none'
      },
      high: {
        enabled: true,
        polygonReduction: 0.0,
        textureSize: 1024,
        shadowQuality: 'low',
        antialiasingLevel: 2,
        effectsLevel: 'minimal'
      },
      ultra: {
        enabled: false,
        polygonReduction: 0.0,
        textureSize: 2048,
        shadowQuality: 'low',
        antialiasingLevel: 2,
        effectsLevel: 'minimal'
      }
    },
    
    preloading: {
      priority: 'critical',
      preloadOnHover: false,
      preloadOnVisible: true,
      preloadOnIdle: true,
      preloadDependencies: [],
      cacheStrategy: 'aggressive',
      maxCacheSize: 8,
      cacheEviction: 'lru'
    },
    
    recommendedUseCases: [
      'ultra-low-end',
      'emergency-fallback',
      'minimal-mode',
      'accessibility-mode'
    ],
    fallbackModels: ['dragon-2d-sprite', 'dragon-ascii'],
    alternativeModels: ['dragon-2d-sprite']
  },

  'dragon-head': {
    id: 'dragon-head',
    name: 'dragon_head.glb',
    displayName: 'Dragon Head (Detailed)',
    description: 'Detailed dragon head model',
    path: '/models/dragon_head.glb',
    format: 'glb',
    fileSize: 706 * 1024, // 706KB
    quality: 'high',
    type: 'static',
    version: '1.0.0',
    lastUpdated: '2024-07-08',
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
      renderComplexity: 4,
      memoryUsageMB: 16,
      loadTimeMs: 800,
      frameTimeMs: 12,
      vertexCount: 8000,
      triangleCount: 16000,
      textureMemoryMB: 6,
      recommendedFPS: 60,
      minDeviceMemoryMB: 128,
      cpuIntensity: 3,
      gpuIntensity: 4,
      batteryImpact: 'low'
    },
    
    features: {
      hasLevelOfDetail: false,
      hasAnimations: false,
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
      sm: { scale: 0.7, position: [0, -0.4, 0] },
      md: { scale: 0.9, position: [0, -0.6, 0] },
      lg: { scale: 1.2, position: [0, -0.8, 0] },
      xl: { scale: 1.5, position: [0, -1.0, 0] },
      gigantic: { scale: 1.8, position: [0, -1.3, 0] }
    },
    
    animations: {
      hasIdleAnimation: false,
      hasVoiceReactiveAnimation: true,
      hasEmotionAnimations: true,
      hasSpecialEffects: false,
      supportsMorphTargets: false,
      supportsKeyframes: false,
      maxConcurrentAnimations: 1,
      animationComplexity: 2
    },
    
    materials: {
      diffuseTexture: '/models/textures/Material.002_baseColor.png',
      normalTexture: '/models/textures/Material.002_normal.png',
      metallicRoughnessTexture: '/models/textures/Material.002_metallicRoughness.png',
      emissiveTexture: '/models/textures/Material.002_emissive.png',
      hasTransparency: false,
      supportsPBR: true,
      materialComplexity: 5,
      shaderRequirements: ['standard', 'pbr'],
      textureCompressionFormat: 'basis'
    },
    
    qualitySettings: {
      low: {
        enabled: true,
        polygonReduction: 0.3,
        textureSize: 512,
        shadowQuality: 'none',
        antialiasingLevel: 0,
        effectsLevel: 'minimal'
      },
      medium: {
        enabled: true,
        polygonReduction: 0.1,
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
      preloadOnHover: false,
      preloadOnVisible: true,
      preloadOnIdle: true,
      preloadDependencies: [],
      cacheStrategy: 'moderate',
      maxCacheSize: 24,
      cacheEviction: 'lru'
    },
    
    recommendedUseCases: [
      'detail-showcase',
      'desktop-experience',
      'high-quality-fallback'
    ],
    fallbackModels: ['dragon-head-optimized', 'seiron-optimized'],
    alternativeModels: ['dragon-head-optimized']
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

// Default model recommendations
export function getDefaultModel(): string {
  return 'seiron-animated'
}

export function getDefaultFallback(): string {
  return 'seiron-backup'
}

export function getUltimateFallback(): string {
  return 'dragon-ascii'
}

// Export utilities
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

// Export the main configuration
export default {
  DRAGON_MODELS,
  DRAGON_MODEL_CONSTANTS,
  getDefaultModel,
  getDefaultFallback,
  getUltimateFallback,
  getModelConfig,
  getAllModelIds,
  getModelsByQuality,
  getModelsByType,
  getModelsByUseCase
}
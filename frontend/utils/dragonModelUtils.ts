/**
 * Dragon Model Configuration Integration Utilities
 * 
 * Simplified utility functions for integrating the dragon model configuration
 * system with existing components and hooks.
 */

import React, { useState, useEffect, useMemo } from 'react'
import { 
  DragonModelConfig,
  getDefaultModel,
  getDefaultFallback,
  getModelConfig,
  getModelsByQuality,
  getModelsByType,
  getModelsByUseCase,
  DRAGON_MODELS,
  DRAGON_MODEL_CONSTANTS
} from '@config/dragonModels'
import { logger } from '@lib/logger'

// Simplified device capability detection
export interface SimpleDeviceCapability {
  isDesktop: boolean
  isMobile: boolean
  isTablet: boolean
  hasWebGL: boolean
  memoryMB: number
}

// Basic device detection
export function detectSimpleDeviceCapability(): SimpleDeviceCapability {
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
  const isTablet = /iPad|Android.*Tablet/i.test(navigator.userAgent)
  const isDesktop = !isMobile && !isTablet
  
  // Basic WebGL detection
  let hasWebGL = false
  try {
    const canvas = document.createElement('canvas')
    hasWebGL = !!(canvas.getContext('webgl') || canvas.getContext('experimental-webgl'))
  } catch (e) {
    hasWebGL = false
  }
  
  // Rough memory estimation
  const memoryMB = (navigator as any).deviceMemory ? (navigator as any).deviceMemory * 1024 : 2048
  
  return {
    isDesktop,
    isMobile,
    isTablet,
    hasWebGL,
    memoryMB
  }
}

// Dragon model configuration hook
export function useDragonModelConfiguration(preferredModelId?: string) {
  const [currentModel, setCurrentModel] = useState<DragonModelConfig | null>(null)
  const [deviceCapability, setDeviceCapability] = useState<SimpleDeviceCapability | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    const initialize = async () => {
      try {
        setIsLoading(true)
        
        // Detect device capabilities
        const device = detectSimpleDeviceCapability()
        setDeviceCapability(device)
        
        // Choose model
        let modelId = preferredModelId || getDefaultModel()
        
        // Simple fallback logic
        if (!device.hasWebGL) {
          modelId = 'dragon-ascii'
        } else if (device.isMobile && device.memoryMB < 2048) {
          modelId = getDefaultFallback()
        }
        
        const model = getModelConfig(modelId)
        if (!model) {
          throw new Error(`Model not found: ${modelId}`)
        }
        
        setCurrentModel(model)
        setError(null)
        
        logger.info('Dragon model configuration initialized:', {
          modelId: model.id,
          device: device
        })
      } catch (err) {
        logger.error('Failed to initialize dragon model configuration:', err)
        setError(err as Error)
      } finally {
        setIsLoading(false)
      }
    }

    initialize()
  }, [preferredModelId])

  return {
    currentModel,
    deviceCapability,
    isLoading,
    error,
    reload: () => {
      setIsLoading(true)
      setError(null)
    }
  }
}

// Enhanced dragon renderer props
export interface EnhancedDragonRendererProps {
  preferredModelId?: string
  autoOptimizeQuality?: boolean
  enableFallback?: boolean
  fallbackType?: 'ascii' | '2d' | '3d'
  onModelLoad?: (model: DragonModelConfig) => void
  onModelError?: (error: Error, modelId: string) => void
  onFallback?: (from: string, to: string) => void
  performanceMode?: 'auto' | 'high' | 'medium' | 'low'
  className?: string
  style?: React.CSSProperties
}

// Smart model selector (simplified)
export class SmartModelSelector {
  static selectOptimalModel(device: SimpleDeviceCapability): DragonModelConfig {
    if (!device.hasWebGL) {
      return getModelConfig('dragon-ascii')!
    }
    
    if (device.isMobile && device.memoryMB < 2048) {
      return getModelConfig(getDefaultFallback())!
    }
    
    return getModelConfig(getDefaultModel())!
  }
  
  static createFallbackChain(device: SimpleDeviceCapability): DragonModelConfig[] {
    const models = []
    
    if (device.hasWebGL && !device.isMobile) {
      models.push(getModelConfig(getDefaultModel())!)
    }
    
    models.push(getModelConfig(getDefaultFallback())!)
    models.push(getModelConfig('dragon-2d-sprite')!)
    models.push(getModelConfig('dragon-ascii')!)
    
    return models.filter(Boolean)
  }
}

// Model performance optimizer (simplified)
export class ModelPerformanceOptimizer {
  static getOptimalQualityLevel(device: SimpleDeviceCapability): 'low' | 'medium' | 'high' | 'ultra' {
    if (!device.hasWebGL || device.memoryMB < 1024) {
      return 'low'
    }
    
    if (device.isMobile || device.memoryMB < 4096) {
      return 'medium'
    }
    
    if (device.isDesktop && device.memoryMB >= 8192) {
      return 'high'
    }
    
    return 'medium'
  }
  
  static shouldEnableEffects(device: SimpleDeviceCapability): boolean {
    return device.hasWebGL && device.memoryMB >= 2048 && !device.isMobile
  }
}

// Export utilities
export const dragonModelUtils = {
  detectSimpleDeviceCapability,
  SmartModelSelector,
  ModelPerformanceOptimizer,
  DRAGON_MODELS,
  DRAGON_MODEL_CONSTANTS
}

export default dragonModelUtils
/**
 * Enhanced Dragon Renderer with Model Configuration System
 * 
 * Simplified version that integrates the dragon model configuration system
 * with the existing DragonRenderer for backwards compatibility.
 */

'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { DragonRenderer, VoiceAnimationState } from './DragonRenderer'
import { 
  DragonModelConfig,
  getDefaultModel,
  getDefaultFallback,
  getModelConfig,
  DRAGON_MODELS
} from '@config/dragonModels'
import { logger } from '@lib/logger'

// Extended props combining old and new systems
export interface EnhancedDragonRendererProps {
  // Legacy props for backward compatibility
  modelPath?: string
  dragonType?: 'ascii' | '2d' | '3d'
  size?: 'sm' | 'md' | 'lg' | 'xl'
  voiceState?: VoiceAnimationState
  
  // Enhanced props
  preferredModelId?: string
  autoOptimizeQuality?: boolean
  enableFallback?: boolean
  fallbackType?: 'ascii' | '2d' | '3d'
  onModelLoad?: (modelConfig: DragonModelConfig) => void
  onModelError?: (error: Error, modelId: string) => void
  onFallback?: (from: string, to: string) => void
  performanceMode?: 'auto' | 'high' | 'medium' | 'low'
  
  // Additional configuration
  className?: string
  style?: React.CSSProperties
}

/**
 * Enhanced Dragon Renderer Component
 * 
 * This component provides an improved dragon rendering experience with:
 * - Automatic model selection based on device capabilities
 * - Performance optimization
 * - Robust fallback system
 * - Legacy compatibility
 */
export const EnhancedDragonRenderer: React.FC<EnhancedDragonRendererProps> = ({
  modelPath,
  dragonType = '3d',
  size = 'lg',
  voiceState,
  preferredModelId,
  autoOptimizeQuality = true,
  enableFallback = true,
  fallbackType = '2d',
  onModelLoad,
  onModelError,
  onFallback,
  performanceMode = 'auto',
  className,
  style,
  ...props
}) => {
  const [currentModelConfig, setCurrentModelConfig] = useState<DragonModelConfig | null>(null)
  const [currentDragonType, setCurrentDragonType] = useState<'ascii' | '2d' | '3d'>(dragonType)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  // Initialize model configuration
  useEffect(() => {
    const initializeModel = async () => {
      try {
        setIsLoading(true)
        setError(null)

        // Determine which model to use
        let modelId: string
        if (preferredModelId) {
          modelId = preferredModelId
        } else if (modelPath) {
          // Try to find model by path
          const foundModel = Object.values(DRAGON_MODELS).find(m => m.path === modelPath)
          modelId = foundModel?.id || getDefaultModel()
        } else {
          modelId = getDefaultModel()
        }

        // Get model configuration
        const modelConfig = getModelConfig(modelId)
        if (!modelConfig) {
          throw new Error(`Model configuration not found for: ${modelId}`)
        }

        setCurrentModelConfig(modelConfig)
        
        // Determine dragon type based on model
        let selectedDragonType = dragonType
        if (modelConfig.type === 'animated' || modelConfig.format === 'gltf' || modelConfig.format === 'glb') {
          selectedDragonType = '3d'
        } else if (modelConfig.id === 'dragon-2d-sprite') {
          selectedDragonType = '2d'
        } else if (modelConfig.id === 'dragon-ascii') {
          selectedDragonType = 'ascii'
        }
        
        setCurrentDragonType(selectedDragonType)
        
        // Call load callback
        onModelLoad?.(modelConfig)
        
        logger.info('Enhanced dragon renderer initialized:', {
          modelId: modelConfig.id,
          dragonType: selectedDragonType,
          format: modelConfig.format
        })

        setIsLoading(false)
      } catch (initError) {
        logger.error('Failed to initialize enhanced dragon renderer:', initError)
        setError(initError as Error)
        
        // Try fallback if enabled
        if (enableFallback) {
          await handleFallback(initError as Error)
        } else {
          setIsLoading(false)
        }
      }
    }

    initializeModel()
  }, [preferredModelId, modelPath, dragonType, enableFallback])

  // Handle fallback scenarios
  const handleFallback = useCallback(async (fallbackError: Error) => {
    try {
      logger.warn('Attempting fallback due to error:', fallbackError.message)
      
      const originalType = currentDragonType
      const fallbackModelId = getDefaultFallback()
      const fallbackConfig = getModelConfig(fallbackModelId)
      
      if (!fallbackConfig) {
        throw new Error('Fallback model configuration not found')
      }

      setCurrentModelConfig(fallbackConfig)
      setCurrentDragonType(fallbackType)
      setError(null)
      setIsLoading(false)
      
      // Call fallback callback
      onFallback?.(originalType, fallbackType)
      
      logger.info('Fallback successful:', {
        from: originalType,
        to: fallbackType,
        fallbackModel: fallbackModelId
      })
    } catch (fallbackFallbackError) {
      logger.error('Fallback also failed:', fallbackFallbackError)
      setError(fallbackFallbackError as Error)
      onModelError?.(fallbackFallbackError as Error, 'fallback')
      setIsLoading(false)
    }
  }, [currentDragonType, fallbackType, onFallback, onModelError])

  // Loading state
  if (isLoading) {
    return (
      <div className={`flex items-center justify-center p-8 ${className || ''}`} style={style}>
        <div className="text-white">
          <div className="animate-pulse">🐉</div>
          <p className="text-sm mt-2">Loading dragon...</p>
        </div>
      </div>
    )
  }

  // Error state
  if (error && !currentModelConfig) {
    return (
      <div className={`flex items-center justify-center p-8 ${className || ''}`} style={style}>
        <div className="text-red-400 text-center">
          <p>❌ Dragon failed to awaken</p>
          <p className="text-xs mt-1">{error.message}</p>
        </div>
      </div>
    )
  }

  // Success state - render the dragon
  return (
    <div className={className} style={style}>
      <DragonRenderer
        dragonType={currentDragonType === '3d' ? 'glb' : currentDragonType}
        size={size}
        voiceState={voiceState}
        enableFallback={enableFallback}
        fallbackType={fallbackType === '3d' ? '2d' : fallbackType}
        onError={(error, type) => {
          onModelError?.(error, type)
          if (enableFallback) {
            handleFallback(error)
          }
        }}
        onFallback={onFallback}
        {...props}
      />
      
      {/* Development info */}
      {process.env.NODE_ENV === 'development' && currentModelConfig && (
        <div className="absolute bottom-0 left-0 bg-black bg-opacity-50 text-xs text-white p-2 rounded">
          Model: {currentModelConfig.displayName} ({currentModelConfig.id})
        </div>
      )}
    </div>
  )
}

export default EnhancedDragonRenderer
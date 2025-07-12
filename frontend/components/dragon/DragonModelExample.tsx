/**
 * Dragon Model Configuration System Usage Examples
 * 
 * Simplified examples using the focused dragon model configuration system
 */

'use client'

import React, { useState, useEffect } from 'react'
import { 
  DragonModelConfig,
  getModelsByQuality,
  getModelsByType,
  getModelsByUseCase,
  DRAGON_MODELS,
  getDefaultModel,
  getDefaultFallback,
  getModelConfig
} from '@config/dragonModels'
import { logger } from '@lib/logger'

// Example 1: Basic model selection
export const BasicModelSelection: React.FC = () => {
  const [selectedModel, setSelectedModel] = useState<DragonModelConfig | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const initializeModelSelection = async () => {
      try {
        // Get the default model (seiron-animated)
        const defaultModelId = getDefaultModel()
        const model = getModelConfig(defaultModelId)
        setSelectedModel(model || null)
        setLoading(false)
      } catch (error) {
        logger.error('Failed to initialize model selection:', error)
        setLoading(false)
      }
    }

    initializeModelSelection()
  }, [])

  if (loading) {
    return <div className="p-4">Loading model configuration...</div>
  }

  return (
    <div className="p-6 bg-gray-800 rounded-lg">
      <h3 className="text-xl font-bold text-white mb-4">Selected Dragon Model</h3>
      {selectedModel ? (
        <div className="space-y-2">
          <p className="text-green-400">✅ {selectedModel.displayName}</p>
          <p className="text-gray-300">{selectedModel.description}</p>
          <p className="text-sm text-gray-400">Format: {selectedModel.format}</p>
          <p className="text-sm text-gray-400">Quality: {selectedModel.quality}</p>
          <p className="text-sm text-gray-400">Type: {selectedModel.type}</p>
        </div>
      ) : (
        <p className="text-red-400">❌ No model selected</p>
      )}
    </div>
  )
}

// Example 2: Model filtering by quality and type
export const ModelFiltering: React.FC = () => {
  const [highQualityModels, setHighQualityModels] = useState<DragonModelConfig[]>([])
  const [animatedModels, setAnimatedModels] = useState<DragonModelConfig[]>([])
  const [voiceModels, setVoiceModels] = useState<DragonModelConfig[]>([])

  useEffect(() => {
    // Filter models by quality
    const highQuality = getModelsByQuality('high')
    setHighQualityModels(highQuality)

    // Filter models by type
    const animated = getModelsByType('animated')
    setAnimatedModels(animated)

    // Filter models by use case
    const voice = getModelsByUseCase('voice-interface')
    setVoiceModels(voice)
  }, [])

  return (
    <div className="p-6 bg-gray-800 rounded-lg space-y-4">
      <h3 className="text-xl font-bold text-white mb-4">Model Filtering Examples</h3>
      
      <div>
        <h4 className="text-lg font-semibold text-blue-400">High Quality Models</h4>
        <ul className="text-gray-300">
          {highQualityModels.map((model) => (
            <li key={model.id}>• {model.displayName}</li>
          ))}
        </ul>
      </div>

      <div>
        <h4 className="text-lg font-semibold text-green-400">Animated Models</h4>
        <ul className="text-gray-300">
          {animatedModels.map((model) => (
            <li key={model.id}>• {model.displayName}</li>
          ))}
        </ul>
      </div>

      <div>
        <h4 className="text-lg font-semibold text-purple-400">Voice-Enabled Models</h4>
        <ul className="text-gray-300">
          {voiceModels.map((model) => (
            <li key={model.id}>• {model.displayName}</li>
          ))}
        </ul>
      </div>
    </div>
  )
}

// Example 3: Model fallback demonstration
export const ModelFallback: React.FC = () => {
  const [primaryModel, setPrimaryModel] = useState<DragonModelConfig | null>(null)
  const [fallbackModel, setFallbackModel] = useState<DragonModelConfig | null>(null)

  useEffect(() => {
    // Get primary model
    const primary = getModelConfig(getDefaultModel())
    setPrimaryModel(primary || null)

    // Get fallback model
    const fallback = getModelConfig(getDefaultFallback())
    setFallbackModel(fallback || null)
  }, [])

  return (
    <div className="p-6 bg-gray-800 rounded-lg">
      <h3 className="text-xl font-bold text-white mb-4">Model Fallback System</h3>
      
      <div className="space-y-4">
        <div>
          <h4 className="text-lg font-semibold text-green-400">Primary Model</h4>
          {primaryModel ? (
            <div className="text-gray-300">
              <p>• {primaryModel.displayName}</p>
              <p className="text-sm text-gray-400">Path: {primaryModel.path}</p>
            </div>
          ) : (
            <p className="text-red-400">❌ No primary model</p>
          )}
        </div>

        <div>
          <h4 className="text-lg font-semibold text-yellow-400">Fallback Model</h4>
          {fallbackModel ? (
            <div className="text-gray-300">
              <p>• {fallbackModel.displayName}</p>
              <p className="text-sm text-gray-400">Path: {fallbackModel.path}</p>
            </div>
          ) : (
            <p className="text-red-400">❌ No fallback model</p>
          )}
        </div>
      </div>
    </div>
  )
}

// Main example component
export const DragonModelExample: React.FC = () => {
  return (
    <div className="space-y-6 p-4">
      <h2 className="text-2xl font-bold text-white mb-6">Dragon Model Configuration Examples</h2>
      <BasicModelSelection />
      <ModelFiltering />
      <ModelFallback />
    </div>
  )
}

export default DragonModelExample
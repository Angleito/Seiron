/**
 * Dragon Model Configuration System Usage Examples
 * 
 * This file demonstrates how to use the comprehensive dragon model configuration system
 * for optimal model selection, performance monitoring, and device compatibility.
 */

'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { 
  DragonModelConfig,
  DragonModelSelector,
  DeviceCapabilityDetector,
  ModelPreloader,
  ModelPerformanceMonitor,
  getRecommendedModel,
  getOptimalQualitySettings,
  createFallbackChain,
  preloadModelSet,
  getModelsByDeviceCapability,
  getModelsByQuality,
  getModelsByType,
  getModelsByUseCase,
  DRAGON_MODELS,
  DeviceCapability,
  DragonModelQuality,
  DragonModelType
} from '@config/dragonModels'
import { logger } from '@lib/logger'

// Example 1: Basic model selection based on device capabilities
export const BasicModelSelection: React.FC = () => {
  const [recommendedModel, setRecommendedModel] = useState<DragonModelConfig | null>(null)
  const [deviceCapabilities, setDeviceCapabilities] = useState<DeviceCapability | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const initializeModelSelection = async () => {
      try {
        // Get recommended model based on device capabilities
        const model = await getRecommendedModel('high', 'voice-interface')
        setRecommendedModel(model)

        // Get device capabilities for display
        const capabilities = await DeviceCapabilityDetector.getInstance().detectCapabilities()
        setDeviceCapabilities(capabilities)

        setLoading(false)
      } catch (error) {
        logger.error('Failed to initialize model selection:', error)
        setLoading(false)
      }
    }

    initializeModelSelection()
  }, [])

  if (loading) {
    return <div className="p-4">Analyzing device capabilities...</div>
  }

  return (
    <div className="p-4 space-y-4">
      <h2 className="text-xl font-bold">Basic Model Selection</h2>
      
      <div className="bg-gray-100 p-4 rounded">
        <h3 className="font-semibold mb-2">Device Capabilities</h3>
        {deviceCapabilities && (
          <div className="text-sm space-y-1">
            <p>WebGL2: {deviceCapabilities.webgl2 ? 'Supported' : 'Not Supported'}</p>
            <p>WebGL1: {deviceCapabilities.webgl1 ? 'Supported' : 'Not Supported'}</p>
            <p>Memory: {deviceCapabilities.memoryMB} MB</p>
            <p>Device Type: {deviceCapabilities.isDesktop ? 'Desktop' : deviceCapabilities.isMobile ? 'Mobile' : 'Tablet'}</p>
            <p>GPU Tier: {deviceCapabilities.gpuTier}</p>
            <p>CPU Cores: {deviceCapabilities.cpuCores}</p>
          </div>
        )}
      </div>

      <div className="bg-blue-100 p-4 rounded">
        <h3 className="font-semibold mb-2">Recommended Model</h3>
        {recommendedModel && (
          <div className="text-sm space-y-1">
            <p><strong>Name:</strong> {recommendedModel.displayName}</p>
            <p><strong>Quality:</strong> {recommendedModel.quality}</p>
            <p><strong>Type:</strong> {recommendedModel.type}</p>
            <p><strong>File Size:</strong> {(recommendedModel.fileSize / 1024 / 1024).toFixed(2)} MB</p>
            <p><strong>Memory Usage:</strong> {recommendedModel.performance.memoryUsageMB} MB</p>
            <p><strong>Load Time:</strong> {recommendedModel.performance.loadTimeMs} ms</p>
            <p><strong>Use Cases:</strong> {recommendedModel.recommendedUseCases.join(', ')}</p>
          </div>
        )}
      </div>
    </div>
  )
}

// Example 2: Advanced model selection with quality preferences
export const AdvancedModelSelection: React.FC = () => {
  const [selectedQuality, setSelectedQuality] = useState<DragonModelQuality>('medium')
  const [selectedType, setSelectedType] = useState<DragonModelType>('full')
  const [selectedUseCase, setSelectedUseCase] = useState('voice-interface')
  const [availableModels, setAvailableModels] = useState<DragonModelConfig[]>([])
  const [qualitySettings, setQualitySettings] = useState<any>(null)

  useEffect(() => {
    const updateModels = async () => {
      try {
        // Get device capabilities
        const capabilities = await DeviceCapabilityDetector.getInstance().detectCapabilities()
        
        // Get compatible models
        const compatibleModels = getModelsByDeviceCapability(capabilities)
        
        // Filter by preferences
        let filteredModels = compatibleModels
        
        if (selectedQuality !== 'medium') {
          filteredModels = filteredModels.filter(model => model.quality === selectedQuality)
        }
        
        if (selectedType !== 'full') {
          filteredModels = filteredModels.filter(model => model.type === selectedType)
        }
        
        if (selectedUseCase !== 'voice-interface') {
          filteredModels = filteredModels.filter(model => 
            model.recommendedUseCases.includes(selectedUseCase)
          )
        }
        
        setAvailableModels(filteredModels)
        
        // Get optimal quality settings for the first available model
        if (filteredModels.length > 0) {
          const settings = getOptimalQualitySettings(filteredModels[0], capabilities)
          setQualitySettings(settings)
        }
      } catch (error) {
        logger.error('Failed to update models:', error)
      }
    }

    updateModels()
  }, [selectedQuality, selectedType, selectedUseCase])

  return (
    <div className="p-4 space-y-4">
      <h2 className="text-xl font-bold">Advanced Model Selection</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium mb-2">Quality</label>
          <select 
            value={selectedQuality} 
            onChange={(e) => setSelectedQuality(e.target.value as DragonModelQuality)}
            className="w-full p-2 border rounded"
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="ultra">Ultra</option>
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-2">Type</label>
          <select 
            value={selectedType} 
            onChange={(e) => setSelectedType(e.target.value as DragonModelType)}
            className="w-full p-2 border rounded"
          >
            <option value="full">Full</option>
            <option value="head">Head</option>
            <option value="animated">Animated</option>
            <option value="static">Static</option>
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-2">Use Case</label>
          <select 
            value={selectedUseCase} 
            onChange={(e) => setSelectedUseCase(e.target.value)}
            className="w-full p-2 border rounded"
          >
            <option value="voice-interface">Voice Interface</option>
            <option value="mobile-optimized">Mobile Optimized</option>
            <option value="desktop-showcase">Desktop Showcase</option>
            <option value="high-end-devices">High End Devices</option>
            <option value="low-end-devices">Low End Devices</option>
          </select>
        </div>
      </div>

      <div className="bg-green-100 p-4 rounded">
        <h3 className="font-semibold mb-2">Available Models ({availableModels.length})</h3>
        {availableModels.length === 0 ? (
          <p className="text-sm text-gray-600">No models match your criteria</p>
        ) : (
          <div className="space-y-2">
            {availableModels.map((model) => (
              <div key={model.id} className="bg-white p-3 rounded border">
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-medium">{model.displayName}</h4>
                  <span className="text-xs bg-gray-200 px-2 py-1 rounded">{model.status}</span>
                </div>
                <p className="text-sm text-gray-600 mb-2">{model.description}</p>
                <div className="text-xs text-gray-500 grid grid-cols-2 gap-2">
                  <span>Memory: {model.performance.memoryUsageMB} MB</span>
                  <span>Load Time: {model.performance.loadTimeMs} ms</span>
                  <span>Complexity: {model.performance.renderComplexity}/10</span>
                  <span>Battery: {model.performance.batteryImpact}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {qualitySettings && (
        <div className="bg-purple-100 p-4 rounded">
          <h3 className="font-semibold mb-2">Optimal Quality Settings</h3>
          <div className="text-sm space-y-1">
            <p>Texture Size: {qualitySettings.textureSize}px</p>
            <p>Shadow Quality: {qualitySettings.shadowQuality}</p>
            <p>Anti-aliasing: {qualitySettings.antialiasingLevel}x</p>
            <p>Effects Level: {qualitySettings.effectsLevel}</p>
            <p>Polygon Reduction: {(qualitySettings.polygonReduction * 100).toFixed(0)}%</p>
          </div>
        </div>
      )}
    </div>
  )
}

// Example 3: Model preloading and performance monitoring
export const ModelPreloadingExample: React.FC = () => {
  const [preloadStatus, setPreloadStatus] = useState<Record<string, 'idle' | 'loading' | 'loaded' | 'error'>>({})
  const [performanceData, setPerformanceData] = useState<any>(null)

  const preloadModel = async (modelId: string) => {
    setPreloadStatus(prev => ({ ...prev, [modelId]: 'loading' }))
    
    try {
      const model = DRAGON_MODELS[modelId]
      if (!model) {
        throw new Error(`Model ${modelId} not found`)
      }
      
      const preloader = ModelPreloader.getInstance()
      await preloader.preloadModel(model)
      
      setPreloadStatus(prev => ({ ...prev, [modelId]: 'loaded' }))
      
      // Record performance data
      const monitor = ModelPerformanceMonitor.getInstance()
      monitor.recordModelPerformance(modelId, {
        loadTimeMs: Date.now(), // Simplified for demo
        memoryUsageMB: model.performance.memoryUsageMB,
        renderComplexity: model.performance.renderComplexity
      })
      
    } catch (error) {
      logger.error(`Failed to preload model ${modelId}:`, error)
      setPreloadStatus(prev => ({ ...prev, [modelId]: 'error' }))
    }
  }

  const preloadModelSet = async () => {
    try {
      const modelIds = ['seiron-primary', 'dragon-head-optimized', 'dragon-2d-sprite']
      await preloadModelSet(modelIds)
      
      // Update all statuses
      const newStatus: Record<string, 'loaded'> = {}
      modelIds.forEach(id => {
        newStatus[id] = 'loaded'
      })
      setPreloadStatus(prev => ({ ...prev, ...newStatus }))
      
    } catch (error) {
      logger.error('Failed to preload model set:', error)
    }
  }

  const getPerformanceData = () => {
    const monitor = ModelPerformanceMonitor.getInstance()
    const avgPerformance = monitor.getAveragePerformance()
    setPerformanceData(avgPerformance)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'loaded': return 'bg-green-500'
      case 'loading': return 'bg-yellow-500'
      case 'error': return 'bg-red-500'
      default: return 'bg-gray-500'
    }
  }

  return (
    <div className="p-4 space-y-4">
      <h2 className="text-xl font-bold">Model Preloading & Performance</h2>
      
      <div className="space-y-2">
        <button
          onClick={preloadModelSet}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Preload Model Set
        </button>
        
        <button
          onClick={getPerformanceData}
          className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 ml-2"
        >
          Get Performance Data
        </button>
      </div>

      <div className="bg-gray-100 p-4 rounded">
        <h3 className="font-semibold mb-2">Individual Model Preloading</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
          {Object.keys(DRAGON_MODELS).map((modelId) => {
            const model = DRAGON_MODELS[modelId]
            const status = preloadStatus[modelId] || 'idle'
            
            return (
              <div key={modelId} className="flex items-center space-x-2">
                <button
                  onClick={() => preloadModel(modelId)}
                  disabled={status === 'loading'}
                  className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600 disabled:opacity-50"
                >
                  {status === 'loading' ? 'Loading...' : 'Preload'}
                </button>
                <div className={`w-3 h-3 rounded-full ${getStatusColor(status)}`}></div>
                <span className="text-sm">{model.displayName}</span>
              </div>
            )
          })}
        </div>
      </div>

      {performanceData && (
        <div className="bg-blue-100 p-4 rounded">
          <h3 className="font-semibold mb-2">Average Performance Metrics</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="font-medium">Memory Usage</p>
              <p>{performanceData.memoryUsageMB.toFixed(1)} MB</p>
            </div>
            <div>
              <p className="font-medium">Load Time</p>
              <p>{performanceData.loadTimeMs.toFixed(0)} ms</p>
            </div>
            <div>
              <p className="font-medium">Render Complexity</p>
              <p>{performanceData.renderComplexity.toFixed(1)}/10</p>
            </div>
            <div>
              <p className="font-medium">Battery Impact</p>
              <p>{performanceData.batteryImpact}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Example 4: Fallback chain demonstration
export const FallbackChainExample: React.FC = () => {
  const [selectedModel, setSelectedModel] = useState('seiron-animated')
  const [fallbackChain, setFallbackChain] = useState<DragonModelConfig[]>([])

  useEffect(() => {
    const chain = createFallbackChain(selectedModel)
    setFallbackChain(chain)
  }, [selectedModel])

  return (
    <div className="p-4 space-y-4">
      <h2 className="text-xl font-bold">Fallback Chain Demonstration</h2>
      
      <div>
        <label className="block text-sm font-medium mb-2">Primary Model</label>
        <select 
          value={selectedModel} 
          onChange={(e) => setSelectedModel(e.target.value)}
          className="w-full p-2 border rounded"
        >
          {Object.entries(DRAGON_MODELS).map(([id, model]) => (
            <option key={id} value={id}>{model.displayName}</option>
          ))}
        </select>
      </div>

      <div className="bg-orange-100 p-4 rounded">
        <h3 className="font-semibold mb-2">Fallback Chain</h3>
        <div className="space-y-2">
          {fallbackChain.map((model, index) => (
            <div key={model.id} className="flex items-center space-x-4 p-3 bg-white rounded border">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold">
                  {index + 1}
                </div>
              </div>
              <div className="flex-grow">
                <h4 className="font-medium">{model.displayName}</h4>
                <p className="text-sm text-gray-600">{model.description}</p>
                <div className="text-xs text-gray-500 mt-1">
                  Quality: {model.quality} | Type: {model.type} | 
                  Memory: {model.performance.memoryUsageMB} MB |
                  Load Time: {model.performance.loadTimeMs} ms
                </div>
              </div>
              <div className="flex-shrink-0">
                <span className={`px-2 py-1 rounded text-xs ${
                  index === 0 ? 'bg-green-200 text-green-800' :
                  index === fallbackChain.length - 1 ? 'bg-red-200 text-red-800' :
                  'bg-yellow-200 text-yellow-800'
                }`}>
                  {index === 0 ? 'Primary' : index === fallbackChain.length - 1 ? 'Final' : 'Fallback'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// Main component showcasing all examples
export const DragonModelConfigurationShowcase: React.FC = () => {
  const [activeTab, setActiveTab] = useState(0)
  
  const tabs = [
    { name: 'Basic Selection', component: BasicModelSelection },
    { name: 'Advanced Selection', component: AdvancedModelSelection },
    { name: 'Preloading & Performance', component: ModelPreloadingExample },
    { name: 'Fallback Chain', component: FallbackChainExample }
  ]

  return (
    <div className="max-w-6xl mx-auto p-4">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">Dragon Model Configuration System</h1>
        <p className="text-gray-600">
          Comprehensive examples showing how to use the dragon model configuration system
          for optimal performance, device compatibility, and fallback management.
        </p>
      </div>

      <div className="border-b border-gray-200 mb-6">
        <nav className="flex space-x-8">
          {tabs.map((tab, index) => (
            <button
              key={index}
              onClick={() => setActiveTab(index)}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === index
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.name}
            </button>
          ))}
        </nav>
      </div>

      <div className="bg-white rounded-lg shadow">
        {React.createElement(tabs[activeTab].component)}
      </div>
    </div>
  )
}

export default DragonModelConfigurationShowcase
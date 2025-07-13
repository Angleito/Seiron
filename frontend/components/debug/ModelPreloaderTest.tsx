'use client'

import React, { useState, useEffect } from 'react'
import { ModelPreloader, DEFAULT_MODELS } from '../dragon/DragonModelManager'
import { 
  exportModelManifest, 
  getModelManifest, 
  getModelPreloadStats,
  loadModelProgressively 
} from '../../utils/modelManifestExporter'

export const ModelPreloaderTest: React.FC = () => {
  const [preloadStats, setPreloadStats] = useState<any>(null)
  const [manifest, setManifest] = useState<any>(null)
  const [progressiveLoadingStatus, setProgressiveLoadingStatus] = useState<string>('')
  const [currentQuality, setCurrentQuality] = useState<string>('')

  useEffect(() => {
    // Get initial stats
    updateStats()
  }, [])

  const updateStats = () => {
    setPreloadStats(getModelPreloadStats())
    setManifest(getModelManifest())
  }

  const handleExportManifest = () => {
    exportModelManifest()
  }

  const handleProgressiveLoad = async () => {
    setProgressiveLoadingStatus('Starting progressive load...')
    
    try {
      await loadModelProgressively(
        'seiron-animated',
        'low',
        'ultra',
        (quality) => {
          setCurrentQuality(quality)
          setProgressiveLoadingStatus(`Loading ${quality} quality...`)
        }
      )
      setProgressiveLoadingStatus('Progressive loading complete!')
    } catch (error) {
      setProgressiveLoadingStatus(`Error: ${error}`)
    }
  }

  const handlePreloadAll = async () => {
    const preloader = ModelPreloader.getInstance()
    
    for (const [modelId, model] of Object.entries(DEFAULT_MODELS)) {
      try {
        await preloader.preloadModel(model)
      } catch (error) {
        console.error(`Failed to preload ${modelId}:`, error)
      }
    }
    
    updateStats()
  }

  const handleValidateFallbacks = async () => {
    const preloader = ModelPreloader.getInstance()
    
    for (const modelId of Object.keys(DEFAULT_MODELS)) {
      try {
        const chain = await preloader.validateFallbackChain(modelId)
        console.log(`Fallback chain for ${modelId}:`, chain)
      } catch (error) {
        console.error(`Failed to validate fallback chain for ${modelId}:`, error)
      }
    }
  }

  return (
    <div className="p-6 bg-gray-900 rounded-lg">
      <h2 className="text-2xl font-bold mb-6 text-blue-400">Model Preloader Test</h2>
      
      {/* Preload Statistics */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-3 text-green-400">Preload Statistics</h3>
        {preloadStats && (
          <div className="bg-gray-800 p-4 rounded">
            <div>Total Models in Manifest: {preloadStats.totalModels}</div>
            <div>Preloaded Models: {preloadStats.preloadedModels}</div>
            <div>Manifest Version: {preloadStats.manifestVersion}</div>
            <div>Last Updated: {new Date(preloadStats.lastUpdated).toLocaleString()}</div>
            <div>Checksums Cached: {preloadStats.checksumsCached}</div>
            <div>Caching Headers Cached: {preloadStats.cachingHeadersCached}</div>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="mb-6 space-x-3">
        <button
          onClick={updateStats}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded"
        >
          Refresh Stats
        </button>
        
        <button
          onClick={handleExportManifest}
          className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded"
        >
          Export Manifest
        </button>
        
        <button
          onClick={handlePreloadAll}
          className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded"
        >
          Preload All Models
        </button>
        
        <button
          onClick={handleValidateFallbacks}
          className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 rounded"
        >
          Validate Fallback Chains
        </button>
      </div>

      {/* Progressive Loading Test */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-3 text-green-400">Progressive Loading</h3>
        <button
          onClick={handleProgressiveLoad}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded mb-3"
        >
          Test Progressive Loading
        </button>
        
        {progressiveLoadingStatus && (
          <div className="bg-gray-800 p-4 rounded">
            <div>Status: {progressiveLoadingStatus}</div>
            {currentQuality && <div>Current Quality: {currentQuality}</div>}
          </div>
        )}
      </div>

      {/* Model Manifest */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-3 text-green-400">Model Manifest</h3>
        {manifest && (
          <div className="bg-gray-800 p-4 rounded max-h-96 overflow-y-auto">
            <pre className="text-xs">
              {JSON.stringify(manifest, null, 2)}
            </pre>
          </div>
        )}
      </div>

      {/* Available Models */}
      <div>
        <h3 className="text-lg font-semibold mb-3 text-green-400">Available Models</h3>
        <div className="grid grid-cols-2 gap-4">
          {Object.entries(DEFAULT_MODELS).map(([modelId, model]) => (
            <div key={modelId} className="bg-gray-800 p-3 rounded">
              <div className="font-semibold text-blue-300">{model.displayName}</div>
              <div className="text-sm">
                <div>Quality: {model.quality}</div>
                <div>Memory: {model.memoryUsageMB}MB</div>
                <div>Checksum: {model.checksum || 'Not set'}</div>
                <div>Version: {model.version || '1.0.0'}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

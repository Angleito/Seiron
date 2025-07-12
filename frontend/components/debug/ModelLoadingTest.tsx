/**
 * ModelLoadingTest - Debug component to test the model loading fixes
 * 
 * This component demonstrates that the ERR_ABORTED issues have been resolved
 * by using the centralized ModelCacheService.
 */

import React, { useState, useEffect } from 'react'
import { useDragonModel, useModelPreloader } from '@/hooks/useDragonModel'
import { useModelCache } from '@/services/ModelCacheService'

interface ModelTestCardProps {
  url: string
  name: string
}

function ModelTestCard({ url, name }: ModelTestCardProps) {
  const { model, isLoading, error, retry } = useDragonModel(url, {
    onLoad: (loadedModel) => {
      console.log(`✅ ${name} loaded successfully:`, loadedModel)
    },
    onError: (loadError) => {
      console.error(`❌ ${name} load failed:`, loadError)
    }
  })

  return (
    <div className={`p-4 border rounded-lg ${
      error ? 'border-red-500 bg-red-50' : 
      isLoading ? 'border-blue-500 bg-blue-50' : 
      model ? 'border-green-500 bg-green-50' : 'border-gray-300'
    }`}>
      <h3 className="font-semibold text-sm mb-2">{name}</h3>
      <div className="text-xs text-gray-600 mb-2">{url}</div>
      
      {isLoading && (
        <div className="flex items-center text-blue-600">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
          Loading...
        </div>
      )}
      
      {error && (
        <div className="text-red-600">
          <div className="mb-2">❌ {error.message}</div>
          <button 
            onClick={retry}
            className="px-2 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      )}
      
      {model && (
        <div className="text-green-600">
          ✅ Loaded successfully
          <div className="text-xs text-gray-500 mt-1">
            Type: {model.type}
          </div>
        </div>
      )}
    </div>
  )
}

export function ModelLoadingTest() {
  const [testMode, setTestMode] = useState<'single' | 'concurrent' | 'preload'>('single')
  const [concurrentCount, setConcurrentCount] = useState(3)
  const { getCacheStats } = useModelCache()
  const [stats, setStats] = useState(getCacheStats())

  // Test models
  const testModels = [
    { url: '/models/seiron.glb', name: 'Seiron Primary' },
    { url: '/models/dragon_head.obj', name: 'Dragon Head OBJ' },
    { url: '/models/dragon_head_optimized.glb', name: 'Dragon Head Optimized' },
    { url: '/models/seiron_animated.gltf', name: 'Seiron Animated' }
  ]

  // Preloader test
  const preloaderUrls = testModels.map(m => m.url)
  const preloader = useModelPreloader(preloaderUrls)

  // Update stats periodically
  useEffect(() => {
    const interval = setInterval(() => {
      setStats(getCacheStats())
    }, 1000)
    return () => clearInterval(interval)
  }, [getCacheStats])

  const renderConcurrentTest = () => {
    const items = []
    const baseModel = testModels[0] // Use same model multiple times to test concurrent loading
    
    if (!baseModel) {
      return [<div key="no-model" className="text-red-500">No base model available for concurrent testing</div>]
    }
    
    for (let i = 0; i < concurrentCount; i++) {
      items.push(
        <ModelTestCard 
          key={`concurrent-${i}`}
          url={baseModel.url}
          name={`${baseModel.name} #${i + 1}`}
        />
      )
    }
    
    return items
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">
          🐉 Model Loading Fix Test
        </h1>
        <p className="text-gray-600">
          This component tests that ERR_ABORTED issues have been resolved using the centralized ModelCacheService.
        </p>
      </div>

      {/* Test Mode Selector */}
      <div className="mb-6">
        <div className="flex space-x-4 mb-4">
          <button
            onClick={() => setTestMode('single')}
            className={`px-4 py-2 rounded ${
              testMode === 'single' ? 'bg-blue-600 text-white' : 'bg-gray-200'
            }`}
          >
            Single Load Test
          </button>
          <button
            onClick={() => setTestMode('concurrent')}
            className={`px-4 py-2 rounded ${
              testMode === 'concurrent' ? 'bg-blue-600 text-white' : 'bg-gray-200'
            }`}
          >
            Concurrent Load Test
          </button>
          <button
            onClick={() => setTestMode('preload')}
            className={`px-4 py-2 rounded ${
              testMode === 'preload' ? 'bg-blue-600 text-white' : 'bg-gray-200'
            }`}
          >
            Preload Test
          </button>
        </div>

        {testMode === 'concurrent' && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Concurrent Requests: {concurrentCount}
            </label>
            <input
              type="range"
              min="2"
              max="10"
              value={concurrentCount}
              onChange={(e) => setConcurrentCount(parseInt(e.target.value))}
              className="w-48"
            />
          </div>
        )}
      </div>

      {/* Cache Statistics */}
      <div className="mb-6 p-4 bg-gray-100 rounded-lg">
        <h2 className="text-lg font-semibold mb-2">📊 Cache Statistics</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <div className="font-medium">Total Entries</div>
            <div className="text-gray-600">{stats.totalEntries}</div>
          </div>
          <div>
            <div className="font-medium">Loaded Models</div>
            <div className="text-green-600">{stats.loadedModels}</div>
          </div>
          <div>
            <div className="font-medium">Loading Models</div>
            <div className="text-blue-600">{stats.loadingModels}</div>
          </div>
          <div>
            <div className="font-medium">Error Models</div>
            <div className="text-red-600">{stats.errorModels}</div>
          </div>
          <div>
            <div className="font-medium">Active Loads</div>
            <div className="text-orange-600">{stats.activeLoads}</div>
          </div>
          <div>
            <div className="font-medium">Queued Loads</div>
            <div className="text-purple-600">{stats.queuedLoads}</div>
          </div>
          <div>
            <div className="font-medium">Memory Usage</div>
            <div className="text-gray-600">{(stats.memoryUsage / 1024 / 1024).toFixed(2)} MB</div>
          </div>
        </div>
      </div>

      {/* Test Results */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {testMode === 'single' && testModels.map((model) => (
          <ModelTestCard key={model.url} url={model.url} name={model.name} />
        ))}

        {testMode === 'concurrent' && renderConcurrentTest()}

        {testMode === 'preload' && (
          <div className="col-span-full">
            <div className="p-4 border rounded-lg">
              <h3 className="font-semibold mb-2">Preload Test</h3>
              <div className="mb-2">
                Progress: {preloader.preloadedCount}/{preloader.totalCount} 
                ({preloader.progress.toFixed(1)}%)
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${preloader.progress}%` }}
                ></div>
              </div>
              {preloader.isPreloading ? (
                <div className="text-blue-600 mt-2">🔄 Preloading models...</div>
              ) : (
                <div className="text-green-600 mt-2">✅ Preloading complete!</div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Instructions */}
      <div className="mt-8 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <h3 className="font-semibold text-yellow-800 mb-2">🧪 Test Instructions</h3>
        <ul className="text-sm text-yellow-700 space-y-1">
          <li><strong>Single Load Test:</strong> Tests individual model loading with proper error handling</li>
          <li><strong>Concurrent Load Test:</strong> Tests loading the same model multiple times simultaneously (this is where ERR_ABORTED typically occurred)</li>
          <li><strong>Preload Test:</strong> Tests the preloading system that prevents duplicate requests</li>
          <li><strong>Expected Result:</strong> No ERR_ABORTED errors should occur, and concurrent requests should be deduplicated</li>
        </ul>
      </div>
    </div>
  )
}

export default ModelLoadingTest
import React, { useState, useCallback } from 'react'
import { SeironGLBDragonWithCanvas } from './SeironGLBDragon'
import { VoiceAnimationState } from './DragonRenderer'

// Example component demonstrating dynamic model switching
const DragonModelSwitchingExample: React.FC = () => {
  const [selectedModel, setSelectedModel] = useState('/models/seiron.glb')
  const [loadingProgress, setLoadingProgress] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [loadingStatus, setLoadingStatus] = useState('')

  // Mock voice state for demonstration
  const [voiceState, setVoiceState] = useState<VoiceAnimationState>({
    isListening: false,
    isSpeaking: false,
    isProcessing: false,
    isIdle: true,
    volume: 0.5,
    emotion: 'calm'
  })

  // Available models for switching
  const availableModels = [
    { path: '/models/seiron.glb', name: 'Default Dragon', quality: 'high' },
    { path: '/models/seiron_low.glb', name: 'Low Quality Dragon', quality: 'low' },
    { path: '/models/seiron_medium.glb', name: 'Medium Quality Dragon', quality: 'medium' },
    { path: '/models/seiron_high.glb', name: 'High Quality Dragon', quality: 'high' },
    { path: '/models/seiron_animated.gltf', name: 'Animated Dragon', quality: 'high' }
  ]

  // Model-specific configuration
  const modelSpecificConfig: { [key: string]: any } = {
    '/models/seiron_low.glb': {
      scale: 2.0,
      position: [0, -1, 0] as [number, number, number],
      rotation: [0, 0, 0] as [number, number, number],
      animationName: 'idle',
      quality: 'low' as const,
      optimizations: {
        shadows: false,
        reflections: false,
        antialiasing: false,
        particles: false
      }
    },
    '/models/seiron_medium.glb': {
      scale: 2.5,
      position: [0, -0.5, 0] as [number, number, number],
      rotation: [0, 0, 0] as [number, number, number],
      animationName: 'flying',
      quality: 'medium' as const,
      optimizations: {
        shadows: true,
        reflections: false,
        antialiasing: true,
        particles: true
      }
    },
    '/models/seiron_high.glb': {
      scale: 3.0,
      position: [0, 0, 0] as [number, number, number],
      rotation: [0, 0, 0] as [number, number, number],
      animationName: 'flying',
      quality: 'high' as const,
      optimizations: {
        shadows: true,
        reflections: true,
        antialiasing: true,
        particles: true
      }
    },
    '/models/seiron_animated.gltf': {
      scale: 2.8,
      position: [0, 0.5, 0] as [number, number, number],
      rotation: [0, Math.PI / 4, 0] as [number, number, number],
      animationName: 'flapping',
      quality: 'high' as const,
      materialOverrides: {
        roughness: 0.2,
        metalness: 0.3,
        colorMultiplier: 1.5
      }
    }
  }

  // Loading callbacks
  const handleLoadStart = useCallback((modelPath: string) => {
    console.log(`Loading started for: ${modelPath}`)
    setIsLoading(true)
    setLoadingProgress(0)
    setLoadingStatus(`Loading ${modelPath}...`)
  }, [])

  const handleLoadProgress = useCallback((progress: number, modelPath: string) => {
    console.log(`Loading progress: ${progress}% for ${modelPath}`)
    setLoadingProgress(progress)
    setLoadingStatus(`Loading ${modelPath}... ${Math.round(progress)}%`)
  }, [])

  const handleLoadComplete = useCallback((modelPath: string) => {
    console.log(`Loading completed for: ${modelPath}`)
    setIsLoading(false)
    setLoadingProgress(100)
    setLoadingStatus(`Loaded ${modelPath}`)
    setTimeout(() => setLoadingStatus(''), 2000)
  }, [])

  const handleLoadError = useCallback((error: Error, modelPath: string) => {
    console.error(`Loading error for ${modelPath}:`, error)
    setIsLoading(false)
    setLoadingStatus(`Error loading ${modelPath}: ${error.message}`)
  }, [])

  const handleModelSwitch = useCallback((fromPath: string, toPath: string) => {
    console.log(`Model switched from ${fromPath} to ${toPath}`)
    setLoadingStatus(`Switching from ${fromPath} to ${toPath}`)
  }, [])

  const handleError = useCallback((error: Error) => {
    console.error('Dragon component error:', error)
    setLoadingStatus(`Error: ${error.message}`)
  }, [])

  const handleFallback = useCallback(() => {
    console.log('Fallback triggered')
    setLoadingStatus('Fallback model loaded')
  }, [])

  // Voice state controls
  const handleVoiceStateChange = (newState: Partial<VoiceAnimationState>) => {
    setVoiceState(prev => ({ ...prev, ...newState }))
  }

  return (
    <div className="w-full h-screen bg-gray-900 text-white">
      <div className="flex h-full">
        {/* Control Panel */}
        <div className="w-1/3 p-4 bg-gray-800 overflow-y-auto">
          <h2 className="text-xl font-bold mb-4">Dynamic Model Switching Demo</h2>
          
          {/* Model Selection */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-2">Select Model:</h3>
            <div className="space-y-2">
              {availableModels.map(model => (
                <button
                  key={model.path}
                  onClick={() => setSelectedModel(model.path)}
                  className={`w-full p-2 rounded text-left transition-colors ${
                    selectedModel === model.path
                      ? 'bg-yellow-600 text-white'
                      : 'bg-gray-700 hover:bg-gray-600'
                  }`}
                >
                  <div className="font-medium">{model.name}</div>
                  <div className="text-sm text-gray-300">
                    Quality: {model.quality} | Path: {model.path}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Loading Status */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-2">Loading Status:</h3>
            <div className="bg-gray-700 p-3 rounded">
              <div className="text-sm mb-2">{loadingStatus}</div>
              {isLoading && (
                <div className="w-full bg-gray-600 rounded-full h-2">
                  <div 
                    className="bg-yellow-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${loadingProgress}%` }}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Voice State Controls */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-2">Voice State:</h3>
            <div className="space-y-2">
              <button
                onClick={() => handleVoiceStateChange({ isListening: !voiceState.isListening, isSpeaking: false, isProcessing: false, isIdle: false })}
                className={`w-full p-2 rounded ${voiceState.isListening ? 'bg-blue-600' : 'bg-gray-700'}`}
              >
                {voiceState.isListening ? 'Stop' : 'Start'} Listening
              </button>
              <button
                onClick={() => handleVoiceStateChange({ isSpeaking: !voiceState.isSpeaking, isListening: false, isProcessing: false, isIdle: false })}
                className={`w-full p-2 rounded ${voiceState.isSpeaking ? 'bg-orange-600' : 'bg-gray-700'}`}
              >
                {voiceState.isSpeaking ? 'Stop' : 'Start'} Speaking
              </button>
              <button
                onClick={() => handleVoiceStateChange({ isProcessing: !voiceState.isProcessing, isListening: false, isSpeaking: false, isIdle: false })}
                className={`w-full p-2 rounded ${voiceState.isProcessing ? 'bg-purple-600' : 'bg-gray-700'}`}
              >
                {voiceState.isProcessing ? 'Stop' : 'Start'} Processing
              </button>
              <button
                onClick={() => handleVoiceStateChange({ isIdle: true, isListening: false, isSpeaking: false, isProcessing: false })}
                className={`w-full p-2 rounded ${voiceState.isIdle ? 'bg-green-600' : 'bg-gray-700'}`}
              >
                Set Idle
              </button>
            </div>
            
            {/* Volume Control */}
            <div className="mt-4">
              <label className="block text-sm font-medium mb-1">Volume: {voiceState.volume?.toFixed(1)}</label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={voiceState.volume || 0}
                onChange={(e) => handleVoiceStateChange({ volume: parseFloat(e.target.value) })}
                className="w-full"
              />
            </div>
          </div>

          {/* Model Configuration Info */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-2">Current Model Config:</h3>
            <div className="bg-gray-700 p-3 rounded">
              <pre className="text-xs">
                {JSON.stringify(modelSpecificConfig[selectedModel] || 'No config', null, 2)}
              </pre>
            </div>
          </div>
        </div>

        {/* Dragon Display */}
        <div className="flex-1 relative">
          <SeironGLBDragonWithCanvas
            modelPath={selectedModel}
            voiceState={voiceState}
            size="gigantic"
            enableAnimations={true}
            modelSpecificConfig={modelSpecificConfig}
            fallbackModelPath="/models/seiron.glb"
            enableModelPreloading={true}
            supportedFormats={['glb', 'gltf']}
            onLoadStart={handleLoadStart}
            onLoadProgress={handleLoadProgress}
            onLoadComplete={handleLoadComplete}
            onLoadError={handleLoadError}
            onModelSwitch={handleModelSwitch}
            onError={handleError}
            onFallback={handleFallback}
            className="w-full h-full"
          />
          
          {/* Loading Overlay */}
          {isLoading && (
            <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
              <div className="text-center">
                <div className="text-4xl mb-4 animate-spin">🐉</div>
                <div className="text-xl font-bold">Loading Dragon...</div>
                <div className="text-sm mt-2">{Math.round(loadingProgress)}%</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default DragonModelSwitchingExample
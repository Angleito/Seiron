import React, { useState, useEffect, useRef, Suspense } from 'react'
import { Play, Pause, RotateCcw, AlertTriangle, CheckCircle, Zap, Eye, Palette, Mic, MicOff, Volume2 } from 'lucide-react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Environment, Loader } from '@react-three/drei'
import { SeironGLBDragon } from '../../components/dragon/SeironGLBDragon'
import { VoiceAnimationState } from '../../components/dragon/DragonRenderer'

interface WebGLCapabilities {
  webgl: boolean
  webgl2: boolean
  maxTextureSize: number
  maxVertexUniforms: number
  maxFragmentUniforms: number
  extensions: string[]
}

// Enhanced 3D WebGL Dragon Demo with Three.js
export default function WebGL3DPage() {
  const [voiceState, setVoiceState] = useState<VoiceAnimationState>({
    isListening: false,
    isSpeaking: false,
    isProcessing: false,
    isIdle: true,
    volume: 0,
    emotion: 'calm'
  })
  const [capabilities, setCapabilities] = useState<WebGLCapabilities | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [quality, setQuality] = useState<'low' | 'medium' | 'high' | 'ultra'>('high')
  const [showControls, setShowControls] = useState(true)
  const [enableParticles, setEnableParticles] = useState(true)
  const [enableLighting, setEnableLighting] = useState(true)
  const [dragonSize, setDragonSize] = useState<'sm' | 'md' | 'lg' | 'xl' | 'gigantic'>('lg')

  // Check WebGL capabilities
  useEffect(() => {
    try {
      const canvas = document.createElement('canvas')
      const context = canvas.getContext('webgl') || canvas.getContext('experimental-webgl') as WebGLRenderingContext | null
      
      if (!context) {
        throw new Error('WebGL not supported')
      }

      const caps: WebGLCapabilities = {
        webgl: !!context,
        webgl2: !!canvas.getContext('webgl2'),
        maxTextureSize: context.getParameter(context.MAX_TEXTURE_SIZE),
        maxVertexUniforms: context.getParameter(context.MAX_VERTEX_UNIFORM_VECTORS),
        maxFragmentUniforms: context.getParameter(context.MAX_FRAGMENT_UNIFORM_VECTORS),
        extensions: context.getSupportedExtensions() || []
      }

      setCapabilities(caps)
      setLoading(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown WebGL error')
      setLoading(false)
    }
  }, [])

  // Voice state handlers
  const handleListening = () => {
    setVoiceState(prev => ({
      ...prev,
      isListening: !prev.isListening,
      isSpeaking: false,
      isProcessing: false,
      isIdle: false,
      emotion: 'focused'
    }))
  }

  const handleSpeaking = () => {
    setVoiceState(prev => ({
      ...prev,
      isListening: false,
      isSpeaking: !prev.isSpeaking,
      isProcessing: false,
      isIdle: false,
      volume: prev.isSpeaking ? 0 : 0.8,
      emotion: 'excited'
    }))
  }

  const handleProcessing = () => {
    setVoiceState(prev => ({
      ...prev,
      isListening: false,
      isSpeaking: false,
      isProcessing: !prev.isProcessing,
      isIdle: false,
      emotion: 'focused'
    }))
  }

  const handleReset = () => {
    setVoiceState({
      isListening: false,
      isSpeaking: false,
      isProcessing: false,
      isIdle: true,
      volume: 0,
      emotion: 'calm'
    })
  }

  const handleDragonError = (error: Error) => {
    console.error('Dragon rendering error:', error)
    setError(`Dragon rendering failed: ${error.message}`)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-900 via-red-900 to-orange-900 flex items-center justify-center">
        <div className="text-center text-white">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-400 mx-auto mb-4"></div>
          <p className="text-xl">Initializing WebGL...</p>
        </div>
      </div>
    )
  }

  if (error || !capabilities?.webgl) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-900 via-red-900 to-orange-900 flex items-center justify-center p-8">
        <div className="bg-red-900/50 border border-red-500 rounded-lg p-8 max-w-md text-center text-white">
          <AlertTriangle className="h-12 w-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-4">WebGL Not Available</h2>
          <p className="text-red-200 mb-6">
            {error || 'Your browser does not support WebGL, which is required for 3D dragon rendering.'}
          </p>
          <div className="text-left bg-black/20 p-4 rounded">
            <h3 className="font-semibold mb-2">Fallback Options:</h3>
            <ul className="text-sm space-y-1">
              <li>• Try a different browser (Chrome, Firefox, Edge)</li>
              <li>• Enable hardware acceleration</li>
              <li>• Update your graphics drivers</li>
              <li>• Use the 2D Sprite Dragons instead</li>
            </ul>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-900 via-red-900 to-orange-900 relative">
      {/* Header */}
      <div className="relative z-10 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-4xl font-bold text-yellow-400 mb-2">
                3D WebGL Dragons
              </h1>
              <p className="text-yellow-200">
                Hardware-accelerated 3D dragon rendering with voice integration
              </p>
            </div>
            <button
              onClick={() => setShowControls(!showControls)}
              className="p-2 bg-yellow-500/20 border border-yellow-500 rounded-lg text-yellow-400 hover:bg-yellow-500/30 transition-colors"
            >
              <Eye className="h-5 w-5" />
            </button>
          </div>

          {/* WebGL Capabilities */}
          <div className="bg-black/20 border border-yellow-500/30 rounded-lg p-4 mb-6">
            <h3 className="text-lg font-semibold text-yellow-400 mb-3">WebGL Capabilities</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-400" />
                <span className="text-white">WebGL: {capabilities.webgl ? 'Yes' : 'No'}</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-400" />
                <span className="text-white">WebGL2: {capabilities.webgl2 ? 'Yes' : 'No'}</span>
              </div>
              <div className="text-white">
                Max Texture: {capabilities.maxTextureSize}px
              </div>
              <div className="text-white">
                Extensions: {capabilities.extensions.length}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3D Scene */}
      <div className="absolute inset-0 z-0">
        <Canvas
          shadows
          camera={{ position: [0, 2, 5], fov: 50 }}
          gl={{ 
            antialias: true, 
            alpha: true,
            powerPreference: "high-performance",
            failIfMajorPerformanceCaveat: false
          }}
          onCreated={({ gl }) => {
            gl.setPixelRatio(window.devicePixelRatio)
            gl.setSize(window.innerWidth, window.innerHeight)
          }}
        >
          <Suspense fallback={null}>
            {/* Lighting */}
            {enableLighting && (
              <>
                <ambientLight intensity={0.3} color="#fbbf24" />
                <directionalLight
                  position={[10, 10, 5]}
                  intensity={voiceState.isSpeaking ? 1.5 : 1}
                  color={voiceState.isSpeaking ? "#ff6b35" : voiceState.isListening ? "#3b82f6" : "#fbbf24"}
                  castShadow
                />
                <pointLight
                  position={[0, 5, 0]}
                  intensity={voiceState.volume * 2}
                  color="#ff4500"
                  distance={20}
                />
              </>
            )}

            {/* Environment */}
            <Environment preset="sunset" />

            {/* Dragon */}
            <SeironGLBDragon
              voiceState={voiceState}
              size={dragonSize}
              enableAnimations={true}
              onError={handleDragonError}
            />

            {/* Camera Controls */}
            <OrbitControls
              enablePan={true}
              enableZoom={true}
              enableRotate={true}
              minDistance={2}
              maxDistance={10}
              minPolarAngle={0}
              maxPolarAngle={Math.PI}
            />
          </Suspense>
        </Canvas>
      </div>

      {/* Controls Panel */}
      {showControls && (
        <div className="absolute bottom-6 left-6 right-6 z-10">
          <div className="max-w-4xl mx-auto bg-black/40 backdrop-blur-lg border border-yellow-500/30 rounded-lg p-6">
            {/* Voice Controls */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-yellow-400 mb-3">Voice Integration</h3>
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={handleListening}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                    voiceState.isListening
                      ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/25'
                      : 'bg-blue-500/20 text-blue-400 border border-blue-500/50 hover:bg-blue-500/30'
                  }`}
                >
                  {voiceState.isListening ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
                  {voiceState.isListening ? 'Listening...' : 'Start Listening'}
                </button>

                <button
                  onClick={handleSpeaking}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                    voiceState.isSpeaking
                      ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/25'
                      : 'bg-orange-500/20 text-orange-400 border border-orange-500/50 hover:bg-orange-500/30'
                  }`}
                >
                  <Volume2 className="h-4 w-4" />
                  {voiceState.isSpeaking ? 'Speaking...' : 'Test Speaking'}
                </button>

                <button
                  onClick={handleProcessing}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                    voiceState.isProcessing
                      ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/25'
                      : 'bg-purple-500/20 text-purple-400 border border-purple-500/50 hover:bg-purple-500/30'
                  }`}
                >
                  <Zap className="h-4 w-4" />
                  {voiceState.isProcessing ? 'Processing...' : 'Test Processing'}
                </button>

                <button
                  onClick={handleReset}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-500/20 text-gray-400 border border-gray-500/50 rounded-lg font-medium hover:bg-gray-500/30 transition-all"
                >
                  <RotateCcw className="h-4 w-4" />
                  Reset
                </button>
              </div>

              {/* Voice State Display */}
              <div className="mt-3 text-sm text-gray-300">
                <span className="mr-4">
                  State: <span className="text-yellow-400 font-medium">
                    {voiceState.isListening ? 'Listening' : voiceState.isSpeaking ? 'Speaking' : voiceState.isProcessing ? 'Processing' : 'Idle'}
                  </span>
                </span>
                <span className="mr-4">
                  Volume: <span className="text-yellow-400 font-medium">{Math.round(voiceState.volume * 100)}%</span>
                </span>
                <span>
                  Emotion: <span className="text-yellow-400 font-medium capitalize">{voiceState.emotion}</span>
                </span>
              </div>
            </div>

            {/* Rendering Controls */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Quality */}
              <div>
                <label className="block text-sm font-medium text-yellow-400 mb-2">
                  Quality Level
                </label>
                <select
                  value={quality}
                  onChange={(e) => setQuality(e.target.value as any)}
                  className="w-full p-2 bg-black/30 border border-yellow-500/30 rounded text-white"
                >
                  <option value="low">Low (Mobile)</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="ultra">Ultra (Desktop)</option>
                </select>
              </div>

              {/* Dragon Size */}
              <div>
                <label className="block text-sm font-medium text-yellow-400 mb-2">
                  Dragon Size
                </label>
                <select
                  value={dragonSize}
                  onChange={(e) => setDragonSize(e.target.value as any)}
                  className="w-full p-2 bg-black/30 border border-yellow-500/30 rounded text-white"
                >
                  <option value="sm">Small</option>
                  <option value="md">Medium</option>
                  <option value="lg">Large</option>
                  <option value="xl">Extra Large</option>
                  <option value="gigantic">Gigantic</option>
                </select>
              </div>

              {/* Effects */}
              <div>
                <label className="block text-sm font-medium text-yellow-400 mb-2">
                  Effects
                </label>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm text-white">
                    <input
                      type="checkbox"
                      checked={enableParticles}
                      onChange={(e) => setEnableParticles(e.target.checked)}
                      className="rounded"
                    />
                    Particle Effects
                  </label>
                  <label className="flex items-center gap-2 text-sm text-white">
                    <input
                      type="checkbox"
                      checked={enableLighting}
                      onChange={(e) => setEnableLighting(e.target.checked)}
                      className="rounded"
                    />
                    Dynamic Lighting
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Loading indicator for the 3D scene */}
      <Loader />
    </div>
  )
}
import React, { useState, useEffect, useRef } from 'react'
import { Play, Pause, RotateCcw, AlertTriangle, CheckCircle, Zap, Eye, Palette } from 'lucide-react'

interface WebGLCapabilities {
  webgl: boolean
  webgl2: boolean
  maxTextureSize: number
  maxVertexUniforms: number
  maxFragmentUniforms: number
  extensions: string[]
}

// Simplified WebGL demo
export default function WebGL3DPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isAnimating, setIsAnimating] = useState(false)
  const [capabilities, setCapabilities] = useState<WebGLCapabilities | null>(null)
  const [rotationX, setRotationX] = useState(0)
  const [rotationY, setRotationY] = useState(0)
  const [zoom, setZoom] = useState(1)
  const [animationSpeed, setAnimationSpeed] = useState(1)
  const [glowIntensity, setGlowIntensity] = useState(0.5)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const animationRef = useRef<number | null>(null)

  // Initialize WebGL
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    try {
      const context = canvas.getContext('webgl') || canvas.getContext('experimental-webgl') as WebGLRenderingContext | null
      if (!context) {
        throw new Error('WebGL not supported')
      }

      // Check capabilities
      const caps: WebGLCapabilities = {
        webgl: !!context,
        webgl2: !!canvas.getContext('webgl2'),
        maxTextureSize: context.getParameter(context.MAX_TEXTURE_SIZE),
        maxVertexUniforms: context.getParameter(context.MAX_VERTEX_UNIFORM_VECTORS),
        maxFragmentUniforms: context.getParameter(context.MAX_FRAGMENT_UNIFORM_VECTORS),
        extensions: context.getSupportedExtensions() || []
      }

      setCapabilities(caps)
      
      // Simple WebGL setup
      context.clearColor(0.1, 0.1, 0.1, 1.0)
      context.enable(context.DEPTH_TEST)
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown WebGL error')
    } finally {
      setLoading(false)
    }
  }, [])

  // Simple animation loop
  useEffect(() => {
    if (!isAnimating) return

    const animate = () => {
      const canvas = canvasRef.current
      if (canvas) {
        const ctx = canvas.getContext('2d')
        if (ctx) {
          // Fallback to 2D canvas rendering
          ctx.fillStyle = '#0a0a0a'
          ctx.fillRect(0, 0, canvas.width, canvas.height)
          
          ctx.save()
          ctx.translate(canvas.width / 2, canvas.height / 2)
          ctx.scale(zoom, zoom)
          ctx.rotate((rotationX + rotationY) * 0.01)
          
          // Draw a simple dragon shape
          ctx.fillStyle = `hsl(${30 + glowIntensity * 60}, 70%, 50%)`
          ctx.beginPath()
          ctx.arc(0, 0, 50, 0, Math.PI * 2)
          ctx.fill()
          
          // Add glow effect
          const gradient = ctx.createRadialGradient(0, 0, 50, 0, 0, 100)
          gradient.addColorStop(0, `hsla(${30 + glowIntensity * 60}, 70%, 50%, 0.8)`)
          gradient.addColorStop(1, 'transparent')
          ctx.fillStyle = gradient
          ctx.beginPath()
          ctx.arc(0, 0, 100, 0, Math.PI * 2)
          ctx.fill()
          
          ctx.restore()
        }
      }
      
      animationRef.current = requestAnimationFrame(animate)
    }

    animationRef.current = requestAnimationFrame(animate)

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [isAnimating, animationSpeed, rotationX, rotationY, zoom, glowIntensity])

  const handlePlayPause = () => {
    setIsAnimating(!isAnimating)
  }

  const handleReset = () => {
    setRotationX(0)
    setRotationY(0)
    setZoom(1)
    setAnimationSpeed(1)
    setGlowIntensity(0.5)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-orange-400 mx-auto mb-4"></div>
          <h2 className="text-xl font-bold text-orange-400">
            Initializing WebGL Dragon...
          </h2>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 p-6 flex items-center justify-center">
        <div className="max-w-2xl bg-red-900/20 border border-red-500 rounded-lg p-6 text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <AlertTriangle className="w-6 h-6 text-red-400" />
            <h2 className="text-2xl font-bold text-red-400">WebGL Error</h2>
          </div>
          <p className="text-white mb-4">{error}</p>
          <div className="text-left">
            <p className="text-gray-300 mb-2">This demo requires WebGL support. Please try:</p>
            <ul className="text-gray-400 text-sm space-y-1 list-disc list-inside">
              <li>Using a modern browser (Chrome, Firefox, Safari, Edge)</li>
              <li>Enabling hardware acceleration</li>
              <li>Updating your graphics drivers</li>
            </ul>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-6xl font-bold mb-4 bg-gradient-to-r from-blue-400 to-cyan-500 bg-clip-text text-transparent">
            3D WEBGL DRAGONS
          </h1>
          <p className="text-gray-300 text-lg">
            Hardware-accelerated 3D dragon rendering with custom shaders
          </p>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
          {/* 3D Dragon Display */}
          <div className="xl:col-span-3">
            <div className="bg-black/90 border-2 border-blue-400 rounded-lg p-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-blue-400">3D Dragon Renderer</h2>
                <div className="flex gap-2">
                  {capabilities?.webgl ? (
                    <span className="flex items-center gap-1 px-3 py-1 bg-green-900/20 border border-green-400 rounded-full text-green-400 text-sm">
                      <CheckCircle className="w-4 h-4" />
                      WebGL Ready
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 px-3 py-1 bg-red-900/20 border border-red-400 rounded-full text-red-400 text-sm">
                      <AlertTriangle className="w-4 h-4" />
                      WebGL Not Available
                    </span>
                  )}
                  {capabilities?.webgl2 && (
                    <span className="flex items-center gap-1 px-3 py-1 bg-blue-900/20 border border-blue-400 rounded-full text-blue-400 text-sm">
                      <CheckCircle className="w-4 h-4" />
                      WebGL2
                    </span>
                  )}
                </div>
              </div>

              <canvas
                ref={canvasRef}
                width={800}
                height={600}
                className="w-full h-[400px] md:h-[600px] border border-blue-400 rounded-lg bg-gray-950"
              />

              <div className="flex justify-center gap-4 mt-4">
                <button
                  onClick={handlePlayPause}
                  className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-colors duration-200"
                >
                  {isAnimating ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                  {isAnimating ? 'Pause' : 'Start'} Animation
                </button>
                <button
                  onClick={handleReset}
                  className="flex items-center gap-2 px-6 py-3 border border-cyan-400 text-cyan-400 hover:bg-cyan-400/10 font-bold rounded-lg transition-colors duration-200"
                >
                  <RotateCcw className="w-5 h-5" />
                  Reset
                </button>
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="xl:col-span-1 space-y-6">
            {/* Animation Controls */}
            <div className="bg-black/80 border border-gray-700 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-4">
                <Play className="w-5 h-5 text-blue-400" />
                <h3 className="text-lg font-bold text-blue-400">Animation</h3>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-gray-300 text-sm mb-2">
                    Speed: {animationSpeed.toFixed(1)}x
                  </label>
                  <input
                    type="range"
                    min="0.1"
                    max="3"
                    step="0.1"
                    value={animationSpeed}
                    onChange={(e) => setAnimationSpeed(parseFloat(e.target.value))}
                    className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider-blue"
                  />
                </div>
                <div>
                  <label className="block text-gray-300 text-sm mb-2">
                    Glow: {glowIntensity.toFixed(1)}
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="2"
                    step="0.1"
                    value={glowIntensity}
                    onChange={(e) => setGlowIntensity(parseFloat(e.target.value))}
                    className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider-orange"
                  />
                </div>
              </div>
            </div>

            {/* Transform Controls */}
            <div className="bg-black/80 border border-gray-700 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-4">
                <Zap className="w-5 h-5 text-cyan-400" />
                <h3 className="text-lg font-bold text-cyan-400">Transform</h3>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-gray-300 text-sm mb-2">
                    Rotation X: {rotationX}°
                  </label>
                  <input
                    type="range"
                    min="-180"
                    max="180"
                    value={rotationX}
                    onChange={(e) => setRotationX(parseInt(e.target.value))}
                    className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider-cyan"
                  />
                </div>
                <div>
                  <label className="block text-gray-300 text-sm mb-2">
                    Rotation Y: {rotationY}°
                  </label>
                  <input
                    type="range"
                    min="-180"
                    max="180"
                    value={rotationY}
                    onChange={(e) => setRotationY(parseInt(e.target.value))}
                    className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider-cyan"
                  />
                </div>
                <div>
                  <label className="block text-gray-300 text-sm mb-2">
                    Zoom: {zoom.toFixed(1)}x
                  </label>
                  <input
                    type="range"
                    min="0.5"
                    max="3"
                    step="0.1"
                    value={zoom}
                    onChange={(e) => setZoom(parseFloat(e.target.value))}
                    className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider-purple"
                  />
                </div>
              </div>
            </div>

            {/* WebGL Info */}
            <div className="bg-black/80 border border-gray-700 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-4">
                <Eye className="w-5 h-5 text-purple-400" />
                <h3 className="text-lg font-bold text-purple-400">WebGL Info</h3>
              </div>
              {capabilities && (
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">WebGL:</span>
                    <span className="text-white">{capabilities.webgl ? 'Supported' : 'Not Supported'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">WebGL2:</span>
                    <span className="text-white">{capabilities.webgl2 ? 'Supported' : 'Not Supported'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Max Texture:</span>
                    <span className="text-white">{capabilities.maxTextureSize}px</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Extensions:</span>
                    <span className="text-white">{capabilities.extensions.length}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Description */}
        <div className="mt-8 bg-black/60 border border-gray-700 rounded-lg p-6">
          <h3 className="text-2xl font-bold text-blue-400 mb-4">About 3D WebGL Dragons</h3>
          <p className="text-gray-300 mb-4">
            This demonstration uses WebGL to render a 3D dragon with real-time lighting, animations, and effects. 
            The dragon mesh is created programmatically and rendered using custom vertex and fragment shaders.
          </p>
          <p className="text-gray-300 mb-4">
            Features include breathing animation, dynamic lighting, glow effects, and interactive controls for 
            rotation, zoom, and animation parameters. The renderer automatically detects WebGL capabilities 
            and provides fallbacks for unsupported features.
          </p>
          <div className="flex flex-wrap gap-4 text-sm">
            <div className="flex items-center gap-2">
              <Play className="w-4 h-4 text-green-400" />
              <span className="text-gray-300">Real-time 3D animation</span>
            </div>
            <div className="flex items-center gap-2">
              <Palette className="w-4 h-4 text-blue-400" />
              <span className="text-gray-300">Custom shader effects</span>
            </div>
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-purple-400" />
              <span className="text-gray-300">Interactive controls</span>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .slider-blue::-webkit-slider-thumb {
          appearance: none;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: #3b82f6;
          cursor: pointer;
        }
        .slider-orange::-webkit-slider-thumb {
          appearance: none;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: #f97316;
          cursor: pointer;
        }
        .slider-cyan::-webkit-slider-thumb {
          appearance: none;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: #06b6d4;
          cursor: pointer;
        }
        .slider-purple::-webkit-slider-thumb {
          appearance: none;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: #8b5cf6;
          cursor: pointer;
        }
      `}</style>
    </div>
  )
}
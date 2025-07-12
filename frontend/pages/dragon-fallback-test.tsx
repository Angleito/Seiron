'use client'

import React, { useState, useEffect } from 'react'
import Head from 'next/head'
import { DragonRenderer } from '../components/dragon/DragonRenderer'
import { DragonFallbackRendererWithErrorBoundary } from '../components/dragon/DragonFallbackRenderer'
import { webglFallbackManager, isHeadlessEnvironment, detectWebGLCapabilities } from '../utils/webglFallback'
import { webglDiagnostics } from '../utils/webglDiagnostics'

export default function DragonFallbackTestPage() {
  const [capabilities, setCapabilities] = useState<any>(null)
  const [diagnostics, setDiagnostics] = useState<any>(null)
  const [healthMetrics, setHealthMetrics] = useState<any>(null)
  const [isHeadless, setIsHeadless] = useState(false)
  const [voiceState, setVoiceState] = useState({
    isListening: false,
    isSpeaking: false,
    isProcessing: false,
    isIdle: true,
    volume: 0.5,
    emotion: 'calm' as const
  })
  const [dragonType, setDragonType] = useState<'auto' | 'glb' | 'fallback' | '2d' | 'ascii'>('auto')

  useEffect(() => {
    // Detect environment and capabilities
    const runDiagnostics = async () => {
      try {
        const headless = isHeadlessEnvironment()
        setIsHeadless(headless)
        
        const caps = detectWebGLCapabilities()
        setCapabilities(caps)
        
        const diag = webglDiagnostics.getDiagnosticInfo()
        setDiagnostics(diag)
        
        const health = webglDiagnostics.getHealthMetrics()
        setHealthMetrics(health)
        
        console.log('Fallback Test Diagnostics:', {
          headless,
          capabilities: caps,
          diagnostics: diag,
          health
        })
      } catch (error) {
        console.error('Diagnostics failed:', error)
      }
    }

    runDiagnostics()
  }, [])

  const simulateVoiceStates = () => {
    // Cycle through voice states for testing
    const states = [
      { isListening: true, isSpeaking: false, isProcessing: false, isIdle: false, volume: 0.7, emotion: 'focused' },
      { isListening: false, isSpeaking: true, isProcessing: false, isIdle: false, volume: 0.9, emotion: 'excited' },
      { isListening: false, isSpeaking: false, isProcessing: true, isIdle: false, volume: 0.3, emotion: 'calm' },
      { isListening: false, isSpeaking: false, isProcessing: false, isIdle: true, volume: 0.2, emotion: 'calm' }
    ] as const

    let currentIndex = 0
    const interval = setInterval(() => {
      setVoiceState(states[currentIndex])
      currentIndex = (currentIndex + 1) % states.length
    }, 3000)

    return () => clearInterval(interval)
  }

  const forceWebGLError = () => {
    // Simulate WebGL context loss
    try {
      const canvas = document.createElement('canvas')
      const gl = canvas.getContext('webgl')
      if (gl) {
        const loseContext = gl.getExtension('WEBGL_lose_context')
        if (loseContext) {
          loseContext.loseContext()
          console.log('Simulated WebGL context loss')
        }
      }
    } catch (error) {
      console.error('Failed to simulate WebGL error:', error)
    }
  }

  return (
    <>
      <Head>
        <title>Dragon Fallback System Test - Seiron</title>
        <meta name="description" content="Testing WebGL fallback system for headless and Docker environments" />
      </Head>

      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white p-4">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-4xl font-bold text-center mb-8 text-yellow-400">
            🐉 Dragon Fallback System Test
          </h1>

          {/* Environment Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            <div className="bg-gray-800 p-4 rounded-lg">
              <h3 className="text-lg font-semibold mb-2 text-blue-400">Environment</h3>
              <div className="space-y-1 text-sm">
                <div>Headless: {isHeadless ? '✅ Yes' : '❌ No'}</div>
                <div>User Agent: {typeof navigator !== 'undefined' ? navigator.userAgent.slice(0, 50) + '...' : 'N/A'}</div>
                <div>Platform: {typeof navigator !== 'undefined' ? navigator.platform : 'Server'}</div>
              </div>
            </div>

            <div className="bg-gray-800 p-4 rounded-lg">
              <h3 className="text-lg font-semibold mb-2 text-green-400">Capabilities</h3>
              <div className="space-y-1 text-sm">
                {capabilities ? Object.entries(capabilities).map(([key, value]) => (
                  <div key={key}>
                    {key}: {value ? '✅' : '❌'}
                  </div>
                )) : 'Loading...'}
              </div>
            </div>

            <div className="bg-gray-800 p-4 rounded-lg">
              <h3 className="text-lg font-semibold mb-2 text-orange-400">Health Metrics</h3>
              <div className="space-y-1 text-sm">
                {healthMetrics ? (
                  <>
                    <div>Context Available: {healthMetrics.isContextAvailable ? '✅' : '❌'}</div>
                    <div>Context Lost: {healthMetrics.isContextLost ? '❌' : '✅'}</div>
                    <div>Rendering Type: {healthMetrics.renderingContextType || 'None'}</div>
                    <div>Performance Score: {healthMetrics.performanceScore.toFixed(1)}</div>
                    <div>Memory Usage: {healthMetrics.memoryUsage.toFixed(1)} MB</div>
                    <div>Errors: {healthMetrics.errorCount}</div>
                  </>
                ) : 'Loading...'}
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="bg-gray-800 p-4 rounded-lg mb-8">
            <h3 className="text-lg font-semibold mb-4 text-purple-400">Test Controls</h3>
            <div className="flex flex-wrap gap-4">
              <select 
                value={dragonType} 
                onChange={(e) => setDragonType(e.target.value as any)}
                className="bg-gray-700 text-white px-3 py-2 rounded"
              >
                <option value="auto">Auto-detect</option>
                <option value="glb">GLB/3D Model</option>
                <option value="fallback">Fallback Renderer</option>
                <option value="2d">2D Sprite</option>
                <option value="ascii">ASCII Art</option>
              </select>

              <button 
                onClick={simulateVoiceStates}
                className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded"
              >
                Test Voice States
              </button>

              <button 
                onClick={forceWebGLError}
                className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded"
              >
                Simulate WebGL Error
              </button>

              <button 
                onClick={() => window.location.reload()}
                className="bg-gray-600 hover:bg-gray-700 px-4 py-2 rounded"
              >
                Reset
              </button>
            </div>
          </div>

          {/* Dragon Renderers Comparison */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Traditional Dragon Renderer */}
            <div className="bg-gray-800 p-6 rounded-lg">
              <h3 className="text-xl font-semibold mb-4 text-yellow-400">
                Traditional Dragon Renderer
              </h3>
              <div className="bg-black rounded-lg h-80 relative">
                <DragonRenderer
                  dragonType={dragonType}
                  voiceState={voiceState}
                  enableFallback={true}
                  enableWebGLFallback={true}
                  className="w-full h-full"
                  width={400}
                  height={320}
                  onError={(error, type) => {
                    console.error(`Traditional renderer error (${type}):`, error)
                  }}
                  onFallback={(from, to) => {
                    console.log(`Traditional renderer fallback: ${from} → ${to}`)
                  }}
                />
              </div>
              <div className="mt-2 text-sm text-gray-400">
                Current Type: {dragonType} | Voice: {
                  voiceState.isListening ? 'Listening' :
                  voiceState.isSpeaking ? 'Speaking' :
                  voiceState.isProcessing ? 'Processing' : 'Idle'
                }
              </div>
            </div>

            {/* Fallback Renderer Direct Test */}
            <div className="bg-gray-800 p-6 rounded-lg">
              <h3 className="text-xl font-semibold mb-4 text-cyan-400">
                Direct Fallback Renderer
              </h3>
              <div className="bg-black rounded-lg h-80 relative">
                <DragonFallbackRendererWithErrorBoundary
                  voiceState={voiceState}
                  className="w-full h-full"
                  width={400}
                  height={320}
                  enableEyeTracking={true}
                  lightningActive={voiceState.isSpeaking && voiceState.volume > 0.7}
                  enableAutoFallback={true}
                  preferredMode="auto"
                  onError={(error) => {
                    console.error('Fallback renderer error:', error)
                  }}
                  onFallback={(mode) => {
                    console.log(`Fallback renderer mode: ${mode}`)
                  }}
                />
              </div>
              <div className="mt-2 text-sm text-gray-400">
                Direct fallback test | Environment: {isHeadless ? 'Headless' : 'Browser'}
              </div>
            </div>
          </div>

          {/* Diagnostic Report */}
          <div className="mt-8 bg-gray-800 p-6 rounded-lg">
            <h3 className="text-xl font-semibold mb-4 text-red-400">Full Diagnostic Report</h3>
            <div className="bg-black p-4 rounded text-xs font-mono overflow-auto max-h-96">
              <pre>{diagnostics ? webglDiagnostics.generateReport() : 'Loading diagnostics...'}</pre>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-8 text-center text-gray-500">
            <p>Test page for WebGL fallback system - works in headless/Docker environments</p>
            <p>Check console for detailed logs and fallback information</p>
          </div>
        </div>
      </div>
    </>
  )
}
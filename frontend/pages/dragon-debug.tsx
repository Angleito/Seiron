import React, { useEffect, useState } from 'react'
import { DragonRenderer } from '../components/dragon/DragonRenderer'
import { SeironGLBDragonWithWebGLErrorBoundary } from '../components/dragon/SeironGLBDragon'

export default function DragonDebugPage() {
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 })
  
  useEffect(() => {
    const updateSize = () => {
      const container = document.getElementById('dragon-container')
      if (container) {
        const rect = container.getBoundingClientRect()
        setContainerSize({ width: rect.width, height: rect.height })
        console.log('Container size:', rect)
      }
    }
    
    updateSize()
    window.addEventListener('resize', updateSize)
    return () => window.removeEventListener('resize', updateSize)
  }, [])
  
  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <h1 className="text-3xl font-bold mb-8">Dragon Debug Page</h1>
      
      {/* Container Info */}
      <div className="mb-4 p-4 bg-gray-800 rounded">
        <h2 className="text-xl mb-2">Container Info</h2>
        <p>Width: {containerSize.width}px</p>
        <p>Height: {containerSize.height}px</p>
      </div>
      
      {/* Test 1: Fixed size container with DragonRenderer */}
      <div className="mb-8">
        <h2 className="text-2xl mb-4">Test 1: DragonRenderer (Fixed Size)</h2>
        <div 
          id="dragon-container"
          className="relative bg-gray-800 border-4 border-yellow-400"
          style={{ width: '800px', height: '600px' }}
        >
          <DragonRenderer
            size="lg"
            dragonType="glb"
            enableFallback={true}
            fallbackType="2d"
            enableAnimations={true}
            className="w-full h-full"
            voiceState={{
              isListening: false,
              isSpeaking: false,
              isProcessing: false,
              isIdle: true,
              volume: 0.5,
              emotion: 'calm'
            }}
            onError={(error, type) => {
              console.error(`Dragon ${type} error:`, error)
            }}
            onFallback={(fromType, toType) => {
              console.log(`Dragon fallback: ${fromType} → ${toType}`)
            }}
          />
        </div>
      </div>
      
      {/* Test 2: Direct GLB Dragon component */}
      <div className="mb-8">
        <h2 className="text-2xl mb-4">Test 2: Direct GLB Dragon (Fixed Size)</h2>
        <div 
          className="relative bg-gray-800 border-4 border-green-400"
          style={{ width: '800px', height: '600px' }}
        >
          <SeironGLBDragonWithWebGLErrorBoundary
            size="lg"
            enableAnimations={true}
            className="w-full h-full"
            voiceState={{
              isListening: false,
              isSpeaking: false,
              isProcessing: false,
              isIdle: true,
              volume: 0.5
            }}
            onError={(error) => {
              console.error('Direct GLB error:', error)
            }}
            onFallback={() => {
              console.log('Direct GLB fallback triggered')
            }}
          />
        </div>
      </div>
      
      {/* Test 3: Simple Three.js cube test */}
      <div className="mb-8">
        <h2 className="text-2xl mb-4">Test 3: Simple Canvas Test</h2>
        <div 
          className="relative bg-gray-800 border-4 border-blue-400"
          style={{ width: '800px', height: '600px' }}
        >
          <canvas 
            id="test-canvas"
            style={{ 
              width: '100%', 
              height: '100%',
              background: 'rgba(255, 255, 0, 0.1)'
            }}
          />
        </div>
      </div>
      
      {/* Test 4: ASCII Dragon (should always work) */}
      <div className="mb-8">
        <h2 className="text-2xl mb-4">Test 4: ASCII Dragon</h2>
        <div 
          className="relative bg-gray-800 border-4 border-purple-400"
          style={{ width: '800px', height: '600px' }}
        >
          <DragonRenderer
            size="lg"
            dragonType="ascii"
            enableFallback={false}
            enableAnimations={true}
            className="w-full h-full"
            voiceState={{
              isListening: false,
              isSpeaking: false,
              isProcessing: false,
              isIdle: true,
              volume: 0.5,
              emotion: 'calm'
            }}
          />
        </div>
      </div>
      
      {/* Test 5: 2D Dragon */}
      <div className="mb-8">
        <h2 className="text-2xl mb-4">Test 5: 2D Dragon</h2>
        <div 
          className="relative bg-gray-800 border-4 border-orange-400"
          style={{ width: '800px', height: '600px' }}
        >
          <DragonRenderer
            size="lg"
            dragonType="2d"
            enableFallback={false}
            enableAnimations={true}
            className="w-full h-full"
            voiceState={{
              isListening: false,
              isSpeaking: false,
              isProcessing: false,
              isIdle: true,
              volume: 0.5,
              emotion: 'calm'
            }}
          />
        </div>
      </div>
    </div>
  )
}
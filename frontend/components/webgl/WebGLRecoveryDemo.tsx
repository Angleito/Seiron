'use client'

import React, { useState } from 'react'
import { SeironGLBDragonWithWebGLErrorBoundary } from '../dragon/SeironGLBDragon'
import WebGLPerformanceMonitor from './WebGLPerformanceMonitor'
import ProductionWebGLErrorBoundary from './ProductionWebGLErrorBoundary'
import { useWebGLRecovery } from '../../utils/webglRecovery'

interface WebGLRecoveryDemoProps {
  className?: string
}

const WebGLRecoveryDemo: React.FC<WebGLRecoveryDemoProps> = ({ className = '' }) => {
  const [showMonitor, setShowMonitor] = useState(true)
  const [dragonFallback, setDragonFallback] = useState(false)
  
  const { 
    simulateContextLoss, 
    resetDiagnostics, 
    diagnostics,
    setQualityLevel 
  } = useWebGLRecovery()

  const handleDragonFallback = () => {
    console.log('Dragon fallback requested')
    setDragonFallback(true)
  }

  const handleRecoverySuccess = () => {
    console.log('WebGL recovery successful')
    setDragonFallback(false)
  }

  const handleRecoveryFailure = () => {
    console.log('WebGL recovery failed')
    setDragonFallback(true)
  }

  return (
    <div className={`relative ${className}`}>
      {/* Main Dragon Component with Production Error Boundary */}
      <ProductionWebGLErrorBoundary
        enableAutoRecovery={true}
        enableQualityReduction={true}
        maxRetries={3}
        showDiagnostics={process.env.NODE_ENV === 'development'}
        onRecoverySuccess={handleRecoverySuccess}
        onRecoveryFailure={handleRecoveryFailure}
        onFallbackRequested={handleDragonFallback}
        onError={(error, errorInfo) => {
          console.error('WebGL Error:', error, errorInfo)
          // Here you could also send to error tracking service
        }}
      >
        {!dragonFallback ? (
          <SeironGLBDragonWithWebGLErrorBoundary
            voiceState={{
              isListening: false,
              isSpeaking: false,
              isProcessing: false,
              isIdle: true,
              volume: 0.5,
              emotion: 'calm'
            }}
            size="lg"
            enableAnimations={true}
            onError={(error) => {
              console.error('Dragon Error:', error)
            }}
            onFallback={handleDragonFallback}
          />
        ) : (
          <div className="flex items-center justify-center min-h-[400px] bg-gradient-to-b from-gray-950 to-black">
            <div className="text-center">
              <div className="text-6xl mb-4 animate-pulse">🐉</div>
              <h3 className="text-2xl font-bold text-yellow-400 mb-2">2D Dragon Mode</h3>
              <p className="text-gray-400">The dragon is running in compatibility mode</p>
            </div>
          </div>
        )}
      </ProductionWebGLErrorBoundary>

      {/* Performance Monitor */}
      {showMonitor && (
        <WebGLPerformanceMonitor
          enabled={true}
          showNotifications={true}
          allowManualQualityControl={true}
        />
      )}

      {/* Development Controls */}
      {process.env.NODE_ENV === 'development' && (
        <div className="fixed bottom-4 left-4 bg-gray-900/95 backdrop-blur-sm border border-gray-700 rounded-lg p-4 space-y-2">
          <h4 className="text-sm font-semibold text-white mb-2">WebGL Recovery Controls</h4>
          
          <div className="space-y-2">
            <button
              onClick={() => simulateContextLoss()}
              className="w-full px-3 py-2 bg-red-600 hover:bg-red-700 text-white text-sm rounded transition-colors"
            >
              Simulate Context Loss
            </button>
            
            <button
              onClick={() => resetDiagnostics()}
              className="w-full px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded transition-colors"
            >
              Reset Diagnostics
            </button>
            
            <button
              onClick={() => setShowMonitor(!showMonitor)}
              className="w-full px-3 py-2 bg-gray-600 hover:bg-gray-700 text-white text-sm rounded transition-colors"
            >
              {showMonitor ? 'Hide' : 'Show'} Monitor
            </button>
          </div>

          <div className="pt-2 border-t border-gray-700">
            <h5 className="text-xs font-medium text-gray-400 mb-1">Quality Controls</h5>
            <div className="grid grid-cols-5 gap-1">
              {[0, 1, 2, 3, 4].map(level => (
                <button
                  key={level}
                  onClick={() => setQualityLevel(level)}
                  className={`px-2 py-1 text-xs rounded transition-colors ${
                    diagnostics.qualityLevel === level
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  {level}
                </button>
              ))}
            </div>
          </div>

          <div className="pt-2 border-t border-gray-700 text-xs text-gray-400">
            <p>Performance: {diagnostics.performanceScore.toFixed(1)}%</p>
            <p>Memory: {diagnostics.memoryUsage.toFixed(1)}MB</p>
            <p>Risk: {diagnostics.contextLossRisk}</p>
            <p>Quality: {diagnostics.qualityLevel}/4</p>
          </div>
        </div>
      )}
    </div>
  )
}

export default WebGLRecoveryDemo
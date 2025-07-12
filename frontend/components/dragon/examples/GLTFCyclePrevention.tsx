'use client'

import React, { useState, useCallback, useEffect } from 'react'
import { 
  GLTFErrorBoundary, 
  useGLTFCircuitBreakerStatus,
  getGLTFCircuitBreakerStats,
  resetGLTFCircuitBreaker
} from '../GLTFErrorBoundary'
import { logger } from '@lib/logger'

// Simulated problematic GLTF component that causes mount/unmount cycles
const ProblematicGLTFComponent: React.FC<{ 
  shouldFail?: boolean
  failureType?: 'loading' | 'parsing' | 'network' 
}> = ({ 
  shouldFail = true, 
  failureType = 'loading' 
}) => {
  const [mountCount, setMountCount] = useState(0)

  useEffect(() => {
    setMountCount(prev => prev + 1)
    
    // Simulate different types of GLTF errors
    if (shouldFail) {
      setTimeout(() => {
        switch (failureType) {
          case 'loading':
            throw new Error('Failed to load GLTF model: file not found')
          case 'parsing':
            throw new Error('GLTF parsing error: invalid typed array length')
          case 'network':
            throw new Error('Network error: 404 not found')
          default:
            throw new Error('Generic GLTF error')
        }
      }, 100)
    }
  }, [shouldFail, failureType])

  return (
    <div className="p-4 border border-green-500 rounded">
      <h3 className="text-green-600 font-semibold">GLTF Component Loaded Successfully</h3>
      <p className="text-sm text-gray-600">Mount count: {mountCount}</p>
    </div>
  )
}

// Circuit breaker status display
const CircuitBreakerStatus: React.FC<{ componentId?: string }> = ({ componentId }) => {
  const { globalStats, componentStatus } = useGLTFCircuitBreakerStatus(componentId)

  return (
    <div className="bg-gray-100 p-4 rounded-lg border">
      <h3 className="font-semibold text-gray-800 mb-3">Global Circuit Breaker Status</h3>
      
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <div className="font-medium text-gray-700">Global Stats:</div>
          <div className="space-y-1 text-gray-600">
            <div>Total Components: {globalStats.totalComponents}</div>
            <div>Open Circuits: {globalStats.openCircuits}</div>
            <div>Permanent Fallbacks: {globalStats.permanentFallbacks}</div>
            <div>Total Mount Attempts: {globalStats.totalMountAttempts}</div>
            <div>Rapid Mount Count: {globalStats.rapidMountCount}</div>
          </div>
        </div>
        
        {componentStatus && (
          <div>
            <div className="font-medium text-gray-700">Component Status:</div>
            <div className="space-y-1 text-gray-600">
              <div>Level: <span className={`font-medium ${
                componentStatus.level === 'closed' ? 'text-green-600' :
                componentStatus.level === 'open' ? 'text-yellow-600' :
                componentStatus.level === 'permanent' ? 'text-red-600' : 'text-orange-600'
              }`}>{componentStatus.level.toUpperCase()}</span></div>
              <div>Can Mount: {componentStatus.canMount ? 'Yes' : 'No'}</div>
              <div>Can Recover: {componentStatus.canRecover ? 'Yes' : 'No'}</div>
              <div>Error Count: {componentStatus.errorCount}</div>
              <div>Mount Attempts: {componentStatus.mountAttempts}</div>
              {componentStatus.cooldownRemaining > 0 && (
                <div>Cooldown: {Math.ceil(componentStatus.cooldownRemaining / 1000)}s</div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// Demonstration component
export const GLTFCyclePreventionDemo: React.FC = () => {
  const [demoState, setDemoState] = useState<{
    shouldFail: boolean
    failureType: 'loading' | 'parsing' | 'network'
    attemptCount: number
    isRunning: boolean
  }>({
    shouldFail: true,
    failureType: 'loading',
    attemptCount: 0,
    isRunning: false
  })

  const [errorBoundaryKey, setErrorBoundaryKey] = useState(0)
  const [logs, setLogs] = useState<string[]>([])

  // Add log entry
  const addLog = useCallback((message: string) => {
    setLogs(prev => [
      `${new Date().toISOString().slice(11, 23)}: ${message}`,
      ...prev.slice(0, 19) // Keep last 20 logs
    ])
  }, [])

  // Simulate rapid mount/unmount cycles (old behavior)
  const simulateRapidMounting = useCallback(() => {
    if (demoState.isRunning) return

    setDemoState(prev => ({ ...prev, isRunning: true }))
    addLog('Starting rapid mount/unmount simulation...')

    let count = 0
    const interval = setInterval(() => {
      count++
      setErrorBoundaryKey(prev => prev + 1)
      setDemoState(prev => ({ ...prev, attemptCount: count }))
      addLog(`Mount attempt #${count}`)

      if (count >= 10) {
        clearInterval(interval)
        setDemoState(prev => ({ ...prev, isRunning: false }))
        addLog('Simulation completed. Check circuit breaker status.')
      }
    }, 500) // Rapid mounting every 500ms
  }, [demoState.isRunning, addLog])

  // Reset everything
  const resetDemo = useCallback(() => {
    setDemoState({
      shouldFail: true,
      failureType: 'loading',
      attemptCount: 0,
      isRunning: false
    })
    setErrorBoundaryKey(0)
    setLogs([])
    
    // Reset circuit breaker (note: this resets all components)
    addLog('Demo reset complete')
  }, [addLog])

  // Handle error boundary events
  const handleError = useCallback((error: Error) => {
    addLog(`Error caught: ${error.message}`)
  }, [addLog])

  const handleFallback = useCallback(() => {
    addLog('Fallback triggered by circuit breaker')
  }, [addLog])

  const handleRecovery = useCallback(() => {
    addLog('Component recovered successfully')
  }, [addLog])

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">
          GLTF Error Boundary Mount/Unmount Cycle Prevention Demo
        </h1>
        <p className="text-gray-600">
          This demo shows how the enhanced GLTF error boundary prevents infinite mount/unmount cycles
          using a global circuit breaker system.
        </p>
      </div>

      {/* Controls */}
      <div className="bg-white p-6 rounded-lg border shadow-sm">
        <h2 className="text-xl font-semibold mb-4">Demo Controls</h2>
        
        <div className="flex flex-wrap gap-4 items-center">
          <label className="flex items-center space-x-2">
            <span className="text-sm font-medium">Failure Type:</span>
            <select 
              value={demoState.failureType}
              onChange={(e) => setDemoState(prev => ({ 
                ...prev, 
                failureType: e.target.value as 'loading' | 'parsing' | 'network' 
              }))}
              className="border rounded px-2 py-1 text-sm"
              disabled={demoState.isRunning}
            >
              <option value="loading">Loading Error</option>
              <option value="parsing">Parsing Error</option>
              <option value="network">Network Error</option>
            </select>
          </label>

          <label className="flex items-center space-x-2">
            <input 
              type="checkbox" 
              checked={demoState.shouldFail}
              onChange={(e) => setDemoState(prev => ({ ...prev, shouldFail: e.target.checked }))}
              disabled={demoState.isRunning}
            />
            <span className="text-sm font-medium">Should Fail</span>
          </label>

          <button
            onClick={simulateRapidMounting}
            disabled={demoState.isRunning}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {demoState.isRunning ? `Simulating... (${demoState.attemptCount}/10)` : 'Simulate Rapid Mounting'}
          </button>

          <button
            onClick={resetDemo}
            disabled={demoState.isRunning}
            className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            Reset Demo
          </button>
        </div>
      </div>

      {/* Circuit Breaker Status */}
      <CircuitBreakerStatus />

      <div className="grid md:grid-cols-2 gap-6">
        {/* GLTF Component with Error Boundary */}
        <div className="bg-white p-6 rounded-lg border shadow-sm">
          <h2 className="text-xl font-semibold mb-4">GLTF Component with Circuit Breaker</h2>
          
          <GLTFErrorBoundary
            key={errorBoundaryKey}
            modelPath="/models/test.glb"
            enableAutoRecovery={true}
            maxRetries={2}
            enableDebugInfo={true}
            onError={handleError}
            onFallback={handleFallback}
            onRecovery={handleRecovery}
          >
            <ProblematicGLTFComponent 
              shouldFail={demoState.shouldFail}
              failureType={demoState.failureType}
            />
          </GLTFErrorBoundary>
        </div>

        {/* Event Log */}
        <div className="bg-white p-6 rounded-lg border shadow-sm">
          <h2 className="text-xl font-semibold mb-4">Event Log</h2>
          
          <div className="bg-gray-50 p-4 rounded border h-80 overflow-y-auto">
            {logs.length === 0 ? (
              <div className="text-gray-500 text-sm italic">No events yet...</div>
            ) : (
              <div className="space-y-1">
                {logs.map((log, index) => (
                  <div 
                    key={index} 
                    className="text-xs font-mono text-gray-700 border-b border-gray-200 pb-1"
                  >
                    {log}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Explanation */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h2 className="text-xl font-semibold text-blue-800 mb-4">How It Works</h2>
        
        <div className="space-y-3 text-blue-700">
          <div>
            <h3 className="font-semibold">1. Global Circuit Breaker</h3>
            <p className="text-sm">
              A singleton circuit breaker tracks mount attempts and errors across all GLTF error boundary instances,
              preventing system-wide mount/unmount cycles.
            </p>
          </div>
          
          <div>
            <h3 className="font-semibold">2. Progressive Fallback Levels</h3>
            <p className="text-sm">
              • <strong>Closed:</strong> Normal operation<br/>
              • <strong>Open:</strong> Temporary blocking with cooldown<br/>
              • <strong>Half-Open:</strong> Testing recovery<br/>
              • <strong>Permanent:</strong> Critical patterns detected, permanent fallback
            </p>
          </div>
          
          <div>
            <h3 className="font-semibold">3. Intelligent Pattern Detection</h3>
            <p className="text-sm">
              The system analyzes error signatures, mount timing, and cross-component behavior to 
              detect cycles before they become problematic.
            </p>
          </div>
          
          <div>
            <h3 className="font-semibold">4. Smart Recovery</h3>
            <p className="text-sm">
              Recovery attempts use exponential backoff and are only allowed when the circuit breaker 
              determines it's safe, preventing infinite retry loops.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default GLTFCyclePreventionDemo
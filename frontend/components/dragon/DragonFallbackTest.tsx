'use client'

import React, { useState } from 'react'
import { DragonRenderer } from './DragonRenderer'

export const DragonFallbackTest: React.FC = () => {
  const [dragonType, setDragonType] = useState<'glb' | '2d' | 'ascii'>('glb')
  const [enableFallback, setEnableFallback] = useState(true)
  const [fallbackLog, setFallbackLog] = useState<string[]>([])
  
  const handleError = (error: Error, type: string) => {
    setFallbackLog(prev => [...prev, `Error in ${type}: ${error.message}`])
  }
  
  const handleFallback = (from: string, to: string) => {
    setFallbackLog(prev => [...prev, `Fallback: ${from} → ${to}`])
  }
  
  const clearLog = () => {
    setFallbackLog([])
  }
  
  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <h1 className="text-3xl font-bold mb-8">Dragon Fallback System Test</h1>
      
      <div className="grid grid-cols-2 gap-8">
        {/* Controls */}
        <div className="space-y-4">
          <div>
            <label className="block mb-2">Dragon Type:</label>
            <select 
              value={dragonType} 
              onChange={(e) => setDragonType(e.target.value as any)}
              className="bg-gray-800 border border-gray-700 rounded px-4 py-2 w-full"
            >
              <option value="glb">GLB (3D Model)</option>
              <option value="2d">2D Sprite</option>
              <option value="ascii">ASCII Art</option>
            </select>
          </div>
          
          <div>
            <label className="flex items-center space-x-2">
              <input 
                type="checkbox" 
                checked={enableFallback}
                onChange={(e) => setEnableFallback(e.target.checked)}
                className="rounded"
              />
              <span>Enable Fallback</span>
            </label>
          </div>
          
          <button
            onClick={clearLog}
            className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded"
          >
            Clear Log
          </button>
          
          <div className="mt-8">
            <h3 className="font-bold mb-2">Fallback Log:</h3>
            <div className="bg-gray-800 rounded p-4 h-48 overflow-y-auto font-mono text-sm">
              {fallbackLog.length === 0 ? (
                <div className="text-gray-500">No events yet...</div>
              ) : (
                fallbackLog.map((log, i) => (
                  <div key={i} className="mb-1">{log}</div>
                ))
              )}
            </div>
          </div>
        </div>
        
        {/* Dragon Display */}
        <div className="bg-gray-800 rounded-lg p-8 h-96 relative">
          <DragonRenderer
            key={dragonType} // Force remount on type change
            dragonType={dragonType}
            enableFallback={enableFallback}
            fallbackType="2d"
            size="lg"
            voiceState={{
              isListening: false,
              isSpeaking: false,
              isProcessing: false,
              isIdle: true,
              volume: 0.5
            }}
            onError={handleError}
            onFallback={handleFallback}
            className="w-full h-full"
          />
        </div>
      </div>
      
      <div className="mt-8 text-sm text-gray-400">
        <p>Test Instructions:</p>
        <ul className="list-disc list-inside mt-2 space-y-1">
          <li>Select "GLB (3D Model)" - if the model fails to load, it should fallback to 2D then ASCII</li>
          <li>The fallback log will show the error and fallback events</li>
          <li>Toggle "Enable Fallback" to see what happens when fallback is disabled</li>
          <li>Each dragon type can be tested independently</li>
        </ul>
      </div>
    </div>
  )
}

export default DragonFallbackTest
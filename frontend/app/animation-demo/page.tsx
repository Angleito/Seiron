'use client'

import { useState } from 'react'
import { OptimizedFloatingDragonLogo } from '../../components/OptimizedFloatingDragonLogo'
import { OptimizedCirclingDragonBalls } from '../../components/OptimizedCirclingDragonBalls'
import { AnimationPerformanceDebugger } from '../../components/AnimationPerformanceDebugger'
import { FloatingDragonLogo } from '../../components/FloatingDragonLogo'
import { CirclingDragonBalls } from '../../components/CirclingDragonBalls'
import type { QualityLevel } from '../../hooks/useAnimationPerformance'

export default function AnimationDemoPage() {
  const [showOptimized, setShowOptimized] = useState(true)
  const [currentQuality, setCurrentQuality] = useState<QualityLevel>('high')
  const [showDebugger, setShowDebugger] = useState(true)
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-red-900/20 to-gray-900">
      {/* Performance Debugger */}
      {showDebugger && (
        <AnimationPerformanceDebugger 
          position="top-right"
          expanded={true}
        />
      )}
      
      {/* Header */}
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold text-white mb-2">
          Dragon Animation Performance Demo
        </h1>
        <p className="text-gray-300 mb-8">
          Compare optimized vs standard animations and monitor performance in real-time
        </p>
        
        {/* Controls */}
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-6 mb-8">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex items-center gap-4">
              <label className="text-white">Version:</label>
              <button
                onClick={() => setShowOptimized(!showOptimized)}
                className={`px-4 py-2 rounded transition-colors ${
                  showOptimized 
                    ? 'bg-green-600 text-white' 
                    : 'bg-red-600 text-white'
                }`}
              >
                {showOptimized ? 'Optimized' : 'Standard'}
              </button>
            </div>
            
            <div className="flex items-center gap-4">
              <label className="text-white">Debugger:</label>
              <button
                onClick={() => setShowDebugger(!showDebugger)}
                className={`px-4 py-2 rounded transition-colors ${
                  showDebugger 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-600 text-white'
                }`}
              >
                {showDebugger ? 'Visible' : 'Hidden'}
              </button>
            </div>
            
            <div className="text-white">
              Current Quality: <span className={`font-bold ${
                currentQuality === 'high' ? 'text-green-400' :
                currentQuality === 'medium' ? 'text-yellow-400' :
                'text-orange-400'
              }`}>{currentQuality.toUpperCase()}</span>
            </div>
          </div>
        </div>
        
        {/* Animation Showcase */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Floating Dragon Logo */}
          <div className="bg-gray-800/30 backdrop-blur-sm rounded-2xl p-8">
            <h2 className="text-2xl font-semibold text-white mb-4">
              Floating Dragon Logo
            </h2>
            <div className="flex justify-center items-center min-h-[400px]">
              {showOptimized ? (
                <OptimizedFloatingDragonLogo 
                  size="lg"
                  showDragonBalls={true}
                  enablePerformanceMonitoring={true}
                  onQualityChange={setCurrentQuality}
                />
              ) : (
                <FloatingDragonLogo 
                  size="lg"
                  showDragonBalls={true}
                />
              )}
            </div>
            <div className="mt-4 text-sm text-gray-400">
              {showOptimized ? (
                <ul className="space-y-1">
                  <li>✓ GPU acceleration enabled</li>
                  <li>✓ Automatic quality adjustment</li>
                  <li>✓ Optimized for mobile devices</li>
                  <li>✓ Memory-efficient animations</li>
                </ul>
              ) : (
                <ul className="space-y-1">
                  <li>✗ No performance optimization</li>
                  <li>✗ Fixed quality level</li>
                  <li>✗ May cause frame drops on mobile</li>
                  <li>✗ Higher memory usage</li>
                </ul>
              )}
            </div>
          </div>
          
          {/* Circling Dragon Balls */}
          <div className="bg-gray-800/30 backdrop-blur-sm rounded-2xl p-8">
            <h2 className="text-2xl font-semibold text-white mb-4">
              Circling Dragon Balls
            </h2>
            <div className="flex justify-center items-center min-h-[400px]">
              {showOptimized ? (
                <OptimizedCirclingDragonBalls 
                  radius={150}
                  speed="normal"
                  interactive={true}
                  enablePerformanceMonitoring={true}
                />
              ) : (
                <CirclingDragonBalls 
                  radius={150}
                  speed="normal"
                  interactive={true}
                />
              )}
            </div>
            <div className="mt-4 text-sm text-gray-400">
              {showOptimized ? (
                <ul className="space-y-1">
                  <li>✓ Physics-based motion on high quality</li>
                  <li>✓ CSS containment for performance</li>
                  <li>✓ Reduced paint areas</li>
                  <li>✓ Smart visibility detection</li>
                </ul>
              ) : (
                <ul className="space-y-1">
                  <li>✗ Basic CSS animations only</li>
                  <li>✗ No containment optimization</li>
                  <li>✗ Full element repaints</li>
                  <li>✗ Always animating</li>
                </ul>
              )}
            </div>
          </div>
        </div>
        
        {/* Performance Tips */}
        <div className="mt-8 bg-gray-800/50 backdrop-blur-sm rounded-lg p-6">
          <h3 className="text-xl font-semibold text-white mb-4">
            Performance Optimization Features
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="bg-gray-700/50 rounded p-4">
              <h4 className="font-semibold text-green-400 mb-2">Low Quality</h4>
              <ul className="text-gray-300 space-y-1">
                <li>• Basic floating animation</li>
                <li>• Simple orbital motion</li>
                <li>• No particle effects</li>
                <li>• Minimal GPU usage</li>
              </ul>
            </div>
            <div className="bg-gray-700/50 rounded p-4">
              <h4 className="font-semibold text-yellow-400 mb-2">Medium Quality</h4>
              <ul className="text-gray-300 space-y-1">
                <li>• Breathing animations</li>
                <li>• Enhanced orbits</li>
                <li>• Basic particle effects</li>
                <li>• Balanced performance</li>
              </ul>
            </div>
            <div className="bg-gray-700/50 rounded p-4">
              <h4 className="font-semibold text-green-400 mb-2">High Quality</h4>
              <ul className="text-gray-300 space-y-1">
                <li>• Full physics simulation</li>
                <li>• All micro-animations</li>
                <li>• Rich particle effects</li>
                <li>• Maximum visual fidelity</li>
              </ul>
            </div>
          </div>
        </div>
        
        {/* Technical Details */}
        <div className="mt-8 bg-gray-800/50 backdrop-blur-sm rounded-lg p-6">
          <h3 className="text-xl font-semibold text-white mb-4">
            Technical Implementation
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm text-gray-300">
            <div>
              <h4 className="font-semibold text-blue-400 mb-2">Optimization Techniques</h4>
              <ul className="space-y-1">
                <li>• <code className="bg-gray-700 px-1 rounded">will-change</code> CSS property for GPU acceleration</li>
                <li>• <code className="bg-gray-700 px-1 rounded">contain</code> property to limit repaints</li>
                <li>• <code className="bg-gray-700 px-1 rounded">transform3d</code> for hardware acceleration</li>
                <li>• <code className="bg-gray-700 px-1 rounded">IntersectionObserver</code> for visibility detection</li>
                <li>• <code className="bg-gray-700 px-1 rounded">requestAnimationFrame</code> for smooth updates</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-blue-400 mb-2">Performance Monitoring</h4>
              <ul className="space-y-1">
                <li>• Real-time FPS tracking</li>
                <li>• Frame time measurement</li>
                <li>• Dropped frame detection</li>
                <li>• CPU/Memory usage estimation</li>
                <li>• Automatic quality adjustment</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
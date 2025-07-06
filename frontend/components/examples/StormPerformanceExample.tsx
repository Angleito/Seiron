import React, { useState } from 'react'
import { StormBackground } from '../effects/StormBackground'
import { StormPerformanceMonitor } from '@/hooks/useStormPerformance'

/**
 * Example component demonstrating the performance-optimized storm effects
 * 
 * Features demonstrated:
 * - Automatic performance monitoring and quality adjustment
 * - Lazy loading of heavy components
 * - Mobile-specific optimizations
 * - Accessibility support (reduced motion)
 * - Battery level awareness
 * - Memory management
 * - Progressive enhancement
 */
export function StormPerformanceExample() {
  const [intensity, setIntensity] = useState(0.6)
  const [animated, setAnimated] = useState(true)

  return (
    <div className="relative w-full h-screen overflow-hidden">
      {/* Performance monitor (only in development) */}
      <StormPerformanceMonitor />
      
      {/* Storm background with performance optimizations */}
      <StormBackground
        intensity={intensity}
        animated={animated}
        className="storm-background"
      >
        {/* Demo content */}
        <div className="relative z-10 flex flex-col items-center justify-center h-full p-8 text-white">
          <h1 className="text-4xl md:text-6xl font-bold text-center mb-8 text-shadow-lg">
            Performance-Optimized Storm
          </h1>
          
          <div className="bg-black/30 backdrop-blur-sm rounded-lg p-6 max-w-md w-full space-y-4">
            <div>
              <label htmlFor="intensity" className="block text-sm font-medium mb-2">
                Storm Intensity: {Math.round(intensity * 100)}%
              </label>
              <input
                id="intensity"
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={intensity}
                onChange={(e) => setIntensity(parseFloat(e.target.value))}
                className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
              />
            </div>
            
            <div className="flex items-center space-x-2">
              <input
                id="animated"
                type="checkbox"
                checked={animated}
                onChange={(e) => setAnimated(e.target.checked)}
                className="w-4 h-4 text-red-600 bg-gray-700 border-gray-600 rounded focus:ring-red-500"
              />
              <label htmlFor="animated" className="text-sm font-medium">
                Enable Animations
              </label>
            </div>
            
            <div className="text-xs text-gray-300 space-y-1">
              <p>🎯 Performance features:</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>Auto FPS monitoring</li>
                <li>Lazy loading of effects</li>
                <li>Mobile optimizations</li>
                <li>Memory management</li>
                <li>Battery awareness</li>
                <li>Reduced motion support</li>
              </ul>
            </div>
          </div>
        </div>
      </StormBackground>
      
      {/* CSS for text shadow */}
      <style dangerouslySetInnerHTML={{
        __html: `
          .text-shadow-lg {
            text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.8),
                         0 0 10px rgba(239, 68, 68, 0.3);
          }
        `
      }} />
    </div>
  )
}

export default StormPerformanceExample
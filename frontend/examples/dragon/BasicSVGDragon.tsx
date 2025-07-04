/**
 * Basic SVG Dragon Example
 * 
 * Demonstrates the simplest implementation of the SVG dragon system
 * with essential features and default configuration.
 */

import React from 'react'
import { EnhancedDragonCharacter } from '@/components/dragon'

export function BasicSVGDragon() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-900 to-purple-900">
      <div className="text-center space-y-8">
        <h1 className="text-4xl font-bold text-white mb-8">
          Basic SVG Dragon
        </h1>
        
        <div className="bg-black/30 backdrop-blur-sm rounded-2xl p-8 border border-blue-500/20">
          <EnhancedDragonCharacter
            size="lg"
            renderMode="svg"
            svgQuality="standard"
            enableSVGAnimations={true}
            interactive={true}
            showDragonBalls={true}
            initialState="idle"
            initialMood="neutral"
          />
        </div>
        
        <div className="text-white text-center max-w-md">
          <p className="text-lg mb-4">
            A basic SVG dragon with standard quality settings and all essential features enabled.
          </p>
          <ul className="text-sm text-gray-300 space-y-1">
            <li>• SVG rendering for crisp graphics</li>
            <li>• Standard quality for balanced performance</li>
            <li>• Interactive cursor tracking</li>
            <li>• 7 orbiting dragon balls</li>
          </ul>
        </div>
      </div>
    </div>
  )
}

export default BasicSVGDragon
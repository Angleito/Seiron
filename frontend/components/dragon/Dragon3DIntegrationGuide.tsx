'use client'

import React, { useState } from 'react'
import Dragon3D from './Dragon3D'

/**
 * Integration guide and demo for the Dragon3D component
 * Shows common usage patterns and best practices
 */
const Dragon3DIntegrationGuide: React.FC = () => {
  const [powerLevel, setPowerLevel] = useState(50)
  
  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-white mb-4">
          Dragon3D Integration Guide
        </h1>
        <p className="text-gray-300">
          Learn how to integrate the 3D Dragon component into your Seiron applications
        </p>
      </div>

      {/* Basic Usage */}
      <section className="bg-gray-800 rounded-lg p-6">
        <h2 className="text-xl font-semibold text-yellow-400 mb-4">Basic Usage</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-lg font-medium text-white mb-2">Simple Dragon</h3>
            <Dragon3D size="md" />
          </div>
          <div className="space-y-4">
            <pre className="bg-gray-900 p-4 rounded text-sm overflow-x-auto">
              <code className="text-green-400">{`import { Dragon3D } from '@/components/dragon'

function MyComponent() {
  return <Dragon3D size="md" />
}`}</code>
            </pre>
          </div>
        </div>
      </section>

      {/* Interactive Dragon */}
      <section className="bg-gray-800 rounded-lg p-6">
        <h2 className="text-xl font-semibold text-yellow-400 mb-4">Interactive Dragon</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-lg font-medium text-white mb-2">
              Power Level: {powerLevel}%
            </h3>
            <Dragon3D 
              size="lg"
              animationSpeed={powerLevel / 50}
              showParticles={powerLevel > 30}
              quality={powerLevel > 70 ? 'high' : 'medium'}
              onClick={() => setPowerLevel(Math.min(100, powerLevel + 10))}
              enableHover={true}
            />
            <div className="mt-4">
              <input
                type="range"
                min="0"
                max="100"
                value={powerLevel}
                onChange={(e) => setPowerLevel(parseInt(e.target.value))}
                className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
              />
            </div>
          </div>
          <div className="space-y-4">
            <pre className="bg-gray-900 p-4 rounded text-sm overflow-x-auto">
              <code className="text-green-400">{`const [powerLevel, setPowerLevel] = useState(50)

<Dragon3D 
  size="lg"
  animationSpeed={powerLevel / 50}
  showParticles={powerLevel > 30}
  quality={powerLevel > 70 ? 'high' : 'medium'}
  onClick={() => setPowerLevel(powerLevel + 10)}
  enableHover={true}
/>`}</code>
            </pre>
          </div>
        </div>
      </section>

      {/* Size Variants */}
      <section className="bg-gray-800 rounded-lg p-6">
        <h2 className="text-xl font-semibold text-yellow-400 mb-4">Size Variants</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 items-center">
          <div className="text-center">
            <h3 className="text-white mb-2">Small</h3>
            <Dragon3D size="sm" enableInteraction={false} />
            <code className="text-xs text-gray-400">size="sm"</code>
          </div>
          <div className="text-center">
            <h3 className="text-white mb-2">Medium</h3>
            <Dragon3D size="md" enableInteraction={false} />
            <code className="text-xs text-gray-400">size="md"</code>
          </div>
          <div className="text-center">
            <h3 className="text-white mb-2">Large</h3>
            <Dragon3D size="lg" enableInteraction={false} />
            <code className="text-xs text-gray-400">size="lg"</code>
          </div>
          <div className="text-center">
            <h3 className="text-white mb-2">Extra Large</h3>
            <Dragon3D size="xl" enableInteraction={false} />
            <code className="text-xs text-gray-400">size="xl"</code>
          </div>
        </div>
      </section>

      {/* Performance Optimization */}
      <section className="bg-gray-800 rounded-lg p-6">
        <h2 className="text-xl font-semibold text-yellow-400 mb-4">Performance Optimization</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <h3 className="text-white mb-2">Low Quality</h3>
            <Dragon3D 
              size="md" 
              quality="low" 
              showParticles={false}
              enableInteraction={false}
            />
            <div className="mt-2 text-xs text-gray-400">
              <p>50 particles</p>
              <p>Simplified geometry</p>
              <p>Best for mobile</p>
            </div>
          </div>
          <div className="text-center">
            <h3 className="text-white mb-2">Medium Quality</h3>
            <Dragon3D 
              size="md" 
              quality="medium" 
              showParticles={true}
              enableInteraction={false}
            />
            <div className="mt-2 text-xs text-gray-400">
              <p>100 particles</p>
              <p>Balanced detail</p>
              <p>Recommended default</p>
            </div>
          </div>
          <div className="text-center">
            <h3 className="text-white mb-2">High Quality</h3>
            <Dragon3D 
              size="md" 
              quality="high" 
              showParticles={true}
              enableInteraction={false}
            />
            <div className="mt-2 text-xs text-gray-400">
              <p>200 particles</p>
              <p>Full detail</p>
              <p>Desktop/powerful devices</p>
            </div>
          </div>
        </div>
      </section>

      {/* Common Patterns */}
      <section className="bg-gray-800 rounded-lg p-6">
        <h2 className="text-xl font-semibold text-yellow-400 mb-4">Common Integration Patterns</h2>
        <div className="space-y-6">
          
          {/* Voice Assistant Integration */}
          <div>
            <h3 className="text-lg font-medium text-white mb-2">Voice Assistant Integration</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center justify-center bg-gray-900 rounded p-4">
                <Dragon3D 
                  size="lg"
                  animationSpeed={1.5}
                  showParticles={true}
                  quality="medium"
                  enableInteraction={false}
                />
              </div>
              <pre className="bg-gray-900 p-4 rounded text-sm overflow-x-auto">
                <code className="text-green-400">{`function VoiceInterface() {
  const { isListening, isProcessing } = useVoice()
  
  return (
    <Dragon3D
      size="lg"
      animationSpeed={isListening ? 2 : 1}
      showParticles={isProcessing}
      quality="medium"
      className="voice-dragon"
    />
  )
}`}</code>
              </pre>
            </div>
          </div>

          {/* Portfolio Dashboard */}
          <div>
            <h3 className="text-lg font-medium text-white mb-2">Portfolio Dashboard</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center justify-center bg-gray-900 rounded p-4">
                <Dragon3D 
                  size="md"
                  animationSpeed={0.8}
                  showParticles={false}
                  quality="medium"
                  autoRotate={true}
                  enableInteraction={false}
                />
              </div>
              <pre className="bg-gray-900 p-4 rounded text-sm overflow-x-auto">
                <code className="text-green-400">{`function PortfolioDashboard() {
  const { portfolioValue } = usePortfolio()
  
  return (
    <Dragon3D
      size="md"
      animationSpeed={portfolioValue > 10000 ? 1.5 : 0.8}
      showParticles={portfolioValue > 50000}
      autoRotate={true}
      onClick={() => openPortfolioDetails()}
    />
  )
}`}</code>
              </pre>
            </div>
          </div>

          {/* Loading States */}
          <div>
            <h3 className="text-lg font-medium text-white mb-2">Loading States</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center justify-center bg-gray-900 rounded p-4">
                <Dragon3D 
                  size="sm"
                  animationSpeed={2}
                  showParticles={true}
                  quality="low"
                  enableInteraction={false}
                />
              </div>
              <pre className="bg-gray-900 p-4 rounded text-sm overflow-x-auto">
                <code className="text-green-400">{`function LoadingDragon({ isLoading }) {
  if (!isLoading) return null
  
  return (
    <Dragon3D
      size="sm"
      animationSpeed={2}
      showParticles={true}
      quality="low"
      enableInteraction={false}
    />
  )
}`}</code>
              </pre>
            </div>
          </div>

        </div>
      </section>

      {/* Best Practices */}
      <section className="bg-gray-800 rounded-lg p-6">
        <h2 className="text-xl font-semibold text-yellow-400 mb-4">Best Practices</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-lg font-medium text-white mb-3">Performance Tips</h3>
            <ul className="space-y-2 text-gray-300 text-sm">
              <li>• Use 'low' quality on mobile devices</li>
              <li>• Disable particles for better performance</li>
              <li>• Set enableInteraction={`{false}`} for decorative dragons</li>
              <li>• Use smaller sizes in dense layouts</li>
              <li>• Adjust animation speed based on system performance</li>
            </ul>
          </div>
          <div>
            <h3 className="text-lg font-medium text-white mb-3">Accessibility</h3>
            <ul className="space-y-2 text-gray-300 text-sm">
              <li>• Respect user motion preferences</li>
              <li>• Provide alternative text descriptions</li>
              <li>• Ensure keyboard navigation support</li>
              <li>• Use appropriate ARIA labels</li>
              <li>• Test with screen readers</li>
            </ul>
          </div>
        </div>
      </section>
    </div>
  )
}

export default Dragon3DIntegrationGuide
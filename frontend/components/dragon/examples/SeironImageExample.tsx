'use client'

import React from 'react'
import { SeironImage } from '../SeironImage'

export const SeironImageExample: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-900 p-8">
      {/* Background variant - ultra low opacity */}
      <SeironImage 
        variant="background" 
        className="z-0"
      />
      
      <div className="relative z-10 space-y-16">
        <section className="text-center">
          <h1 className="text-4xl font-bold text-white mb-8">SeironImage Component Examples</h1>
          
          {/* Hero variant - full size with animations */}
          <div className="flex justify-center mb-8">
            <SeironImage 
              variant="hero"
              onClick={() => console.log('Hero clicked!')}
              className="mx-auto"
            />
          </div>
          <p className="text-gray-300">Hero variant with breathing animation and glow effects</p>
        </section>

        <section className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Corner variant examples */}
          <div className="bg-gray-800 p-6 rounded-lg relative overflow-hidden">
            <SeironImage 
              variant="corner" 
              className="absolute top-4 right-4"
              onClick={() => console.log('Corner clicked!')}
            />
            <h2 className="text-2xl font-bold text-white mb-4">Corner Variant</h2>
            <p className="text-gray-300 mr-32">
              Medium size with hover effects. Opacity transitions from 70% to 90% on hover.
              Perfect for branding corners or as interactive elements.
            </p>
          </div>

          {/* Watermark variant example */}
          <div className="bg-gray-800 p-6 rounded-lg relative">
            <SeironImage 
              variant="watermark" 
              className="absolute bottom-4 left-4"
              enableHoverEffects={false}
            />
            <h2 className="text-2xl font-bold text-white mb-4">Watermark Variant</h2>
            <p className="text-gray-300">
              Ultra-low opacity (5-10%) for subtle background branding. 
              Includes blur effect for a softer appearance.
            </p>
          </div>
        </section>

        <section className="bg-gray-800 p-8 rounded-lg">
          <h2 className="text-2xl font-bold text-white mb-6">Features Demonstration</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <SeironImage 
                variant="corner" 
                className="mx-auto mb-4"
              />
              <h3 className="text-lg font-semibold text-white mb-2">CSS Blend Modes</h3>
              <p className="text-sm text-gray-400">
                Uses mix-blend-mode: screen for fire-like effects
              </p>
            </div>
            
            <div className="text-center">
              <SeironImage 
                variant="corner" 
                className="mx-auto mb-4"
                enableHoverEffects={true}
              />
              <h3 className="text-lg font-semibold text-white mb-2">Interactive Hover</h3>
              <p className="text-sm text-gray-400">
                Scales up and shows fire overlay on hover
              </p>
            </div>
            
            <div className="text-center relative">
              <SeironImage 
                variant="corner" 
                className="mx-auto mb-4"
              />
              <h3 className="text-lg font-semibold text-white mb-2">Radial Gradient Mask</h3>
              <p className="text-sm text-gray-400">
                Edges fade smoothly with gradient masks
              </p>
            </div>
          </div>
        </section>

        <section className="text-center text-gray-400">
          <p>All variants include:</p>
          <ul className="list-disc list-inside mt-2">
            <li>Proper TypeScript types</li>
            <li>Responsive sizing</li>
            <li>Optimized loading (lazy loading for non-hero variants)</li>
            <li>Proper alt text for accessibility</li>
          </ul>
        </section>
      </div>
    </div>
  )
}

export default SeironImageExample
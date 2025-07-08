'use client'

import { useState } from 'react'
import { EnhancedHeroSection } from './EnhancedHeroSection'

/**
 * Example component demonstrating EnhancedHeroSection usage
 * This shows various configuration options and integration patterns
 */
export const EnhancedHeroSectionExample = () => {
  const [currentDemo, setCurrentDemo] = useState<'default' | 'custom' | 'minimal'>('default')

  // Custom taglines for demonstration
  const customTaglines = [
    "Forge your destiny in the DeFi realm",
    "Harness the power of decentralized finance",
    "Transform your portfolio with anime power",
    "Achieve financial Super Saiyan status"
  ]

  const handleNavigation = (path: string) => {
    console.log(`Navigation triggered to: ${path}`)
    // In a real app, this would use router navigation
    // navigate(path) or router.push(path)
  }

  const demoConfigs = {
    default: {
      showPowerLevel: true,
      powerValue: 42000,
      enableAnimations: true,
      size: 'lg' as const,
      customTaglines: undefined
    },
    custom: {
      showPowerLevel: true,
      powerValue: 150000,
      enableAnimations: true,
      size: 'xl' as const,
      customTaglines: customTaglines
    },
    minimal: {
      showPowerLevel: false,
      powerValue: 25000,
      enableAnimations: false,
      size: 'md' as const,
      customTaglines: ["Simple and clean interface"]
    }
  }

  const currentConfig = demoConfigs[currentDemo]

  return (
    <div className="min-h-screen">
      {/* Demo Controls */}
      <div className="fixed top-4 left-4 z-[200] bg-black/80 rounded-lg p-4 backdrop-blur-sm">
        <h3 className="text-white font-semibold mb-2">Demo Mode:</h3>
        <div className="flex gap-2">
          {Object.keys(demoConfigs).map((demo) => (
            <button
              key={demo}
              onClick={() => setCurrentDemo(demo as keyof typeof demoConfigs)}
              className={`
                px-3 py-1 rounded text-sm font-medium transition-all
                ${currentDemo === demo 
                  ? 'bg-yellow-500 text-black' 
                  : 'bg-gray-700 text-white hover:bg-gray-600'
                }
              `}
            >
              {demo.charAt(0).toUpperCase() + demo.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Enhanced Hero Section Demo */}
      <EnhancedHeroSection
        onNavigate={handleNavigation}
        showPowerLevel={currentConfig.showPowerLevel}
        powerValue={currentConfig.powerValue}
        enableAnimations={currentConfig.enableAnimations}
        customTaglines={currentConfig.customTaglines}
        size={currentConfig.size}
        className="demo-hero-section"
      />

      {/* Demo Information */}
      <div className="fixed bottom-4 right-4 z-[200] bg-black/80 rounded-lg p-4 backdrop-blur-sm max-w-sm">
        <h4 className="text-yellow-400 font-semibold mb-2">Current Configuration:</h4>
        <div className="text-white text-sm space-y-1">
          <div>Power Level: {currentConfig.showPowerLevel ? `${currentConfig.powerValue.toLocaleString()}` : 'Hidden'}</div>
          <div>Animations: {currentConfig.enableAnimations ? 'Enabled' : 'Disabled'}</div>
          <div>Size: {currentConfig.size.toUpperCase()}</div>
          <div>Taglines: {currentConfig.customTaglines ? 'Custom' : 'Default'}</div>
        </div>
      </div>
    </div>
  )
}

export default EnhancedHeroSectionExample
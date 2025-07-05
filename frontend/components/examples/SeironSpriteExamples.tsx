'use client'

import React, { useState, useEffect } from 'react'
import { SeironSprite } from '../SeironSprite'

// Example 1: Basic Display Dragon
export function BasicDisplayDragon() {
  return (
    <div className="flex flex-col items-center p-8 bg-gradient-to-b from-gray-900 to-black">
      <h2 className="text-2xl font-bold text-orange-400 mb-4">Basic Display</h2>
      <SeironSprite 
        size="lg"
        quality="medium"
        className="border border-orange-500/30 rounded-lg"
      />
      <p className="text-gray-400 mt-4 text-center max-w-md">
        A non-interactive dragon perfect for decorative displays and loading screens.
      </p>
    </div>
  )
}

// Example 2: Interactive Dragon with Wish Granting
export function InteractiveWishDragon() {
  const [wishCount, setWishCount] = useState(0)
  const [lastWish, setLastWish] = useState<string | null>(null)
  const [isReady, setIsReady] = useState(true)

  const handleWishGrant = (wishType: 'power' | 'wisdom' | 'fortune') => {
    setLastWish(wishType)
    setWishCount(prev => prev + 1)
    setIsReady(false)
    
    // Cooldown period
    setTimeout(() => setIsReady(true), 8000)
  }

  const handleInteraction = (type: 'hover' | 'click' | 'touch') => {
    console.log(`Dragon interaction: ${type}`)
  }

  return (
    <div className="flex flex-col items-center p-8 bg-gradient-to-b from-purple-900 to-black">
      <h2 className="text-2xl font-bold text-purple-400 mb-4">Interactive Wish Dragon</h2>
      
      {/* Stats Display */}
      <div className="bg-black/40 rounded-lg p-4 mb-6 text-center">
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <div className="text-gray-400">Status</div>
            <div className={isReady ? 'text-green-400' : 'text-yellow-400'}>
              {isReady ? 'Ready' : 'Recharging...'}
            </div>
          </div>
          <div>
            <div className="text-gray-400">Wishes</div>
            <div className="text-blue-400">{wishCount}</div>
          </div>
          <div>
            <div className="text-gray-400">Last Wish</div>
            <div className="text-purple-400">
              {lastWish ? lastWish.charAt(0).toUpperCase() + lastWish.slice(1) : 'None'}
            </div>
          </div>
        </div>
      </div>

      <SeironSprite 
        size="xl"
        quality="high"
        interactive={true}
        readyToGrant={isReady}
        onWishGrant={handleWishGrant}
        onInteraction={handleInteraction}
        className="border border-purple-500/30 rounded-lg shadow-2xl"
      />
      
      <p className="text-gray-400 mt-4 text-center max-w-md">
        Click on the dragon when it's ready to grant a wish! Each wish has a different animation.
      </p>
    </div>
  )
}

// Example 3: Performance Optimized Dragon
export function PerformanceOptimizedDragon() {
  const [batteryLevel, setBatteryLevel] = useState<number | null>(null)
  const [isLowBattery, setIsLowBattery] = useState(false)

  useEffect(() => {
    // Mock battery detection
    const checkBattery = async () => {
      try {
        // @ts-ignore - Battery API might not be available
        const battery = await navigator.getBattery?.()
        if (battery) {
          setBatteryLevel(Math.round(battery.level * 100))
          setIsLowBattery(battery.level < 0.2 && !battery.charging)
        }
      } catch (e) {
        // Fallback for unsupported browsers
        setBatteryLevel(75) // Mock value
      }
    }
    
    checkBattery()
  }, [])

  return (
    <div className="flex flex-col items-center p-8 bg-gradient-to-b from-green-900 to-black">
      <h2 className="text-2xl font-bold text-green-400 mb-4">Performance Optimized</h2>
      
      {/* Performance Info */}
      <div className="bg-black/40 rounded-lg p-4 mb-6 text-center">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <div className="text-gray-400">Battery Level</div>
            <div className={batteryLevel && batteryLevel < 20 ? 'text-red-400' : 'text-green-400'}>
              {batteryLevel !== null ? `${batteryLevel}%` : 'Unknown'}
            </div>
          </div>
          <div>
            <div className="text-gray-400">Optimization</div>
            <div className={isLowBattery ? 'text-yellow-400' : 'text-blue-400'}>
              {isLowBattery ? 'Battery Mode' : 'Standard'}
            </div>
          </div>
        </div>
      </div>

      <SeironSprite 
        size="lg"
        quality={isLowBattery ? "low" : "medium"}
        interactive={true}
        batteryOptimized={isLowBattery}
        enableAutoQuality={true}
        className="border border-green-500/30 rounded-lg"
      />
      
      <p className="text-gray-400 mt-4 text-center max-w-md">
        This dragon automatically adjusts quality based on device performance and battery status.
      </p>
    </div>
  )
}

// Example 4: Size Comparison Grid
export function SizeComparisonGrid() {
  const sizes: Array<'sm' | 'md' | 'lg' | 'xl'> = ['sm', 'md', 'lg', 'xl']

  return (
    <div className="p-8 bg-gradient-to-b from-blue-900 to-black">
      <h2 className="text-2xl font-bold text-blue-400 mb-8 text-center">Size Comparison</h2>
      
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 items-end justify-items-center">
        {sizes.map(size => (
          <div key={size} className="flex flex-col items-center">
            <div className="text-lg font-semibold text-blue-300 mb-2">
              {size.toUpperCase()}
            </div>
            <SeironSprite 
              size={size}
              quality="medium"
              interactive={true}
              className="border border-blue-500/30 rounded-lg"
            />
            <div className="text-sm text-gray-400 mt-2 text-center">
              {size === 'sm' && '120x120'}
              {size === 'md' && '200x200'}
              {size === 'lg' && '300x300'}
              {size === 'xl' && '400x400'}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// Example 5: Quality Level Comparison
export function QualityComparisonDemo() {
  const qualities: Array<'low' | 'medium' | 'high'> = ['low', 'medium', 'high']

  return (
    <div className="p-8 bg-gradient-to-b from-red-900 to-black">
      <h2 className="text-2xl font-bold text-red-400 mb-8 text-center">Quality Levels</h2>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {qualities.map(quality => (
          <div key={quality} className="flex flex-col items-center">
            <div className="text-lg font-semibold text-red-300 mb-2">
              {quality.charAt(0).toUpperCase() + quality.slice(1)} Quality
            </div>
            <SeironSprite 
              size="lg"
              quality={quality}
              interactive={true}
              className="border border-red-500/30 rounded-lg"
            />
            <div className="text-sm text-gray-400 mt-4 text-center max-w-xs">
              {quality === 'low' && 'Basic effects, 30 FPS target, battery friendly'}
              {quality === 'medium' && 'Balanced performance, 45 FPS target, moderate effects'}
              {quality === 'high' && 'Full effects, 60 FPS target, maximum visual quality'}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// Example 6: Mobile-Optimized Dragon
export function MobileOptimizedDragon() {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768 || /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent))
    }
    
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  const handleTouch = (type: 'hover' | 'click' | 'touch') => {
    if (type === 'touch') {
      // Provide haptic feedback if available
      if ('vibrate' in navigator) {
        navigator.vibrate(50)
      }
    }
  }

  return (
    <div className="flex flex-col items-center p-8 bg-gradient-to-b from-indigo-900 to-black">
      <h2 className="text-2xl font-bold text-indigo-400 mb-4">Mobile Optimized</h2>
      
      <div className="bg-black/40 rounded-lg p-4 mb-6 text-center">
        <div className="text-sm">
          <div className="text-gray-400">Device Type</div>
          <div className={isMobile ? 'text-blue-400' : 'text-green-400'}>
            {isMobile ? 'Mobile/Tablet' : 'Desktop'}
          </div>
        </div>
      </div>

      <SeironSprite 
        size={isMobile ? "md" : "lg"}
        quality={isMobile ? "low" : "medium"}
        interactive={true}
        batteryOptimized={isMobile}
        enableAutoQuality={true}
        onInteraction={handleTouch}
        className="border border-indigo-500/30 rounded-lg"
      />
      
      <p className="text-gray-400 mt-4 text-center max-w-md">
        {isMobile 
          ? 'Touch the dragon! Optimized for mobile with haptic feedback and battery conservation.'
          : 'Hover and click for interactions. Full desktop experience with enhanced effects.'
        }
      </p>
    </div>
  )
}

// Example 7: Dashboard Widget Dragon
export function DashboardWidgetDragon() {
  const [stats] = useState({
    portfolio: 125000,
    growth: 15.7,
    sei_balance: 1250
  })

  return (
    <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl p-6 max-w-md">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">Portfolio Guardian</h3>
        <div className="text-green-400 text-sm">+{stats.growth}%</div>
      </div>
      
      <div className="flex items-center gap-4">
        <SeironSprite 
          size="sm"
          quality="medium"
          interactive={true}
          className="flex-shrink-0"
        />
        
        <div className="flex-1 text-sm">
          <div className="flex justify-between text-gray-300 mb-1">
            <span>Portfolio Value</span>
            <span className="text-white font-semibold">${stats.portfolio.toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-gray-300">
            <span>SEI Balance</span>
            <span className="text-blue-400">{stats.sei_balance} SEI</span>
          </div>
        </div>
      </div>
    </div>
  )
}

// Example 8: Loading Screen Dragon
export function LoadingScreenDragon() {
  const [progress, setProgress] = useState(0)
  const [isComplete, setIsComplete] = useState(false)

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          setIsComplete(true)
          clearInterval(interval)
          return 100
        }
        return prev + Math.random() * 15
      })
    }, 200)

    return () => clearInterval(interval)
  }, [])

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-black via-red-950 to-black">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-transparent bg-gradient-to-r from-red-400 to-orange-400 bg-clip-text mb-4">
          Summoning Seiron...
        </h1>
        
        <SeironSprite 
          size="xl"
          quality="high"
          interactive={false}
          readyToGrant={isComplete}
          className="mb-6"
        />
        
        <div className="w-64 bg-gray-800 rounded-full h-2 mb-2">
          <div 
            className="bg-gradient-to-r from-red-500 to-orange-500 h-2 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="text-orange-300 text-sm">
          {isComplete ? 'Dragon Awakened!' : `Loading... ${Math.round(progress)}%`}
        </div>
      </div>
    </div>
  )
}

// Combined Examples Component
export function SeironSpriteExamples() {
  const [activeExample, setActiveExample] = useState(0)

  const examples = [
    { name: 'Basic Display', component: <BasicDisplayDragon /> },
    { name: 'Interactive Wishes', component: <InteractiveWishDragon /> },
    { name: 'Performance Optimized', component: <PerformanceOptimizedDragon /> },
    { name: 'Size Comparison', component: <SizeComparisonGrid /> },
    { name: 'Quality Levels', component: <QualityComparisonDemo /> },
    { name: 'Mobile Optimized', component: <MobileOptimizedDragon /> },
    { name: 'Dashboard Widget', component: <DashboardWidgetDragon /> },
    { name: 'Loading Screen', component: <LoadingScreenDragon /> },
  ]

  return (
    <div className="min-h-screen bg-black">
      {/* Navigation */}
      <div className="sticky top-0 z-10 bg-black/80 backdrop-blur border-b border-gray-800">
        <div className="max-w-6xl mx-auto px-4 py-3">
          <h1 className="text-2xl font-bold text-white mb-4">SeironSprite Examples</h1>
          <div className="flex flex-wrap gap-2">
            {examples.map((example, index) => (
              <button
                key={index}
                onClick={() => setActiveExample(index)}
                className={`px-3 py-1 rounded text-sm transition-colors ${
                  activeExample === index
                    ? 'bg-orange-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                {example.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Active Example */}
      <div className="min-h-screen">
        {examples[activeExample].component}
      </div>
    </div>
  )
}

export default SeironSpriteExamples
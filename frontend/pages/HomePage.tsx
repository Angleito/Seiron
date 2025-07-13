import { useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import React from 'react'

// Star component for Dragon Balls
const Star = ({ filled = false }: { filled?: boolean }) => (
  <span className={`text-2xl ${filled ? 'text-yellow-400' : 'text-gray-600'}`}>★</span>
)

// Feature Card Component
const FeatureCard = ({ 
  title, 
  powerLevel, 
  subtitle, 
  description, 
  ctaText, 
  onClick 
}: { 
  title: string
  powerLevel: string
  subtitle: string
  description: string
  ctaText: string
  onClick: () => void
}) => (
  <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-6 hover:border-yellow-500/30 transition-all duration-300">
    <div className="flex justify-between items-start mb-4">
      <h3 className="text-xl font-bold text-white">{title}</h3>
      <span className="text-yellow-400 font-bold">{powerLevel}</span>
    </div>
    <h4 className="text-lg text-yellow-400 mb-2">{subtitle}</h4>
    <p className="text-gray-400 mb-4">{description}</p>
    <button
      onClick={onClick}
      className="w-full py-2 bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 rounded hover:bg-yellow-500/20 transition-all duration-300"
    >
      {ctaText}
    </button>
  </div>
)

export default function HomePage() {
  const [powerLevel, setPowerLevel] = useState(0)
  const [isLoaded, setIsLoaded] = useState(false)
  const [activeDragonBalls, setActiveDragonBalls] = useState(0)
  const navigate = useNavigate()

  useEffect(() => {
    // Animate power level on mount
    setIsLoaded(true)
    const targetPower = 32.2
    const increment = targetPower / 30
    let currentPower = 0
    
    const timer = setInterval(() => {
      currentPower += increment
      if (currentPower >= targetPower) {
        setPowerLevel(targetPower)
        clearInterval(timer)
      } else {
        setPowerLevel(currentPower)
      }
    }, 50)

    // Animate Dragon Balls
    const dragonBallTimer = setInterval(() => {
      setActiveDragonBalls(prev => (prev >= 7 ? 4 : prev + 1))
    }, 2000)

    return () => {
      clearInterval(timer)
      clearInterval(dragonBallTimer)
    }
  }, [])

  const handleSummon = () => {
    navigate('/chat')
  }

  const handleAbout = () => {
    navigate('/about')
  }

  const handleFeatureClick = (feature: string) => {
    // Navigate to specific features or show modal
    console.log(`Navigating to ${feature}`)
    navigate('/chat')
  }

  return (
    <div className="min-h-screen bg-black overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-purple-950/20 via-black to-black" />
      
      {/* Main container */}
      <div className="relative z-10 min-h-screen">
        {/* Header Section */}
        <div className="container mx-auto px-4 py-8">
          {/* Power Level Display */}
          <div className="text-center mb-8">
            <h2 className="text-yellow-400 text-sm uppercase tracking-wider mb-2">Seiron Power Level</h2>
            <div className="flex items-center justify-center gap-4">
              <span className="text-5xl font-bold text-white">{powerLevel.toFixed(1)}K</span>
              <span className="px-3 py-1 bg-green-500/20 border border-green-500 rounded text-green-400 text-sm">
                Elite
              </span>
            </div>
          </div>

          {/* Dragon Balls */}
          <div className="text-center mb-12">
            <div className="flex justify-center items-center gap-1 mb-2">
              {[...Array(22)].map((_, i) => (
                <Star key={i} filled={i >= 3 && i <= 6 && i <= activeDragonBalls} />
              ))}
            </div>
            <p className="text-gray-400 text-sm">Hover to Activate Dragon Balls (4-7 Stars)</p>
          </div>

          {/* Hero Section */}
          <div className="text-center mb-16">
            <h1 className="text-7xl font-black text-white mb-4 tracking-wider">SEIRON</h1>
            <p className="text-2xl text-yellow-400 mb-8">Become the legendary portfolio warrior</p>
            
            {/* Navigation */}
            <div className="flex justify-center gap-8 mb-8">
              <button className="text-gray-400 hover:text-yellow-400 transition-colors">Power</button>
              <button className="text-gray-400 hover:text-yellow-400 transition-colors">Growth</button>
              <button className="text-gray-400 hover:text-yellow-400 transition-colors">Magic</button>
            </div>

            {/* CTA Buttons */}
            <div className="flex justify-center gap-4">
              <button
                onClick={handleSummon}
                className="px-8 py-3 bg-yellow-500 text-black font-bold rounded hover:bg-yellow-600 transition-all duration-300"
              >
                SUMMON
              </button>
              <button
                onClick={handleAbout}
                className="px-8 py-3 bg-transparent border border-gray-600 text-gray-400 font-bold rounded hover:border-gray-400 hover:text-white transition-all duration-300"
              >
                ABOUT
              </button>
            </div>
          </div>

          {/* Feature Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
            <FeatureCard
              title="Elite Warrior"
              powerLevel="9.0K"
              subtitle="Master the Sei Battlefield"
              description="Lightning-Fast Network Domination"
              ctaText="Enter the Battlefield"
              onClick={() => handleFeatureClick('elite')}
            />
            <FeatureCard
              title="Super Saiyan"
              powerLevel="15.0K"
              subtitle="Unlock Your Saiyan Potential"
              description="Portfolio Power Beyond Limits"
              ctaText="Unlock Power"
              onClick={() => handleFeatureClick('saiyan')}
            />
            <FeatureCard
              title="Fusion Master"
              powerLevel="25.0K"
              subtitle="Energy Fusion Techniques"
              description="Advanced DeFi Strategies"
              ctaText="Learn Fusion"
              onClick={() => handleFeatureClick('fusion')}
            />
            <FeatureCard
              title="Legendary Saiyan"
              powerLevel="50.0K"
              subtitle="Power Level Rankings"
              description="Ascend the Warrior Hierarchy"
              ctaText="Check Rankings"
              onClick={() => handleFeatureClick('legendary')}
            />
          </div>

          {/* Footer Section */}
          <div className="text-center pb-12">
            <p className="text-gray-400 mb-4">Total Power Available: <span className="text-yellow-400 font-bold">99K+</span></p>
            <button
              onClick={handleSummon}
              className="px-12 py-4 bg-gradient-to-r from-yellow-500 to-yellow-600 text-black font-black rounded-lg text-xl hover:scale-105 transform transition-all duration-300 mb-4"
            >
              START YOUR JOURNEY
            </button>
            <p className="text-gray-500 text-sm">
              No registration required • Connect any wallet
            </p>
            <p className="text-gray-600 text-xs mt-2">
              Wallet · Privy
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
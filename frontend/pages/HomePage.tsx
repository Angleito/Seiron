import { useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import React from 'react'

// Star component for Dragon Balls
const Star = ({ filled = false }: { filled?: boolean }) => (
  <span className={`text-2xl ${filled ? 'text-yellow-400' : 'text-gray-600'}`}>★</span>
)

// Enhanced DBZ Feature Card Component
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
  <div className="dbz-feature-card dbz-hover-power">
    <div className="dbz-aura"></div>
    <div className="flex justify-between items-start mb-4">
      <h3 className="dbz-feature-title text-xl">{title}</h3>
      <span className="dbz-feature-power">{powerLevel}</span>
    </div>
    <h4 className="dbz-subtitle text-lg mb-2">{subtitle}</h4>
    <p className="text-gray-300 mb-4">{description}</p>
    <button
      onClick={onClick}
      className="dbz-button-secondary w-full"
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
    <div className="min-h-screen dbz-bg-space overflow-hidden">
      {/* Enhanced DBZ Background with energy effects */}
      <div className="absolute inset-0">
        <div className="dbz-energy-orb" style={{top: '10%', left: '20%', animationDelay: '0s'}}></div>
        <div className="dbz-energy-orb" style={{top: '30%', right: '15%', animationDelay: '1s'}}></div>
        <div className="dbz-energy-orb" style={{bottom: '20%', left: '10%', animationDelay: '2s'}}></div>
      </div>
      
      {/* Main container */}
      <div className="relative z-10 min-h-screen">
        {/* Header Section */}
        <div className="container mx-auto px-4 py-8">
          {/* Enhanced DBZ Power Level Display */}
          <div className="dbz-power-level mx-auto max-w-md mb-8">
            <h2 className="dbz-power-label">Seiron Power Level</h2>
            <div className="flex items-center justify-center gap-4">
              <span className="dbz-power-number">{powerLevel.toFixed(1)}K</span>
              <span className="px-3 py-1 dbz-glow-blue bg-blue-500/20 border border-blue-400 rounded dbz-text-energy text-sm dbz-energy-pulse">
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

          {/* Enhanced DBZ Hero Section */}
          <div className="text-center mb-16">
            <h1 className="dbz-title text-7xl mb-4">SEIRON</h1>
            <p className="dbz-subtitle text-2xl mb-8">Become the legendary portfolio warrior</p>
            
            {/* Enhanced DBZ Navigation */}
            <div className="flex justify-center gap-8 mb-8">
              <button className="text-gray-400 hover:dbz-text-saiyan transition-colors dbz-hover-power font-semibold">⚡ Power</button>
              <button className="text-gray-400 hover:dbz-text-energy transition-colors dbz-hover-power font-semibold">📈 Growth</button>
              <button className="text-gray-400 hover:text-purple-400 transition-colors dbz-hover-power font-semibold">✨ Magic</button>
            </div>

            {/* Enhanced DBZ CTA Buttons */}
            <div className="flex justify-center gap-4">
              <button
                onClick={handleSummon}
                className="dbz-button-primary"
              >
                🐉 SUMMON
              </button>
              <button
                onClick={handleAbout}
                className="dbz-button-secondary"
              >
                ℹ️ ABOUT
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

          {/* Enhanced DBZ Footer Section */}
          <div className="text-center pb-12">
            <p className="text-gray-400 mb-4">Total Power Available: <span className="dbz-power-text">99K+</span></p>
            <button
              onClick={handleSummon}
              className="dbz-button-primary text-xl px-12 py-4 mb-4 dbz-screen-shake-on-hover"
              onMouseEnter={(e) => e.currentTarget.classList.add('dbz-screen-shake')}
              onAnimationEnd={(e) => e.currentTarget.classList.remove('dbz-screen-shake')}
            >
              🚀 START YOUR JOURNEY
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
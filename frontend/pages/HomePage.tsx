import { useNavigate } from 'react-router-dom'
import { StormBackground } from '../components/effects/StormBackground'
import { useEffect, useState } from 'react'
import { 
  EnhancedHeroSection,
  DragonBallFeatureCards,
  FeatureShowcaseGrid,
  ScrollProgressIndicator
} from '../components/homepage'
import '../styles/homepage-enhancements.css'

export default function HomePage() {
  const [isLoaded, setIsLoaded] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    // Trigger loading animations
    const timer = setTimeout(() => {
      setIsLoaded(true)
    }, 200)

    return () => clearTimeout(timer)
  }, [])

  const handleNavigation = (path: string) => {
    try {
      navigate(path)
    } catch (error) {
      console.error(`Navigation error:`, error)
    }
  }

  return (
    <div className="relative min-h-screen">
      {/* Scroll Progress Indicator */}
      <ScrollProgressIndicator />
      
      <StormBackground 
        className="min-h-screen" 
        intensity={0.8}
        animated={true}
      >
        {/* Enhanced Hero Section */}
        <section className="relative z-50 min-h-screen flex items-center justify-center px-4">
          <EnhancedHeroSection 
            onNavigate={handleNavigation}
            showPowerLevel={true}
            powerValue={42000}
            enableAnimations={isLoaded}
            size="lg"
          />
        </section>
        
        {/* Dragon Ball Feature Cards Section */}
        <section className="relative z-40 py-20 px-4">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-black text-yellow-400 mb-4 storm-mystical-aura">
                Saiyan Abilities
              </h2>
              <p className="text-xl text-yellow-400/80 font-light">
                Master the art of DeFi with legendary powers
              </p>
            </div>
            <DragonBallFeatureCards />
          </div>
        </section>
        
        {/* Feature Showcase Grid Section */}
        <section className="relative z-40 py-20 px-4 bg-gradient-to-b from-transparent via-slate-900/50 to-transparent">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-black text-yellow-400 mb-4 storm-mystical-aura">
                Unlock Your DeFi Potential
              </h2>
              <p className="text-xl text-yellow-400/80 font-light">
                Transform into the ultimate portfolio warrior
              </p>
            </div>
            <FeatureShowcaseGrid 
              animated={isLoaded}
              showPowerLevels={true}
            />
          </div>
        </section>
        
        {/* Call to Action Section */}
        <section className="relative z-40 py-20 px-4">
          <div className="max-w-4xl mx-auto text-center">
            <div className="mb-12">
              <h2 className="text-5xl font-black text-yellow-400 mb-6 storm-mystical-aura">
                Ready to Power Up?
              </h2>
              <p className="text-2xl text-yellow-400/80 font-light mb-8">
                Join the elite ranks of Saiyan traders and unlock your true potential
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
              <button
                onClick={() => handleNavigation('/chat')}
                className="
                kamehameha-button group relative overflow-hidden
                px-12 py-6 bg-gradient-to-r from-yellow-500 to-yellow-600 
                text-red-950 font-black rounded-xl text-xl
                storm-hover-glow storm-hover-lightning
                border-2 border-yellow-400
                shadow-xl shadow-yellow-500/50
                transform transition-all duration-300
                hover:shadow-2xl hover:shadow-yellow-500/60
                hover:border-yellow-300
                hover:scale-105
                active:scale-95
                cursor-pointer
                "
              >
                <span className="relative z-10 tracking-wide">
                  START YOUR JOURNEY
                </span>
              </button>
              
              <div className="text-sm text-yellow-400/60">
                No registration required • Connect any wallet
              </div>
            </div>
          </div>
        </section>
        
        {/* Atmospheric Enhancement */}
        <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-black/60 via-red-950/20 to-transparent pointer-events-none" />
      </StormBackground>
    </div>
  )
}
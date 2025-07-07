import { useNavigate } from 'react-router-dom'
import { Sparkles, BookOpen } from 'lucide-react'
import { StormBackground } from '../components/effects/StormBackground'
import { useEffect, useState } from 'react'

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
    <StormBackground 
      className="min-h-screen" 
      intensity={0.8}
      animated={true}
    >
      {/* Main Content */}
      <div className="relative z-50 flex flex-col items-center justify-center min-h-screen px-4">
        <div className="text-center max-w-4xl">
          {/* Mystical Power Title */}
          <h1 className={`
            text-8xl font-black mb-4 relative
            text-transparent bg-gradient-to-b from-yellow-400 via-yellow-500 to-yellow-600 bg-clip-text
            transition-all duration-1000 ease-out
            ${isLoaded ? 'storm-power-manifestation' : 'opacity-0 scale-0'}
          `}>
            <span className="storm-mystical-aura">SEIRON</span>
          </h1>
          
          {/* Mystical Subtitle */}
          <div className={`
            text-2xl text-yellow-400/90 mb-16 font-light relative
            transition-all duration-1000 delay-500 ease-out
            ${isLoaded ? 'storm-entrance-lightning' : 'opacity-0 translate-y-10'}
          `}>
            <span className="storm-hover-glow inline-block">
              Grant your wildest Sei investing wishes
            </span>
            <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-32 h-px bg-gradient-to-r from-transparent via-yellow-500 to-transparent opacity-60" />
          </div>
          
          {/* Storm-Themed Action Buttons */}
          <div className={`
            transition-all duration-1000 delay-1000 ease-out
            relative z-[100]
            ${isLoaded ? 'storm-entrance-dramatic' : 'opacity-0 translate-y-20'}
          `}>
            <div className="flex gap-6 justify-center">
              <button
                onClick={() => handleNavigation('/chat')}
                className="
                group relative overflow-hidden
                px-10 py-4 bg-gradient-to-r from-yellow-500 to-yellow-600 
                text-red-950 font-bold rounded-lg
                storm-hover-glow storm-hover-lightning
                border-2 border-yellow-400
                shadow-lg shadow-yellow-500/50
                transform transition-all duration-300
                hover:shadow-xl hover:shadow-yellow-500/60
                hover:border-yellow-300
                hover:scale-105
                active:scale-95
                opacity-100
                cursor-pointer
                pointer-events-auto
                z-10
                block
                "
              >
                <Sparkles className="inline mr-3 h-5 w-5 storm-breathing" />
              <span className="relative z-10 text-lg font-extrabold tracking-wide">
                SUMMON
              </span>
              {/* Lightning flash effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-700 pointer-events-none" />
                </button>
              
              <button
                onClick={() => handleNavigation('/about')}
                className="
                group relative overflow-hidden
                px-10 py-4 bg-gradient-to-r from-slate-800 to-slate-900
                text-yellow-400 font-bold rounded-lg
                storm-hover-glow storm-hover-vortex
                border-2 border-yellow-500
                shadow-lg shadow-red-900/50
                backdrop-blur-sm
                transform transition-all duration-300
                hover:bg-gradient-to-r hover:from-slate-700 hover:to-slate-800
                hover:border-yellow-400
                hover:shadow-xl hover:shadow-red-900/60
                hover:scale-105
                active:scale-95
                opacity-100
                cursor-pointer
                pointer-events-auto
                z-10
                block
                "
              >
                <BookOpen className="inline mr-3 h-5 w-5 storm-power-pulse" />
              <span className="relative z-10 text-lg font-extrabold tracking-wide">
                ABOUT
              </span>
              {/* Storm energy effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-yellow-400/10 to-transparent transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-500 pointer-events-none" />
              </button>
            </div>
          </div>
        </div>
        
        {/* Atmospheric Enhancement */}
        <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-black/60 via-red-950/20 to-transparent pointer-events-none" />
      </div>
    </StormBackground>
  )
}
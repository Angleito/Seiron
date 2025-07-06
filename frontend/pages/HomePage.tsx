import { Link } from 'react-router-dom'
import { Sparkles, Zap } from 'lucide-react'
import { StormBackground } from '../components/effects/StormBackground'
import { useEffect, useState } from 'react'

export default function HomePage() {
  const [isLoaded, setIsLoaded] = useState(false)
  const [showPortal, setShowPortal] = useState(false)

  useEffect(() => {
    // Trigger loading animations
    const timer = setTimeout(() => {
      setIsLoaded(true)
      // Delay portal appearance for dramatic effect
      setTimeout(() => setShowPortal(true), 800)
    }, 200)

    return () => clearTimeout(timer)
  }, [])

  return (
    <StormBackground 
      className="min-h-screen" 
      intensity={0.8}
      animated={true}
    >
      {/* Mystical Portal Effect */}
      <div className={`
        absolute inset-0 flex items-center justify-center
        transition-all duration-1000 ease-out
        ${showPortal ? 'opacity-100 scale-100' : 'opacity-0 scale-50'}
      `}>
        <div className="relative">
          {/* Portal Ring */}
          <div className="absolute inset-0 rounded-full border-4 border-yellow-500/20 storm-vortex" 
               style={{ width: '600px', height: '600px', left: '-300px', top: '-300px' }} />
          <div className="absolute inset-0 rounded-full border-2 border-yellow-400/30 storm-vortex-spiral" 
               style={{ width: '400px', height: '400px', left: '-200px', top: '-200px' }} />
          <div className="absolute inset-0 rounded-full border border-yellow-300/40 storm-breathing" 
               style={{ width: '200px', height: '200px', left: '-100px', top: '-100px' }} />
        </div>
      </div>
      
      {/* Main Content */}
      <div className="relative z-70 flex flex-col items-center justify-center min-h-screen px-4">
        <div className="text-center max-w-4xl">
          {/* Dragon Summoning Title */}
          <h1 className={`
            text-8xl font-black mb-4 relative
            text-transparent bg-gradient-to-b from-yellow-400 via-yellow-500 to-yellow-600 bg-clip-text
            transition-all duration-1000 ease-out
            ${isLoaded ? 'storm-dragon-summon' : 'opacity-0 scale-0'}
          `}>
            <span className="storm-dragon-aura">SEIRON</span>
          </h1>
          
          {/* Mystical Subtitle */}
          <p className={`
            text-2xl text-yellow-400/90 mb-16 font-light relative
            transition-all duration-1000 delay-500 ease-out
            ${isLoaded ? 'storm-entrance-lightning' : 'opacity-0 translate-y-10'}
          `}>
            <span className="storm-hover-glow inline-block">
              Grant your wildest Sei investing wishes
            </span>
            <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-32 h-px bg-gradient-to-r from-transparent via-yellow-500 to-transparent opacity-60" />
          </p>
          
          {/* Storm-Themed Action Buttons */}
          <div className={`
            flex gap-6 justify-center transition-all duration-1000 delay-1000 ease-out
            ${isLoaded ? 'storm-entrance-dramatic' : 'opacity-0 translate-y-20'}
          `}>
            <Link
              to="/dashboard"
              className="
                group relative overflow-hidden
                px-10 py-4 bg-gradient-to-r from-yellow-500 to-yellow-600 
                text-red-950 font-bold rounded-lg
                storm-hover-glow storm-hover-lightning
                border-2 border-yellow-400/50
                shadow-lg shadow-yellow-500/25
                transform transition-all duration-300
                hover:shadow-xl hover:shadow-yellow-500/40
                hover:border-yellow-300
                active:scale-95
              "
            >
              <Sparkles className="inline mr-3 h-5 w-5 storm-breathing" />
              <span className="relative z-10 text-lg font-extrabold tracking-wide">
                SUMMON
              </span>
              {/* Lightning flash effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
            </Link>
            
            <Link
              to="/dragon-showcase"
              className="
                group relative overflow-hidden
                px-10 py-4 bg-gradient-to-r from-slate-800/80 to-slate-900/80
                text-yellow-400 font-bold rounded-lg
                storm-hover-glow storm-hover-vortex
                border-2 border-yellow-500/50
                shadow-lg shadow-red-900/25
                backdrop-blur-sm
                transform transition-all duration-300
                hover:bg-gradient-to-r hover:from-slate-700/80 hover:to-slate-800/80
                hover:border-yellow-400
                hover:shadow-xl hover:shadow-red-900/40
                active:scale-95
              "
            >
              <Zap className="inline mr-3 h-5 w-5 storm-power-pulse" />
              <span className="relative z-10 text-lg font-extrabold tracking-wide">
                POWERS
              </span>
              {/* Storm energy effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-yellow-400/10 to-transparent transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-500" />
            </Link>
          </div>
        </div>
        
        {/* Atmospheric Enhancement */}
        <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-black/60 via-red-950/20 to-transparent" />
      </div>
      
      {/* Mystical Energy Orbs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-32 h-32 bg-yellow-500/20 rounded-full blur-2xl storm-breathing" />
        <div className="absolute top-1/3 right-1/4 w-24 h-24 bg-red-600/20 rounded-full blur-2xl storm-fog" />
        <div className="absolute bottom-1/4 left-1/3 w-40 h-40 bg-yellow-400/15 rounded-full blur-3xl storm-power-pulse" />
        <div className="absolute bottom-1/3 right-1/3 w-28 h-28 bg-red-500/20 rounded-full blur-2xl storm-vortex" />
      </div>
      
      {/* Scroll Indicator */}
      <div className={`
        absolute bottom-8 left-1/2 transform -translate-x-1/2
        transition-all duration-1000 delay-1500 ease-out
        ${isLoaded ? 'storm-scroll-fade in-view' : 'opacity-0'}
      `}>
        <div className="flex flex-col items-center text-yellow-400/60">
          <div className="w-px h-8 bg-gradient-to-b from-yellow-400/40 to-transparent mb-2" />
          <div className="text-sm font-light tracking-widest uppercase storm-breathing">
            Scroll to explore
          </div>
        </div>
      </div>
    </StormBackground>
  )
}
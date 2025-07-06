import { useNavigate } from 'react-router-dom'
import { Sparkles, BookOpen } from 'lucide-react'
import { useEffect, useState, lazy, Suspense } from 'react'

// Import only the lightning effect
const LightningEffect = lazy(() => import('../components/effects/LightningEffect'))

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
      console.log(`Navigating to ${path}`)
      navigate(path)
    } catch (error) {
      console.error(`Navigation error:`, error)
    }
  }

  return (
    <div className="min-h-screen bg-black relative">
      {/* Dark Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-slate-900 to-black" />
      
      {/* Lightning Effect Only */}
      <Suspense fallback={null}>
        <LightningEffect
          className="absolute inset-0"
          frequency="medium"
          intensity="normal"
          enabled={true}
          reducedMotion={false}
          maxBolts={2}
        />
      </Suspense>
      
      {/* Main Content */}
      <div className="relative z-50 flex flex-col items-center justify-center min-h-screen px-4">
        <div className="text-center max-w-4xl">
          {/* Clean Title */}
          <h1 className={`
            text-8xl font-black mb-6 relative
            text-transparent bg-gradient-to-b from-white via-gray-100 to-gray-300 bg-clip-text
            transition-all duration-1000 ease-out
            ${isLoaded ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}
          `}>
            SEIRON
          </h1>
          
          {/* Clean Subtitle */}
          <div className={`
            text-2xl text-gray-300 mb-16 font-light
            transition-all duration-1000 delay-300 ease-out
            ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}
          `}>
            Grant your wildest Sei investing wishes
          </div>
          
          {/* Clean Action Buttons */}
          <div className={`
            transition-all duration-1000 delay-600 ease-out
            ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}
          `}>
            <div className="flex gap-6 justify-center">
              <button
                onClick={() => handleNavigation('/chat')}
                className="
                px-8 py-3 bg-white text-black font-semibold rounded-lg
                transform transition-all duration-200
                hover:scale-105 hover:shadow-lg
                active:scale-95
                "
              >
                <Sparkles className="inline mr-2 h-5 w-5" />
                SUMMON
              </button>
              
              <button
                onClick={() => handleNavigation('/about')}
                className="
                px-8 py-3 bg-transparent text-white font-semibold rounded-lg
                border-2 border-white/30
                transform transition-all duration-200
                hover:border-white/60 hover:bg-white/10
                hover:scale-105
                active:scale-95
                "
              >
                <BookOpen className="inline mr-2 h-5 w-5" />
                ABOUT
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
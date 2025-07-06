import { Link } from 'react-router-dom'
import { Sparkles, Zap } from 'lucide-react'
import { WavyCloud } from '@components/effects/WavyCloud'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-red-950 via-red-900 to-black relative overflow-hidden">
      <WavyCloud className="absolute top-0 left-0 h-96" />
      
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4">
        <div className="text-center max-w-4xl">
          <h1 className="text-7xl font-black text-transparent bg-gradient-to-b from-yellow-400 to-yellow-600 bg-clip-text mb-4">
            SEIRON
          </h1>
          <p className="text-xl text-yellow-400/80 mb-12 font-light">
            Grant your wildest Sei investing wishes
          </p>
          
          <div className="flex gap-4 justify-center">
            <Link
              to="/dashboard"
              className="px-8 py-3 bg-gradient-to-r from-yellow-500 to-yellow-600 text-red-950 font-bold rounded hover:from-yellow-400 hover:to-yellow-500 transition-all shadow-lg"
            >
              <Sparkles className="inline mr-2 h-4 w-4" />
              Summon
            </Link>
            <Link
              to="/dragon-showcase"
              className="px-8 py-3 border border-yellow-500/50 text-yellow-400 font-medium rounded hover:bg-yellow-500/10 transition-all"
            >
              <Zap className="inline mr-2 h-4 w-4" />
              Powers
            </Link>
          </div>
        </div>
        
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-black to-transparent" />
      </div>
      
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-20 left-20 w-64 h-64 bg-yellow-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-red-600/10 rounded-full blur-3xl" />
      </div>
    </div>
  )
}
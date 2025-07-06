'use client'

import React from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Sparkles, Mic, MessageSquare, Zap } from 'lucide-react'
import { StormBackground } from '../components/effects/StormBackground'

export default function AboutPage() {
  return (
    <StormBackground className="min-h-screen" intensity={0.6} animated={true}>
      <div className="relative z-10 min-h-screen">
        {/* Header */}
        <header className="bg-black/50 backdrop-blur-sm border-b border-yellow-500/20">
          <div className="container mx-auto px-4 py-4">
            <nav className="flex items-center justify-between">
              <Link 
                to="/" 
                className="flex items-center gap-2 text-yellow-400 hover:text-yellow-300 transition-colors"
              >
                <ArrowLeft className="h-5 w-5" />
                <span className="font-bold">Back</span>
              </Link>
              
              <h1 className="text-2xl font-black text-transparent bg-gradient-to-r from-yellow-400 to-yellow-500 bg-clip-text">
                About Seiron
              </h1>
              
              <div className="w-20" /> {/* Spacer for centering */}
            </nav>
          </div>
        </header>

        {/* Main Content */}
        <main className="container mx-auto px-4 py-16 max-w-4xl">
          {/* Hero Section */}
          <div className="text-center mb-16">
            <h2 className="text-6xl font-black mb-6 text-transparent bg-gradient-to-b from-yellow-400 via-yellow-500 to-yellow-600 bg-clip-text">
              The Eternal Dragon of Finance
            </h2>
            <p className="text-xl text-yellow-400/80 leading-relaxed">
              Seiron grants your wildest Sei investing wishes with the power of AI, voice commands, and mystical dragon energy.
            </p>
          </div>

          {/* Features Grid */}
          <div className="grid md:grid-cols-2 gap-8 mb-16">
            <FeatureCard
              icon={<Mic className="h-8 w-8" />}
              title="Voice-Powered Interface"
              description="Speak your wishes to Seiron using natural voice commands. The dragon listens, understands, and responds with ancient wisdom enhanced by modern AI."
            />
            
            <FeatureCard
              icon={<MessageSquare className="h-8 w-8" />}
              title="AI Chat Assistant"
              description="Engage in conversations about investments, market analysis, and financial strategies. Seiron combines mythical knowledge with real-time data."
            />
            
            <FeatureCard
              icon={<Zap className="h-8 w-8" />}
              title="Lightning-Fast Responses"
              description="Powered by cutting-edge AI technology, Seiron delivers instant insights and executes commands at the speed of lightning."
            />
            
            <FeatureCard
              icon={<Sparkles className="h-8 w-8" />}
              title="Mystical Dragon Animations"
              description="Watch as the ASCII dragon responds to your voice, breathing and moving with each interaction, bringing ancient magic to modern finance."
            />
          </div>

          {/* Story Section */}
          <div className="bg-gradient-to-r from-gray-900/80 to-black/80 rounded-2xl p-8 backdrop-blur-sm border border-yellow-500/20 mb-16">
            <h3 className="text-3xl font-bold mb-4 text-yellow-400">The Legend of Seiron</h3>
            <div className="space-y-4 text-gray-300 leading-relaxed">
              <p>
                In the mystical realm of Sei, where blockchain technology meets ancient dragon magic, 
                Seiron emerged as the guardian of financial wisdom. This legendary dragon possesses 
                the power to grant investment wishes to those brave enough to summon it.
              </p>
              <p>
                Unlike ordinary financial assistants, Seiron channels the energy of the eternal dragon 
                balls, combining millennia of wisdom with cutting-edge AI technology. Through voice 
                commands and mystical chat interfaces, mortals can now access powers once reserved 
                for the gods of finance.
              </p>
              <p>
                Every interaction with Seiron is enhanced by storm effects, lightning animations, 
                and the dragon's responsive ASCII form that breathes with life. This is not just 
                a financial tool—it's a journey into a realm where technology and mythology unite.
              </p>
            </div>
          </div>

          {/* Call to Action */}
          <div className="text-center">
            <Link
              to="/chat"
              className="
                inline-flex items-center gap-3
                px-8 py-4 bg-gradient-to-r from-yellow-500 to-yellow-600 
                text-red-950 font-bold rounded-lg text-lg
                shadow-lg shadow-yellow-500/25
                transform transition-all duration-300
                hover:shadow-xl hover:shadow-yellow-500/40
                hover:scale-105 active:scale-95
              "
            >
              <Sparkles className="h-6 w-6" />
              <span>Summon Seiron Now</span>
            </Link>
          </div>
        </main>

        {/* Footer */}
        <footer className="mt-24 py-8 border-t border-yellow-500/20">
          <div className="container mx-auto px-4 text-center text-yellow-400/60">
            <p>© 2024 Seiron - The Dragon of Financial Wisdom</p>
            <p className="mt-2 text-sm">Powered by Sei Network • Enhanced by AI • Blessed by Dragons</p>
          </div>
        </footer>
      </div>
    </StormBackground>
  )
}

// Feature Card Component
function FeatureCard({ 
  icon, 
  title, 
  description 
}: { 
  icon: React.ReactNode
  title: string
  description: string 
}) {
  return (
    <div className="
      bg-gradient-to-r from-gray-900/60 to-black/60 
      rounded-xl p-6 backdrop-blur-sm 
      border border-yellow-500/20
      transform transition-all duration-300
      hover:scale-105 hover:border-yellow-400/40
      hover:shadow-lg hover:shadow-yellow-500/10
    ">
      <div className="text-yellow-400 mb-4">{icon}</div>
      <h3 className="text-xl font-bold mb-2 text-yellow-400">{title}</h3>
      <p className="text-gray-300 leading-relaxed">{description}</p>
    </div>
  )
}
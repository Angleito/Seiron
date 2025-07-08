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
              The Eternal Guardian of Finance
            </h2>
            <p className="text-xl text-yellow-400/80 leading-relaxed">
              Seiron grants your wildest Sei investing wishes with the power of AI, voice commands, and mystical energy.
            </p>
          </div>

          {/* Features Grid */}
          <div className="grid md:grid-cols-2 gap-8 mb-16">
            <FeatureCard
              icon={<Mic className="h-8 w-8" />}
              title="Voice-Powered Interface"
              description="Speak your wishes to Seiron using natural voice commands. The guardian dragon listens, understands, and responds with ancient wisdom enhanced by OpenAI GPT-4."
            />
            
            <FeatureCard
              icon={<MessageSquare className="h-8 w-8" />}
              title="Multi-Agent AI System"
              description="Specialized dragon agents for lending (Yei Finance), liquidity (DragonSwap), market analysis (Symphony), and NFT management (Takara) work together to optimize your portfolio."
            />
            
            <FeatureCard
              icon={<Zap className="h-8 w-8" />}
              title="Real-Time DeFi Integration"
              description="Native integration with Sei Network protocols. Execute trades, manage liquidity, and optimize yields across the entire Sei ecosystem with dragon-speed transactions."
            />
            
            <FeatureCard
              icon={<Sparkles className="h-8 w-8" />}
              title="3D Dragon Animations"
              description="Experience the legendary dragon in full 3D glory with progressive loading, adaptive quality modes, and voice-reactive animations that respond to your every command."
            />
          </div>

          {/* Story Section */}
          <div className="bg-gradient-to-r from-gray-900/80 to-black/80 rounded-2xl p-8 backdrop-blur-sm border border-yellow-500/20 mb-16">
            <h3 className="text-3xl font-bold mb-4 text-yellow-400">The Legend of Seiron</h3>
            <div className="space-y-4 text-gray-300 leading-relaxed">
              <p>
                In the mystical realm of Sei, where blockchain technology meets ancient ethereal magic, 
                Seiron emerged as the guardian of financial wisdom. This legendary spirit possesses 
                the power to grant investment wishes to those brave enough to summon it.
              </p>
              <p>
                Unlike ordinary financial assistants, Seiron channels the energy of the eternal orbs 
                of wisdom, combining millennia of ancient knowledge with cutting-edge AI technology. Through voice 
                commands and mystical chat interfaces, mortals can now access powers once reserved 
                for the gods of finance.
              </p>
              <p>
                Every interaction with Seiron is enhanced by immersive storm effects and the dragon's 
                majestic 3D form that breathes with life, tracking your movements and responding to 
                your voice. This is not just a financial tool—it's a journey into a realm where 
                cutting-edge technology and ancient mythology unite.
              </p>
            </div>
          </div>

          {/* Technical Details */}
          <div className="bg-gradient-to-r from-gray-900/80 to-black/80 rounded-2xl p-8 backdrop-blur-sm border border-yellow-500/20 mb-16">
            <h3 className="text-3xl font-bold mb-4 text-yellow-400">Technical Architecture</h3>
            <div className="grid md:grid-cols-2 gap-6 text-gray-300">
              <div>
                <h4 className="text-xl font-semibold text-yellow-400 mb-2">Frontend Stack</h4>
                <ul className="space-y-1 text-sm">
                  <li>• React 18 with TypeScript</li>
                  <li>• Vite for blazing-fast builds</li>
                  <li>• Three.js & React Three Fiber for 3D</li>
                  <li>• TailwindCSS for styling</li>
                  <li>• Web Speech API for voice</li>
                  <li>• ElevenLabs for text-to-speech</li>
                </ul>
              </div>
              <div>
                <h4 className="text-xl font-semibold text-yellow-400 mb-2">Backend & AI</h4>
                <ul className="space-y-1 text-sm">
                  <li>• Node.js with Express</li>
                  <li>• OpenAI GPT-4 integration</li>
                  <li>• Multi-agent orchestration system</li>
                  <li>• Real-time WebSocket support</li>
                  <li>• Sei Network RPC integration</li>
                  <li>• Non-custodial wallet connection</li>
                </ul>
              </div>
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
            <p>© 2025 Seiron - The Guardian of Financial Wisdom</p>
            <p className="mt-2 text-sm">Powered by Sei Network • Enhanced by AI • Blessed by Ancient Spirits</p>
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
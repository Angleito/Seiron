import { Link } from 'react-router-dom'
import { Bot, Shield, TrendingUp, Zap, Star, Eye, Sparkles } from 'lucide-react'
import SeironSprite from '@components/SeironSprite'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-black">
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-b from-black via-red-950/20 to-black">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          {/* Seiron Dragon with integrated environment */}
          <div className="relative flex justify-center mb-12">
            {/* Background glow effect */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-[700px] h-[700px] bg-gradient-radial from-red-600/20 via-orange-500/10 to-transparent blur-3xl animate-pulse" />
            </div>
            
            {/* Dragon Image with fiery effects */}
            <div className="relative z-10">
              <SeironSprite 
                variant="hero"
                className="drop-shadow-2xl"
              />
              
              {/* Additional fiery overlay effect */}
              <div className="absolute inset-0 bg-gradient-to-t from-orange-600/20 via-red-600/10 to-transparent opacity-60 pointer-events-none animate-pulse" />
              
              {/* Radial gradient overlay for edge blending */}
              <div 
                className="absolute inset-0 pointer-events-none"
                style={{
                  background: 'radial-gradient(circle at center, transparent 40%, rgba(0,0,0,0.3) 70%, rgba(0,0,0,0.6) 100%)'
                }}
              />
            </div>
          </div>
          
          <div className="text-center">
            <h1 className="text-6xl font-bold text-transparent bg-gradient-to-r from-red-400 via-orange-400 to-yellow-400 bg-clip-text mb-6 drop-shadow-lg">
              Seiron - Granting your wildest Sei Investing Wishes
            </h1>
            <p className="text-xl text-orange-300/80 max-w-3xl mx-auto mb-8 leading-relaxed">
              Unleash the power of the eternal dragon to fulfill your wildest investment dreams in the Sei ecosystem. 
              Speak your boldest financial desires, and watch Seiron manifest extraordinary trading strategies with mystical precision.
            </p>
            <div className="flex justify-center gap-4">
              <Link
                to="/dashboard"
                className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-red-600 to-orange-600 text-white font-bold rounded-lg hover:from-red-700 hover:to-orange-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105"
              >
                <Star className="mr-2 h-5 w-5" />
                Summon Seiron
              </Link>
              <Link
                to="/dragon-showcase"
                className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-yellow-600 to-red-600 text-white font-medium rounded-lg hover:from-yellow-700 hover:to-red-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105"
              >
                <Sparkles className="mr-2 h-4 w-4" />
                Dragon Powers
              </Link>
              <a
                href="#features"
                className="inline-flex items-center px-6 py-3 bg-transparent text-orange-200 font-medium rounded-lg border border-orange-400 hover:bg-red-800/50 transition-colors"
              >
                Learn More
              </a>
            </div>
          </div>
        </div>

        {/* Subtle Dark Background Effects */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute inset-0 bg-gradient-to-r from-red-950/10 to-orange-950/10" />
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 bg-red-900 rounded-full blur-3xl opacity-10 animate-pulse" />
          <div className="absolute top-20 left-1/4 w-64 h-64 bg-orange-900 rounded-full blur-2xl opacity-5 animate-pulse" />
          <div className="absolute bottom-20 right-1/4 w-80 h-80 bg-red-800 rounded-full blur-3xl opacity-5 animate-pulse" />
        </div>
      </div>

      {/* Dragon Powers Section */}
      <div id="features" className="py-24 bg-gradient-to-b from-black via-red-950/10 to-black">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-transparent bg-gradient-to-r from-red-400 to-orange-400 bg-clip-text mb-4">
              Seiron's Mystical Powers
            </h2>
            <p className="text-lg text-orange-300">
              Unleash Seiron's legendary powers to fulfill your wildest investment fantasies
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {/* Dragon Power 1 */}
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-red-600 to-orange-600 text-white rounded-lg mb-4 shadow-lg">
                <Sparkles className="h-8 w-8" />
              </div>
              <h3 className="text-lg font-semibold text-orange-100 mb-2">
                Wish Fulfillment
              </h3>
              <p className="text-sm text-orange-200/60">
                Speak your investment desires and watch Seiron grant your every trading wish
              </p>
            </div>

            {/* Dragon Power 2 */}
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-red-600 to-orange-600 text-white rounded-lg mb-4 shadow-lg">
                <Eye className="h-8 w-8" />
              </div>
              <h3 className="text-lg font-semibold text-orange-100 mb-2">
                Dragon Vision
              </h3>
              <p className="text-sm text-orange-200/60">
                See through market chaos with Seiron's all-seeing mystical powers
              </p>
            </div>

            {/* Dragon Power 3 */}
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-red-600 to-orange-600 text-white rounded-lg mb-4 shadow-lg">
                <Shield className="h-8 w-8" />
              </div>
              <h3 className="text-lg font-semibold text-orange-100 mb-2">
                Dragon Shield
              </h3>
              <p className="text-sm text-orange-200/60">
                Protected by ancient dragon magic for secure trading
              </p>
            </div>

            {/* Dragon Power 4 */}
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-red-600 to-orange-600 text-white rounded-lg mb-4 shadow-lg">
                <Zap className="h-8 w-8" />
              </div>
              <h3 className="text-lg font-semibold text-orange-100 mb-2">
                Dragon Speed
              </h3>
              <p className="text-sm text-orange-200/60">
                Execute trades at the speed of dragon fire
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="py-24 bg-black">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="bg-gradient-to-br from-red-950/20 to-orange-950/20 p-8 rounded-lg border border-red-800/20">
              <Bot className="h-12 w-12 text-orange-400 mb-4" />
              <h3 className="text-xl font-semibold text-orange-100 mb-2">
                AI-Powered Dragon Brain
              </h3>
              <p className="text-orange-200/60">
                Powered by ancient dragon wisdom and cutting-edge AI to grant your investment wishes with supernatural precision
              </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-gradient-to-br from-red-950/20 to-orange-950/20 p-8 rounded-lg border border-red-800/20">
              <TrendingUp className="h-12 w-12 text-orange-400 mb-4" />
              <h3 className="text-xl font-semibold text-orange-100 mb-2">
                Dragon Market Mastery
              </h3>
              <p className="text-orange-200/60">
                Real-time analysis of Sei markets with the mystical power to see trends before they happen
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-gradient-to-br from-red-950/20 to-orange-950/20 p-8 rounded-lg border border-red-800/20">
              <Zap className="h-12 w-12 text-orange-400 mb-4" />
              <h3 className="text-xl font-semibold text-orange-100 mb-2">
                Lightning-Fast Wishes
              </h3>
              <p className="text-orange-200/60">
                Your trading wishes are granted at dragon-fire speed with instant execution
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="py-24 bg-gradient-to-t from-black via-red-950/20 to-black">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl font-bold text-transparent bg-gradient-to-r from-red-400 to-orange-400 bg-clip-text mb-4">
            Ready to Summon Seiron?
          </h2>
          <p className="text-xl text-orange-300 mb-8">
            The eternal dragon awaits to grant your wildest investment wishes
          </p>
          <Link
            to="/dashboard"
            className="inline-flex items-center px-10 py-5 bg-gradient-to-r from-red-600 to-orange-600 text-white font-bold text-lg rounded-lg hover:from-red-700 hover:to-orange-700 transition-all duration-300 shadow-xl hover:shadow-2xl transform hover:scale-105"
          >
            <Star className="mr-3 h-6 w-6" />
            Summon the Dragon
          </Link>
        </div>
      </div>
    </div>
  )
}
import Link from 'next/link'
import { Shield, TrendingUp, Star, Eye, Sparkles } from 'lucide-react'
import { FloatingDragonLogo } from '@/components/FloatingDragonLogo'

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-red-950 via-red-900 to-red-800">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          {/* Floating Dragon Logo */}
          <div className="flex justify-center mb-12">
            <FloatingDragonLogo size="xl" />
          </div>
          
          <div className="text-center">
            <h1 className="text-6xl font-bold text-transparent bg-gradient-to-r from-red-400 via-orange-400 to-yellow-400 bg-clip-text mb-6 drop-shadow-lg">
              Seiron - Granting your wildest Sei Investing Wishes
            </h1>
            <p className="text-xl text-orange-200 max-w-3xl mx-auto mb-8 leading-relaxed">
              Unleash the power of the eternal dragon to fulfill your wildest investment dreams in the Sei ecosystem. 
              Speak your boldest financial desires, and watch Seiron manifest extraordinary trading strategies with mystical precision.
            </p>
            <div className="flex justify-center gap-4">
              <Link
                href="/dashboard"
                className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-red-600 to-orange-600 text-white font-bold rounded-lg hover:from-red-700 hover:to-orange-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105"
              >
                <Star className="mr-2 h-5 w-5" />
                Summon Seiron
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

        {/* Dragon Scale Background */}
        <div className="absolute inset-0 -z-10 pointer-events-none">
          <div className="absolute inset-0 bg-gradient-to-r from-red-900/40 to-orange-900/40 opacity-70 will-change-transform transform-gpu" />
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 bg-red-500 rounded-full blur-3xl opacity-20 animate-pulse will-change-opacity contain-paint" />
          <div className="absolute top-20 left-1/4 w-64 h-64 bg-orange-500 rounded-full blur-2xl opacity-15 animate-pulse will-change-opacity contain-paint" />
          <div className="absolute bottom-20 right-1/4 w-80 h-80 bg-yellow-500 rounded-full blur-3xl opacity-10 animate-pulse will-change-opacity contain-paint" />
          {/* Dragon Scale Pattern */}
          <div className="absolute inset-0 opacity-5 pointer-events-none" style={{
            backgroundImage: 'radial-gradient(circle at 20px 20px, rgba(255,0,0,0.3) 2px, transparent 2px)',
            backgroundSize: '40px 40px',
            contain: 'paint'
          }} />
        </div>
      </div>

      {/* Dragon Powers Section */}
      <div id="features" className="py-24 bg-gradient-to-b from-red-900 to-red-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-transparent bg-gradient-to-r from-red-400 to-orange-400 bg-clip-text mb-4">
              Seiron&apos;s Mystical Powers
            </h2>
            <p className="text-lg text-orange-300">
              Unleash Seiron&apos;s legendary powers to fulfill your wildest investment fantasies
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {/* Dragon Power 1 */}
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-red-600 to-orange-600 text-white rounded-lg mb-4 shadow-lg">
                <Sparkles className="h-8 w-8" />
              </div>
              <h3 className="text-lg font-semibold text-orange-100 mb-2">
                Wish Interpretation
              </h3>
              <p className="text-orange-400">
                Voice your wildest investment dreams. Seiron interprets your boldest wishes and brings them to life.
              </p>
            </div>

            {/* Dragon Power 2 */}
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-orange-600 to-red-600 text-white rounded-lg mb-4 shadow-lg">
                <TrendingUp className="h-8 w-8" />
              </div>
              <h3 className="text-lg font-semibold text-orange-100 mb-2">
                Dragon Ball Strategies
              </h3>
              <p className="text-orange-400">
                Investment strategies so wild and powerful, they shatter the boundaries of traditional finance. Power levels beyond imagination!
              </p>
            </div>

            {/* Dragon Power 3 */}
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-red-700 to-orange-700 text-white rounded-lg mb-4 shadow-lg">
                <Shield className="h-8 w-8" />
              </div>
              <h3 className="text-lg font-semibold text-orange-100 mb-2">
                Dragon&apos;s Protection
              </h3>
              <p className="text-orange-400">
                Your treasure remains in your vault. The dragon guards without possessing.
              </p>
            </div>

            {/* Dragon Power 4 */}
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-yellow-600 to-red-600 text-white rounded-lg mb-4 shadow-lg">
                <Eye className="h-8 w-8" />
              </div>
              <h3 className="text-lg font-semibold text-orange-100 mb-2">
                Dragon Sight
              </h3>
              <p className="text-orange-400">
                See through market illusions with the dragon&apos;s all-seeing eyes and eternal wisdom.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* The Summoning Ritual Section */}
      <div className="py-24 bg-gradient-to-b from-red-950 to-red-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-transparent bg-gradient-to-r from-orange-400 to-red-400 bg-clip-text mb-4">
              The Summoning Ritual
            </h2>
            <p className="text-lg text-orange-300">
              Three sacred steps to awaken the eternal dragon
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-gradient-to-br from-red-800 to-red-900 rounded-lg p-8 shadow-xl border border-orange-500/40">
              <div className="text-3xl font-bold text-transparent bg-gradient-to-r from-red-400 to-orange-400 bg-clip-text mb-4">1</div>
              <h3 className="text-xl font-semibold text-orange-100 mb-2">
                Prepare the Altar
              </h3>
              <p className="text-orange-400">
                Connect your sacred wallet (MetaMask or Keplr) to establish the summoning circle.
              </p>
            </div>

            <div className="bg-gradient-to-br from-red-800 to-red-900 rounded-lg p-8 shadow-xl border border-orange-500/40">
              <div className="text-3xl font-bold text-transparent bg-gradient-to-r from-red-400 to-orange-400 bg-clip-text mb-4">2</div>
              <h3 className="text-xl font-semibold text-orange-100 mb-2">
                Speak Your Wish
              </h3>
              <p className="text-orange-400">
                Channel your desires: &quot;Grant me $1000 of SEI&quot; or &quot;Balance my digital treasures.&quot;
              </p>
            </div>

            <div className="bg-gradient-to-br from-red-800 to-red-900 rounded-lg p-8 shadow-xl border border-orange-500/40">
              <div className="text-3xl font-bold text-transparent bg-gradient-to-r from-red-400 to-orange-400 bg-clip-text mb-4">3</div>
              <h3 className="text-xl font-semibold text-orange-100 mb-2">
                Dragon&apos;s Manifestation
              </h3>
              <p className="text-orange-400">
                Seiron awakens, scans the Sei realm, and grants your wish with mystical precision.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Final Summoning Section */}
      <div className="py-24 bg-gradient-to-r from-red-800 via-red-900 to-orange-800">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-orange-100 mb-4">
            Ready to Make Your Wildest Investment Dreams Come True?
          </h2>
          <p className="text-xl text-orange-100 mb-8">
            Join the legendary investors who have already unleashed Seiron&apos;s power to fulfill their wildest Sei ecosystem fantasies.
          </p>
          <Link
            href="/dashboard"
            className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-yellow-400 to-orange-400 text-red-900 font-bold rounded-lg hover:from-yellow-300 hover:to-orange-300 transition-all duration-300 shadow-lg shadow-orange-500/30 hover:shadow-xl hover:shadow-orange-400/40 transform hover:scale-105 animate-power-pulse"
          >
            <Star className="mr-2 h-5 w-5" />
            Summon Seiron
          </Link>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-red-950 text-orange-400 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <p className="text-sm text-orange-300">
              2024 Seiron - Granting your wildest Sei Investing Wishes. Powered by the eternal flames of Sei Network.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}

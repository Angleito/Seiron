import Link from 'next/link'
import { Bot, Shield, TrendingUp, Zap } from 'lucide-react'

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center">
            <h1 className="text-5xl font-bold text-gray-900 mb-6">
              AI-Powered Portfolio Management
            </h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8">
              Let artificial intelligence manage your crypto portfolio. Natural language commands, 
              automated trading, and intelligent insights - all in one platform.
            </p>
            <div className="flex justify-center gap-4">
              <Link
                href="/dashboard"
                className="inline-flex items-center px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
              >
                Launch Dashboard
              </Link>
              <a
                href="#features"
                className="inline-flex items-center px-6 py-3 bg-white text-gray-700 font-medium rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors"
              >
                Learn More
              </a>
            </div>
          </div>
        </div>

        {/* Background decoration */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-50 to-indigo-50 opacity-50" />
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 bg-blue-200 rounded-full blur-3xl opacity-20" />
        </div>
      </div>

      {/* Features Section */}
      <div id="features" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Intelligent Portfolio Management
            </h2>
            <p className="text-lg text-gray-600">
              Powered by advanced AI to make crypto investing effortless
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {/* Feature 1 */}
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 text-blue-600 rounded-lg mb-4">
                <Bot className="h-8 w-8" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Natural Language Interface
              </h3>
              <p className="text-gray-600">
                Simply tell the AI what you want to do. No complex interfaces or trading jargon.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 text-green-600 rounded-lg mb-4">
                <TrendingUp className="h-8 w-8" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Smart Trading Strategies
              </h3>
              <p className="text-gray-600">
                AI analyzes market conditions and executes trades based on proven strategies.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-purple-100 text-purple-600 rounded-lg mb-4">
                <Shield className="h-8 w-8" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Secure & Non-Custodial
              </h3>
              <p className="text-gray-600">
                Your funds stay in your wallet. We never have access to your private keys.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-orange-100 text-orange-600 rounded-lg mb-4">
                <Zap className="h-8 w-8" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Real-Time Insights
              </h3>
              <p className="text-gray-600">
                Get instant market analysis and portfolio recommendations powered by AI.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* How It Works Section */}
      <div className="py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              How It Works
            </h2>
            <p className="text-lg text-gray-600">
              Get started in minutes with our simple process
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white rounded-lg p-8 shadow-sm">
              <div className="text-3xl font-bold text-blue-600 mb-4">1</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Connect Your Wallet
              </h3>
              <p className="text-gray-600">
                Connect your MetaMask or Keplr wallet to get started. Your keys, your control.
              </p>
            </div>

            <div className="bg-white rounded-lg p-8 shadow-sm">
              <div className="text-3xl font-bold text-blue-600 mb-4">2</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Chat with AI
              </h3>
              <p className="text-gray-600">
                Tell the AI what you want: "Buy $1000 of ETH" or "Rebalance my portfolio."
              </p>
            </div>

            <div className="bg-white rounded-lg p-8 shadow-sm">
              <div className="text-3xl font-bold text-blue-600 mb-4">3</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                AI Executes
              </h3>
              <p className="text-gray-600">
                The AI analyzes markets, finds the best prices, and executes your strategy.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="py-24 bg-blue-600">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-white mb-4">
            Ready to Start Trading Smarter?
          </h2>
          <p className="text-xl text-blue-100 mb-8">
            Join thousands of users who are already using AI to manage their crypto portfolios.
          </p>
          <Link
            href="/dashboard"
            className="inline-flex items-center px-8 py-4 bg-white text-blue-600 font-semibold rounded-lg hover:bg-gray-100 transition-colors"
          >
            Launch Dashboard
          </Link>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <p className="text-sm">
              2024 AI Portfolio Manager. Built on Sei Network.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}

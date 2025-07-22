import Link from 'next/link';
import { Sparkles, MessageSquare, TrendingUp, Shield } from 'lucide-react';

export default function HomePage() {
  return (
    <main className="min-h-[calc(100vh-200px)]">
      {/* Hero Section */}
      <section className="relative py-20 px-4 overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-red-900/20 via-orange-900/10 to-transparent" />
        
        <div className="container mx-auto max-w-6xl relative z-10">
          <div className="text-center mb-12">
            <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-red-500 via-orange-500 to-yellow-500 bg-clip-text text-transparent">
              Welcome to Seiron
            </h1>
            <p className="text-xl md:text-2xl text-gray-300 max-w-3xl mx-auto">
              AI-powered conversational portfolio manager for Sei Network
            </p>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
            <Link
              href="/chat"
              className="flex items-center justify-center gap-2 px-8 py-4 bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 text-white rounded-lg transition-all transform hover:scale-105 font-semibold text-lg"
            >
              <MessageSquare className="w-5 h-5" />
              Start Chat
            </Link>
            <Link
              href="/dashboard"
              className="flex items-center justify-center gap-2 px-8 py-4 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-all transform hover:scale-105 font-semibold text-lg"
            >
              <TrendingUp className="w-5 h-5" />
              View Dashboard
            </Link>
          </div>

          {/* Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-xl p-6 hover:border-red-800/50 transition-all">
              <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-r from-red-600 to-orange-600 rounded-lg mb-4">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold mb-2">AI-Powered Insights</h3>
              <p className="text-gray-400">
                Get intelligent portfolio recommendations powered by advanced AI and real-time market data
              </p>
            </div>

            <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-xl p-6 hover:border-orange-800/50 transition-all">
              <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-r from-orange-600 to-yellow-600 rounded-lg mb-4">
                <MessageSquare className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Conversational Interface</h3>
              <p className="text-gray-400">
                Manage your portfolio through natural conversations with our AI assistant
              </p>
            </div>

            <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-xl p-6 hover:border-yellow-800/50 transition-all">
              <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-r from-yellow-600 to-red-600 rounded-lg mb-4">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Secure & Reliable</h3>
              <p className="text-gray-400">
                Built on Sei Network with enterprise-grade security and reliability
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 px-4 border-t border-gray-800">
        <div className="container mx-auto max-w-6xl">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            <div>
              <div className="text-4xl font-bold bg-gradient-to-r from-red-500 to-orange-500 bg-clip-text text-transparent mb-2">
                9000+
              </div>
              <p className="text-gray-400">Power Level</p>
            </div>
            <div>
              <div className="text-4xl font-bold bg-gradient-to-r from-orange-500 to-yellow-500 bg-clip-text text-transparent mb-2">
                24/7
              </div>
              <p className="text-gray-400">AI Availability</p>
            </div>
            <div>
              <div className="text-4xl font-bold bg-gradient-to-r from-yellow-500 to-red-500 bg-clip-text text-transparent mb-2">
                100%
              </div>
              <p className="text-gray-400">Sei Native</p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
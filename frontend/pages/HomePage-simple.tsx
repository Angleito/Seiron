import React from 'react'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-black to-gray-900 text-white">
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-6xl font-bold mb-4 bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent">
            Seiron
          </h1>
          <p className="text-2xl mb-8">
            Granting your wildest Sei investing wishes
          </p>
          <p className="text-lg mb-8">
            Master the art of DeFi with legendary powers and transform into the ultimate portfolio warrior.
          </p>
          <div className="flex justify-center space-x-4">
            <button className="px-8 py-3 bg-yellow-500 text-black rounded-lg font-bold hover:bg-yellow-400 transition-colors">
              🚀 READY TO POWER UP?
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
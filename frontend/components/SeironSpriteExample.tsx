'use client'

import React, { useState } from 'react'
import SeironSprite from './SeironSprite'

export function SeironSpriteExample() {
  const [readyToGrant, setReadyToGrant] = useState(true)
  const [lastWish, setLastWish] = useState<string | null>(null)
  const [wishCount, setWishCount] = useState(0)

  const handleInteraction = (type: 'hover' | 'click' | 'touch') => {
    console.log(`🐉 Dragon interaction: ${type}`)
  }

  const handleWishGrant = (wishType: 'power' | 'wisdom' | 'fortune') => {
    console.log(`✨ Wish granted: ${wishType}`)
    setLastWish(wishType)
    setWishCount(prev => prev + 1)
    
    // Make dragon not ready for a few seconds
    setReadyToGrant(false)
    setTimeout(() => {
      setReadyToGrant(true)
    }, 10000) // 10 seconds cooldown
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex flex-col items-center justify-center p-8">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-white mb-4">
          Interactive Seiron Dragon
        </h1>
        <p className="text-lg text-gray-300 mb-6">
          Hover over the dragon to see it respond. Click when ready to grant a wish!
        </p>
        
        {/* Status display */}
        <div className="bg-black/30 rounded-lg p-4 mb-6 text-white">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <div className="font-semibold">Status</div>
              <div className={readyToGrant ? 'text-green-400' : 'text-yellow-400'}>
                {readyToGrant ? 'Ready to Grant Wishes' : 'Recharging...'}
              </div>
            </div>
            <div>
              <div className="font-semibold">Wishes Granted</div>
              <div className="text-blue-400">{wishCount}</div>
            </div>
            <div>
              <div className="font-semibold">Last Wish</div>
              <div className="text-purple-400">
                {lastWish ? lastWish.charAt(0).toUpperCase() + lastWish.slice(1) : 'None'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Dragon */}
      <div className="mb-8">
        <SeironSprite
          size="xl"
          interactive={true}
          readyToGrant={readyToGrant}
          onInteraction={handleInteraction}
          onWishGrant={handleWishGrant}
          className="drop-shadow-2xl"
        />
      </div>

      {/* Instructions */}
      <div className="max-w-2xl text-center text-gray-300">
        <h2 className="text-xl font-semibold mb-4">How to Interact</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div className="bg-black/20 rounded-lg p-4">
            <div className="font-semibold text-orange-400 mb-2">🖱️ Mouse</div>
            <div>Hover over the dragon to see enhanced glow and particles. Click when ready to grant a wish!</div>
          </div>
          <div className="bg-black/20 rounded-lg p-4">
            <div className="font-semibold text-blue-400 mb-2">📱 Touch</div>
            <div>Tap the dragon on mobile devices. Touch and hold for enhanced effects.</div>
          </div>
        </div>
        
        <div className="mt-6 bg-black/20 rounded-lg p-4">
          <div className="font-semibold text-green-400 mb-2">✨ Wish Types</div>
          <div className="text-sm">
            The dragon can grant three types of wishes: <span className="text-yellow-400">Power</span>, 
            <span className="text-blue-400"> Wisdom</span>, and <span className="text-purple-400"> Fortune</span>. 
            Each wish triggers a unique animation sequence!
          </div>
        </div>
      </div>
    </div>
  )
}

export default SeironSpriteExample
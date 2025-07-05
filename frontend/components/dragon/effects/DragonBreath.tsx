'use client'

import React from 'react'

export const DragonBreath = React.memo(function DragonBreath() {
  return (
    <div className="absolute bottom-[20%] left-[50%] transform -translate-x-1/2">
      <div className="relative">
        {[...Array(3)].map((_, i) => (
          <div
            key={i}
            className="absolute w-4 h-4 bg-gradient-to-r from-red-500 to-orange-400 rounded-full animate-dragon-fire"
            style={{
              left: `${i * 10}px`,
              animationDelay: `${i * 0.1}s`,
              filter: 'blur(2px)'
            }}
          />
        ))}
      </div>
    </div>
  )
})
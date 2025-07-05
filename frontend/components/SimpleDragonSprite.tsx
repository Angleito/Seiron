'use client'

import React from 'react'
import { motion } from 'framer-motion'

export interface SimpleDragonSpriteProps {
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
  onClick?: () => void
  enableHover?: boolean
}

const sizeClasses = {
  sm: 'w-16 h-16',
  md: 'w-24 h-24',
  lg: 'w-32 h-32',
  xl: 'w-48 h-48'
}

const SimpleDragonSprite: React.FC<SimpleDragonSpriteProps> = ({
  size = 'lg',
  className = '',
  onClick,
  enableHover = true
}) => {
  return (
    <motion.div
      className={`${sizeClasses[size]} ${className} cursor-pointer select-none`}
      onClick={onClick}
      whileHover={enableHover ? { scale: 1.05 } : undefined}
      whileTap={{ scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
    >
      <img
        src="/dragon-logo.png"
        alt="Seiron Dragon"
        className="w-full h-full object-contain filter drop-shadow-lg"
        draggable={false}
      />
    </motion.div>
  )
}

export default SimpleDragonSprite
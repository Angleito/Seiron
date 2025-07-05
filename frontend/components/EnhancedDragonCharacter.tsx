'use client'

import React from 'react'
import SimpleDragonSprite from './SimpleDragonSprite'

interface EnhancedDragonCharacterProps {
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
  onClick?: () => void
  enableHover?: boolean
}

const EnhancedDragonCharacter: React.FC<EnhancedDragonCharacterProps> = ({
  size = 'lg',
  className = '',
  onClick,
  enableHover = true
}) => {
  return (
    <SimpleDragonSprite
      size={size}
      className={className}
      onClick={onClick}
      enableHover={enableHover}
    />
  )
}

export default EnhancedDragonCharacter
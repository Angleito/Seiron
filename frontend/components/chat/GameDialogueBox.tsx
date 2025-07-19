'use client'

import { useEffect, useState, useRef } from 'react'
import { cn } from '@/lib/utils'

interface GameDialogueBoxProps {
  characterName: string
  characterImage?: string
  message: string
  position?: 'left' | 'right'
  onComplete?: () => void
  typewriterSpeed?: number
  showPortrait?: boolean
}

export function GameDialogueBox({
  characterName,
  characterImage,
  message,
  position = 'left',
  onComplete,
  typewriterSpeed = 30,
  showPortrait = true
}: GameDialogueBoxProps) {
  const [displayedText, setDisplayedText] = useState('')
  const [isComplete, setIsComplete] = useState(false)
  const typewriterRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    let currentIndex = 0
    setDisplayedText('')
    setIsComplete(false)

    const typeWriter = () => {
      if (currentIndex < message.length) {
        setDisplayedText(message.slice(0, currentIndex + 1))
        currentIndex++
        typewriterRef.current = setTimeout(typeWriter, typewriterSpeed)
      } else {
        setIsComplete(true)
        onComplete?.()
      }
    }

    typewriterRef.current = setTimeout(typeWriter, 100)

    return () => {
      if (typewriterRef.current) {
        clearTimeout(typewriterRef.current)
      }
    }
  }, [message, typewriterSpeed, onComplete])

  const handleSkipAnimation = () => {
    if (typewriterRef.current) {
      clearTimeout(typewriterRef.current)
    }
    setDisplayedText(message)
    setIsComplete(true)
    onComplete?.()
  }

  return (
    <div 
      className={cn(
        "flex items-start gap-4 mb-6 animate-dialogue-appear",
        position === 'right' && "flex-row-reverse"
      )}
    >
      {/* Character Portrait */}
      {showPortrait && characterImage && (
        <div className="relative flex-shrink-0">
          <div className="game-portrait-frame">
            <img
              src={characterImage}
              alt={characterName}
              width={80}
              height={80}
              className="rounded-lg object-cover w-full h-full"
            />
            {/* Energy aura effect */}
            <div className="absolute inset-0 rounded-lg game-portrait-aura" />
          </div>
        </div>
      )}

      {/* Dialogue Box */}
      <div 
        className="game-dialogue-box relative flex-1 max-w-2xl cursor-pointer"
        onClick={!isComplete ? handleSkipAnimation : undefined}
      >
        {/* Character Name Header */}
        <div className="game-dialogue-header">
          <span className="text-white font-semibold text-size-2">{characterName}</span>
        </div>

        {/* Message Content */}
        <div className="game-dialogue-content">
          <p className="text-white leading-relaxed whitespace-pre-wrap">
            {displayedText}
            {!isComplete && <span className="animate-pulse">▮</span>}
          </p>
        </div>

        {/* Triangle Pointer */}
        <div 
          className={cn(
            "game-dialogue-pointer",
            position === 'right' ? "game-dialogue-pointer-right" : "game-dialogue-pointer-left"
          )}
        />

        {/* Ornamental Corners */}
        <div className="game-dialogue-corner game-dialogue-corner-tl" />
        <div className="game-dialogue-corner game-dialogue-corner-tr" />
        <div className="game-dialogue-corner game-dialogue-corner-bl" />
        <div className="game-dialogue-corner game-dialogue-corner-br" />
      </div>
    </div>
  )
}
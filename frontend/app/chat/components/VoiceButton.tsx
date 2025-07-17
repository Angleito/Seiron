'use client'

import React, { useCallback, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Mic, MicOff, Volume2, VolumeX, CircleDot, Zap } from 'lucide-react'
import { cn } from '@lib/utils'

export interface VoiceButtonProps {
  /** Button mode - 'toggle' stays active until clicked again, 'push' only active while pressed */
  mode: 'toggle' | 'push'
  /** Current listening state */
  isListening: boolean
  /** Current speaking state */
  isSpeaking: boolean
  /** Processing state (between listening and speaking) */
  isProcessing: boolean
  /** Whether the component is disabled */
  disabled?: boolean
  /** Callback when listening state should change */
  onListeningChange: (listening: boolean) => void
  /** Speaker enabled state */
  speakerEnabled: boolean
  /** Callback when speaker state should change */
  onSpeakerToggle: () => void
  /** Additional CSS classes */
  className?: string
  /** Show power level indicator */
  showPowerLevel?: boolean
  /** Current power level (0-100) */
  powerLevel?: number
}

export type VoiceState = 'idle' | 'listening' | 'processing' | 'speaking'

export const VoiceButton = React.memo(function VoiceButton({
  mode,
  isListening,
  isSpeaking,
  isProcessing,
  disabled = false,
  onListeningChange,
  speakerEnabled,
  onSpeakerToggle,
  className = '',
  showPowerLevel = true,
  powerLevel = 0
}: VoiceButtonProps) {
  const [isPressing, setIsPressing] = useState(false)

  // Determine current voice state
  const voiceState: VoiceState = useMemo(() => {
    if (isSpeaking) return 'speaking'
    if (isProcessing) return 'processing'
    if (isListening) return 'listening'
    return 'idle'
  }, [isListening, isSpeaking, isProcessing])

  // Handle mouse/touch events for push-to-talk
  const handlePointerDown = useCallback(() => {
    if (disabled) return
    
    setIsPressing(true)
    if (mode === 'push' && !isListening) {
      onListeningChange(true)
    }
  }, [disabled, mode, isListening, onListeningChange])

  const handlePointerUp = useCallback(() => {
    setIsPressing(false)
    if (mode === 'push' && isListening) {
      onListeningChange(false)
    }
  }, [mode, isListening, onListeningChange])

  const handleClick = useCallback(() => {
    if (disabled) return
    
    if (mode === 'toggle') {
      onListeningChange(!isListening)
    }
    // For push mode, click without hold just triggers a quick activation
    else if (mode === 'push' && !isPressing) {
      onListeningChange(true)
      setTimeout(() => onListeningChange(false), 2000) // Auto-stop after 2s
    }
  }, [disabled, mode, isListening, onListeningChange, isPressing])

  // Handle keyboard events for accessibility
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (disabled) return
    
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault()
      if (mode === 'push') {
        handlePointerDown()
      } else {
        handleClick()
      }
    }
  }, [disabled, mode, handlePointerDown, handleClick])

  const handleKeyUp = useCallback((e: React.KeyboardEvent) => {
    if (disabled) return
    
    if (e.key === ' ' && mode === 'push') {
      e.preventDefault()
      handlePointerUp()
    }
  }, [disabled, mode, handlePointerUp])

  // Animation variants for different states
  const buttonVariants = {
    idle: { 
      scale: 1, 
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
      background: 'linear-gradient(135deg, #1f2937 0%, #111827 100%)'
    },
    listening: { 
      scale: 1.05, 
      boxShadow: '0 8px 24px rgba(59, 130, 246, 0.4)',
      background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)'
    },
    processing: { 
      scale: 1.02, 
      boxShadow: '0 6px 18px rgba(168, 85, 247, 0.4)',
      background: 'linear-gradient(135deg, #a855f7 0%, #7c3aed 100%)'
    },
    speaking: { 
      scale: 1.03, 
      boxShadow: '0 6px 20px rgba(249, 115, 22, 0.4)',
      background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)'
    }
  }

  const pulseVariants = {
    idle: { opacity: 0 },
    active: { 
      opacity: [0.3, 0.8, 0.3],
      scale: [1, 1.2, 1],
      transition: { 
        duration: 1.5, 
        repeat: Infinity,
        ease: "easeInOut"
      }
    }
  }

  // Get state colors and icons
  const getStateConfig = (state: VoiceState) => {
    switch (state) {
      case 'listening':
        return {
          icon: Mic,
          color: 'text-blue-100',
          ringColor: 'border-blue-400',
          label: mode === 'push' ? 'Release to stop' : 'Listening...',
          ariaLabel: 'Currently listening to voice input'
        }
      case 'processing':
        return {
          icon: CircleDot,
          color: 'text-purple-100',
          ringColor: 'border-purple-400', 
          label: 'Processing...',
          ariaLabel: 'Processing voice input'
        }
      case 'speaking':
        return {
          icon: Volume2,
          color: 'text-orange-100',
          ringColor: 'border-orange-400',
          label: 'Speaking...',
          ariaLabel: 'AI is speaking'
        }
      default:
        return {
          icon: disabled ? MicOff : Mic,
          color: disabled ? 'text-gray-400' : 'text-gray-100',
          ringColor: 'border-gray-600',
          label: disabled ? 'Voice disabled' : (mode === 'push' ? 'Hold to talk' : 'Click to talk'),
          ariaLabel: disabled ? 'Voice input disabled' : 'Activate voice input'
        }
    }
  }

  const stateConfig = getStateConfig(voiceState)
  const IconComponent = stateConfig.icon

  return (
    <div className={cn('relative flex flex-col items-center space-y-4', className)}>
      {/* Main Voice Button */}
      <motion.button
        variants={buttonVariants}
        animate={voiceState}
        whileTap={{ scale: disabled ? 1 : 0.95 }}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        onKeyUp={handleKeyUp}
        disabled={disabled}
        aria-label={stateConfig.ariaLabel}
        aria-pressed={isListening}
        className={cn(
          'relative flex items-center justify-center',
          'w-20 h-20 rounded-full',
          'border-2 focus:outline-none focus:ring-4 focus:ring-blue-500/30',
          'transition-all duration-200 ease-in-out',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          stateConfig.ringColor
        )}
      >
        {/* Pulsing Ring Effect */}
        <motion.div
          variants={pulseVariants}
          animate={voiceState !== 'idle' ? 'active' : 'idle'}
          className={cn(
            'absolute inset-0 rounded-full border-2',
            stateConfig.ringColor
          )}
        />

        {/* Power Level Ring */}
        {showPowerLevel && powerLevel > 0 && (
          <motion.div
            initial={{ pathLength: 0 }}
            animate={{ pathLength: powerLevel / 100 }}
            className="absolute inset-0"
          >
            <svg className="w-full h-full -rotate-90">
              <circle
                cx="50%"
                cy="50%"
                r="38"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
                className="text-yellow-400"
                style={{
                  strokeDasharray: `${2 * Math.PI * 38}`,
                  strokeDashoffset: `${2 * Math.PI * 38 * (1 - powerLevel / 100)}`
                }}
              />
            </svg>
          </motion.div>
        )}

        {/* Icon */}
        <IconComponent 
          className={cn('w-8 h-8 z-10', stateConfig.color)}
          strokeWidth={2}
        />

        {/* Processing Animation */}
        <AnimatePresence>
          {isProcessing && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="absolute inset-0 flex items-center justify-center"
            >
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                className="w-12 h-12 border-3 border-transparent border-t-purple-400 rounded-full"
              />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>

      {/* Speaker Toggle Button */}
      <motion.button
        onClick={onSpeakerToggle}
        whileTap={{ scale: 0.9 }}
        whileHover={{ scale: 1.1 }}
        disabled={disabled}
        aria-label={speakerEnabled ? 'Disable voice output' : 'Enable voice output'}
        className={cn(
          'flex items-center justify-center',
          'w-10 h-10 rounded-full',
          'border transition-all duration-200',
          'focus:outline-none focus:ring-2 focus:ring-blue-500/30',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          speakerEnabled 
            ? 'bg-orange-600 border-orange-500 text-white hover:bg-orange-700' 
            : 'bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600'
        )}
      >
        {speakerEnabled ? (
          <Volume2 className="w-4 h-4" />
        ) : (
          <VolumeX className="w-4 h-4" />
        )}
      </motion.button>

      {/* Status Label */}
      <AnimatePresence mode="wait">
        <motion.div
          key={voiceState}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="text-center"
        >
          <div className={cn(
            'text-sm font-medium mb-1',
            stateConfig.color
          )}>
            {stateConfig.label}
          </div>
          
          {/* Power Level Display */}
          {showPowerLevel && powerLevel > 0 && (
            <div className="flex items-center justify-center gap-1 text-xs text-yellow-400">
              <Zap className="w-3 h-3" />
              <span>{powerLevel}%</span>
            </div>
          )}

          {/* Mode Hint */}
          <div className="text-xs text-gray-500">
            {mode === 'push' ? 'Push to talk' : 'Toggle mode'}
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  )
})

export default VoiceButton
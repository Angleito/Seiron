'use client'

import { useEffect, useState, useCallback } from 'react'
import { useAnimation, AnimationControls } from 'framer-motion'

export type DragonState = 'idle' | 'attention' | 'ready' | 'active' | 'sleeping' | 'awakening'
export type DragonMood = 'neutral' | 'happy' | 'excited' | 'powerful' | 'mystical'

interface DragonAnimationConfig {
  enableAutoState?: boolean
  enableProximityDetection?: boolean
  proximityThreshold?: number
  enableTimeBasedStates?: boolean
}

interface DragonAnimationReturn {
  dragonState: DragonState
  dragonMood: DragonMood
  controls: AnimationControls
  setDragonState: (state: DragonState) => void
  setDragonMood: (mood: DragonMood) => void
  triggerSpecialAnimation: (animation: string) => void
  powerLevel: number
  isCharging: boolean
}

export function useDragonAnimation({
  enableAutoState = true,
  enableProximityDetection = true,
  proximityThreshold = 300,
  enableTimeBasedStates = true
}: DragonAnimationConfig = {}): DragonAnimationReturn {
  const [dragonState, setDragonState] = useState<DragonState>('idle')
  const [dragonMood, setDragonMood] = useState<DragonMood>('neutral')
  const [powerLevel, setPowerLevel] = useState(0)
  const [isCharging, setIsCharging] = useState(false)
  const controls = useAnimation()

  // Time-based state changes
  useEffect(() => {
    if (!enableTimeBasedStates) return

    const checkTime = () => {
      const hour = new Date().getHours()
      
      // Dragon sleeps late at night (11 PM - 5 AM)
      if (hour >= 23 || hour < 5) {
        setDragonState('sleeping')
        setDragonMood('neutral')
      } 
      // Dragon awakens in the morning (5 AM - 7 AM)
      else if (hour >= 5 && hour < 7) {
        setDragonState('awakening')
        setDragonMood('happy')
      }
      // Dragon is most active during day (9 AM - 5 PM)
      else if (hour >= 9 && hour < 17) {
        setDragonMood('excited')
      }
      // Dragon is mystical during twilight (6 PM - 8 PM)
      else if (hour >= 18 && hour < 20) {
        setDragonMood('mystical')
      }
    }

    checkTime()
    const interval = setInterval(checkTime, 60000) // Check every minute
    return () => clearInterval(interval)
  }, [enableTimeBasedStates])

  // Auto state transitions
  useEffect(() => {
    if (!enableAutoState || dragonState === 'sleeping') return

    const stateTransitions = {
      idle: () => {
        const random = Math.random()
        if (random < 0.1) {
          setDragonState('attention')
          setTimeout(() => setDragonState('idle'), 3000)
        }
      },
      attention: () => {
        const random = Math.random()
        if (random < 0.3) {
          setDragonState('ready')
        } else if (random < 0.1) {
          setDragonState('idle')
        }
      },
      ready: () => {
        const random = Math.random()
        if (random < 0.2) {
          setDragonState('active')
          setIsCharging(true)
          setTimeout(() => {
            setIsCharging(false)
            setDragonState('idle')
          }, 5000)
        }
      }
    }

    const transition = stateTransitions[dragonState as keyof typeof stateTransitions]
    if (transition) {
      const timeout = setTimeout(transition, 3000 + Math.random() * 4000)
      return () => clearTimeout(timeout)
    }
  }, [dragonState, enableAutoState])

  // Power level management
  useEffect(() => {
    if (dragonState === 'active' && isCharging) {
      const interval = setInterval(() => {
        setPowerLevel(prev => Math.min(prev + 10, 100))
      }, 100)
      return () => clearInterval(interval)
    } else {
      const interval = setInterval(() => {
        setPowerLevel(prev => Math.max(prev - 5, 0))
      }, 200)
      return () => clearInterval(interval)
    }
  }, [dragonState, isCharging])

  // Trigger special animations based on state and mood
  useEffect(() => {
    const animationConfig = {
      idle: {
        neutral: { scale: 1, rotate: 0 },
        happy: { scale: 1.05, rotate: [0, 2, -2, 0] },
        excited: { scale: [1, 1.1, 1], rotate: [0, 5, -5, 0] },
        powerful: { scale: 1.1, rotate: 0 },
        mystical: { scale: 1, rotate: [0, 360] }
      },
      attention: {
        neutral: { scale: 1.05, rotate: 0 },
        happy: { scale: 1.1, rotate: 2 },
        excited: { scale: 1.15, rotate: [-2, 2] },
        powerful: { scale: 1.2, rotate: 0 },
        mystical: { scale: 1.05, rotate: [0, 180, 360] }
      },
      ready: {
        neutral: { scale: [1.05, 1.1, 1.05], rotate: 0 },
        happy: { scale: [1.1, 1.15, 1.1], rotate: [0, 5, 0] },
        excited: { scale: [1.1, 1.2, 1.1], rotate: [-5, 5] },
        powerful: { scale: [1.15, 1.25, 1.15], rotate: 0 },
        mystical: { scale: [1.05, 1.15, 1.05], rotate: [0, 90, 180, 270, 360] }
      },
      active: {
        neutral: { scale: [1.1, 1.2, 1.1], rotate: [-5, 5] },
        happy: { scale: [1.15, 1.25, 1.15], rotate: [-10, 10] },
        excited: { scale: [1.2, 1.3, 1.2], rotate: [-15, 15] },
        powerful: { scale: [1.25, 1.35, 1.25], rotate: [-20, 20] },
        mystical: { scale: [1.1, 1.3, 1.1], rotate: [0, 720] }
      },
      sleeping: {
        neutral: { scale: 0.9, rotate: 0 },
        happy: { scale: 0.9, rotate: 0 },
        excited: { scale: 0.9, rotate: 0 },
        powerful: { scale: 0.9, rotate: 0 },
        mystical: { scale: 0.9, rotate: 0 }
      },
      awakening: {
        neutral: { scale: [0.9, 1, 0.95, 1], rotate: 0 },
        happy: { scale: [0.9, 1.05, 1], rotate: [0, 5, 0] },
        excited: { scale: [0.9, 1.1, 1.05], rotate: [-5, 5, 0] },
        powerful: { scale: [0.9, 1.1, 1], rotate: 0 },
        mystical: { scale: [0.9, 1, 1.05, 1], rotate: [0, 360] }
      }
    }

    const config = animationConfig[dragonState]?.[dragonMood]
    if (config) {
      controls.start({
        ...config,
        transition: {
          duration: dragonState === 'active' ? 2 : 3,
          repeat: dragonState === 'active' || dragonState === 'ready' ? Infinity : 0,
          ease: "easeInOut"
        }
      })
    }
  }, [dragonState, dragonMood, controls])

  // Special animation triggers
  const triggerSpecialAnimation = useCallback((animation: string) => {
    switch (animation) {
      case 'roar':
        controls.start({
          scale: [1, 1.5, 1.3, 1],
          rotate: [0, -10, 10, 0],
          transition: { duration: 1, ease: "easeOut" }
        })
        break
      case 'spin':
        controls.start({
          rotate: [0, 360, 720],
          scale: [1, 1.2, 1],
          transition: { duration: 2, ease: "easeInOut" }
        })
        break
      case 'pulse':
        controls.start({
          scale: [1, 1.2, 0.8, 1.3, 1],
          transition: { duration: 1.5, ease: "easeInOut" }
        })
        break
      case 'shake':
        controls.start({
          x: [-10, 10, -10, 10, 0],
          rotate: [-5, 5, -5, 5, 0],
          transition: { duration: 0.5, ease: "easeOut" }
        })
        break
      case 'powerUp':
        setIsCharging(true)
        controls.start({
          scale: [1, 1.5, 1.3],
          filter: [
            "brightness(1) hue-rotate(0deg)",
            "brightness(2) hue-rotate(360deg)",
            "brightness(1.5) hue-rotate(180deg)"
          ],
          transition: { duration: 3, ease: "easeInOut" }
        })
        setTimeout(() => setIsCharging(false), 3000)
        break
    }
  }, [controls])

  return {
    dragonState,
    dragonMood,
    controls,
    setDragonState,
    setDragonMood,
    triggerSpecialAnimation,
    powerLevel,
    isCharging
  }
}
'use client'

import React, { useState, useCallback, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { SeironDragon } from './SeironDragon'
// import { useEnhancedMouseTracking } from './hooks/useEnhancedMouseTracking'
// import { useEnhancedTouchGestures } from './hooks/useEnhancedTouchGestures'
// import { useKeyboardNavigation } from './hooks/useKeyboardNavigation'
import { useAnimationPerformance } from './hooks/useAnimationPerformance'
import { DragonErrorBoundary } from '@components/error-boundaries'
import { pipe } from 'fp-ts/function'
import * as O from 'fp-ts/Option'
import type { 
  DragonState, 
  DragonMood, 
  DragonPart, 
  TouchGesture,
  InteractionType,
  SVGInteractionZones
} from './types'

interface EnhancedDragonInteractionSystemProps {
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'xxl'
  initialState?: DragonState
  initialMood?: DragonMood
  interactive?: boolean
  showDragonBalls?: boolean
  enableAdvancedInteractions?: boolean
  enablePerformanceOptimization?: boolean
  enableAccessibility?: boolean
  enableHapticFeedback?: boolean
  enableDebugMode?: boolean
  svgZones?: SVGInteractionZones
  className?: string
  onStateChange?: (state: DragonState) => void
  onMoodChange?: (mood: DragonMood) => void
  onPowerLevelChange?: (level: number) => void
  onInteractionEvent?: (type: InteractionType, data?: unknown) => void
  onPerformanceAlert?: (metric: string, value: number) => void
}

interface InteractionStats {
  totalInteractions: number
  partInteractions: Record<DragonPart, number>
  gestureStats: Record<string, number>
  averageResponseTime: number
  accessibilityUsage: number
  performanceMetrics: {
    fps: number
    latency: number
    memoryUsage: number
  }
}

interface DebugInfo {
  mousePosition: { x: number; y: number }
  hoveredPart: DragonPart | null
  currentGesture: TouchGesture | null
  focusedElement: DragonPart | null
  proximityZone: string
  performanceMode: string
  interactionStats: InteractionStats
}

// Debug Panel Component
const DebugPanel: React.FC<{ debugInfo: DebugInfo; onClose: () => void }> = ({ debugInfo, onClose }) => (
  <motion.div
    className="fixed top-4 right-4 bg-black bg-opacity-80 text-white p-4 rounded-lg z-50 max-w-sm"
    initial={{ opacity: 0, x: 100 }}
    animate={{ opacity: 1, x: 0 }}
    exit={{ opacity: 0, x: 100 }}
  >
    <div className="flex justify-between items-center mb-3">
      <h3 className="text-lg font-bold text-yellow-400">Debug Panel</h3>
      <button 
        onClick={onClose}
        className="text-gray-400 hover:text-white transition-colors"
      >
        ✕
      </button>
    </div>
    
    <div className="space-y-2 text-sm">
      <div>
        <span className="text-blue-400">Mouse:</span> 
        {debugInfo.mousePosition.x.toFixed(0)}, {debugInfo.mousePosition.y.toFixed(0)}
      </div>
      
      <div>
        <span className="text-green-400">Hovered:</span> 
        {debugInfo.hoveredPart || 'none'}
      </div>
      
      <div>
        <span className="text-purple-400">Focused:</span> 
        {debugInfo.focusedElement || 'none'}
      </div>
      
      <div>
        <span className="text-orange-400">Proximity:</span> 
        {debugInfo.proximityZone}
      </div>
      
      <div>
        <span className="text-red-400">Performance:</span> 
        {debugInfo.performanceMode}
      </div>
      
      <div>
        <span className="text-cyan-400">FPS:</span> 
        {debugInfo.performanceMode || 'auto'}
      </div>
      
      <div>
        <span className="text-yellow-400">Latency:</span> 
        {debugInfo.performanceMode || 'auto'}
      </div>
      
      <div>
        <span className="text-pink-400">Interactions:</span> 
        {debugInfo.interactionStats.totalInteractions}
      </div>
      
      {debugInfo.currentGesture && (
        <div>
          <span className="text-indigo-400">Gesture:</span> 
          {debugInfo.currentGesture.type}
        </div>
      )}
    </div>
  </motion.div>
)

// Performance Alert Component
const PerformanceAlert: React.FC<{ 
  metric: string
  value: number
  onDismiss: () => void 
}> = ({ metric, value, onDismiss }) => (
  <motion.div
    className="fixed bottom-4 left-4 bg-orange-500 text-white p-3 rounded-lg shadow-lg z-40"
    initial={{ opacity: 0, y: 50 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: 50 }}
  >
    <div className="flex items-center space-x-2">
      <span className="text-xl">⚠️</span>
      <div>
        <div className="font-bold">Performance Alert</div>
        <div className="text-sm">{metric}: {value.toFixed(2)}</div>
      </div>
      <button 
        onClick={onDismiss}
        className="ml-2 text-orange-200 hover:text-white"
      >
        ✕
      </button>
    </div>
  </motion.div>
)

// Interaction Feedback Component
const InteractionFeedback: React.FC<{ 
  message: string
  type: 'success' | 'info' | 'warning'
  onComplete: () => void 
}> = ({ message, type, onComplete }) => {
  useEffect(() => {
    const timer = setTimeout(onComplete, 2000)
    return () => clearTimeout(timer)
  }, [onComplete])

  const colors = {
    success: 'bg-green-500',
    info: 'bg-blue-500',
    warning: 'bg-yellow-500'
  }

  return (
    <motion.div
      className={`fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 ${colors[type]} text-white px-6 py-3 rounded-lg shadow-lg z-50`}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
    >
      {message}
    </motion.div>
  )
}

// Main Enhanced Dragon Interaction System
const EnhancedDragonInteractionSystemContent: React.FC<EnhancedDragonInteractionSystemProps> = ({
  size = 'lg',
  initialState = 'idle',
  initialMood = 'neutral',
  // interactive = true,
  // showDragonBalls = true,
  // enableAdvancedInteractions = true,
  enablePerformanceOptimization = true,
  enableAccessibility = true,
  // enableHapticFeedback = true,
  enableDebugMode = false,
  // svgZones,
  className = '',
  onStateChange,
  onMoodChange,
  onPowerLevelChange,
  onInteractionEvent,
  onPerformanceAlert
}) => {
  // State management
  const [currentState, setCurrentState] = useState<DragonState>(initialState)
  const [currentMood, setCurrentMood] = useState<DragonMood>(initialMood)
  const [powerLevel, setPowerLevel] = useState(1000)
  const [interactionStats, setInteractionStats] = useState<InteractionStats>({
    totalInteractions: 0,
    partInteractions: {} as Record<DragonPart, number>,
    gestureStats: {},
    averageResponseTime: 0,
    accessibilityUsage: 0,
    performanceMetrics: { fps: 60, latency: 0, memoryUsage: 0 }
  })
  
  const [showDebugPanel, setShowDebugPanel] = useState(enableDebugMode)
  const [performanceAlerts, setPerformanceAlerts] = useState<Array<{ id: string; metric: string; value: number }>>([])
  const [interactionFeedback, setInteractionFeedback] = useState<{ 
    message: string; 
    type: 'success' | 'info' | 'warning';
    id: string 
  } | null>(null)

  // Refs for tracking
  const interactionStartTimeRef = useRef<number>(0)
  const statsUpdateIntervalRef = useRef<NodeJS.Timeout>()

  // Performance monitoring
  const { performanceMode, metrics } = useAnimationPerformance(enablePerformanceOptimization)

  // Event handlers (available for future integration with interaction hooks)
  // const handleStateChange = useCallback((state: DragonState) => {
  //   setCurrentState(state)
  //   onStateChange?.(state)
  //   onInteractionEvent?.('hover', { state })
  //   
  //   // Show feedback
  //   setInteractionFeedback({
  //     id: `state-${Date.now()}`,
  //     message: `Dragon is now ${state}`,
  //     type: 'info'
  //   })
  // }, [onStateChange, onInteractionEvent])

  // const handleMoodChange = useCallback((mood: DragonMood) => {
  //   setCurrentMood(mood)
  //   onMoodChange?.(mood)
  //   onInteractionEvent?.('hover', { mood })
  // }, [onMoodChange, onInteractionEvent])

  // const handlePowerLevelChange = useCallback((level: number) => {
  //   setPowerLevel(level)
  //   onPowerLevelChange?.(level)
  //   onInteractionEvent?.('hover', { level })
  //   
  //   if (level > 9000) {
  //     setInteractionFeedback({
  //       id: `power-${Date.now()}`,
  //       message: "Power level: IT'S OVER 9000!",
  //       type: 'success'
  //     })
  //   }
  // }, [onPowerLevelChange, onInteractionEvent])

  // const handleDragonPartClick = useCallback((part: DragonPart, _event: MouseEvent) => {
  //   const responseTime = Date.now() - interactionStartTimeRef.current
  //   
  //   // Update interaction stats
  //   setInteractionStats(prev => ({
  //     ...prev,
  //     totalInteractions: prev.totalInteractions + 1,
  //     partInteractions: {
  //       ...prev.partInteractions,
  //       [part]: (prev.partInteractions[part] || 0) + 1
  //     },
  //     averageResponseTime: (prev.averageResponseTime + responseTime) / 2
  //   }))

  //   onInteractionEvent?.('click', { part, responseTime })
  //   
  //   // Show feedback for special interactions
  //   const feedbackMessages: Record<DragonPart, string> = {
  //     'head': 'Dragon acknowledges you',
  //     'left-eye': 'Left eye winks',
  //     'right-eye': 'Right eye winks',
  //     'body': 'Dragon powers up',
  //     'left-arm': 'Left arm flexes',
  //     'right-arm': 'Right arm flexes',
  //     'left-leg': 'Left leg kicks',
  //     'right-leg': 'Right leg kicks',
  //     'tail': 'Tail swishes powerfully',
  //     'wings': 'Wings flutter',
  //     'dragon-ball': 'Dragon ball collected!'
  //   }

  //   pipe(
  //     O.fromNullable(feedbackMessages[part]),
  //     O.map(message => {
  //       setInteractionFeedback({
  //         id: `click-${Date.now()}`,
  //         message,
  //         type: part === 'dragon-ball' ? 'success' : 'info'
  //       })
  //     })
  //   )
  // }, [onInteractionEvent])

  // const handleGestureDetected = useCallback((gesture: TouchGesture, part?: DragonPart) => {
  //   setInteractionStats(prev => ({
  //     ...prev,
  //     gestureStats: {
  //       ...prev.gestureStats,
  //       [gesture.type]: (prev.gestureStats[gesture.type] || 0) + 1
  //     }
  //   }))

  //   onInteractionEvent?.('gesture-swipe', { gesture, part })
  //   
  //   // Provide feedback for complex gestures
  //   if (gesture.type === 'pinch' && gesture.scale && gesture.scale > 1.5) {
  //     setInteractionFeedback({
  //       id: `gesture-${Date.now()}`,
  //       message: 'Dragon grows larger!',
  //       type: 'success'
  //     })
  //   } else if (gesture.type === 'rotate' && gesture.rotation && Math.abs(gesture.rotation) > 90) {
  //     setInteractionFeedback({
  //       id: `gesture-${Date.now()}`,
  //       message: 'Dragon spins with power!',
  //       type: 'success'
  //     })
  //   }
  // }, [onInteractionEvent])

  // Performance monitoring
  useEffect(() => {
    if (!enablePerformanceOptimization) return

    const checkPerformance = () => {
      const alerts: Array<{ id: string; metric: string; value: number }> = []

      if (metrics.fps < 30) {
        alerts.push({ 
          id: `fps-${Date.now()}`, 
          metric: 'FPS', 
          value: metrics.fps 
        })
      }

      if (metrics.averageFrameTime > 33) {
        alerts.push({ 
          id: `frametime-${Date.now()}`, 
          metric: 'Frame Time', 
          value: metrics.averageFrameTime 
        })
      }

      if (alerts.length > 0) {
        setPerformanceAlerts(prev => [...prev, ...alerts])
        alerts.forEach(alert => {
          onPerformanceAlert?.(alert.metric, alert.value)
        })
      }

      // Update performance metrics in stats
      setInteractionStats(prev => ({
        ...prev,
        performanceMetrics: {
          fps: metrics.fps,
          latency: metrics.averageFrameTime,
          memoryUsage: metrics.memoryUsage
        }
      }))
    }

    statsUpdateIntervalRef.current = setInterval(checkPerformance, 1000)
    return () => {
      if (statsUpdateIntervalRef.current) {
        clearInterval(statsUpdateIntervalRef.current)
      }
    }
  }, [enablePerformanceOptimization, metrics, onPerformanceAlert])

  // Debug info for debug panel
  const debugInfo: DebugInfo = {
    mousePosition: { x: 0, y: 0 }, // Would be provided by mouse tracking hook
    hoveredPart: null, // Would be provided by interaction hooks
    currentGesture: null, // Would be provided by touch gesture hook
    focusedElement: null, // Would be provided by keyboard navigation hook
    proximityZone: 'none', // Would be provided by proximity detection
    performanceMode,
    interactionStats
  }

  // Track interaction start times
  const handleInteractionStart = useCallback(() => {
    interactionStartTimeRef.current = Date.now()
  }, [])

  // Dismiss alerts and feedback
  const dismissPerformanceAlert = useCallback((id: string) => {
    setPerformanceAlerts(prev => prev.filter(alert => alert.id !== id))
  }, [])

  const dismissInteractionFeedback = useCallback(() => {
    setInteractionFeedback(null)
  }, [])

  // Keyboard shortcuts for debug mode
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.shiftKey && event.key === 'D') {
        setShowDebugPanel(prev => !prev)
      }
    }

    document.addEventListener('keydown', handleKeyPress)
    return () => document.removeEventListener('keydown', handleKeyPress)
  }, [])

  return (
    <div 
      className={`relative ${className}`}
      onMouseDown={handleInteractionStart}
      onTouchStart={handleInteractionStart}
    >
      {/* Main Dragon Component */}
      <SeironDragon
        size={size as 'sm' | 'md' | 'lg' | 'xl'}
        className="interactive-dragon"
        variant="hero"
      />

      {/* Accessibility Announcer */}
      {enableAccessibility && (
        <div 
          aria-live="polite" 
          aria-atomic="true" 
          className="sr-only"
          id="dragon-announcer"
        >
          Dragon state: {currentState}, mood: {currentMood}, power level: {powerLevel}
        </div>
      )}

      {/* Debug Panel */}
      <AnimatePresence>
        {showDebugPanel && (
          <DebugPanel
            debugInfo={debugInfo}
            onClose={() => setShowDebugPanel(false)}
          />
        )}
      </AnimatePresence>

      {/* Performance Alerts */}
      <AnimatePresence>
        {performanceAlerts.map(alert => (
          <PerformanceAlert
            key={alert.id}
            metric={alert.metric}
            value={alert.value}
            onDismiss={() => dismissPerformanceAlert(alert.id)}
          />
        ))}
      </AnimatePresence>

      {/* Interaction Feedback */}
      <AnimatePresence>
        {interactionFeedback && (
          <InteractionFeedback
            message={interactionFeedback.message}
            type={interactionFeedback.type}
            onComplete={dismissInteractionFeedback}
          />
        )}
      </AnimatePresence>

      {/* Power Level Indicator */}
      <motion.div
        className="absolute top-2 left-2 bg-black bg-opacity-50 text-white px-3 py-1 rounded-lg text-sm"
        animate={{
          scale: powerLevel > 9000 ? [1, 1.2, 1] : 1,
          color: powerLevel > 9000 ? '#FFD700' : '#FFFFFF'
        }}
        transition={{ duration: 0.5 }}
      >
        Power: {powerLevel.toLocaleString()}
      </motion.div>

      {/* Interaction Counter */}
      {enableDebugMode && (
        <div className="absolute top-2 right-2 bg-black bg-opacity-50 text-white px-3 py-1 rounded-lg text-sm">
          Interactions: {interactionStats.totalInteractions}
        </div>
      )}

      {/* Performance Mode Indicator */}
      {enablePerformanceOptimization && (
        <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 text-white px-2 py-1 rounded text-xs">
          {performanceMode.toUpperCase()}
        </div>
      )}
    </div>
  )
}

export const EnhancedDragonInteractionSystem: React.FC<EnhancedDragonInteractionSystemProps> = (props) => {
  return (
    <DragonErrorBoundary>
      <EnhancedDragonInteractionSystemContent {...props} />
    </DragonErrorBoundary>
  )
}

export default EnhancedDragonInteractionSystem
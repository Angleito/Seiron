'use client'

import React, { useState } from 'react'
import { 
  EnhancedDragonInteractionSystem,
  SVGDragonCharacter,
  useSVGInteraction,
  useEnhancedMouseTracking,
  useEnhancedTouchGestures,
  useKeyboardNavigation
} from '../index'
import type { 
  DragonState, 
  DragonMood, 
  DragonPart, 
  TouchGesture,
  InteractionType 
} from '../types'

// Example 1: Basic SVG Dragon with Enhanced Interactions
export const BasicSVGDragonExample: React.FC = () => {
  const [interactions, setInteractions] = useState<string[]>([])

  const handleDragonPartClick = (part: DragonPart, event: MouseEvent) => {
    setInteractions(prev => [...prev.slice(-4), `Clicked ${part} at ${new Date().toLocaleTimeString()}`])
  }

  const handleGestureDetected = (gesture: TouchGesture, part?: DragonPart) => {
    setInteractions(prev => [...prev.slice(-4), `${gesture.type} gesture on ${part || 'dragon'}`])
  }

  return (
    <div className="p-8 bg-gradient-to-br from-purple-900 to-blue-900 min-h-screen">
      <h2 className="text-white text-2xl mb-4">Basic SVG Dragon with Enhanced Interactions</h2>
      
      <div className="flex gap-8">
        {/* Dragon Component */}
        <div className="flex-1">
          <SVGDragonCharacter
            size="lg"
            interactive={true}
            showDragonBalls={true}
            enableAdvancedInteractions={true}
            enableKeyboardNavigation={true}
            enableScreenReader={true}
            enableHapticFeedback={true}
            onDragonPartClick={handleDragonPartClick}
            onGestureDetected={handleGestureDetected}
          />
        </div>

        {/* Interaction Log */}
        <div className="w-64 bg-black bg-opacity-50 p-4 rounded-lg">
          <h3 className="text-white text-lg mb-2">Recent Interactions</h3>
          <div className="space-y-1">
            {interactions.map((interaction, index) => (
              <div key={index} className="text-green-400 text-sm">
                {interaction}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-4 text-gray-300 text-sm">
        <p>Try the following interactions:</p>
        <ul className="list-disc list-inside mt-2 space-y-1">
          <li>Click on different dragon parts (head, eyes, body, arms, tail)</li>
          <li>Touch and drag for gestures (mobile/tablet)</li>
          <li>Use Tab to navigate with keyboard</li>
          <li>Press Enter to activate focused parts</li>
          <li>Try pinch/zoom gestures on touch devices</li>
        </ul>
      </div>
    </div>
  )
}

// Example 2: Full Enhanced Dragon Interaction System
export const FullInteractionSystemExample: React.FC = () => {
  const [dragonState, setDragonState] = useState<DragonState>('idle')
  const [dragonMood, setDragonMood] = useState<DragonMood>('neutral')
  const [powerLevel, setPowerLevel] = useState(1000)
  const [events, setEvents] = useState<Array<{ type: string; data: any; timestamp: string }>>([])

  const handleInteractionEvent = (type: InteractionType, data?: any) => {
    setEvents(prev => [...prev.slice(-9), {
      type,
      data,
      timestamp: new Date().toLocaleTimeString()
    }])
  }

  const handlePerformanceAlert = (metric: string, value: number) => {
    console.warn(`Performance Alert: ${metric} = ${value}`)
  }

  return (
    <div className="p-8 bg-gradient-to-br from-indigo-900 to-purple-900 min-h-screen">
      <h2 className="text-white text-3xl mb-6">Enhanced Dragon Interaction System</h2>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Dragon Component */}
        <div className="lg:col-span-2">
          <EnhancedDragonInteractionSystem
            size="xl"
            interactive={true}
            showDragonBalls={true}
            enableAdvancedInteractions={true}
            enablePerformanceOptimization={true}
            enableAccessibility={true}
            enableHapticFeedback={true}
            enableDebugMode={false}
            onStateChange={setDragonState}
            onMoodChange={setDragonMood}
            onPowerLevelChange={setPowerLevel}
            onInteractionEvent={handleInteractionEvent}
            onPerformanceAlert={handlePerformanceAlert}
          />
        </div>

        {/* Status Panel */}
        <div className="space-y-4">
          {/* Dragon Status */}
          <div className="bg-black bg-opacity-50 p-4 rounded-lg">
            <h3 className="text-white text-lg mb-3">Dragon Status</h3>
            <div className="space-y-2">
              <div className="text-blue-400">
                State: <span className="text-white">{dragonState}</span>
              </div>
              <div className="text-green-400">
                Mood: <span className="text-white">{dragonMood}</span>
              </div>
              <div className="text-yellow-400">
                Power: <span className="text-white">{powerLevel.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Event Log */}
          <div className="bg-black bg-opacity-50 p-4 rounded-lg">
            <h3 className="text-white text-lg mb-3">Event Log</h3>
            <div className="space-y-1 max-h-64 overflow-y-auto">
              {events.map((event, index) => (
                <div key={index} className="text-xs">
                  <span className="text-gray-400">{event.timestamp}</span>
                  <br />
                  <span className="text-cyan-400">{event.type}</span>
                  {event.data && (
                    <span className="text-gray-300 ml-2">
                      {JSON.stringify(event.data, null, 0)}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Instructions */}
      <div className="mt-8 bg-black bg-opacity-30 p-6 rounded-lg">
        <h3 className="text-white text-xl mb-4">Advanced Interaction Features</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
          <div>
            <h4 className="text-yellow-400 font-semibold mb-2">Mouse Interactions</h4>
            <ul className="text-gray-300 space-y-1">
              <li>• Eye tracking follows cursor</li>
              <li>• Head rotation with movement</li>
              <li>• Proximity-based state changes</li>
              <li>• Part-specific hover effects</li>
            </ul>
          </div>
          
          <div>
            <h4 className="text-green-400 font-semibold mb-2">Touch Gestures</h4>
            <ul className="text-gray-300 space-y-1">
              <li>• Tap individual parts</li>
              <li>• Swipe up/down for power</li>
              <li>• Pinch to power up</li>
              <li>• Long press for special actions</li>
            </ul>
          </div>
          
          <div>
            <h4 className="text-blue-400 font-semibold mb-2">Keyboard Navigation</h4>
            <ul className="text-gray-300 space-y-1">
              <li>• Tab through dragon parts</li>
              <li>• Arrow keys for spatial nav</li>
              <li>• Enter to activate</li>
              <li>• Screen reader support</li>
            </ul>
          </div>
        </div>
        
        <div className="mt-4 text-center">
          <p className="text-gray-400">
            Press <kbd className="bg-gray-700 px-2 py-1 rounded">Ctrl + Shift + D</kbd> to toggle debug mode
          </p>
        </div>
      </div>
    </div>
  )
}

// Example 3: Custom Hook Usage
export const CustomHookExample: React.FC = () => {
  const dragonRef = React.useRef<SVGSVGElement>(null)
  
  // Use individual hooks for custom behavior
  const svgInteraction = useSVGInteraction({
    elementRef: dragonRef,
    enabled: true,
    onPartHover: (part) => console.log('Hovered:', part),
    onPartClick: (part) => console.log('Clicked:', part)
  })

  const mouseTracking = useEnhancedMouseTracking({
    elementRef: dragonRef,
    enabled: true,
    eyeTrackingEnabled: true,
    headRotationEnabled: true,
    cursorEffectsEnabled: true
  })

  const touchGestures = useEnhancedTouchGestures({
    enabled: true,
    enableHapticFeedback: true,
    onGestureRecognized: (gesture, context) => {
      console.log('Gesture:', gesture.type, 'Context:', context)
    }
  })

  const keyboardNav = useKeyboardNavigation({
    enabled: true,
    enableScreenReader: true,
    onPartFocus: (part) => console.log('Focused:', part),
    onPartActivate: (part, method) => console.log('Activated:', part, 'via', method)
  })

  return (
    <div className="p-8 bg-gradient-to-br from-gray-900 to-black min-h-screen">
      <h2 className="text-white text-2xl mb-4">Custom Hook Usage Example</h2>
      
      <div className="bg-gray-800 p-6 rounded-lg">
        <p className="text-gray-300 mb-4">
          This example shows how to use the individual enhanced hooks for custom dragon implementations.
          Check the browser console to see the interaction events.
        </p>
        
        <div className="flex justify-center">
          <svg
            ref={dragonRef}
            width="400"
            height="400"
            viewBox="0 0 400 400"
            className="border border-gray-600 rounded-lg"
            {...touchGestures.gestureHandlers}
            {...keyboardNav.getAccessibilityProps('body')}
          >
            {/* Simple dragon shape for demonstration */}
            <circle
              cx="200"
              cy="150"
              r="60"
              fill="url(#dragonGradient)"
              data-dragon-part="head"
              className="cursor-pointer"
              style={{
                transform: `translate(${mouseTracking.svgState.headRotation.x}px, ${mouseTracking.svgState.headRotation.y}px)`
              }}
            />
            
            <circle
              cx="180"
              cy="130"
              r="12"
              fill="blue"
              data-dragon-part="left-eye"
              className="cursor-pointer"
              style={{
                transform: `translate(${mouseTracking.eyeTracking.leftEye.rotation.x}px, ${mouseTracking.eyeTracking.leftEye.rotation.y}px)`
              }}
            />
            
            <circle
              cx="220"
              cy="130"
              r="12"
              fill="red"
              data-dragon-part="right-eye"
              className="cursor-pointer"
              style={{
                transform: `translate(${mouseTracking.eyeTracking.rightEye.rotation.x}px, ${mouseTracking.eyeTracking.rightEye.rotation.y}px)`
              }}
            />
            
            <ellipse
              cx="200"
              cy="250"
              rx="80"
              ry="100"
              fill="url(#bodyGradient)"
              data-dragon-part="body"
              className="cursor-pointer"
            />
            
            <defs>
              <radialGradient id="dragonGradient">
                <stop offset="0%" stopColor="#ff6b6b" />
                <stop offset="100%" stopColor="#ff4757" />
              </radialGradient>
              <radialGradient id="bodyGradient">
                <stop offset="0%" stopColor="#ffa726" />
                <stop offset="100%" stopColor="#ff7043" />
              </radialGradient>
            </defs>
          </svg>
        </div>
        
        <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
          <div>
            <h4 className="text-blue-400 font-semibold">Mouse Position</h4>
            <p className="text-gray-300">
              X: {mouseTracking.mousePosition.x.toFixed(0)}, 
              Y: {mouseTracking.mousePosition.y.toFixed(0)}
            </p>
          </div>
          
          <div>
            <h4 className="text-green-400 font-semibold">Hovered Part</h4>
            <p className="text-gray-300">
              {svgInteraction.svgState.hoveredPart || 'None'}
            </p>
          </div>
          
          <div>
            <h4 className="text-yellow-400 font-semibold">Focused Part</h4>
            <p className="text-gray-300">
              {keyboardNav.navigationState.currentFocus || 'None'}
            </p>
          </div>
          
          <div>
            <h4 className="text-purple-400 font-semibold">Active Gestures</h4>
            <p className="text-gray-300">
              {touchGestures.isGestureActive ? 'In Progress' : 'None'}
            </p>
          </div>
        </div>
      </div>

      {/* Accessibility Announcer */}
      <keyboardNav.AriaLiveRegion />
    </div>
  )
}

// Main example showcase
export const SVGDragonInteractionShowcase: React.FC = () => {
  const [currentExample, setCurrentExample] = useState<'basic' | 'full' | 'hooks'>('basic')

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Navigation */}
      <nav className="bg-black bg-opacity-50 p-4">
        <div className="max-w-6xl mx-auto flex space-x-4">
          <button
            onClick={() => setCurrentExample('basic')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              currentExample === 'basic' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            Basic SVG Dragon
          </button>
          <button
            onClick={() => setCurrentExample('full')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              currentExample === 'full' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            Full Interaction System
          </button>
          <button
            onClick={() => setCurrentExample('hooks')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              currentExample === 'hooks' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            Custom Hooks
          </button>
        </div>
      </nav>

      {/* Content */}
      <div>
        {currentExample === 'basic' && <BasicSVGDragonExample />}
        {currentExample === 'full' && <FullInteractionSystemExample />}
        {currentExample === 'hooks' && <CustomHookExample />}
      </div>
    </div>
  )
}

export default SVGDragonInteractionShowcase
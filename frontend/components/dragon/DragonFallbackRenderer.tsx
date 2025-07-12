'use client'

import React, { useRef, useEffect, useState, useMemo } from 'react'
import * as THREE from 'three'
import { Canvas, useFrame } from '@react-three/fiber'
import { webglFallbackManager, WebGLFallbackManager, FallbackContext } from '../../utils/webglFallback'
import { webglDiagnostics } from '../../utils/webglDiagnostics'
import { WebGLErrorBoundary } from '../error-boundaries/WebGLErrorBoundary'

export interface DragonFallbackRendererProps {
  className?: string
  width?: number
  height?: number
  enableEyeTracking?: boolean
  lightningActive?: boolean
  voiceState?: {
    isListening: boolean
    isSpeaking: boolean
    isProcessing: boolean
    isIdle: boolean
    volume: number
    emotion?: 'excited' | 'angry' | 'calm' | 'focused'
  }
  onLoad?: () => void
  onError?: (error: Error) => void
  onFallback?: (mode: string) => void
  enableAutoFallback?: boolean
  preferredMode?: 'webgl2' | 'webgl' | 'software' | 'canvas2d' | 'mock' | 'none' | 'auto'
}

interface DragonState {
  pose: 'idle' | 'listening' | 'speaking' | 'processing' | 'coiled' | 'flying' | 'attacking'
  energy: number
  color: string
  aura: string
  animation: {
    breathing: number
    pulse: number
    particles: number
  }
}

/**
 * ASCII Dragon Component for Text-based Fallback
 */
function ASCIIDragon({ 
  dragonState,
  width = 80,
  height = 20 
}: { 
  dragonState: DragonState
  width?: number
  height?: number 
}) {
  const dragonAscii = useMemo(() => {
    const { pose, energy } = dragonState
    
    // Different ASCII art based on pose and energy level
    const baseIntensity = Math.floor(energy * 4) // 0-4 intensity levels
    const chars = ['·', '~', '≋', '◉', '█']
    const energyChar = chars[Math.min(baseIntensity, chars.length - 1)]
    
    switch (pose) {
      case 'listening':
        return `
    ${energyChar}${energyChar}${energyChar} LISTENING ${energyChar}${energyChar}${energyChar}
       ${energyChar}              ${energyChar}
    ${energyChar}    ▄▄▄▄▄▄▄▄▄    ${energyChar}
   ${energyChar}   ▄█████████████▄   ${energyChar}
  ${energyChar}  ▄███▀▀▀███▀▀▀███▄  ${energyChar}
 ${energyChar} ▄████   ●   ●   ████▄ ${energyChar}
${energyChar}▄█████▄▄▄▄▄▄▄▄▄▄▄▄█████▄${energyChar}
${energyChar}██████████████████████████${energyChar}
${energyChar}▀██████████████████████████▀${energyChar}
 ${energyChar} ▀████████████████████▀ ${energyChar}
  ${energyChar}  ▀██████████████▀  ${energyChar}
   ${energyChar}   ▀████████▀   ${energyChar}
    ${energyChar}    ▀▀▀▀▀▀▀▀    ${energyChar}
       ${energyChar}              ${energyChar}
    ${energyChar}${energyChar}${energyChar}           ${energyChar}${energyChar}${energyChar}
        `.trim()
      
      case 'speaking':
        return `
    ${energyChar}${energyChar}${energyChar} SPEAKING ${energyChar}${energyChar}${energyChar}
    ${energyChar}≋≋≋≋≋≋≋≋≋≋≋≋≋≋≋${energyChar}
   ${energyChar}≋   ▄▄▄▄▄▄▄▄▄   ≋${energyChar}
  ${energyChar}≋  ▄█████████████▄  ≋${energyChar}
 ${energyChar}≋ ▄███▀▀▀███▀▀▀███▄ ≋${energyChar}
${energyChar}≋▄████   ◉   ◉   ████▄≋${energyChar}
${energyChar}≋█████▄▄▄▄███▄▄▄▄█████≋${energyChar}
${energyChar}≋████████▀▀▀▀▀████████≋${energyChar}
${energyChar}≋███████▀ ~~~ ▀███████≋${energyChar}
${energyChar}≋██████▀  ~~~  ▀██████≋${energyChar}
 ${energyChar}≋████▀   ~~~   ▀████≋${energyChar}
  ${energyChar}≋██▀    ~~~    ▀██≋${energyChar}
   ${energyChar}≋▀      ~~~      ▀≋${energyChar}
    ${energyChar}≋      ~~~      ≋${energyChar}
    ${energyChar}${energyChar}${energyChar}     ~~~     ${energyChar}${energyChar}${energyChar}
        `.trim()
      
      case 'processing':
        return `
    ${energyChar}${energyChar}${energyChar} THINKING ${energyChar}${energyChar}${energyChar}
      ${energyChar}○○○○○○○○○○○○${energyChar}
     ${energyChar}○   ▄▄▄▄▄▄▄▄▄   ○${energyChar}
    ${energyChar}○  ▄█████████████▄  ○${energyChar}
   ${energyChar}○ ▄███▀▀▀███▀▀▀███▄ ○${energyChar}
  ${energyChar}○▄████   ◈   ◈   ████▄○${energyChar}
 ${energyChar}○█████▄▄▄▄▄▄▄▄▄▄▄█████○${energyChar}
${energyChar}○██████████████████████○${energyChar}
 ${energyChar}○▀██████████████████▀○${energyChar}
  ${energyChar}○  ▀██████████████▀  ○${energyChar}
   ${energyChar}○   ▀████████▀   ○${energyChar}
    ${energyChar}○    ▀▀▀▀▀▀▀▀    ○${energyChar}
     ${energyChar}○              ○${energyChar}
      ${energyChar}○○○○○○○○○○○○${energyChar}
        `.trim()
      
      case 'coiled':
      default:
        return `
    ${energyChar}${energyChar}${energyChar} SEIRON DRAGON ${energyChar}${energyChar}${energyChar}
        ${energyChar}          ${energyChar}
       ${energyChar}▄▄▄▄▄▄▄▄▄▄${energyChar}
      ${energyChar}████████████${energyChar}
     ${energyChar}██▀▀▀██▀▀▀██${energyChar}
    ${energyChar}███  ●   ●  ███${energyChar}
   ${energyChar}████▄▄▄▄▄▄▄▄████${energyChar}
  ${energyChar}██████████████████${energyChar}
 ${energyChar}████████████████████${energyChar}
${energyChar}██████████████████████${energyChar}
 ${energyChar}████████████████████${energyChar}
  ${energyChar}██████████████████${energyChar}
   ${energyChar}████████████████${energyChar}
    ${energyChar}██████████████${energyChar}
     ${energyChar}████████████${energyChar}
      ${energyChar}██████████${energyChar}
        ${energyChar}          ${energyChar}
        `.trim()
    }
  }, [dragonState])

  return (
    <div className="font-mono text-xs leading-tight select-none">
      <pre 
        style={{ 
          color: dragonState.color,
          textShadow: `0 0 10px ${dragonState.aura}`,
          filter: `brightness(${0.5 + dragonState.energy * 0.5})`
        }}
      >
        {dragonAscii}
      </pre>
    </div>
  )
}

/**
 * Canvas2D Dragon Component
 */
function Canvas2DDragon({ 
  dragonState,
  width = 400,
  height = 300,
  className = "" 
}: { 
  dragonState: DragonState
  width?: number
  height?: number
  className?: string
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationRef = useRef<number>()

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const animate = () => {
      // Clear canvas
      ctx.clearRect(0, 0, width, height)
      
      const centerX = width / 2
      const centerY = height / 2
      const time = Date.now() * 0.001
      
      // Breathing animation
      const breathScale = 1 + Math.sin(time * 2) * 0.05 * dragonState.animation.breathing
      
      // Pulse animation
      const pulseScale = 1 + Math.sin(time * 4) * 0.03 * dragonState.animation.pulse
      
      // Apply transformations
      ctx.save()
      ctx.translate(centerX, centerY)
      ctx.scale(breathScale * pulseScale, breathScale * pulseScale)
      
      // Draw aura if energy > 0.5
      if (dragonState.energy > 0.5) {
        const auraRadius = 120 + Math.sin(time * 3) * 20
        const gradient = ctx.createRadialGradient(0, 0, 60, 0, 0, auraRadius)
        gradient.addColorStop(0, `${dragonState.aura}40`)
        gradient.addColorStop(0.5, `${dragonState.aura}20`)
        gradient.addColorStop(1, `${dragonState.aura}00`)
        
        ctx.fillStyle = gradient
        ctx.beginPath()
        ctx.arc(0, 0, auraRadius, 0, Math.PI * 2)
        ctx.fill()
      }
      
      // Draw dragon body
      ctx.fillStyle = dragonState.color
      ctx.strokeStyle = dragonState.aura
      ctx.lineWidth = 2
      
      // Main body (oval)
      ctx.beginPath()
      ctx.ellipse(0, 0, 60, 40, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.stroke()
      
      // Head
      ctx.beginPath()
      ctx.arc(-70, -20, 30, 0, Math.PI * 2)
      ctx.fill()
      ctx.stroke()
      
      // Eyes
      ctx.fillStyle = '#ffffff'
      ctx.beginPath()
      ctx.arc(-80, -25, 5, 0, Math.PI * 2)
      ctx.fill()
      ctx.beginPath()
      ctx.arc(-60, -25, 5, 0, Math.PI * 2)
      ctx.fill()
      
      // Eye pupils (follow mouse/animation)
      ctx.fillStyle = '#000000'
      const eyeOffset = Math.sin(time) * 2
      ctx.beginPath()
      ctx.arc(-80 + eyeOffset, -25, 2, 0, Math.PI * 2)
      ctx.fill()
      ctx.beginPath()
      ctx.arc(-60 + eyeOffset, -25, 2, 0, Math.PI * 2)
      ctx.fill()
      
      // Wings
      ctx.fillStyle = dragonState.color
      ctx.globalAlpha = 0.7
      
      // Left wing
      ctx.beginPath()
      ctx.moveTo(20, -20)
      ctx.lineTo(80, -40 + Math.sin(time * 2) * 10)
      ctx.lineTo(60, 10)
      ctx.closePath()
      ctx.fill()
      
      // Right wing
      ctx.beginPath()
      ctx.moveTo(20, 20)
      ctx.lineTo(80, 40 + Math.sin(time * 2) * 10)
      ctx.lineTo(60, -10)
      ctx.closePath()
      ctx.fill()
      
      ctx.globalAlpha = 1
      
      // Tail
      ctx.beginPath()
      ctx.moveTo(60, 0)
      ctx.lineTo(120, -10 + Math.sin(time * 1.5) * 5)
      ctx.lineTo(100, 10)
      ctx.closePath()
      ctx.fill()
      
      // Particles for high energy states
      if (dragonState.animation.particles > 0) {
        ctx.fillStyle = dragonState.aura
        for (let i = 0; i < dragonState.animation.particles * 10; i++) {
          const angle = (i / (dragonState.animation.particles * 10)) * Math.PI * 2
          const distance = 80 + Math.sin(time * 2 + i) * 20
          const x = Math.cos(angle) * distance
          const y = Math.sin(angle) * distance
          const size = 1 + Math.sin(time * 3 + i) * 1
          
          ctx.beginPath()
          ctx.arc(x, y, size, 0, Math.PI * 2)
          ctx.fill()
        }
      }
      
      ctx.restore()
      
      animationRef.current = requestAnimationFrame(animate)
    }
    
    animate()
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [dragonState, width, height])

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className={className}
      style={{ 
        filter: `brightness(${0.7 + dragonState.energy * 0.3})`,
        background: 'transparent'
      }}
    />
  )
}

/**
 * Main Dragon Fallback Renderer Component
 */
export function DragonFallbackRenderer({
  className = "",
  width = 400,
  height = 300,
  enableEyeTracking = true,
  lightningActive = false,
  voiceState,
  onLoad,
  onError,
  onFallback,
  enableAutoFallback = true,
  preferredMode = 'auto'
}: DragonFallbackRendererProps) {
  const [fallbackContext, setFallbackContext] = useState<FallbackContext | null>(null)
  const [dragonState, setDragonState] = useState<DragonState>({
    pose: 'idle',
    energy: 0.5,
    color: '#ff6600',
    aura: '#ffaa00',
    animation: {
      breathing: 1,
      pulse: 0,
      particles: 0
    }
  })
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)
  const fallbackManagerRef = useRef<WebGLFallbackManager | null>(null)

  // Update dragon state based on voice state
  useEffect(() => {
    if (!voiceState) return

    setDragonState(prev => {
      const newState = { ...prev }

      // Update pose
      if (voiceState.isListening) {
        newState.pose = 'listening'
        newState.color = '#0066ff'
        newState.aura = '#00aaff'
        newState.animation.pulse = 0.7
        newState.animation.particles = 0.3
      } else if (voiceState.isSpeaking) {
        newState.pose = 'speaking'
        newState.color = '#ff6600'
        newState.aura = '#ffaa00'
        newState.animation.pulse = 1
        newState.animation.particles = 0.8
      } else if (voiceState.isProcessing) {
        newState.pose = 'processing'
        newState.color = '#9966ff'
        newState.aura = '#bb88ff'
        newState.animation.pulse = 0.5
        newState.animation.particles = 0.6
      } else {
        newState.pose = 'idle'
        newState.color = '#ff6600'
        newState.aura = '#ffaa00'
        newState.animation.pulse = 0.2
        newState.animation.particles = 0.1
      }

      // Update energy based on volume
      newState.energy = Math.max(0.3, voiceState.volume)
      
      // Update breathing based on activity
      newState.animation.breathing = voiceState.isIdle ? 0.5 : 1

      return newState
    })
  }, [voiceState])

  // Update dragon state based on lightning
  useEffect(() => {
    if (lightningActive) {
      setDragonState(prev => ({
        ...prev,
        energy: 1,
        animation: {
          ...prev.animation,
          pulse: 1,
          particles: 1
        }
      }))
    }
  }, [lightningActive])

  // Initialize fallback system
  useEffect(() => {
    const initializeFallback = async () => {
      try {
        setIsLoading(true)
        
        // Create fallback manager
        const manager = new WebGLFallbackManager({
          enableSoftwareRendering: true,
          enableCanvas2DFallback: true,
          enableHeadlessMode: true,
          enableMockCanvas: true,
          fallbackWidth: width,
          fallbackHeight: height,
          logLevel: 'info'
        })
        
        fallbackManagerRef.current = manager
        
        // Detect capabilities
        const capabilities = manager.detectCapabilities()
        webglDiagnostics.recordError(`Fallback capabilities detected: ${JSON.stringify(capabilities)}`)
        
        // Create appropriate context
        let mode = preferredMode
        if (mode === 'auto') {
          mode = capabilities.recommendedMode
        }
        
        const context = manager.createContext(mode)
        setFallbackContext(context)
        
        // Test Three.js if using WebGL modes
        if (context.type === 'webgl' || context.type === 'webgl2') {
          const threeJSWorking = manager.testThreeJS()
          if (!threeJSWorking && enableAutoFallback) {
            console.warn('Three.js test failed, falling back to Canvas2D')
            const fallbackContext = manager.createContext('canvas2d')
            setFallbackContext(fallbackContext)
            if (onFallback) {
              onFallback('canvas2d')
            }
          }
        }
        
        setIsLoading(false)
        if (onLoad) {
          onLoad()
        }
        
        console.log(`Dragon renderer initialized with ${context.type} mode`)
        
      } catch (error) {
        console.error('Failed to initialize dragon fallback renderer:', error)
        setHasError(true)
        setIsLoading(false)
        if (onError) {
          onError(error as Error)
        }
      }
    }

    initializeFallback()

    return () => {
      if (fallbackManagerRef.current) {
        fallbackManagerRef.current.dispose()
      }
    }
  }, [width, height, preferredMode, enableAutoFallback, onLoad, onError, onFallback])

  // Render based on fallback context type
  const renderDragon = () => {
    if (!fallbackContext) {
      return (
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="animate-spin text-4xl mb-2">🐉</div>
            <p className="text-gray-400">Initializing Dragon...</p>
          </div>
        </div>
      )
    }

    switch (fallbackContext.type) {
      case 'webgl':
      case 'webgl2':
        // Use React Three Fiber for WebGL modes
        return (
          <Canvas
            style={{ width, height }}
            gl={{ 
              context: fallbackContext.context as WebGLRenderingContext,
              antialias: false,
              alpha: true
            }}
            camera={{ position: [0, 0, 5], fov: 75 }}
          >
            <ambientLight intensity={0.5} />
            <pointLight position={[10, 10, 10]} />
            <mesh>
              <boxGeometry args={[1, 1, 1]} />
              <meshStandardMaterial color={dragonState.color} />
            </mesh>
          </Canvas>
        )
      
      case 'software':
      case 'canvas2d':
        return (
          <Canvas2DDragon
            dragonState={dragonState}
            width={width}
            height={height}
            className={className}
          />
        )
      
      case 'mock':
      default:
        return (
          <div className="flex items-center justify-center h-full bg-black">
            <ASCIIDragon 
              dragonState={dragonState}
              width={Math.floor(width / 8)}
              height={Math.floor(height / 16)}
            />
          </div>
        )
    }
  }

  if (isLoading) {
    return (
      <div className={`flex items-center justify-center ${className}`} style={{ width, height }}>
        <div className="text-center">
          <div className="animate-spin text-4xl mb-2">🐉</div>
          <p className="text-gray-400">Loading Dragon System...</p>
        </div>
      </div>
    )
  }

  if (hasError) {
    return (
      <div className={`flex items-center justify-center ${className}`} style={{ width, height }}>
        <div className="text-center">
          <div className="text-4xl mb-2">⚠️</div>
          <p className="text-red-400">Dragon System Error</p>
          <p className="text-gray-500 text-sm">Falling back to basic mode</p>
          <ASCIIDragon dragonState={dragonState} />
        </div>
      </div>
    )
  }

  return (
    <div className={className} style={{ width, height }}>
      {renderDragon()}
      
      {/* Debug info in development */}
      {process.env.NODE_ENV === 'development' && fallbackContext && (
        <div className="absolute bottom-2 left-2 text-xs text-gray-500 bg-black bg-opacity-50 p-1 rounded">
          Mode: {fallbackContext.type} | 
          Headless: {fallbackContext.isHeadless ? 'Yes' : 'No'} |
          Docker: {fallbackContext.isDocker ? 'Yes' : 'No'}
        </div>
      )}
    </div>
  )
}

/**
 * Dragon Fallback Renderer with Error Boundary
 */
export function DragonFallbackRendererWithErrorBoundary(props: DragonFallbackRendererProps) {
  return (
    <WebGLErrorBoundary
      enableAutoRecovery={true}
      enableContextLossRecovery={true}
      maxRetries={2}
      onError={(error) => {
        console.error('Dragon Fallback Renderer Error:', error)
        webglDiagnostics.recordError(`Dragon Fallback Renderer Error: ${error.message}`)
      }}
      onFallbackRequested={() => {
        console.log('WebGL Error Boundary requested fallback')
        if (props.onFallback) {
          props.onFallback('error-boundary-fallback')
        }
      }}
    >
      <DragonFallbackRenderer {...props} />
    </WebGLErrorBoundary>
  )
}

export default DragonFallbackRendererWithErrorBoundary
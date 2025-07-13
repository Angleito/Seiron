'use client'

import React, { useRef, useEffect, useState, useMemo, Suspense } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useMouseTracking } from '@/hooks/useMouseTracking'
import { useWebGLRecovery } from '../../utils/webglRecovery'
import { useDragonModel } from '@/hooks/useDragonModel'
import { SeironDragonHeadGLB } from './SeironDragonHeadGLB'
import { DragonParticles } from './DragonParticles'

interface DragonHead3DProps {
  className?: string
  intensity?: number
  enableEyeTracking?: boolean
  lightningActive?: boolean
  onLoad?: () => void
  onError?: (error: Error) => void
  onFallback?: () => void
}

// Dragon mesh component - using GLB model
function DragonHeadMesh({ 
  enableEyeTracking = true, 
  lightningActive = false,
  intensity = 1
}: { 
  enableEyeTracking: boolean
  lightningActive: boolean
  intensity?: number
}) {
  // Use the GLB model
  return (
    <SeironDragonHeadGLB
      enableEyeTracking={enableEyeTracking}
      lightningActive={lightningActive}
      intensity={intensity}
    />
  )
}

// Lighting setup for the dragon
function DragonLighting({ lightningActive = false }: { lightningActive: boolean }) {
  const ambientRef = useRef<THREE.AmbientLight>(null)
  const directionalRef = useRef<THREE.DirectionalLight>(null)
  const rimLightRef = useRef<THREE.DirectionalLight>(null)

  useFrame((state) => {
    // Enhance lighting during lightning strikes
    if (ambientRef.current) {
      ambientRef.current.intensity = lightningActive ? 0.8 : 0.3
    }
    
    if (directionalRef.current) {
      directionalRef.current.intensity = lightningActive ? 2.5 : 1.2
    }

    if (rimLightRef.current) {
      rimLightRef.current.intensity = lightningActive ? 1.5 : 0.6
    }
  })

  return (
    <>
      {/* Ambient light for overall illumination */}
      <ambientLight ref={ambientRef} color="#5a4545" intensity={0.3} />
      
      {/* Main directional light */}
      <directionalLight
        ref={directionalRef}
        position={[10, 10, 5]}
        intensity={1.2}
        color="#fbbf24"
        castShadow
      />
      
      {/* Rim lighting from behind */}
      <directionalLight
        ref={rimLightRef}
        position={[-5, 5, -10]}
        intensity={0.6}
        color="#f59e0b"
      />
      
      {/* Side lighting for depth */}
      <pointLight
        position={[8, 2, 8]}
        intensity={0.5}
        color="#e6a700"
        distance={20}
      />
    </>
  )
}

// Error boundary component for the 3D scene
function DragonScene({ 
  enableEyeTracking, 
  lightningActive,
  isLoaded = true,
  intensity = 1
}: { 
  enableEyeTracking: boolean
  lightningActive: boolean
  isLoaded?: boolean
  intensity?: number
}) {
  // Always render components to maintain hook consistency
  // Use isLoaded to control visibility/behavior instead
  return (
    <>
      <DragonLighting lightningActive={lightningActive && isLoaded} />
      <DragonHeadMesh 
        enableEyeTracking={enableEyeTracking && isLoaded}
        lightningActive={lightningActive && isLoaded}
        intensity={isLoaded ? intensity : 0}
      />
      {/* Particle effects around the dragon */}
      <DragonParticles 
        count={300}
        lightningActive={lightningActive && isLoaded}
        intensity={isLoaded ? intensity : 0}
      />
      {/* Fog for atmosphere */}
      <fog attach="fog" args={['#1a202c', 5, 25]} />
    </>
  )
}

// Main component
export function DragonHead3D({ 
  className = "",
  intensity = 0.8,
  enableEyeTracking = true,
  lightningActive = false,
  onLoad,
  onError,
  onFallback
}: DragonHead3DProps) {
  const [isLoaded, setIsLoaded] = useState(false)
  const [hasError, setHasError] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)

  // WebGL recovery hook
  const {
    initializeRecovery,
    diagnostics,
    shouldFallback,
    resetDiagnostics
  } = useWebGLRecovery({
    maxRecoveryAttempts: 3,
    recoveryDelayMs: 1000,
    fallbackEnabled: true,
    onContextLost: () => {
      console.warn('🔴 WebGL context lost in DragonHead3D')
    },
    onContextRestored: () => {
      console.log('🟢 WebGL context restored in DragonHead3D')
      // Reset any error states
      setHasError(false)
    },
    onRecoveryFailed: () => {
      console.error('❌ WebGL recovery failed in DragonHead3D')
      setHasError(true)
    },
    onFallback: () => {
      console.log('⚠️ WebGL fallback triggered in DragonHead3D')
      if (onFallback) {
        onFallback()
      }
    }
  })

  // Error handling
  const handleError = (error: Error) => {
    console.error('Dragon head loading error:', error)
    
    // Check if error is WebGL-related
    const isWebGLError = error.message.includes('WebGL') || 
                        error.message.includes('context') ||
                        error.message.includes('CONTEXT_LOST')
    
    if (isWebGLError) {
      console.warn('🔴 WebGL-related error detected in DragonHead3D, WebGL recovery will handle this')
      // Let WebGL recovery handle this error
      return
    }
    
    setHasError(true)
    
    // Propagate error to parent
    if (onError) {
      onError(error)
    }
  }

  // Loading state management
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoaded(true)
      if (onLoad) {
        onLoad()
      }
    }, 100)
    return () => clearTimeout(timer)
  }, [])

  // Initialize WebGL recovery when Canvas is ready
  useEffect(() => {
    if (canvasRef.current && rendererRef.current) {
      initializeRecovery(canvasRef.current, rendererRef.current)
    }
  }, [canvasRef.current, rendererRef.current, initializeRecovery])

  if (hasError || shouldFallback) {
    return null // Fail silently to not break the page
  }

  return (
    <div className={`absolute inset-0 ${className}`}>
      <Canvas
        ref={canvasRef}
        camera={{ 
          position: [0, 1, 8], 
          fov: 45,
          near: 0.1,
          far: 100
        }}
        style={{ 
          background: 'transparent',
          pointerEvents: 'none' // Allow mouse events to pass through
        }}
        gl={{ 
          antialias: true, 
          alpha: true,
          powerPreference: 'high-performance',
          preserveDrawingBuffer: true, // Helps with context recovery
          failIfMajorPerformanceCaveat: false
        }}
        onCreated={(state) => {
          // Canvas successfully created
          rendererRef.current = state.gl
          
          // Initialize WebGL recovery with the canvas and renderer
          if (canvasRef.current) {
            initializeRecovery(canvasRef.current, state.gl)
          }
        }}
        onError={(error) => {
          console.error('🎮 DragonHead3D Canvas error:', error)
          handleError(new Error('Canvas creation failed'))
        }}
      >
        <Suspense fallback={null}>
          <DragonScene 
            enableEyeTracking={enableEyeTracking}
            lightningActive={lightningActive}
            isLoaded={isLoaded}
            intensity={intensity}
          />
        </Suspense>
      </Canvas>
    </div>
  )
}

export default DragonHead3D
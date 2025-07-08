'use client'

/**
 * DragonHead3DOptimized - Performance-optimized 3D dragon component
 * 
 * Performance optimizations:
 * - Simplified material system: Using MeshLambertMaterial instead of MeshPhongMaterial
 * - Reduced lighting: Single directional light + minimal ambient light
 * - Cached materials and geometries to prevent recreation
 * - Reduced polygon count: Lower segment counts on geometries
 * - Frame loop set to "demand" for on-demand rendering
 * - Material disposal on unmount to prevent memory leaks
 * - Disabled unnecessary WebGL features (antialias, stencil buffer)
 * - Fixed device pixel ratio to 1 for consistent performance
 */

import React, { useRef, useEffect, useState, useMemo, Suspense, lazy } from 'react'
import { Canvas, useFrame, useLoader } from '@react-three/fiber'
import { OBJLoader } from 'three-stdlib'
import * as THREE from 'three'
import { useMouseTracking } from '@/hooks/useMouseTracking'
import { useStormPerformance } from '@/hooks/useStormPerformance'
import { usePerformanceMonitor } from '@/hooks/usePerformanceMonitor'

interface DragonHead3DOptimizedProps {
  className?: string
  intensity?: number
  enableEyeTracking?: boolean
  lightningActive?: boolean
  forceQuality?: 'low' | 'medium' | 'high' | 'auto'
  onLoad?: () => void
}

// Lazy load the full 3D component for better initial page load
const FullDragonScene = lazy(() => import('./DragonHead3D').then(module => ({
  default: module.DragonHead3D
})))

// Simple fallback dragon for low-end devices
function SimpleDragonFallback({ className }: { className?: string }) {
  return (
    <div className={`absolute inset-0 flex items-center justify-center ${className}`}>
      <div className="relative w-48 h-48">
        {/* Simple CSS-based dragon silhouette */}
        <div className="absolute inset-0 bg-gradient-radial from-red-600/20 to-transparent animate-pulse" />
        <div className="absolute inset-0 flex items-center justify-center text-6xl opacity-20">
          🐉
        </div>
      </div>
    </div>
  )
}

// Lightweight dragon mesh for medium performance devices
function LightweightDragonMesh({ 
  enableEyeTracking = false, 
  lightningActive = false 
}: { 
  enableEyeTracking: boolean
  lightningActive: boolean 
}) {
  const meshRef = useRef<THREE.Mesh>(null)
  const { mousePosition, isMouseActive } = useMouseTracking(undefined, {
    smoothing: true,
    smoothingFactor: 0.15 // Less smooth for better performance
  })
  const frameCountRef = useRef(0)

  // Cache materials to avoid recreation
  const materials = useMemo(() => {
    const dragonMaterial = new THREE.MeshLambertMaterial({
      color: new THREE.Color(0.7, 0.15, 0.1),
      emissive: new THREE.Color(0.1, 0.02, 0.01),
      emissiveIntensity: lightningActive ? 0.3 : 0.1
    })
    
    const eyeMaterial = new THREE.MeshBasicMaterial({
      color: '#ffffff'
    })

    return { dragonMaterial, eyeMaterial }
  }, [lightningActive])

  // Cache geometries
  const geometries = useMemo(() => {
    const dragonGeo = new THREE.ConeGeometry(1, 2, 6) // Reduced segments from 8 to 6
    dragonGeo.rotateX(Math.PI * 0.5)
    
    const eyeGeo = new THREE.SphereGeometry(0.1, 6, 6) // Reduced segments from 8 to 6

    return { dragonGeo, eyeGeo }
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Dispose materials to prevent memory leaks
      materials.dragonMaterial.dispose()
      materials.eyeMaterial.dispose()
      geometries.dragonGeo.dispose()
      geometries.eyeGeo.dispose()
    }
  }, [materials, geometries])

  useFrame((state) => {
    if (!meshRef.current) return

    // Track frame count for performance monitoring
    frameCountRef.current++
    
    // Log frame count every 60 frames in dev mode
    if (process.env.NODE_ENV === 'development' && frameCountRef.current % 60 === 0) {
      console.log(`🐉 Lightweight Dragon: ${frameCountRef.current} frames rendered`)
    }

    // Simple breathing animation
    const breathe = Math.sin(state.clock.elapsedTime * 0.8) * 0.02
    meshRef.current.scale.setScalar(1 + breathe)

    // Simple rotation based on mouse
    if (isMouseActive && enableEyeTracking) {
      const normalizedX = (mousePosition.x / window.innerWidth) * 2 - 1
      const normalizedY = -(mousePosition.y / window.innerHeight) * 2 + 1
      
      meshRef.current.rotation.y = normalizedX * 0.3
      meshRef.current.rotation.x = 0.1 + normalizedY * 0.2
    }
  })

  return (
    <mesh ref={meshRef} geometry={geometries.dragonGeo} material={materials.dragonMaterial}>
      {/* Add simple eyes */}
      <mesh position={[0.3, 0.2, 0.8]} geometry={geometries.eyeGeo} material={materials.eyeMaterial} />
      <mesh position={[-0.3, 0.2, 0.8]} geometry={geometries.eyeGeo} material={materials.eyeMaterial} />
    </mesh>
  )
}

// Main optimized component
export function DragonHead3DOptimized({ 
  className = "",
  intensity = 0.8,
  enableEyeTracking = true,
  lightningActive = false,
  forceQuality = 'auto',
  onLoad
}: DragonHead3DOptimizedProps) {
  const [renderMode, setRenderMode] = useState<'loading' | 'fallback' | 'lightweight' | 'full'>('loading')
  const { config, metrics, isMobile, isTablet } = useStormPerformance()
  
  // Performance monitoring
  const performanceMonitor = usePerformanceMonitor({
    componentName: 'DragonHead3D',
    enabled: true,
    onPerformanceWarning: (metrics) => {
      console.warn('Dragon3D performance warning:', metrics)
      // Auto-downgrade quality if performance is poor
      if (metrics.fps < 20 && renderMode === 'full') {
        console.log('🐉 Auto-downgrading to lightweight mode due to poor performance')
        setRenderMode('lightweight')
      } else if (metrics.fps < 15 && renderMode === 'lightweight') {
        console.log('🐉 Auto-downgrading to fallback mode due to very poor performance')
        setRenderMode('fallback')
      }
    }
  })
  
  useEffect(() => {
    // Start render timer
    performanceMonitor.startTimer('render-mode-determination')
    
    // Determine render mode based on device and performance
    const determineRenderMode = () => {
      if (forceQuality !== 'auto') {
        switch (forceQuality) {
          case 'low':
            setRenderMode('fallback')
            break
          case 'medium':
            setRenderMode('lightweight')
            break
          case 'high':
            setRenderMode('full')
            break
        }
        return
      }

      // Auto quality detection
      if (isMobile || config.animationQuality === 'low') {
        setRenderMode('fallback')
      } else if (isTablet || config.animationQuality === 'medium') {
        setRenderMode('lightweight')
      } else {
        setRenderMode('full')
      }
      
      // End timer and log
      const determinationTime = performanceMonitor.endTimer('render-mode-determination')
      if (process.env.NODE_ENV === 'development') {
        console.log(`🐉 Render mode determined in ${determinationTime.toFixed(0)}ms`)
      }
    }

    // Small delay to prevent flash
    const timer = setTimeout(determineRenderMode, 100)
    return () => clearTimeout(timer)
  }, [isMobile, isTablet, config.animationQuality, forceQuality, performanceMonitor])
  
  // Call onLoad when render mode is determined
  useEffect(() => {
    if (renderMode !== 'loading' && onLoad) {
      onLoad()
      performanceMonitor.logMetrics()
    }
  }, [renderMode, onLoad, performanceMonitor])
  
  // Log performance metrics periodically in development
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      const interval = setInterval(() => {
        performanceMonitor.logMetrics()
      }, 5000) // Log every 5 seconds
      
      return () => clearInterval(interval)
    }
  }, [performanceMonitor])

  // Loading state
  if (renderMode === 'loading') {
    return (
      <div className={`absolute inset-0 ${className}`}>
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/10 animate-pulse" />
      </div>
    )
  }

  // Fallback for low-end devices
  if (renderMode === 'fallback') {
    return <SimpleDragonFallback className={className} />
  }

  // Lightweight 3D for medium devices
  if (renderMode === 'lightweight') {
    return (
      <div className={`absolute inset-0 ${className}`}>
        <Canvas
          camera={{ 
            position: [0, 0, 5], 
            fov: 45,
            near: 0.1,
            far: 50
          }}
          style={{ 
            background: 'transparent',
            pointerEvents: 'none'
          }}
          gl={{ 
            antialias: false, // Disable for better performance
            alpha: true,
            powerPreference: 'low-power',
            preserveDrawingBuffer: false,
            stencil: false, // Disable stencil buffer
            depth: true
          }}
          frameloop="always" // Need continuous rendering for breathing animation
          dpr={[1, 1]} // Lock pixel ratio to 1 for performance
        >
          <Suspense fallback={null}>
            {/* Simplified lighting - single directional light with reduced ambient */}
            <ambientLight intensity={0.3} />
            <directionalLight 
              position={[5, 5, 5]} 
              intensity={0.7}
              castShadow={false} // Disable shadows for performance
            />
            
            {/* Lightweight dragon */}
            <LightweightDragonMesh 
              enableEyeTracking={enableEyeTracking}
              lightningActive={lightningActive}
            />
          </Suspense>
        </Canvas>
      </div>
    )
  }

  // Full quality for high-end devices
  return (
    <Suspense fallback={<SimpleDragonFallback className={className} />}>
      <FullDragonScene
        className={className}
        intensity={intensity}
        enableEyeTracking={enableEyeTracking}
        lightningActive={lightningActive}
      />
    </Suspense>
  )
}

export default DragonHead3DOptimized
'use client'

import React, { useRef, useEffect, useState, useMemo, Suspense, lazy } from 'react'
import { Canvas, useFrame, useLoader } from '@react-three/fiber'
import { OBJLoader } from 'three-stdlib'
import * as THREE from 'three'
import { useMouseTracking } from '@/hooks/useMouseTracking'
import { useStormPerformance } from '@/hooks/useStormPerformance'

interface DragonHead3DOptimizedProps {
  className?: string
  intensity?: number
  enableEyeTracking?: boolean
  lightningActive?: boolean
  forceQuality?: 'low' | 'medium' | 'high' | 'auto'
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

  useFrame((state, delta) => {
    if (!meshRef.current) return

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

  // Create a simple dragon head geometry
  const geometry = useMemo(() => {
    const geo = new THREE.ConeGeometry(1, 2, 8)
    geo.rotateX(Math.PI * 0.5)
    return geo
  }, [])

  const material = useMemo(() => {
    return new THREE.MeshPhongMaterial({
      color: new THREE.Color(0.7, 0.15, 0.1),
      shininess: 40,
      specular: new THREE.Color(0.9, 0.6, 0.2),
      emissive: lightningActive ? new THREE.Color(0.2, 0.1, 0.05) : new THREE.Color(0, 0, 0)
    })
  }, [lightningActive])

  return (
    <mesh ref={meshRef} geometry={geometry} material={material}>
      {/* Add simple eyes */}
      <mesh position={[0.3, 0.2, 0.8]}>
        <sphereGeometry args={[0.1, 8, 8]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>
      <mesh position={[-0.3, 0.2, 0.8]}>
        <sphereGeometry args={[0.1, 8, 8]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>
    </mesh>
  )
}

// Main optimized component
export function DragonHead3DOptimized({ 
  className = "",
  intensity = 0.8,
  enableEyeTracking = true,
  lightningActive = false,
  forceQuality = 'auto'
}: DragonHead3DOptimizedProps) {
  const [renderMode, setRenderMode] = useState<'loading' | 'fallback' | 'lightweight' | 'full'>('loading')
  const { config, metrics, isMobile, isTablet } = useStormPerformance()
  
  useEffect(() => {
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
    }

    // Small delay to prevent flash
    const timer = setTimeout(determineRenderMode, 100)
    return () => clearTimeout(timer)
  }, [isMobile, isTablet, config.animationQuality, forceQuality])

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
            preserveDrawingBuffer: false
          }}
          dpr={[1, 1]} // Lock pixel ratio to 1 for performance
        >
          <Suspense fallback={null}>
            {/* Minimal lighting */}
            <ambientLight intensity={0.5} />
            <directionalLight position={[5, 5, 5]} intensity={0.8} />
            
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
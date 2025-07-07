'use client'

import React, { useRef, useEffect, useState, useMemo, Suspense } from 'react'
import { Canvas, useFrame, useLoader } from '@react-three/fiber'
import { OBJLoader } from 'three-stdlib'
import * as THREE from 'three'
import { useMouseTracking } from '@/hooks/useMouseTracking'

interface DragonHead3DProps {
  className?: string
  intensity?: number
  enableEyeTracking?: boolean
  lightningActive?: boolean
}

// Eye tracking component that handles the dragon head mesh
function DragonHeadMesh({ 
  enableEyeTracking = true, 
  lightningActive = false 
}: { 
  enableEyeTracking: boolean
  lightningActive: boolean 
}) {
  const meshRef = useRef<THREE.Group>(null)
  const leftEyeRef = useRef<THREE.Object3D>(null)
  const rightEyeRef = useRef<THREE.Object3D>(null)
  const blinkRef = useRef({ isBlinking: false, blinkTimer: 0, nextBlink: Math.random() * 5 + 3 })
  
  // Load the OBJ model
  const obj = useLoader(OBJLoader, '/models/dragon_head.obj')
  
  // Mouse tracking for eye movement
  const { mousePosition, isMouseActive } = useMouseTracking(undefined, {
    smoothing: true,
    smoothingFactor: 0.08
  })

  // Clone the model to avoid issues with reusing geometry
  const clonedObj = useMemo(() => {
    const cloned = obj.clone()
    
    // Scale and position the dragon head
    cloned.scale.setScalar(0.8) // Adjust scale as needed
    cloned.position.set(0, -18, -4) // Position head so eyes are at center, moved back
    cloned.rotation.set(0.1, 0, 0) // Slight downward angle
    
    // Apply dark, metallic materials
    cloned.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.material = new THREE.MeshPhongMaterial({
          color: new THREE.Color(0.15, 0.12, 0.1), // Dark brown/black
          shininess: 30,
          specular: new THREE.Color(0.3, 0.2, 0.1), // Subtle golden highlights
        })
        child.castShadow = true
        child.receiveShadow = true
      }
    })
    
    return cloned
  }, [obj])

  // Calculate eye rotation based on mouse position
  const calculateEyeRotation = (mouseX: number, mouseY: number) => {
    if (!enableEyeTracking || !isMouseActive) {
      return { x: 0, y: 0 }
    }

    // Convert screen coordinates to normalized device coordinates
    const normalizedX = (mouseX / window.innerWidth) * 2 - 1
    const normalizedY = -(mouseY / window.innerHeight) * 2 + 1
    
    // Limit eye movement range (eyes can't rotate infinitely)
    const maxRotation = Math.PI / 6 // 30 degrees max
    const eyeRotationX = normalizedY * maxRotation * 0.3 // Reduce vertical movement
    const eyeRotationY = normalizedX * maxRotation * 0.5 // More horizontal movement
    
    return { x: eyeRotationX, y: eyeRotationY }
  }

  // Animation loop
  useFrame((state, delta) => {
    if (!meshRef.current) return

    const { x: eyeRotX, y: eyeRotY } = calculateEyeRotation(mousePosition.x, mousePosition.y)
    
    // Handle blinking animation
    blinkRef.current.blinkTimer += delta
    
    if (!blinkRef.current.isBlinking && blinkRef.current.blinkTimer >= blinkRef.current.nextBlink) {
      blinkRef.current.isBlinking = true
      blinkRef.current.blinkTimer = 0
    }
    
    if (blinkRef.current.isBlinking) {
      if (blinkRef.current.blinkTimer >= 0.15) { // Blink duration
        blinkRef.current.isBlinking = false
        blinkRef.current.blinkTimer = 0
        blinkRef.current.nextBlink = Math.random() * 8 + 4 // Next blink in 4-12 seconds
      }
    }

    // Apply eye rotations (we'll need to identify eye objects in the mesh)
    // For now, we'll apply subtle head movement to simulate eye tracking
    if (isMouseActive && enableEyeTracking) {
      meshRef.current.rotation.x = 0.1 + eyeRotX * 0.1
      meshRef.current.rotation.y = eyeRotY * 0.15
    } else {
      // Return to neutral position when mouse is inactive
      meshRef.current.rotation.x = THREE.MathUtils.lerp(meshRef.current.rotation.x, 0.1, delta * 2)
      meshRef.current.rotation.y = THREE.MathUtils.lerp(meshRef.current.rotation.y, 0, delta * 2)
    }

    // Subtle breathing animation
    const breathe = Math.sin(state.clock.elapsedTime * 0.8) * 0.02
    meshRef.current.scale.setScalar(0.8 + breathe)

    // Lightning flash effect on materials
    if (lightningActive) {
      meshRef.current.traverse((child) => {
        if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshPhongMaterial) {
          child.material.emissive.setHex(0x444422) // Golden glow during lightning
        }
      })
    } else {
      meshRef.current.traverse((child) => {
        if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshPhongMaterial) {
          child.material.emissive.setHex(0x000000) // No glow normally
        }
      })
    }
  })

  return (
    <group ref={meshRef}>
      <primitive object={clonedObj} />
    </group>
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
      <ambientLight ref={ambientRef} color="#4a5568" intensity={0.3} />
      
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
        color="#d97706"
        distance={20}
      />
    </>
  )
}

// Error boundary component for the 3D scene
function DragonScene({ 
  enableEyeTracking, 
  lightningActive 
}: { 
  enableEyeTracking: boolean
  lightningActive: boolean 
}) {
  return (
    <Suspense fallback={null}>
      <DragonLighting lightningActive={lightningActive} />
      <DragonHeadMesh 
        enableEyeTracking={enableEyeTracking}
        lightningActive={lightningActive}
      />
      {/* Fog for atmosphere */}
      <fog attach="fog" args={['#1a202c', 5, 25]} />
    </Suspense>
  )
}

// Main component
export function DragonHead3D({ 
  className = "",
  intensity = 0.8,
  enableEyeTracking = true,
  lightningActive = false
}: DragonHead3DProps) {
  const [isLoaded, setIsLoaded] = useState(false)
  const [hasError, setHasError] = useState(false)

  // Error handling
  const handleError = (error: Error) => {
    console.error('Dragon head loading error:', error)
    setHasError(true)
  }

  // Loading state management
  useEffect(() => {
    const timer = setTimeout(() => setIsLoaded(true), 100)
    return () => clearTimeout(timer)
  }, [])

  if (hasError) {
    return null // Fail silently to not break the page
  }

  return (
    <div className={`absolute inset-0 ${className}`}>
      <Canvas
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
          powerPreference: 'high-performance'
        }}
        onCreated={() => {
          // Canvas successfully created
        }}
      >
        {isLoaded && (
          <DragonScene 
            enableEyeTracking={enableEyeTracking}
            lightningActive={lightningActive}
          />
        )}
      </Canvas>
    </div>
  )
}

export default DragonHead3D
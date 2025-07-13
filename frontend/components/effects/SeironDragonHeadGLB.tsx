'use client'

import React, { useRef, useEffect, useState, Suspense } from 'react'
import { useFrame, useLoader } from '@react-three/fiber'
import { GLTFLoader } from 'three-stdlib'
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader'
import * as THREE from 'three'
import { useMouseTracking } from '@/hooks/useMouseTracking'
import { Html } from '@react-three/drei'

interface SeironDragonHeadGLBProps {
  enableEyeTracking?: boolean
  lightningActive?: boolean
  intensity?: number
  onLoadError?: (error: Error) => void
}

// Error boundary for model loading
class ModelErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback?: React.ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: any) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error) {
    console.error('Model loading error caught by boundary:', error)
    return { hasError: true, error }
  }

  override componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Model loading error details:', { error, errorInfo })
  }

  override render() {
    if (this.state.hasError) {
      return this.props.fallback || <Html><div>Failed to load 3D model</div></Html>
    }
    return this.props.children
  }
}

// Loading component
function LoadingFallback() {
  return (
    <>
      {/* Simple loading indicator */}
      <mesh>
        <boxGeometry args={[0.5, 0.5, 0.5]} />
        <meshStandardMaterial color="#ff6600" emissive="#ff3300" emissiveIntensity={0.5} />
      </mesh>
      <Html center>
        <div style={{ 
          color: 'white', 
          fontSize: '12px',
          background: 'rgba(0,0,0,0.7)',
          padding: '8px 16px',
          borderRadius: '4px'
        }}>
          Summoning dragon...
        </div>
      </Html>
    </>
  )
}

// Inner component that actually loads the model
function SeironDragonHeadGLBInner({
  enableEyeTracking = true,
  lightningActive = false,
  intensity = 1,
  onLoadError
}: SeironDragonHeadGLBProps) {
  const groupRef = useRef<THREE.Group>(null)
  const modelRef = useRef<THREE.Group>(null)
  const initialSetupDone = useRef(false)
  
  // Load the GLB model - simplified without cache busting
  const modelUrl = `/models/dragon_head_optimized.glb`
  console.log('Attempting to load model from:', modelUrl)
  console.log('Full URL would be:', window.location.origin + modelUrl)
  
  // Add error boundary logging
  useEffect(() => {
    console.log('SeironDragonHeadGLBInner component mounted')
    console.log('Available models:', [
      'dragon_head_optimized.glb',
      'seiron_optimized.glb', 
      'dragon_head.glb',
      'seiron_head.glb'
    ])
  }, [])
  
  const gltf = useLoader(
    GLTFLoader, 
    modelUrl,
    (loader) => {  // Configure DRACOLoader for decompression
      const draco = new DRACOLoader()
      draco.setDecoderPath('/draco/')  // Path to decoder files in public/draco/
      loader.setDRACOLoader(draco)
    },
    (progress) => {  // Progress handler
      console.log('Loading progress event:', progress)
      if (progress && typeof progress === 'object' && 'loaded' in progress && 'total' in progress) {
        const percentage = ((progress as any).loaded / (progress as any).total * 100).toFixed(1)
        console.log('Loading progress:', percentage + '%')
      }
    }
  )
  
  console.log('Model loaded successfully:', gltf)
  
  // Mouse tracking for eye movement
  const { mousePosition, isMouseActive } = useMouseTracking(undefined, {
    smoothing: true,
    smoothingFactor: 0.08
  })

  // Setup model on load
  useEffect(() => {
    if (gltf && gltf.scene && modelRef.current && !initialSetupDone.current) {
      // Clear any existing children
      modelRef.current.clear()
      
      // Clone the scene to avoid issues
      const clonedScene = gltf.scene.clone()
      
      // Make it MASSIVE - scale up significantly
      clonedScene.scale.set(5, 5, 5)
      
      // Rotate to face the user (adjust based on model's original orientation)
      clonedScene.rotation.y = Math.PI // 180 degrees if model is facing away
      clonedScene.position.set(0, -2, -3) // Position so head is centered
      
      // Apply RED dragon materials with GOLDEN accents
      clonedScene.traverse((child: THREE.Object3D) => {
        if (child instanceof THREE.Mesh) {
          // Create new material for red dragon with golden accents
          const material = new THREE.MeshPhysicalMaterial({
            color: new THREE.Color(0.8, 0.1, 0.05), // Deep red
            metalness: 0.9,
            roughness: 0.2,
            clearcoat: 0.5,
            clearcoatRoughness: 0.1,
            emissive: new THREE.Color(0.6, 0.05, 0.02), // Red glow
            emissiveIntensity: lightningActive ? 0.8 : 0.2,
          })
          
          // Check if this part should be golden (based on material name or mesh name)
          const meshName = child.name.toLowerCase()
          if (meshName.includes('horn') || meshName.includes('spike') || 
              meshName.includes('accent') || meshName.includes('detail')) {
            // Golden accents for horns and details
            material.color = new THREE.Color(0.9, 0.7, 0.2) // Gold
            material.emissive = new THREE.Color(0.8, 0.6, 0.1) // Golden glow
            material.metalness = 1.0
            material.roughness = 0.1
          }
          
          child.material = material
          child.castShadow = true
          child.receiveShadow = true
        }
      })
      
      // Add to scene
      modelRef.current.add(clonedScene)
      initialSetupDone.current = true
    }
  }, [gltf, lightningActive])

  // Animation
  useFrame((state, delta) => {
    if (!groupRef.current || !modelRef.current) return

    // Breathing animation - subtle on the already massive model
    const breathe = Math.sin(state.clock.elapsedTime * 0.8) * 0.02
    const baseScale = modelRef.current.children[0]?.scale.x || 5
    modelRef.current.children.forEach(child => {
      child.scale.setScalar(baseScale * (1 + breathe))
    })

    // Eye tracking with head movement - looking at the user
    if (enableEyeTracking && isMouseActive) {
      const normalizedX = (mousePosition.x / window.innerWidth) * 2 - 1
      const normalizedY = -(mousePosition.y / window.innerHeight) * 2 + 1

      // Head follows mouse to maintain eye contact
      groupRef.current.rotation.y = normalizedX * 0.2
      groupRef.current.rotation.x = -0.1 + normalizedY * 0.15 // Slight downward tilt
    } else {
      // Return to looking straight at user
      groupRef.current.rotation.x = THREE.MathUtils.lerp(groupRef.current.rotation.x, -0.1, delta * 2)
      groupRef.current.rotation.y = THREE.MathUtils.lerp(groupRef.current.rotation.y, 0, delta * 2)
    }

    // Intensity-based scaling - make it grow dramatically on appearance
    const targetScale = 1.2 * intensity // Even bigger!
    groupRef.current.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), delta * 2)

    // Lightning effect - enhance red glow and golden accents
    if (lightningActive && modelRef.current) {
      modelRef.current.traverse((child) => {
        if (child instanceof THREE.Mesh && child.material) {
          const material = child.material as THREE.MeshPhysicalMaterial
          if (material.emissive) {
            const pulsate = 0.5 + Math.sin(state.clock.elapsedTime * 10) * 0.5
            material.emissiveIntensity = pulsate
          }
        }
      })
    }
  })


  return (
    <group ref={groupRef} position={[0, 1, -2]} scale={0}>
      <group ref={modelRef}>
        {/* Model will be added here programmatically */}
      </group>
      
      {/* Dramatic lighting setup for red dragon */}
      <pointLight
        position={[0, 5, 3]}
        intensity={lightningActive ? 3 : 1.5}
        color="#ff6600" // Orange-red light
      />
      <pointLight
        position={[-3, 2, 2]}
        intensity={0.8}
        color="#ffaa00" // Golden accent light
      />
      <pointLight
        position={[3, 2, 2]}
        intensity={0.8}
        color="#ffaa00" // Golden accent light
      />
      <spotLight
        position={[0, 8, 5]}
        target-position={[0, 0, 0]}
        angle={0.6}
        penumbra={0.3}
        intensity={lightningActive ? 2 : 1}
        color="#ff0000" // Red spotlight from above
        castShadow
      />
    </group>
  )
}

// Main component with error boundary and suspense
export function SeironDragonHeadGLB(props: SeironDragonHeadGLBProps) {
  useEffect(() => {
    // Log component mount and model path
    console.log('SeironDragonHeadGLB mounted')
    console.log('Model path:', '/models/dragon_head_optimized.glb')
    console.log('Current URL:', window.location.href)
    console.log('Base URL:', document.baseURI)
  }, [])

  return (
    <ModelErrorBoundary fallback={
      <Html center>
        <div style={{ 
          color: 'white', 
          fontSize: '14px',
          background: 'rgba(255,0,0,0.8)',
          padding: '16px',
          borderRadius: '8px'
        }}>
          Model loading error
        </div>
      </Html>
    }>
      <Suspense fallback={<LoadingFallback />}>
        <SeironDragonHeadGLBInner {...props} />
      </Suspense>
    </ModelErrorBoundary>
  )
}
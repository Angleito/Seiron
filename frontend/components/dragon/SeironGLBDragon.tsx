'use client'

import React, { useRef, useEffect, useState, Suspense } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { useGLTF, PerspectiveCamera } from '@react-three/drei'
import * as THREE from 'three'
import { VoiceAnimationState } from './DragonRenderer'

// Debug logging for dragon initialization
console.log('🐉 SeironGLBDragon component loading...')
console.log('🎮 Three.js version:', THREE.REVISION)
console.log('🖼️ WebGL support:', typeof WebGLRenderingContext !== 'undefined')

interface SeironGLBDragonProps {
  voiceState?: VoiceAnimationState
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'gigantic'
  className?: string
  enableAnimations?: boolean
}

// Dragon mesh component that handles the GLB model
function DragonMesh({ 
  voiceState,
  size = 'gigantic',
  enableAnimations = true
}: {
  voiceState?: VoiceAnimationState
  size: 'sm' | 'md' | 'lg' | 'xl' | 'gigantic'
  enableAnimations: boolean
}) {
  const meshRef = useRef<THREE.Group>(null)
  
  // Add error handling for GLTF loading
  let scene: THREE.Group
  let animations: THREE.AnimationClip[]
  try {
    console.log('🔄 Loading GLTF model from /models/seiron_animated.gltf...')
    const gltf = useGLTF('/models/seiron_animated.gltf')
    scene = gltf.scene
    animations = gltf.animations || []
    console.log('✅ GLTF model loaded successfully:', scene)
    console.log('🎭 Available animations:', animations.map(clip => clip.name))
  } catch (error) {
    console.error('❌ Failed to load GLTF model:', error)
    throw error
  }
  
  // Size configurations
  const sizeConfig = {
    sm: { scale: 1, position: [0, -2, 0] },
    md: { scale: 2, position: [0, -3, 0] },
    lg: { scale: 3, position: [0, -4, 0] },
    xl: { scale: 4, position: [0, -5, 0] },
    gigantic: { scale: 8, position: [0, -8, 2] }
  }

  const currentConfig = sizeConfig[size]

  // Animation mixer setup
  const mixerRef = useRef<THREE.AnimationMixer | null>(null)
  const actionRef = useRef<THREE.AnimationAction | null>(null)

  // Clone the scene to avoid conflicts
  const clonedScene = React.useMemo(() => {
    const cloned = scene.clone()
    
    // Set initial scale and position
    cloned.scale.setScalar(currentConfig.scale)
    cloned.position.set(...currentConfig.position as [number, number, number])
    
    // Face forward toward the user
    cloned.rotation.set(0, 0, 0)
    
    // Apply Dragon Ball aesthetic materials
    cloned.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        if (child.material instanceof THREE.MeshStandardMaterial) {
          // Enhance materials for Dragon Ball look
          child.material.roughness = 0.3
          child.material.metalness = 0.1
          child.material.color.multiplyScalar(1.2) // Brighten colors
        }
        child.castShadow = true
        child.receiveShadow = true
      }
    })

    // Initialize animation mixer
    if (animations.length > 0) {
      mixerRef.current = new THREE.AnimationMixer(cloned)
      
      // Find a suitable animation for looping (prefer flying or flapping)
      let selectedAnimation = animations.find(clip => 
        clip.name.includes('flying') || 
        clip.name.includes('flaping') ||
        clip.name.includes('flapping')
      ) || animations[0] // fallback to first animation
      
      if (selectedAnimation) {
        actionRef.current = mixerRef.current.clipAction(selectedAnimation)
        actionRef.current.setLoop(THREE.LoopRepeat, Infinity)
        actionRef.current.play()
        console.log('🎭 Playing animation:', selectedAnimation.name)
      }
    }
    
    return cloned
  }, [scene, currentConfig])

  // Cleanup animation mixer on unmount
  useEffect(() => {
    return () => {
      if (mixerRef.current) {
        mixerRef.current.stopAllAction()
        mixerRef.current.uncacheRoot(mixerRef.current.getRoot())
      }
    }
  }, [])

  // Animation loop
  useFrame((state, delta) => {
    if (!meshRef.current || !enableAnimations) return

    const time = state.clock.elapsedTime

    // Update animation mixer
    if (mixerRef.current) {
      mixerRef.current.update(delta)
    }

    // Simple breathing animation on top of the GLTF animation
    const breatheScale = Math.sin(time * 0.8) * 0.02
    meshRef.current.scale.setScalar(currentConfig.scale + breatheScale)
  })

  return (
    <group ref={meshRef}>
      <primitive object={clonedScene} />
    </group>
  )
}

// Lighting setup optimized for the GLB dragon
function DragonLighting({ voiceState }: { voiceState?: VoiceAnimationState }) {
  const ambientRef = useRef<THREE.AmbientLight>(null)
  const directionalRef = useRef<THREE.DirectionalLight>(null)
  const rimLightRef = useRef<THREE.DirectionalLight>(null)

  useFrame(() => {
    // Adjust lighting based on voice state
    if (ambientRef.current && directionalRef.current && rimLightRef.current) {
      if (voiceState?.isSpeaking) {
        ambientRef.current.intensity = 0.6
        directionalRef.current.intensity = 2.0
        rimLightRef.current.intensity = 1.2
      } else if (voiceState?.isListening) {
        ambientRef.current.intensity = 0.4
        directionalRef.current.intensity = 1.5
        rimLightRef.current.intensity = 0.8
      } else {
        ambientRef.current.intensity = 0.3
        directionalRef.current.intensity = 1.2
        rimLightRef.current.intensity = 0.6
      }
    }
  })

  return (
    <>
      <ambientLight ref={ambientRef} color="#fbbf24" intensity={0.3} />
      <directionalLight
        ref={directionalRef}
        position={[10, 10, 5]}
        intensity={1.2}
        color="#fbbf24"
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
      />
      <directionalLight
        ref={rimLightRef}
        position={[-5, 5, -10]}
        intensity={0.6}
        color="#f59e0b"
      />
      <pointLight
        position={[0, 5, 8]}
        intensity={0.8}
        color="#fbbf24"
        distance={30}
      />
    </>
  )
}

// Loading fallback component
function LoadingDragon() {
  console.log('🔄 LoadingDragon component rendering...')
  return (
    <div className="flex items-center justify-center h-full">
      <div className="text-yellow-400 font-mono text-center">
        <div className="animate-pulse text-6xl mb-4">🐉</div>
        <div>Loading Seiron...</div>
        <div className="text-sm text-yellow-600 mt-2">Initializing 3D dragon...</div>
      </div>
    </div>
  )
}

// Error boundary component
function DragonScene({ 
  voiceState, 
  size,
  enableAnimations 
}: {
  voiceState?: VoiceAnimationState
  size: 'sm' | 'md' | 'lg' | 'xl' | 'gigantic'
  enableAnimations: boolean
}) {
  return (
    <Suspense fallback={<LoadingDragon />}>
      <DragonLighting voiceState={voiceState} />
      <DragonMesh 
        voiceState={voiceState}
        size={size}
        enableAnimations={enableAnimations}
      />
      <fog attach="fog" args={['#000000', 10, 50]} />
    </Suspense>
  )
}

// Main GLB Dragon component
export const SeironGLBDragon: React.FC<SeironGLBDragonProps> = ({
  voiceState,
  size = 'gigantic',
  className = '',
  enableAnimations = true
}) => {
  const [isLoaded, setIsLoaded] = useState(false)
  const [hasError, setHasError] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string>('')

  console.log('🐉 SeironGLBDragon rendering with props:', { size, enableAnimations, voiceState })

  useEffect(() => {
    console.log('⏰ Starting dragon load timer...')
    const timer = setTimeout(() => {
      console.log('✅ Dragon load timer complete')
      setIsLoaded(true)
    }, 100)
    return () => clearTimeout(timer)
  }, [])

  // Error handler
  const handleError = (error: Error) => {
    console.error('❌ Dragon error:', error)
    setHasError(true)
    setErrorMessage(error.message)
  }

  if (hasError) {
    console.log('💥 Dragon error state, showing fallback')
    return (
      <div className={`flex items-center justify-center ${className}`}>
        <div className="text-yellow-400 font-mono text-center">
          <div className="text-4xl mb-2">⚡</div>
          <div>Dragon power loading...</div>
          <div className="text-xs text-red-400 mt-2">{errorMessage}</div>
        </div>
      </div>
    )
  }

  console.log('🎨 Rendering Canvas with isLoaded:', isLoaded)

  return (
    <div className={`w-full h-full ${className}`}>
      <Canvas
        camera={{ 
          position: [0, 2, 12], 
          fov: 45,
          near: 0.1,
          far: 100
        }}
        style={{ 
          background: 'transparent',
          pointerEvents: 'none'
        }}
        gl={{ 
          antialias: true, 
          alpha: true,
          powerPreference: 'high-performance'
        }}
        shadows
        onCreated={(state) => {
          console.log('🎮 Three.js Canvas created:', state)
        }}
        onError={(error) => {
          console.error('🎮 Three.js Canvas error:', error)
          handleError(new Error('Canvas creation failed'))
        }}
      >
        {isLoaded && (
          <DragonScene 
            voiceState={voiceState}
            size={size}
            enableAnimations={enableAnimations}
          />
        )}
      </Canvas>
    </div>
  )
}

// Preload the GLTF model
useGLTF.preload('/models/seiron_animated.gltf')

export default SeironGLBDragon
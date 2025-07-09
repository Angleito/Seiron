'use client'

import React, { useRef, useEffect, useState, Suspense, ErrorInfo } from 'react'
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
  modelPath?: string
  isProgressiveLoading?: boolean
  isLoadingHighQuality?: boolean
  onError?: (error: Error) => void
}

// Dragon mesh component that handles the GLB model
function DragonMesh({ 
  voiceState,
  size = 'gigantic',
  enableAnimations = true,
  modelPath = '/models/seiron_animated_optimized.gltf',
  onError
}: {
  voiceState?: VoiceAnimationState
  size: 'sm' | 'md' | 'lg' | 'xl' | 'gigantic'
  enableAnimations: boolean
  modelPath?: string
  onError?: (error: Error) => void
}) {
  const meshRef = useRef<THREE.Group>(null)
  
  // Add error handling for GLTF loading
  let scene: THREE.Group
  let animations: THREE.AnimationClip[]
  try {
    console.log(`🔄 Loading GLTF model from ${modelPath}...`)
    const gltf = useGLTF(modelPath)
    scene = gltf.scene
    animations = gltf.animations || []
    console.log('✅ GLTF model loaded successfully:', scene)
    console.log('🎭 Available animations:', animations.map(clip => clip.name))
  } catch (error) {
    console.error('❌ Failed to load GLTF model:', error)
    if (onError) {
      onError(error as Error)
    }
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

  // Cleanup animation mixer and dispose of resources on unmount
  useEffect(() => {
    return () => {
      if (mixerRef.current) {
        mixerRef.current.stopAllAction()
        mixerRef.current.uncacheRoot(mixerRef.current.getRoot())
        mixerRef.current = null
      }
      
      // Dispose of the cloned scene and its resources
      if (clonedScene) {
        clonedScene.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            // Dispose of geometry
            if (child.geometry) {
              child.geometry.dispose()
            }
            
            // Dispose of materials
            if (child.material) {
              if (Array.isArray(child.material)) {
                child.material.forEach(material => {
                  if (material.map) material.map.dispose()
                  if (material.normalMap) material.normalMap.dispose()
                  if (material.roughnessMap) material.roughnessMap.dispose()
                  if (material.metalnessMap) material.metalnessMap.dispose()
                  material.dispose()
                })
              } else {
                if (child.material.map) child.material.map.dispose()
                if (child.material.normalMap) child.material.normalMap.dispose()
                if (child.material.roughnessMap) child.material.roughnessMap.dispose()
                if (child.material.metalnessMap) child.material.metalnessMap.dispose()
                child.material.dispose()
              }
            }
          }
        })
        clonedScene.clear()
      }
    }
  }, [clonedScene])

  // Animation loop with performance optimization
  useFrame((state, delta) => {
    if (!meshRef.current || !enableAnimations) return

    const time = state.clock.elapsedTime

    // Update animation mixer
    if (mixerRef.current) {
      mixerRef.current.update(delta)
    }

    // Only update breathing animation every few frames to improve performance
    if (Math.floor(time * 60) % 3 === 0) {
      const breatheScale = Math.sin(time * 0.8) * 0.02
      meshRef.current.scale.setScalar(currentConfig.scale + breatheScale)
    }
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
  enableAnimations,
  modelPath,
  onError
}: {
  voiceState?: VoiceAnimationState
  size: 'sm' | 'md' | 'lg' | 'xl' | 'gigantic'
  enableAnimations: boolean
  modelPath?: string
  onError?: (error: Error) => void
}) {
  return (
    <Suspense fallback={<LoadingDragon />}>
      <DragonLighting voiceState={voiceState} />
      <DragonMesh 
        voiceState={voiceState}
        size={size}
        enableAnimations={enableAnimations}
        modelPath={modelPath}
        onError={onError}
      />
      <fog attach="fog" args={['#000000', 10, 50]} />
    </Suspense>
  )
}

// Main GLB Dragon component
const SeironGLBDragon: React.FC<SeironGLBDragonProps> = ({
  voiceState,
  size = 'gigantic',
  className = '',
  enableAnimations = true,
  modelPath = '/models/seiron_animated_optimized.gltf',
  isProgressiveLoading = false,
  isLoadingHighQuality = false,
  onError
}) => {
  const [isLoaded, setIsLoaded] = useState(false)
  const [hasError, setHasError] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string>('')

  console.log('🐉 SeironGLBDragon rendering with props:', { size, enableAnimations, voiceState })

  useEffect(() => {
    let mounted = true
    console.log('⏰ Starting dragon load timer...')
    const timer = setTimeout(() => {
      if (mounted) {
        console.log('✅ Dragon load timer complete')
        setIsLoaded(true)
      }
    }, 100)
    return () => {
      mounted = false
      clearTimeout(timer)
    }
  }, [])

  // Error handler
  const handleError = (error: Error) => {
    console.error('❌ Dragon error:', error)
    setHasError(true)
    setErrorMessage(error.message)
    
    // Propagate error to parent
    if (onError) {
      onError(error)
    }
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
            modelPath={modelPath}
            onError={handleError}
          />
        )}
      </Canvas>
    </div>
  )
}

// Error boundary class component to catch useGLTF errors
class GLTFErrorBoundary extends React.Component<
  { children: React.ReactNode; onError: (error: Error) => void },
  { hasError: boolean; error?: Error }
> {
  constructor(props: any) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }

  override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('GLTFErrorBoundary caught error:', error, errorInfo)
    this.props.onError(error)
  }

  override render() {
    if (this.state.hasError) {
      return null // Let parent handle the error display
    }
    return this.props.children
  }
}

// Wrapped component that includes error boundary
const SeironGLBDragonWithErrorBoundary: React.FC<SeironGLBDragonProps> = (props) => {
  return (
    <GLTFErrorBoundary onError={props.onError || (() => {})}>
      <SeironGLBDragon {...props} />
    </GLTFErrorBoundary>
  )
}

// Preload the optimized GLTF models only once
if (typeof window !== 'undefined') {
  try {
    // Preload the optimized high-quality model
    useGLTF.preload('/models/seiron_animated_optimized.gltf')
    // Preload the low-quality model for progressive loading
    useGLTF.preload('/models/seiron_optimized.glb')
    // Preload the LOD models if they exist
    useGLTF.preload('/models/seiron_animated_lod_high.gltf')
  } catch (e) {
    console.warn('Failed to preload GLTF models:', e)
  }
}

export default SeironGLBDragon
export { SeironGLBDragon, SeironGLBDragonWithErrorBoundary }
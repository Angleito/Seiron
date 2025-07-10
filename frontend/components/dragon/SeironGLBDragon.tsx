'use client'

import React, { useRef, useEffect, useState, Suspense, ErrorInfo } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { useGLTF, PerspectiveCamera } from '@react-three/drei'
import * as THREE from 'three'
import { VoiceAnimationState } from './DragonRenderer'
import { useWebGLRecovery } from '../../utils/webglRecovery'
import { WebGLErrorBoundary } from '../error-boundaries/WebGLErrorBoundary'

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
  visible?: boolean
  qualitySettings?: any
  deviceCapabilities?: any
  performanceState?: any
  onError?: (error: Error) => void
  onFallback?: () => void
  onLoad?: () => void
  onProgress?: (progress: number) => void
}

// Model availability checker
async function checkModelAvailability(modelPath: string): Promise<boolean> {
  try {
    const response = await fetch(modelPath, { method: 'HEAD' })
    return response.ok
  } catch (error) {
    console.warn(`Model availability check failed for ${modelPath}:`, error)
    return false
  }
}

// Dragon mesh component that handles the GLB model
function DragonMesh({ 
  voiceState,
  size = 'gigantic',
  enableAnimations = true,
  modelPath = '/models/seiron.glb', // Using the primary working model
  onError
}: {
  voiceState?: VoiceAnimationState
  size: 'sm' | 'md' | 'lg' | 'xl' | 'gigantic'
  enableAnimations: boolean
  modelPath?: string
  onError?: (error: Error) => void
}) {
  const meshRef = useRef<THREE.Group>(null)
  
  // Log when component mounts
  useEffect(() => {
    console.log('🐲 DragonMesh mounted with:', { size, modelPath, enableAnimations })
    return () => console.log('🐲 DragonMesh unmounted')
  }, [])
  
  // Try to load model with fallback - use the model path directly
  let scene: THREE.Group
  let animations: THREE.AnimationClip[]
  
  try {
    console.log(`🔄 Loading GLTF model from ${modelPath}...`)
    const gltf = useGLTF(modelPath)
    
    // Validate the loaded model
    if (!gltf || !gltf.scene) {
      throw new Error(`Invalid GLTF model: ${modelPath}`)
    }
    
    scene = gltf.scene
    animations = gltf.animations || []
    console.log('✅ GLTF model loaded successfully:', scene)
    console.log('🎭 Available animations:', animations.map(clip => clip.name))
  } catch (error) {
    console.error('❌ Failed to load GLTF model:', error)
    
    // Check if this is a known problematic model and try fallback
    const problematicModels = ['seiron_animated.gltf', 'seiron_animated_lod_high.gltf']
    const isProblematicModel = problematicModels.some(model => modelPath.includes(model))
    
    if (isProblematicModel) {
      console.log('🔄 Attempting to load fallback model due to known issues...')
      try {
        const fallbackGltf = useGLTF('/models/seiron.glb')
        if (fallbackGltf && fallbackGltf.scene) {
          scene = fallbackGltf.scene
          animations = fallbackGltf.animations || []
          console.log('✅ Fallback model loaded successfully')
        } else {
          throw new Error('Fallback model also failed to load')
        }
      } catch (fallbackError) {
        console.error('❌ Fallback model also failed:', fallbackError)
        if (onError) {
          onError(fallbackError as Error)
        }
        throw fallbackError
      }
    } else {
      if (onError) {
        onError(error as Error)
      }
      throw error
    }
  }
  
  // Size configurations - centered the dragon properly
  const sizeConfig = {
    sm: { scale: 0.8, position: [0, 0, 0] },
    md: { scale: 1.2, position: [0, 0, 0] },
    lg: { scale: 1.8, position: [0, 0, 0] },
    xl: { scale: 2.5, position: [0, 0, 0] },
    gigantic: { scale: 3.5, position: [0, 0, 0] }
  }

  const currentConfig = sizeConfig[size]

  // Animation mixer setup
  const mixerRef = useRef<THREE.AnimationMixer | null>(null)
  const actionRef = useRef<THREE.AnimationAction | null>(null)

  // Clone the scene to avoid conflicts
  const clonedScene = React.useMemo(() => {
    const cloned = scene.clone()
    
    // Calculate bounding box to center the model properly
    const box = new THREE.Box3().setFromObject(cloned)
    const center = box.getCenter(new THREE.Vector3())
    const size = box.getSize(new THREE.Vector3())
    
    // Center the model at origin
    cloned.position.sub(center)
    
    // Apply size configuration
    cloned.scale.setScalar(currentConfig.scale)
    cloned.position.add(new THREE.Vector3(...currentConfig.position as [number, number, number]))
    
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
      console.log('🧹 Cleaning up dragon mesh resources')
      
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
                  // Dispose of all texture maps
                  const textureProperties = ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'emissiveMap', 'bumpMap', 'displacementMap', 'aoMap', 'lightMap', 'alphaMap']
                  textureProperties.forEach(prop => {
                    if (material[prop]) {
                      material[prop].dispose()
                    }
                  })
                  material.dispose()
                })
              } else {
                // Dispose of all texture maps
                const textureProperties = ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'emissiveMap', 'bumpMap', 'displacementMap', 'aoMap', 'lightMap', 'alphaMap']
                textureProperties.forEach(prop => {
                  if (child.material[prop]) {
                    child.material[prop].dispose()
                  }
                })
                child.material.dispose()
              }
            }
          }
        })
        clonedScene.clear()
      }
      
      // Force garbage collection if available
      if (typeof window !== 'undefined' && window.gc) {
        window.gc()
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
    // Further reduce frequency on mobile devices
    const frameSkip = typeof window !== 'undefined' && /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ? 6 : 3
    if (Math.floor(time * 60) % frameSkip === 0) {
      const breatheScale = Math.sin(time * 0.8) * 0.02
      meshRef.current.scale.setScalar(currentConfig.scale + breatheScale)
    }
    
    // Adaptive LOD based on distance to camera
    if (meshRef.current && state.camera) {
      const distance = meshRef.current.position.distanceTo(state.camera.position)
      const lodLevel = distance > 15 ? 0.5 : distance > 10 ? 0.75 : 1
      
      // Apply LOD scaling only if it's significantly different
      if (Math.abs(meshRef.current.scale.x - currentConfig.scale * lodLevel) > 0.1) {
        meshRef.current.scale.setScalar(currentConfig.scale * lodLevel)
      }
    }
  })

  // Log the mesh state in animation frame
  useEffect(() => {
    if (meshRef.current) {
      console.log('🐲 Dragon mesh ref attached:', {
        position: meshRef.current.position,
        scale: meshRef.current.scale,
        visible: meshRef.current.visible,
        children: meshRef.current.children.length
      })
    }
  }, [meshRef.current])

  return (
    <group ref={meshRef}>
      {/* Debug sphere only in development mode */}
      {process.env.NODE_ENV === 'development' && (
        <mesh position={[0, 0, 0]}>
          <sphereGeometry args={[1, 16, 16]} />
          <meshBasicMaterial color="red" wireframe />
        </mesh>
      )}
      
      <primitive 
        object={clonedScene} 
        onUpdate={(self: THREE.Object3D) => {
          if (process.env.NODE_ENV === 'development') {
            console.log('🐲 Primitive updated:', {
              visible: self.visible,
              position: self.position,
              worldPosition: self.getWorldPosition(new THREE.Vector3())
            })
          }
        }}
      />
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

// Loading fallback component - Three.js objects only
function LoadingDragon() {
  console.log('🔄 LoadingDragon component rendering...')
  const meshRef = useRef<THREE.Group>(null)
  const textRef = useRef<THREE.Mesh>(null)
  
  // Animated loading indicator using Three.js objects
  useFrame((state) => {
    const time = state.clock.elapsedTime
    
    if (meshRef.current) {
      // Rotate the entire loading group
      meshRef.current.rotation.y = time * 0.5
      
      // Pulsing scale animation
      const pulse = Math.sin(time * 3) * 0.2 + 1
      meshRef.current.scale.setScalar(pulse)
    }
  })
  
  return (
    <group ref={meshRef} position={[0, 0, 0]}>
      {/* Central loading sphere with pulsing animation */}
      <mesh position={[0, 0, 0]}>
        <sphereGeometry args={[1, 16, 16]} />
        <meshStandardMaterial 
          color="#fbbf24" 
          emissive="#f59e0b" 
          emissiveIntensity={0.3}
          roughness={0.4}
          metalness={0.6}
        />
      </mesh>
      
      {/* Orbiting particles to simulate dragon energy */}
      {[...Array(8)].map((_, i) => {
        const angle = (i / 8) * Math.PI * 2
        const radius = 3
        return (
          <mesh 
            key={i} 
            position={[
              Math.cos(angle) * radius,
              Math.sin(angle * 0.5) * 0.5,
              Math.sin(angle) * radius
            ]}
          >
            <sphereGeometry args={[0.2, 8, 8]} />
            <meshStandardMaterial 
              color="#fbbf24" 
              emissive="#f59e0b" 
              emissiveIntensity={0.5}
            />
          </mesh>
        )
      })}
      
      {/* Dragon-like geometric shape */}
      <mesh position={[0, 2, 0]} rotation={[0, 0, Math.PI / 6]}>
        <coneGeometry args={[1, 2, 6]} />
        <meshStandardMaterial 
          color="#fbbf24" 
          emissive="#f59e0b" 
          emissiveIntensity={0.4}
          roughness={0.3}
          metalness={0.7}
        />
      </mesh>
      
      {/* Wing-like shapes */}
      <mesh position={[-1.5, 1, 0]} rotation={[0, 0, Math.PI / 4]}>
        <boxGeometry args={[2, 0.2, 0.5]} />
        <meshStandardMaterial 
          color="#f59e0b" 
          emissive="#f59e0b" 
          emissiveIntensity={0.3}
          transparent
          opacity={0.8}
        />
      </mesh>
      
      <mesh position={[1.5, 1, 0]} rotation={[0, 0, -Math.PI / 4]}>
        <boxGeometry args={[2, 0.2, 0.5]} />
        <meshStandardMaterial 
          color="#f59e0b" 
          emissive="#f59e0b" 
          emissiveIntensity={0.3}
          transparent
          opacity={0.8}
        />
      </mesh>
      
      {/* Ambient lighting for the loading indicator */}
      <ambientLight intensity={0.4} color="#fbbf24" />
      <pointLight 
        position={[0, 5, 5]} 
        intensity={1} 
        color="#fbbf24" 
        distance={15}
      />
    </group>
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
  // Log scene mounting
  useEffect(() => {
    console.log('🎬 DragonScene mounted')
    return () => console.log('🎬 DragonScene unmounted')
  }, [])
  
  return (
    <Suspense fallback={<LoadingDragon />}>
      {/* Add grid helper for debugging */}
      <gridHelper args={[20, 20, 'yellow', 'gray']} />
      
      {/* Add axes helper for debugging */}
      <axesHelper args={[5]} />
      
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

// Main GLB Dragon component that only renders Three.js objects (no Canvas wrapper)
const SeironGLBDragon: React.FC<SeironGLBDragonProps> = ({
  voiceState,
  size = 'gigantic',
  className = '',
  enableAnimations = true,
  modelPath = '/models/seiron.glb', // Using the primary working model
  isProgressiveLoading = false,
  isLoadingHighQuality = false,
  onError,
  onFallback
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
    
    // Check if this is a model loading error
    const isModelError = error.message.includes('Invalid typed array length') ||
                        error.message.includes('Failed to load') ||
                        error.message.includes('GLTF') ||
                        error.message.includes('GLB')
    
    if (isModelError) {
      console.warn('🔴 Model loading error detected, triggering fallback')
      setErrorMessage('Model loading failed, using fallback')
      
      // Trigger fallback immediately for model errors
      if (onFallback) {
        onFallback()
      }
      return
    }
    
    setHasError(true)
    setErrorMessage(error.message || 'Unknown error')
    
    // Propagate error to parent
    if (onError) {
      onError(error)
    }
  }

  // For Three.js objects only - no HTML elements inside Canvas
  if (hasError) {
    console.log('💥 Dragon error state, returning null to let parent handle')
    // Don't return HTML here - let the parent Canvas error boundary handle it
    if (onError) {
      onError(new Error(errorMessage))
    }
    return null
  }

  console.log('🎨 Rendering Dragon Three.js objects with isLoaded:', isLoaded)

  // Return Three.js objects only - no HTML div wrappers
  return (
    <group>
      {/* Debug mesh for development */}
      {process.env.NODE_ENV === 'development' && (
        <mesh position={[2, 2, 2]}>
          <boxGeometry args={[0.5, 0.5, 0.5]} />
          <meshBasicMaterial color="blue" wireframe />
        </mesh>
      )}
      
      {isLoaded && (
        <DragonScene 
          voiceState={voiceState}
          size={size}
          enableAnimations={enableAnimations}
          modelPath={modelPath}
          onError={handleError}
        />
      )}
    </group>
  )
}

// Component with Canvas wrapper for standalone usage
const SeironGLBDragonWithCanvas: React.FC<SeironGLBDragonProps> = ({
  voiceState,
  size = 'gigantic',
  className = '',
  enableAnimations = true,
  modelPath = '/models/seiron.glb',
  isProgressiveLoading = false,
  isLoadingHighQuality = false,
  onError,
  onFallback
}) => {
  const [hasError, setHasError] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string>('')
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)

  // WebGL recovery hook with enhanced features
  const {
    initializeRecovery,
    diagnostics,
    shouldFallback,
    isRecovering,
    currentRecoveryAttempt,
    resetDiagnostics,
    getQualitySettings,
    setQualityLevel
  } = useWebGLRecovery({
    maxRecoveryAttempts: 3,
    recoveryDelayMs: 1000,
    maxRecoveryDelay: 8000,
    fallbackEnabled: true,
    exponentialBackoff: true,
    enablePreventiveMeasures: true,
    performanceThreshold: 20, // Lower threshold for dragons
    memoryThreshold: 800,
    enableQualityReduction: true,
    enableUserNotifications: true,
    onContextLost: () => {
      console.warn('🔴 WebGL context lost in SeironGLBDragon')
      setHasError(false) // Clear previous errors during recovery
      setErrorMessage('')
    },
    onContextRestored: () => {
      console.log('🟢 WebGL context restored in SeironGLBDragon')
      // Reset any error states
      setHasError(false)
      setErrorMessage('')
    },
    onRecoveryFailed: () => {
      console.error('❌ WebGL recovery failed in SeironGLBDragon')
      setHasError(true)
      setErrorMessage('WebGL recovery failed after multiple attempts')
    },
    onFallback: () => {
      console.log('⚠️ WebGL fallback triggered in SeironGLBDragon')
      if (onFallback) {
        onFallback()
      }
    },
    onRecoveryAttempt: (attempt: number) => {
      console.log(`🔄 WebGL recovery attempt ${attempt} in SeironGLBDragon`)
    },
    onPreventiveMeasure: (measure: string) => {
      console.log(`🛡️ Preventive measure taken: ${measure}`)
    },
    onQualityReduced: (level: number) => {
      console.log(`📉 Quality reduced to level ${level}`)
    },
    onUserNotification: (message: string, type: 'info' | 'warning' | 'error') => {
      console.log(`🔔 User notification: [${type}] ${message}`)
    }
  })

  // Initialize WebGL recovery when Canvas is ready
  useEffect(() => {
    if (canvasRef.current && rendererRef.current) {
      initializeRecovery(canvasRef.current, rendererRef.current)
    }
  }, [canvasRef.current, rendererRef.current, initializeRecovery])

  // Error handler
  const handleError = (error: Error) => {
    console.error('❌ Dragon error:', error)
    
    // Check if error is WebGL-related
    const isWebGLError = error.message.includes('WebGL') || 
                        error.message.includes('context') ||
                        error.message.includes('CONTEXT_LOST')
    
    if (isWebGLError) {
      console.warn('🔴 WebGL-related error detected, WebGL recovery will handle this')
      // Let WebGL recovery handle this error
      return
    }
    
    setHasError(true)
    setErrorMessage(error.message || 'Unknown error')
    
    // Propagate error to parent
    if (onError) {
      onError(error)
    }
  }

  // Show recovery state
  if (isRecovering) {
    console.log('🔄 Dragon is recovering from WebGL context loss')
    return (
      <div className={`flex items-center justify-center ${className}`}>
        <div className="text-yellow-400 font-mono text-center">
          <div className="text-4xl mb-2 animate-pulse">⚡</div>
          <div>Dragon power restoring...</div>
          <div className="text-xs text-blue-400 mt-2">
            Recovery attempt {currentRecoveryAttempt}/3
          </div>
          {diagnostics.contextLossCount > 0 && (
            <div className="text-xs text-gray-400 mt-1">
              Context losses: {diagnostics.contextLossCount}
            </div>
          )}
        </div>
      </div>
    )
  }
  
  // Check if fallback should be triggered
  if (shouldFallback || hasError) {
    console.log('💥 Dragon error state or fallback triggered, showing fallback')
    return (
      <div className={`flex items-center justify-center ${className}`}>
        <div className="text-yellow-400 font-mono text-center">
          <div className="text-4xl mb-2">⚡</div>
          <div>Dragon power loading...</div>
          <div className="text-xs text-red-400 mt-2">
            {shouldFallback ? 'WebGL fallback active' : errorMessage}
          </div>
          {diagnostics.contextLossCount > 0 && (
            <div className="text-xs text-blue-400 mt-1">
              Context losses: {diagnostics.contextLossCount}
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div 
      className={`w-full h-full ${className}`}
      style={{
        minWidth: '200px',
        minHeight: '200px',
        position: 'relative'
      }}
    >      
      <Canvas
        ref={canvasRef}
        camera={{ 
          position: [0, 2, 12], 
          fov: 45,
          near: 0.1,
          far: 100
        }}
        style={{ 
          width: '100%',
          height: '100%',
          display: 'block',
          position: 'absolute',
          top: 0,
          left: 0
        }}
        gl={{ 
          antialias: getQualitySettings().antialias, 
          alpha: true,
          powerPreference: diagnostics.contextLossRisk === 'high' ? 'low-power' : 'high-performance',
          preserveDrawingBuffer: true,
          failIfMajorPerformanceCaveat: false,
          stencil: diagnostics.qualityLevel > 2,
          depth: true,
          logarithmicDepthBuffer: false
        }}
        shadows={getQualitySettings().shadows}
        onCreated={(state) => {
          rendererRef.current = state.gl
          
          // Configure renderer for better recovery
          state.gl.debug.checkShaderErrors = false
          state.gl.capabilities.logarithmicDepthBuffer = false
          
          // Initialize WebGL recovery with the canvas and renderer
          if (canvasRef.current) {
            initializeRecovery(canvasRef.current, state.gl)
          }
        }}
        onError={(error) => {
          console.error('🎮 Three.js Canvas error:', error)
          handleError(new Error('Canvas creation failed'))
        }}
      >
        <SeironGLBDragon
          voiceState={voiceState}
          size={size}
          enableAnimations={enableAnimations}
          modelPath={modelPath}
          onError={handleError}
          onFallback={onFallback}
        />
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

// Wrapped component that includes error boundary (Three.js objects only)
const SeironGLBDragonWithErrorBoundary: React.FC<SeironGLBDragonProps> = (props) => {
  return (
    <GLTFErrorBoundary onError={props.onError || (() => {})}>
      <SeironGLBDragon {...props} />
    </GLTFErrorBoundary>
  )
}

// Component wrapped with WebGL Error Boundary (standalone with Canvas)
const SeironGLBDragonWithWebGLErrorBoundary: React.FC<SeironGLBDragonProps> = (props) => {
  return (
    <WebGLErrorBoundary 
      enableAutoRecovery={true}
      enableContextLossRecovery={true}
      maxRetries={3}
      onRecoverySuccess={() => {
        console.log('🟢 WebGL recovery successful for SeironGLBDragon')
      }}
      onRecoveryFailure={() => {
        console.error('❌ WebGL recovery failed for SeironGLBDragon')
      }}
      onFallbackRequested={() => {
        console.log('⚠️ WebGL fallback requested for SeironGLBDragon')
        if (props.onFallback) {
          props.onFallback()
        }
      }}
    >
      <SeironGLBDragonWithCanvas {...props} />
    </WebGLErrorBoundary>
  )
}

// Preload the optimized GLTF models only once
if (typeof window !== 'undefined') {
  try {
    // Preload only the working models
    useGLTF.preload('/models/seiron.glb') // Primary working model
    console.log('✅ Preloaded primary model: /models/seiron.glb')
  } catch (e) {
    console.warn('Failed to preload GLTF models:', e)
  }
}

export default SeironGLBDragon
export { 
  SeironGLBDragon, 
  SeironGLBDragonWithCanvas,
  SeironGLBDragonWithErrorBoundary, 
  SeironGLBDragonWithWebGLErrorBoundary 
}
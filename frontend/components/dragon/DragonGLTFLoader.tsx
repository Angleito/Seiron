'use client'

import React, { Suspense, useMemo } from 'react'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import { logger } from '@lib/logger'
import { VoiceAnimationState } from './DragonRenderer'

// Types for GLTF loading
interface GLTFResult {
  scene: THREE.Group
  animations: THREE.AnimationClip[]
  materials: { [key: string]: THREE.Material }
  nodes: { [key: string]: THREE.Object3D }
}

interface DragonGLTFLoaderProps {
  modelPath: string
  onLoad?: (gltf: GLTFResult) => void
  onError?: (error: Error) => void
  onProgress?: (progress: number) => void
  enablePreloading?: boolean
  voiceState?: VoiceAnimationState
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'gigantic'
  enableAnimations?: boolean
  className?: string
}

interface DragonMeshProps {
  gltf: GLTFResult
  voiceState?: VoiceAnimationState
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'gigantic'
  enableAnimations?: boolean
  className?: string
}

// Loading fallback component using Three.js objects only
const GLTFLoadingFallback: React.FC<{ modelPath: string }> = ({ modelPath }) => {
  logger.info(`Loading GLTF model: ${modelPath}`)
  
  return (
    <group>
      {/* Central loading indicator */}
      <mesh>
        <sphereGeometry args={[0.5, 16, 16]} />
        <meshStandardMaterial 
          color="#fbbf24" 
          emissive="#f59e0b" 
          emissiveIntensity={0.5}
          transparent
          opacity={0.8}
        />
      </mesh>
      
      {/* Orbiting particles */}
      {Array.from({ length: 6 }).map((_, i) => {
        const angle = (i / 6) * Math.PI * 2
        const radius = 2
        return (
          <mesh 
            key={i}
            position={[
              Math.cos(angle) * radius,
              Math.sin(angle * 0.5) * 0.3,
              Math.sin(angle) * radius
            ]}
          >
            <sphereGeometry args={[0.1, 8, 8]} />
            <meshStandardMaterial 
              color="#fbbf24" 
              emissive="#f59e0b" 
              emissiveIntensity={0.8}
            />
          </mesh>
        )
      })}
      
      {/* Progress indicator ring */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.5, 1.7, 32]} />
        <meshStandardMaterial 
          color="#fbbf24" 
          emissive="#f59e0b" 
          emissiveIntensity={0.3}
          transparent
          opacity={0.6}
        />
      </mesh>
      
      {/* Ambient lighting for loading state */}
      <ambientLight intensity={0.4} color="#fbbf24" />
      <pointLight 
        position={[0, 2, 2]} 
        intensity={0.8} 
        color="#fbbf24" 
        distance={10}
      />
    </group>
  )
}

// Dragon mesh component that uses loaded GLTF
const DragonMesh: React.FC<DragonMeshProps> = ({ 
  gltf, 
  voiceState, 
  size = 'md', 
  enableAnimations = true,
  className 
}) => {
  const meshRef = React.useRef<THREE.Group>(null)
  const mixerRef = React.useRef<THREE.AnimationMixer | null>(null)
  const actionRef = React.useRef<THREE.AnimationAction | null>(null)
  
  // Size configurations
  const sizeConfig = useMemo(() => {
    const configs = {
      sm: { scale: 0.8, position: [0, 0, 0] as [number, number, number] },
      md: { scale: 1.2, position: [0, 0, 0] as [number, number, number] },
      lg: { scale: 1.8, position: [0, 0, 0] as [number, number, number] },
      xl: { scale: 2.5, position: [0, 0, 0] as [number, number, number] },
      gigantic: { scale: 3.5, position: [0, 0, 0] as [number, number, number] }
    }
    return configs[size] || configs.md
  }, [size])
  
  // Clone and configure the scene
  const configuredScene = useMemo(() => {
    if (!gltf?.scene) {
      logger.error('GLTF scene is null or undefined')
      return null
    }
    
    // Clone the scene to avoid conflicts
    const clonedScene = gltf.scene.clone()
    
    // Calculate bounding box and center the model
    const box = new THREE.Box3().setFromObject(clonedScene)
    const center = box.getCenter(new THREE.Vector3())
    const size = box.getSize(new THREE.Vector3())
    
    // Center the model
    clonedScene.position.sub(center)
    
    // Apply size configuration
    clonedScene.scale.setScalar(sizeConfig.scale)
    clonedScene.position.add(new THREE.Vector3(...sizeConfig.position))
    
    // Face forward
    clonedScene.rotation.set(0, 0, 0)
    
    // Enhance materials for Dragon Ball aesthetic
    clonedScene.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        if (child.material instanceof THREE.MeshStandardMaterial) {
          child.material.roughness = 0.3
          child.material.metalness = 0.1
          child.material.color.multiplyScalar(1.2)
        }
        child.castShadow = true
        child.receiveShadow = true
      }
    })
    
    logger.info('GLTF scene configured successfully', {
      boundingBox: { center, size },
      scale: sizeConfig.scale,
      childCount: clonedScene.children.length
    })
    
    return clonedScene
  }, [gltf, sizeConfig])
  
  // Initialize animations
  React.useEffect(() => {
    if (!configuredScene || !gltf?.animations?.length || !enableAnimations) {
      return
    }
    
    // Create animation mixer
    mixerRef.current = new THREE.AnimationMixer(configuredScene)
    
    // Find suitable animation
    const preferredAnimations = ['flying', 'flapping', 'idle']
    let selectedAnimation = gltf.animations.find(clip => 
      preferredAnimations.some(name => clip.name.toLowerCase().includes(name.toLowerCase()))
    ) || gltf.animations[0]
    
    if (selectedAnimation) {
      actionRef.current = mixerRef.current.clipAction(selectedAnimation)
      actionRef.current.setLoop(THREE.LoopRepeat, Infinity)
      actionRef.current.play()
      
      logger.info('Animation started', {
        animationName: selectedAnimation.name,
        duration: selectedAnimation.duration,
        tracks: selectedAnimation.tracks.length
      })
    }
    
    return () => {
      // Cleanup animation mixer
      if (mixerRef.current) {
        mixerRef.current.stopAllAction()
        mixerRef.current.uncacheRoot(mixerRef.current.getRoot())
        mixerRef.current = null
      }
      if (actionRef.current) {
        actionRef.current.stop()
        actionRef.current = null
      }
    }
  }, [configuredScene, gltf, enableAnimations])
  
  // Animation frame update
  React.useEffect(() => {
    if (!mixerRef.current) return
    
    let animationFrameId: number
    const clock = new THREE.Clock()
    
    const animate = () => {
      if (mixerRef.current) {
        mixerRef.current.update(clock.getDelta())
      }
      animationFrameId = requestAnimationFrame(animate)
    }
    
    animate()
    
    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId)
      }
    }
  }, [mixerRef.current])
  
  // Voice state reactions
  React.useEffect(() => {
    if (!meshRef.current || !voiceState) return
    
    // Adjust scale based on voice state
    const baseScale = sizeConfig.scale
    let targetScale = baseScale
    
    if (voiceState.isSpeaking) {
      targetScale = baseScale * 1.1
    } else if (voiceState.isListening) {
      targetScale = baseScale * 1.05
    }
    
    // CRITICAL FIX: Safe scale transition with comprehensive null checks
    if (meshRef.current && 
        meshRef.current.scale && 
        typeof meshRef.current.scale.x === 'number' &&
        typeof meshRef.current.scale.addScalar === 'function') {
      const currentScale = meshRef.current.scale.x
      const scaleDiff = targetScale - currentScale
      
      // Additional safety check for valid scale difference
      if (isFinite(scaleDiff) && Math.abs(scaleDiff) < 10) {
        meshRef.current.scale.addScalar(scaleDiff * 0.1)
      }
    }
    
  }, [voiceState, sizeConfig.scale])
  
  if (!configuredScene) {
    return null
  }
  
  return (
    <group ref={meshRef}>
      <primitive object={configuredScene} />
    </group>
  )
}

// GLTF loader component that handles async loading with Suspense
const GLTFLoader: React.FC<DragonGLTFLoaderProps> = ({ 
  modelPath, 
  onLoad, 
  onError, 
  onProgress,
  ...meshProps 
}) => {
  // Load GLTF using useGLTF hook (this will suspend)
  const gltf = useGLTF(modelPath) as GLTFResult
  
  // Call onLoad when GLTF is loaded
  React.useEffect(() => {
    if (gltf && onLoad) {
      onLoad(gltf)
    }
  }, [gltf, onLoad])
  
  // Validate GLTF structure
  if (!gltf || !gltf.scene) {
    const error = new Error(`Invalid GLTF structure: ${modelPath}`)
    if (onError) {
      onError(error)
    }
    throw error
  }
  
  return <DragonMesh gltf={gltf} {...meshProps} />
}

// Main DragonGLTFLoader component with Suspense
export const DragonGLTFLoader: React.FC<DragonGLTFLoaderProps> = (props) => {
  const { modelPath, onError, enablePreloading = true, ...loaderProps } = props
  
  // Preload the model if enabled
  React.useEffect(() => {
    if (enablePreloading) {
      try {
        useGLTF.preload(modelPath)
        logger.info(`Preloading GLTF model: ${modelPath}`)
      } catch (error) {
        logger.warn(`Failed to preload GLTF model: ${modelPath}`, error)
      }
    }
  }, [modelPath, enablePreloading])
  
  return (
    <Suspense fallback={<GLTFLoadingFallback modelPath={modelPath} />}>
      <GLTFLoader modelPath={modelPath} onError={onError} {...loaderProps} />
    </Suspense>
  )
}

// Hook for imperative GLTF loading
export const useGLTFLoader = (modelPath: string, options?: {
  onLoad?: (gltf: GLTFResult) => void
  onError?: (error: Error) => void
  onProgress?: (progress: number) => void
  enablePreloading?: boolean
}) => {
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<Error | null>(null)
  const [gltf, setGltf] = React.useState<GLTFResult | null>(null)
  
  React.useEffect(() => {
    let mounted = true
    
    const loadGLTF = async () => {
      try {
        setLoading(true)
        setError(null)
        
        if (options?.enablePreloading) {
          useGLTF.preload(modelPath)
        }
        
        // Note: This is a simplified version. In practice, you'd want to use
        // the useGLTF hook within the component that needs the GLTF data.
        const result = await new Promise<GLTFResult>((resolve, reject) => {
          // This is a placeholder - the actual loading should be done
          // within the component using useGLTF hook
          setTimeout(() => {
            reject(new Error('useGLTFLoader should be used within a component that uses useGLTF'))
          }, 100)
        })
        
        if (mounted) {
          setGltf(result)
          if (options?.onLoad) {
            options.onLoad(result)
          }
        }
      } catch (err) {
        if (mounted) {
          const error = err instanceof Error ? err : new Error('GLTF loading failed')
          setError(error)
          if (options?.onError) {
            options.onError(error)
          }
        }
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }
    
    loadGLTF()
    
    return () => {
      mounted = false
    }
  }, [modelPath, options])
  
  return {
    loading,
    error,
    gltf,
    reload: () => {
      setLoading(true)
      setError(null)
      setGltf(null)
    }
  }
}

// Utility functions
export const preloadGLTFModel = (modelPath: string): Promise<GLTFResult> => {
  return new Promise((resolve, reject) => {
    try {
      useGLTF.preload(modelPath)
      // Note: This is a simplified version. The actual implementation
      // would need to handle the asynchronous loading properly.
      logger.info(`Preloaded GLTF model: ${modelPath}`)
      resolve({} as GLTFResult) // Placeholder
    } catch (error) {
      reject(error)
    }
  })
}

export const clearGLTFCache = (modelPath?: string) => {
  try {
    if (modelPath) {
      useGLTF.clear(modelPath)
      logger.info('GLTF cache cleared for model:', modelPath)
    } else {
      // Clear specific known models since clear() requires URL
      const knownModels = [
        '/models/seiron.glb',
        '/models/seiron_animated.gltf',
        '/models/dragon_head.glb',
        '/models/dragon_head_optimized.glb'
      ]
      knownModels.forEach(model => {
        try {
          useGLTF.clear(model)
        } catch (e) {
          // Ignore errors for models that aren't cached
        }
      })
      logger.info('GLTF cache cleared for all known models')
    }
  } catch (error) {
    logger.warn('Failed to clear GLTF cache', error)
  }
}

export default DragonGLTFLoader
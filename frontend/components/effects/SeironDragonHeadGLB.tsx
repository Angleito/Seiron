'use client'

import React, { useRef, useEffect, Suspense, useState } from 'react'
import { useLoader } from '@react-three/fiber'
import { GLTFLoader } from 'three-stdlib'
import * as THREE from 'three'
import { logger } from '@lib/logger'

interface SeironDragonHeadGLBProps {
  lightningActive?: boolean
  onError?: (error: Error) => void
  modelUrl?: string
  enableEyeTracking?: boolean
  intensity?: number
}

// Fallback dragon model using simple geometry
const FallbackDragon: React.FC<{ lightningActive?: boolean }> = ({ lightningActive = false }) => {
  const groupRef = useRef<THREE.Group>(null)
  
  useEffect(() => {
    if (groupRef.current && lightningActive) {
      groupRef.current.rotation.y += 0.01
    }
  })
  
  return (
    <group ref={groupRef}>
      {/* Dragon body */}
      <mesh position={[0, 0, 0]}>
        <coneGeometry args={[0.8, 2, 8]} />
        <meshStandardMaterial color="#ff4444" metalness={0.6} roughness={0.4} />
      </mesh>
      
      {/* Dragon head */}
      <mesh position={[0, 1.2, 0]}>
        <sphereGeometry args={[0.6, 12, 12]} />
        <meshStandardMaterial color="#ff6666" metalness={0.5} roughness={0.3} />
      </mesh>
      
      {/* Eyes */}
      <mesh position={[0.2, 1.3, 0.4]}>
        <sphereGeometry args={[0.1, 8, 8]} />
        <meshStandardMaterial color="#ffff00" emissive="#ffff00" emissiveIntensity={lightningActive ? 2 : 0.5} />
      </mesh>
      <mesh position={[-0.2, 1.3, 0.4]}>
        <sphereGeometry args={[0.1, 8, 8]} />
        <meshStandardMaterial color="#ffff00" emissive="#ffff00" emissiveIntensity={lightningActive ? 2 : 0.5} />
      </mesh>
    </group>
  )
}

// Inner component that actually loads the model - memoized to prevent infinite re-renders
const SeironDragonHeadGLBInner = React.memo(function SeironDragonHeadGLBInner({
  lightningActive = false,
  modelUrl = '/models/seiron_animated.gltf',
  onError
}: SeironDragonHeadGLBProps) {
  const groupRef = useRef<THREE.Group>(null)
  const [loadError, setLoadError] = useState<Error | null>(null)
  
  // List of fallback models to try in order
  const fallbackModels = [
    '/models/seiron_optimized.glb',
    '/models/seiron.glb',
    '/models/dragon_head_optimized.glb',
    '/models/dragon_head.glb'
  ]
  
  const [currentModelUrl, setCurrentModelUrl] = useState(modelUrl)
  const [fallbackIndex, setFallbackIndex] = useState(-1)
  
  useEffect(() => {
    if (loadError && fallbackIndex < fallbackModels.length - 1) {
      const nextIndex = fallbackIndex + 1
      const nextModel = fallbackModels[nextIndex]
      logger.warn(`Failed to load ${currentModelUrl}, trying fallback model: ${nextModel}`)
      setCurrentModelUrl(nextModel || '')
      setFallbackIndex(nextIndex)
      setLoadError(null)
    } else if (loadError && fallbackIndex >= fallbackModels.length - 1) {
      logger.error('All model loading attempts failed, using geometry fallback')
      if (onError) {
        onError(loadError)
      }
    }
  }, [loadError, fallbackIndex, currentModelUrl, onError])
  
  logger.info(`Attempting to load model from: ${currentModelUrl}`)
  
  // Load the model with simplified approach
  let gltf;
  try {
    gltf = useLoader(GLTFLoader, currentModelUrl)
    logger.info('Model loaded successfully:', currentModelUrl)
  } catch (error) {
    logger.error(`Error loading model ${currentModelUrl}:`, error)
    
    // Check if this is a typed array error
    if (error instanceof Error && error.message.includes('Invalid typed array length')) {
      const newError = new Error(
        `Model file corruption detected: The binary data for ${currentModelUrl} is incomplete or corrupted. ` +
        `Expected buffer size does not match actual file size. This often happens when the .bin file is truncated during upload.`
      )
      setLoadError(newError)
    } else {
      setLoadError(error as Error)
    }
    
    // If all fallbacks failed, return the fallback geometry
    if (fallbackIndex >= fallbackModels.length - 1) {
      return <FallbackDragon lightningActive={lightningActive} />
    }
    
    throw error
  }


  // Use the loaded model
  useEffect(() => {
    if (gltf && gltf.scene) {
      // Log model information for debugging
      console.log('Dragon model info:');
      console.log('- Position:', gltf.scene.position);
      console.log('- Scale:', gltf.scene.scale);
      console.log('- Visible:', gltf.scene.visible);
      
      // Calculate bounding box
      const box = new THREE.Box3().setFromObject(gltf.scene);
      const size = box.getSize(new THREE.Vector3());
      const center = box.getCenter(new THREE.Vector3());
      console.log('- Bounding box size:', size);
      console.log('- Bounding box center:', center);
      
      // Make sure it's visible
      gltf.scene.traverse((child: THREE.Object3D) => {
        child.visible = true;
        if (child instanceof THREE.Mesh) {
          console.log('Found mesh:', child.name, 'Material:', child.material);
        }
      });
    }
  }, [gltf]);
  
  // Scale the model appropriately
  const modelScale = 0.02; // Dragon model needs small scale
  
  return (
    <group ref={groupRef} position={[0, -1, -3]} scale={1}>
      {/* Render the GLTF scene directly */}
      {gltf && (
        <primitive 
          object={gltf.scene} 
          scale={[modelScale, modelScale, modelScale]} 
          position={[0, 0, 0]}
          rotation={[0, Math.PI, 0]} // Rotate 180 degrees to face camera
        />
      )}
      
      
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
})

// Error boundary specifically for GLTF loading
class GLTFErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback?: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: any) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }

  override componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    logger.error('GLTF loading error caught by boundary:', error, errorInfo)
  }

  override render() {
    if (this.state.hasError) {
      return this.props.fallback || <FallbackDragon lightningActive={false} />
    }

    return this.props.children
  }
}

// Main component with error boundary and suspense
export function SeironDragonHeadGLB(props: SeironDragonHeadGLBProps) {
  const [error, setError] = useState<Error | null>(null)
  
  useEffect(() => {
    logger.info('SeironDragonHeadGLB mounted with model:', props.modelUrl || '/models/seiron_animated.gltf')
  }, [])

  const handleError = (error: Error) => {
    logger.error('Model loading error:', error)
    setError(error)
    if (props.onError) {
      props.onError(error)
    }
  }

  return (
    <GLTFErrorBoundary fallback={<FallbackDragon lightningActive={props.lightningActive} />}>
      <Suspense fallback={<FallbackDragon lightningActive={false} />}>
        {error ? (
          <FallbackDragon lightningActive={props.lightningActive} />
        ) : (
          <SeironDragonHeadGLBInner {...props} onError={handleError} />
        )}
      </Suspense>
    </GLTFErrorBoundary>
  )
}
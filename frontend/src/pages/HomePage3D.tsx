import React, { Suspense, useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { useGLTF, OrbitControls, Environment } from '@react-three/drei'
import * as THREE from 'three'

// 3D Dragon Component
function Dragon3D() {
  const { scene } = useGLTF('/models/seiron.glb')
  const meshRef = useRef<THREE.Group>(null)
  
  // Clone scene to avoid conflicts and preserve original materials
  const clonedScene = React.useMemo(() => {
    const cloned = scene.clone()
    
    // Traverse and ensure materials maintain their original properties
    cloned.traverse((child) => {
      if (child instanceof THREE.Mesh && child.material) {
        // Clone material to avoid affecting the original
        child.material = child.material.clone()
        
        // Ensure we're not modifying material properties
        if (child.material instanceof THREE.MeshStandardMaterial) {
          // Reset any modifications that might affect appearance
          child.material.needsUpdate = true
        }
      }
    })
    
    return cloned
  }, [scene])
  
  // Animation
  useFrame((state) => {
    if (!meshRef.current) return
    
    // Breathing animation
    const breathingScale = 1 + Math.sin(state.clock.elapsedTime * 0.5) * 0.05
    meshRef.current.scale.setScalar(8 * breathingScale) // Gigantic scale
    
    // Gentle rotation
    meshRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.3) * 0.1
  })
  
  return (
    <group ref={meshRef} position={[0, -3, 0]}>
      <primitive object={clonedScene} />
    </group>
  )
}

// Loading component
function LoadingDragon3D() {
  return (
    <div style={{
      position: 'absolute',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      color: '#fbbf24',
      fontSize: '2rem',
      textAlign: 'center'
    }}>
      <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🐉</div>
      <div>Loading 3D Dragon...</div>
    </div>
  )
}

export default function HomePage3D() {
  
  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative', background: '#000' }}>
      {/* 3D Canvas */}
      <Canvas
        camera={{ position: [0, 0, 15], fov: 45 }}
        style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
        gl={{ 
          outputColorSpace: THREE.LinearSRGBColorSpace,
          toneMapping: THREE.NoToneMapping,
          toneMappingExposure: 1,
          physicallyCorrectLights: true
        }}
      >
        <ambientLight intensity={1} />
        <directionalLight position={[5, 5, 5]} intensity={0.5} color="#ffffff" castShadow={false} />
        
        <Suspense fallback={null}>
          <Dragon3D />
        </Suspense>
        
        <OrbitControls 
          enableZoom={false}
          enablePan={false}
          minPolarAngle={Math.PI / 3}
          maxPolarAngle={Math.PI / 2}
        />
      </Canvas>
      
      {/* UI Overlay */}
      <div style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        textAlign: 'center',
        zIndex: 10,
        pointerEvents: 'none'
      }}>
        <h1 style={{
          fontSize: '5rem',
          fontWeight: 'bold',
          color: '#fbbf24',
          textShadow: '0 0 30px rgba(251, 191, 36, 0.5)',
          marginBottom: '1rem'
        }}>
          SEIRON
        </h1>
        <p style={{
          fontSize: '1.5rem',
          color: '#fbbf24',
          opacity: 0.8
        }}>
          Grant your wildest Sei investing wishes
        </p>
      </div>
    </div>
  )
}

// Preload the model
useGLTF.preload('/models/seiron.glb')
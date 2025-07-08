import React, { Suspense, useRef } from 'react'
import { Canvas, useFrame, useLoader } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js'
import * as THREE from 'three'

// 3D Dragon Component
function Dragon3D() {
  const obj = useLoader(OBJLoader, '/models/dragon_head.obj')
  const meshRef = useRef<THREE.Group>(null)
  const [isMobile, setIsMobile] = React.useState(false)
  
  // Check if mobile
  React.useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])
  
  // Clone and setup OBJ model
  const clonedModel = React.useMemo(() => {
    const cloned = obj.clone()
    
    // Traverse and apply materials to OBJ model
    cloned.traverse((child: THREE.Object3D) => {
      if (child instanceof THREE.Mesh) {
        // Apply a standard material to the OBJ
        child.material = new THREE.MeshStandardMaterial({
          color: 0xff6b35, // Orange color for dragon
          roughness: 0.7,
          metalness: 0.3
        })
        child.castShadow = true
        child.receiveShadow = true
      }
    })
    
    return cloned
  }, [obj])
  
  // Animation
  useFrame((state) => {
    if (!meshRef.current) return
    
    // Responsive scale based on viewport
    const baseScale = isMobile ? 6 : 10
    
    // Breathing animation
    const breathingScale = 1 + Math.sin(state.clock.elapsedTime * 0.5) * 0.05
    meshRef.current.scale.setScalar(baseScale * breathingScale)
    
    // Gentle rotation
    meshRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.3) * 0.1
  })
  
  return (
    <group ref={meshRef} position={[0, isMobile ? -2 : -4, 0]}>
      <primitive object={clonedModel} />
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
    <div style={{ width: '100vw', height: '100vh', position: 'relative', background: '#000', overflow: 'hidden' }}>
      {/* Vignette effect for focus */}
      <div style={{
        position: 'absolute',
        inset: 0,
        background: 'radial-gradient(circle at center, transparent 30%, rgba(0,0,0,0.7) 100%)',
        pointerEvents: 'none',
        zIndex: 5
      }} />
      
      {/* 3D Canvas */}
      <Canvas
        camera={{ position: [0, 0, 15], fov: 45 }}
        style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
        gl={{ 
          outputColorSpace: THREE.LinearSRGBColorSpace,
          toneMapping: THREE.NoToneMapping,
          toneMappingExposure: 1
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
      
      {/* UI Overlay with constrained content */}
      <div style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        textAlign: 'center',
        zIndex: 10,
        pointerEvents: 'none',
        width: '100%',
        maxWidth: '800px',
        padding: '0 1rem'
      }}>
        {/* Energy aura effect */}
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '120%',
          height: '200%',
          background: 'radial-gradient(circle at center, rgba(251, 191, 36, 0.1) 0%, transparent 60%)',
          filter: 'blur(40px)',
          animation: 'pulse 4s ease-in-out infinite'
        }} />
        
        <h1 style={{
          fontSize: 'clamp(3rem, 10vw, 8rem)',
          fontWeight: 'bold',
          color: '#fbbf24',
          textShadow: `
            0 0 30px rgba(251, 191, 36, 0.5),
            0 0 60px rgba(251, 191, 36, 0.3),
            0 0 90px rgba(251, 191, 36, 0.1)
          `,
          marginBottom: 'clamp(0.5rem, 2vw, 2rem)',
          letterSpacing: 'clamp(0.05em, 0.5vw, 0.15em)',
          position: 'relative'
        }}>
          SEIRON
        </h1>
        <p style={{
          fontSize: 'clamp(1rem, 2.5vw, 2rem)',
          color: '#fbbf24',
          opacity: 0.9,
          textShadow: '0 0 20px rgba(251, 191, 36, 0.3)',
          letterSpacing: '0.05em',
          position: 'relative'
        }}>
          Grant your wildest Sei investing wishes
        </p>
      </div>
      
      {/* CSS animations */}
      <style>{`
        @keyframes pulse {
          0%, 100% {
            opacity: 0.6;
            transform: translate(-50%, -50%) scale(1);
          }
          50% {
            opacity: 0.8;
            transform: translate(-50%, -50%) scale(1.1);
          }
        }
        
        @media (min-width: 768px) {
          h1:hover {
            animation: powerUp 0.5s ease-out;
          }
        }
        
        @keyframes powerUp {
          0% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.05);
            filter: brightness(1.2);
          }
          100% {
            transform: scale(1);
          }
        }
      `}</style>
    </div>
  )
}

// Preload the OBJ model
useLoader.preload(OBJLoader, '/models/dragon_head.obj')
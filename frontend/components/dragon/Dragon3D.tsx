'use client'

import React, { useRef, useMemo, useEffect, useState, useCallback } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls, PerspectiveCamera } from '@react-three/drei'
import * as THREE from 'three'
import { motion } from 'framer-motion'
import { 
  useDragonPerformance,
  createPerformancePropComparison,
  adjustParticleCount,
  adjustTextureQuality,
  adjustAnimationQuality,
  LOD_LEVELS,
  LODLevel
} from '../../utils/dragon-performance'

// Types and interfaces
export interface Dragon3DProps {
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
  onClick?: () => void
  enableHover?: boolean
  enableInteraction?: boolean
  animationSpeed?: number
  showParticles?: boolean
  autoRotate?: boolean
  quality?: 'low' | 'medium' | 'high'
  enablePerformanceMode?: boolean
  maxAnimationQuality?: number
  enableLOD?: boolean
  targetFPS?: number
}

interface DragonMeshProps {
  size: number
  animationSpeed: number
  showParticles: boolean
  quality: 'low' | 'medium' | 'high'
  onClick?: () => void
  enableHover?: boolean
  performance: ReturnType<typeof useDragonPerformance>
  maxAnimationQuality: number
}

// Dragon geometry configurations
const DragonConfig = {
  colors: {
    red: new THREE.Color(0xdc2626),
    darkRed: new THREE.Color(0x991b1b),
    gold: new THREE.Color(0xfbbf24),
    darkGold: new THREE.Color(0xd97706),
    eyeGlow: new THREE.Color(0xfef08a),
    fire: new THREE.Color(0xff4500),
  },
  materials: {
    scales: new THREE.MeshPhongMaterial({
      color: 0xdc2626,
      shininess: 100,
      transparent: true,
      opacity: 0.95,
    }),
    belly: new THREE.MeshPhongMaterial({
      color: 0x7f1d1d,
      shininess: 50,
    }),
    gold: new THREE.MeshStandardMaterial({
      color: 0xfbbf24,
      roughness: 0.3,
      metalness: 0.8,
    }),
    darkRed: new THREE.MeshPhongMaterial({
      color: 0x7f1d1d,
      shininess: 30,
    }),
    wing: new THREE.MeshPhongMaterial({
      color: 0xdc2626,
      transparent: true,
      opacity: 0.8,
      side: THREE.DoubleSide,
    }),
    eye: new THREE.MeshPhongMaterial({
      color: 0xfef08a,
      emissive: 0x4d1f00,
      emissiveIntensity: 0.5,
    }),
  },
}

// Performance-aware particle system for magical effects
const ParticleSystem: React.FC<{ 
  count: number; 
  size: number; 
  performance: ReturnType<typeof useDragonPerformance>;
  animationSpeed: number;
}> = ({ count, size, performance, animationSpeed }) => {
  const meshRef = useRef<THREE.Points>(null)
  const frameCountRef = useRef(0)
  
  // Adjust particle count based on performance
  const adjustedCount = useMemo(() => {
    const currentLOD = getCurrentLOD(performance)
    const baseCount = adjustParticleCount(count, currentLOD)
    return Math.max(1, baseCount)
  }, [count, performance.currentLOD])
  
  const [positions, velocities] = useMemo(() => {
    const positions = new Float32Array(adjustedCount * 3)
    const velocities = new Float32Array(adjustedCount * 3)
    
    for (let i = 0; i < adjustedCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * size * 4
      positions[i * 3 + 1] = (Math.random() - 0.5) * size * 4
      positions[i * 3 + 2] = (Math.random() - 0.5) * size * 4
      
      velocities[i * 3] = (Math.random() - 0.5) * 0.02
      velocities[i * 3 + 1] = Math.random() * 0.01 + 0.005
      velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.02
    }
    
    return [positions, velocities]
  }, [adjustedCount, size])

  useFrame((state) => {
    if (!meshRef.current || !meshRef.current.geometry.attributes.position || performance.shouldDisableAnimations) return
    
    // Skip frames for performance optimization
    frameCountRef.current++
    const skipFrames = performance.shouldReduceQuality ? 2 : 1
    if (frameCountRef.current % skipFrames !== 0) return
    
    const positions = meshRef.current.geometry.attributes.position.array as Float32Array
    const speedMultiplier = animationSpeed * (performance.shouldReduceQuality ? 0.5 : 1)
    
    for (let i = 0; i < adjustedCount; i++) {
      const xIndex = i * 3
      const yIndex = i * 3 + 1
      const zIndex = i * 3 + 2
      
      if (positions[xIndex] !== undefined && positions[yIndex] !== undefined && positions[zIndex] !== undefined &&
          velocities[xIndex] !== undefined && velocities[yIndex] !== undefined && velocities[zIndex] !== undefined) {
        positions[xIndex] += velocities[xIndex] * speedMultiplier
        positions[yIndex] += velocities[yIndex] * speedMultiplier
        positions[zIndex] += velocities[zIndex] * speedMultiplier
        
        // Reset particles that go too far
        if (positions[yIndex] > size * 2) {
          positions[xIndex] = (Math.random() - 0.5) * size * 4
          positions[yIndex] = -size * 2
          positions[zIndex] = (Math.random() - 0.5) * size * 4
        }
      }
    }
    
    meshRef.current.geometry.attributes.position.needsUpdate = true
  })

  // Adjust particle size based on LOD
  const particleSize = useMemo(() => {
    const baseSize = size * 0.02
    const currentLOD = getCurrentLOD(performance)
    return baseSize * currentLOD.textureQuality
  }, [size, performance.currentLOD])

  return (
    <points ref={meshRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={adjustedCount}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={particleSize}
        color={DragonConfig.colors.gold}
        transparent
        opacity={performance.currentLOD?.level && performance.currentLOD.level > 2 ? 0.6 : 0.8}
        sizeAttenuation={true}
      />
    </points>
  )
}

// Performance-aware dragon body component
const DragonBody: React.FC<{ 
  size: number; 
  animationSpeed: number; 
  performance: ReturnType<typeof useDragonPerformance> 
}> = ({ size, animationSpeed, performance }) => {
  const bodyRef = useRef<THREE.Group>(null)
  const frameCountRef = useRef(0)
  
  // LOD-aware geometry creation
  const bodyGeometry = useMemo(() => {
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(size * 0.3, size * 0.1, size * 0.2),
      new THREE.Vector3(size * 0.6, 0, size * 0.4),
      new THREE.Vector3(size * 0.9, -size * 0.1, size * 0.2),
      new THREE.Vector3(size * 1.2, 0, 0),
      new THREE.Vector3(size * 1.4, size * 0.1, -size * 0.2),
      new THREE.Vector3(size * 1.6, 0, -size * 0.1),
    ])
    
    // Adjust geometry quality based on LOD
    const currentLOD = getCurrentLOD(performance)
    const segmentCount = currentLOD.level > 2 ? 16 : 32
    const radialSegments = currentLOD.level > 3 ? 4 : 8
    
    return new THREE.TubeGeometry(curve, segmentCount, size * 0.15, radialSegments, false)
  }, [size, performance.currentLOD])

  useFrame((state) => {
    if (!bodyRef.current || performance.shouldDisableAnimations) return
    
    // Skip frames for performance optimization
    frameCountRef.current++
    const skipFrames = performance.shouldReduceQuality ? 3 : 1
    if (frameCountRef.current % skipFrames !== 0) return
    
    const currentLOD = getCurrentLOD(performance)
    const time = state.clock.getElapsedTime() * animationSpeed * currentLOD.animationQuality
    
    // Simplified breathing animation for performance
    if (performance.shouldReduceQuality) {
      const breathe = Math.sin(time * 1) * 0.03 + 1
      bodyRef.current.scale.setScalar(breathe)
    } else {
      // Full breathing animation
      const breathe = Math.sin(time * 2) * 0.05 + 1
      bodyRef.current.scale.setScalar(breathe)
      
      // Subtle undulation (only in high quality mode)
      bodyRef.current.rotation.z = Math.sin(time * 0.5) * 0.1
    }
  })

  return (
    <group ref={bodyRef}>
      <mesh geometry={bodyGeometry} material={DragonConfig.materials.scales} />
      {/* Belly segment */}
      <mesh geometry={bodyGeometry} material={DragonConfig.materials.belly} scale={[0.8, 0.6, 0.8]} />
    </group>
  )
}

// Performance-aware dragon head component
const DragonHead: React.FC<{ 
  size: number; 
  animationSpeed: number; 
  performance: ReturnType<typeof useDragonPerformance> 
}> = ({ size, animationSpeed, performance }) => {
  const headRef = useRef<THREE.Group>(null)
  const eyeRefs = useRef<THREE.Mesh[]>([])
  const frameCountRef = useRef(0)
  
  // Performance-aware head geometry creation
  const headGeometry = useMemo(() => {
    // Adjust geometry detail based on LOD
    const currentLOD = getCurrentLOD(performance)
    const widthSegments = currentLOD.level > 2 ? 8 : 16
    const heightSegments = currentLOD.level > 2 ? 8 : 16
    
    const geometry = new THREE.SphereGeometry(size * 0.25, widthSegments, heightSegments)
    
    // Skip complex geometry modifications in low quality mode
    if (currentLOD.level > 3) {
      return geometry
    }
    
    // Modify geometry to make it more dragon-like
    const positionAttribute = geometry.attributes.position
    if (!positionAttribute) return geometry
    
    const positions = positionAttribute.array as Float32Array
    
    for (let i = 0; i < positions.length; i += 3) {
      const x = positions[i]
      const y = positions[i + 1]
      const z = positions[i + 2]
      
      // Elongate the snout
      if (z !== undefined && z > 0) {
        positions[i + 2] = z * 1.5
      }
      
      // Create ridges (only in high quality)
      if (y !== undefined && y > 0 && x !== undefined && currentLOD.level < 2) {
        positions[i + 1] = y * (1 + Math.sin(x * 8) * 0.1)
      }
    }
    
    positionAttribute.needsUpdate = true
    geometry.computeVertexNormals()
    return geometry
  }, [size, performance.currentLOD])

  const hornGeometry = useMemo(() => {
    return new THREE.ConeGeometry(size * 0.02, size * 0.15, 6)
  }, [size])

  useFrame((state) => {
    if (!headRef.current) return
    
    const time = state.clock.getElapsedTime() * animationSpeed
    
    // Head bobbing
    headRef.current.position.y = Math.sin(time * 2) * size * 0.05
    headRef.current.rotation.y = Math.sin(time * 0.8) * 0.2
    
    // Eye glow animation
    eyeRefs.current.forEach((eye, index) => {
      if (eye) {
        const material = eye.material as THREE.MeshPhongMaterial
        material.emissiveIntensity = 0.3 + Math.sin(time * 3 + index) * 0.2
      }
    })
  })

  return (
    <group ref={headRef} position={[0, size * 0.1, size * 0.4]}>
      {/* Main head */}
      <mesh geometry={headGeometry} material={DragonConfig.materials.scales} />
      
      {/* Eyes */}
      <mesh 
        ref={(el) => el && (eyeRefs.current[0] = el)}
        position={[size * 0.1, size * 0.05, size * 0.15]}
        geometry={new THREE.SphereGeometry(size * 0.03, 8, 8)}
        material={DragonConfig.materials.eye}
      />
      <mesh 
        ref={(el) => el && (eyeRefs.current[1] = el)}
        position={[-size * 0.1, size * 0.05, size * 0.15]}
        geometry={new THREE.SphereGeometry(size * 0.03, 8, 8)}
        material={DragonConfig.materials.eye}
      />
      
      {/* Horns */}
      <mesh 
        position={[size * 0.08, size * 0.2, size * 0.1]}
        rotation={[0, 0, 0.3]}
        geometry={hornGeometry}
        material={DragonConfig.materials.gold}
      />
      <mesh 
        position={[-size * 0.08, size * 0.2, size * 0.1]}
        rotation={[0, 0, -0.3]}
        geometry={hornGeometry}
        material={DragonConfig.materials.gold}
      />
      
      {/* Nostrils */}
      <mesh 
        position={[size * 0.05, size * 0.02, size * 0.22]}
        geometry={new THREE.SphereGeometry(size * 0.01, 6, 6)}
        material={DragonConfig.materials.darkRed}
      />
      <mesh 
        position={[-size * 0.05, size * 0.02, size * 0.22]}
        geometry={new THREE.SphereGeometry(size * 0.01, 6, 6)}
        material={DragonConfig.materials.darkRed}
      />
    </group>
  )
}

// Performance-aware dragon wings component
const DragonWings: React.FC<{ 
  size: number; 
  animationSpeed: number; 
  performance: ReturnType<typeof useDragonPerformance> 
}> = ({ size, animationSpeed, performance }) => {
  const leftWingRef = useRef<THREE.Group>(null)
  const rightWingRef = useRef<THREE.Group>(null)
  
  // Create wing geometry
  const wingGeometry = useMemo(() => {
    const shape = new THREE.Shape()
    shape.moveTo(0, 0)
    shape.bezierCurveTo(size * 0.1, size * 0.3, size * 0.4, size * 0.2, size * 0.5, 0)
    shape.bezierCurveTo(size * 0.4, -size * 0.1, size * 0.2, -size * 0.05, 0, 0)
    
    return new THREE.ShapeGeometry(shape)
  }, [size])

  useFrame((state) => {
    if (!leftWingRef.current || !rightWingRef.current) return
    
    const time = state.clock.getElapsedTime() * animationSpeed
    
    // Wing flapping animation
    const flapAngle = Math.sin(time * 4) * 0.5 + 0.5
    leftWingRef.current.rotation.z = flapAngle
    rightWingRef.current.rotation.z = -flapAngle
    
    // Wing positioning
    leftWingRef.current.position.y = Math.sin(time * 4) * size * 0.02
    rightWingRef.current.position.y = Math.sin(time * 4) * size * 0.02
  })

  return (
    <group>
      {/* Left wing */}
      <group ref={leftWingRef} position={[size * 0.2, size * 0.1, size * 0.1]}>
        <mesh geometry={wingGeometry} material={DragonConfig.materials.wing} />
        {/* Wing membrane details */}
        <mesh 
          geometry={new THREE.PlaneGeometry(size * 0.4, size * 0.15)}
          material={DragonConfig.materials.wing}
          position={[size * 0.2, size * 0.1, 0]}
        />
      </group>
      
      {/* Right wing */}
      <group ref={rightWingRef} position={[-size * 0.2, size * 0.1, size * 0.1]}>
        <mesh geometry={wingGeometry} material={DragonConfig.materials.wing} scale={[-1, 1, 1]} />
        {/* Wing membrane details */}
        <mesh 
          geometry={new THREE.PlaneGeometry(size * 0.4, size * 0.15)}
          material={DragonConfig.materials.wing}
          position={[-size * 0.2, size * 0.1, 0]}
        />
      </group>
    </group>
  )
}

// Performance-aware main dragon mesh component
const DragonMesh: React.FC<DragonMeshProps> = ({
  size,
  animationSpeed,
  showParticles,
  quality,
  onClick,
  enableHover,
  performance,
  maxAnimationQuality
}) => {
  const groupRef = useRef<THREE.Group>(null)
  const [hovered, setHovered] = useState(false)
  const frameCountRef = useRef(0)
  
  // Dynamic particle count based on performance and LOD
  const particleCount = useMemo(() => {
    const baseCount = quality === 'low' ? 50 : quality === 'medium' ? 100 : 200
    const currentLOD = getCurrentLOD(performance)
    return adjustParticleCount(baseCount, currentLOD)
  }, [quality, performance.currentLOD])

  useFrame((state) => {
    if (!groupRef.current || performance.shouldDisableAnimations) return
    
    // Skip frames for performance optimization
    frameCountRef.current++
    const skipFrames = performance.shouldReduceQuality ? 2 : 1
    if (frameCountRef.current % skipFrames !== 0) return
    
    const currentLOD = getCurrentLOD(performance)
    const time = state.clock.getElapsedTime() * animationSpeed * maxAnimationQuality * currentLOD.animationQuality
    
    // Performance-aware floating animation
    if (performance.shouldReduceQuality) {
      // Simplified animation
      groupRef.current.position.y = Math.sin(time * 0.8) * size * 0.05
    } else {
      // Full floating animation
      groupRef.current.position.y = Math.sin(time * 1.5) * size * 0.1
      groupRef.current.rotation.y = Math.sin(time * 0.3) * 0.1
    }
    
    // Hover effect (only in high quality mode)
    if (hovered && enableHover && !performance.shouldReduceQuality) {
      groupRef.current.scale.setScalar(1.1)
    } else {
      groupRef.current.scale.setScalar(1)
    }
  })

  return (
    <group 
      ref={groupRef}
      onClick={onClick}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
    >
      {/* Main dragon parts */}
      <DragonBody size={size} animationSpeed={animationSpeed} performance={performance} />
      <DragonHead size={size} animationSpeed={animationSpeed} performance={performance} />
      <DragonWings size={size} animationSpeed={animationSpeed} performance={performance} />
      
      {/* Particle effects */}
      {showParticles && (performance.currentLOD?.particles?.enabled ?? true) && (
        <ParticleSystem 
          count={particleCount} 
          size={size} 
          performance={performance}
          animationSpeed={animationSpeed}
        />
      )}
      
      {/* Lighting */}
      <ambientLight intensity={0.4} />
      <pointLight 
        position={[size * 0.5, size * 0.5, size * 0.5]} 
        intensity={0.8} 
        color={DragonConfig.colors.gold}
      />
      <pointLight 
        position={[-size * 0.5, size * 0.5, size * 0.5]} 
        intensity={0.6} 
        color={DragonConfig.colors.red}
      />
    </group>
  )
}

// Size mappings
const sizeMap = {
  sm: { size: 0.5, canvasSize: 'w-32 h-32' },
  md: { size: 0.8, canvasSize: 'w-48 h-48' },
  lg: { size: 1.2, canvasSize: 'w-64 h-64' },
  xl: { size: 1.8, canvasSize: 'w-96 h-96' },
}

// Helper to ensure LOD is never undefined
const getCurrentLOD = (performance: any): LODLevel => {
  return performance.currentLOD || LOD_LEVELS[2] // Default to medium
}

// Performance-aware prop comparison
const propComparison = createPerformancePropComparison<Dragon3DProps>([])

// Main Dragon3D component
const Dragon3DInternal: React.FC<Dragon3DProps> = ({
  size = 'lg',
  className = '',
  onClick,
  enableHover = true,
  enableInteraction = true,
  animationSpeed = 1,
  showParticles = true,
  autoRotate = false,
  quality = 'medium',
  enablePerformanceMode = true,
  maxAnimationQuality = 1.0,
  enableLOD = true,
  targetFPS = 60
}) => {
  const { size: dragonSize, canvasSize } = sizeMap[size]
  
  // Performance monitoring
  const performance = useDragonPerformance({
    config: {
      targetFPS,
      adaptiveLOD: enableLOD,
      autoOptimization: enablePerformanceMode,
      maxMemoryMB: 512 // 3D dragon uses more memory
    }
  })
  
  return (
    <motion.div
      className={`${canvasSize} ${className} cursor-pointer select-none`}
      whileHover={enableHover ? { scale: 1.05 } : undefined}
      whileTap={{ scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
    >
      <Canvas
        camera={{ position: [0, 0, 5], fov: 50 }}
        style={{ width: '100%', height: '100%' }}
      >
        <PerspectiveCamera makeDefault />
        
        {/* Scene setup */}
        <color attach="background" args={['#000000']} />
        <fog attach="fog" args={['#000000', 5, 15]} />
        
        {/* Dragon mesh */}
        <DragonMesh
          size={dragonSize}
          animationSpeed={animationSpeed * maxAnimationQuality}
          showParticles={showParticles}
          quality={quality}
          onClick={onClick}
          enableHover={enableHover}
          performance={performance}
          maxAnimationQuality={maxAnimationQuality}
        />
        
        {/* Performance-aware controls */}
        {enableInteraction && !performance.shouldReduceQuality && (
          <OrbitControls 
            enablePan={false}
            enableZoom={false}
            autoRotate={autoRotate && !performance.shouldDisableAnimations}
            autoRotateSpeed={0.5 * maxAnimationQuality}
            maxPolarAngle={Math.PI / 2}
            minPolarAngle={Math.PI / 3}
          />
        )}
      </Canvas>
    </motion.div>
  )
}

// Memoized component with performance-aware prop comparison
const Dragon3D = React.memo(Dragon3DInternal, (prevProps, nextProps) => {
  return propComparison(prevProps, nextProps)
})

// Add display name for debugging
Dragon3D.displayName = 'Dragon3D'

export default Dragon3D
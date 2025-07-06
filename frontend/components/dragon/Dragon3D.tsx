'use client'

import React, { useRef, useMemo, useEffect, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls, PerspectiveCamera } from '@react-three/drei'
import * as THREE from 'three'
import { motion } from 'framer-motion'

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
}

interface DragonMeshProps {
  size: number
  animationSpeed: number
  showParticles: boolean
  quality: 'low' | 'medium' | 'high'
  onClick?: () => void
  enableHover?: boolean
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

// Particle system for magical effects
const ParticleSystem: React.FC<{ count: number; size: number }> = ({ count, size }) => {
  const meshRef = useRef<THREE.Points>(null)
  const [positions, velocities] = useMemo(() => {
    const positions = new Float32Array(count * 3)
    const velocities = new Float32Array(count * 3)
    
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * size * 4
      positions[i * 3 + 1] = (Math.random() - 0.5) * size * 4
      positions[i * 3 + 2] = (Math.random() - 0.5) * size * 4
      
      velocities[i * 3] = (Math.random() - 0.5) * 0.02
      velocities[i * 3 + 1] = Math.random() * 0.01 + 0.005
      velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.02
    }
    
    return [positions, velocities]
  }, [count, size])

  useFrame((state) => {
    if (!meshRef.current || !meshRef.current.geometry.attributes.position) return
    
    const positions = meshRef.current.geometry.attributes.position.array as Float32Array
    
    for (let i = 0; i < count; i++) {
      const xIndex = i * 3
      const yIndex = i * 3 + 1
      const zIndex = i * 3 + 2
      
      if (positions[xIndex] !== undefined && positions[yIndex] !== undefined && positions[zIndex] !== undefined &&
          velocities[xIndex] !== undefined && velocities[yIndex] !== undefined && velocities[zIndex] !== undefined) {
        positions[xIndex] += velocities[xIndex]
        positions[yIndex] += velocities[yIndex]
        positions[zIndex] += velocities[zIndex]
        
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

  return (
    <points ref={meshRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={size * 0.02}
        color={DragonConfig.colors.gold}
        transparent
        opacity={0.8}
        sizeAttenuation={true}
      />
    </points>
  )
}

// Dragon body component
const DragonBody: React.FC<{ size: number; animationSpeed: number }> = ({ size, animationSpeed }) => {
  const bodyRef = useRef<THREE.Group>(null)
  const segmentRefs = useRef<THREE.Mesh[]>([])
  
  // Create serpentine body using tube geometry
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
    
    return new THREE.TubeGeometry(curve, 32, size * 0.15, 8, false)
  }, [size])

  useFrame((state) => {
    if (!bodyRef.current) return
    
    const time = state.clock.getElapsedTime() * animationSpeed
    
    // Breathing animation
    const breathe = Math.sin(time * 2) * 0.05 + 1
    bodyRef.current.scale.setScalar(breathe)
    
    // Subtle undulation
    bodyRef.current.rotation.z = Math.sin(time * 0.5) * 0.1
  })

  return (
    <group ref={bodyRef}>
      <mesh geometry={bodyGeometry} material={DragonConfig.materials.scales} />
      {/* Belly segment */}
      <mesh geometry={bodyGeometry} material={DragonConfig.materials.belly} scale={[0.8, 0.6, 0.8]} />
    </group>
  )
}

// Dragon head component
const DragonHead: React.FC<{ size: number; animationSpeed: number }> = ({ size, animationSpeed }) => {
  const headRef = useRef<THREE.Group>(null)
  const eyeRefs = useRef<THREE.Mesh[]>([])
  
  // Create custom head geometry
  const headGeometry = useMemo(() => {
    const geometry = new THREE.SphereGeometry(size * 0.25, 16, 16)
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
      
      // Create ridges
      if (y !== undefined && y > 0 && x !== undefined) {
        positions[i + 1] = y * (1 + Math.sin(x * 8) * 0.1)
      }
    }
    
    positionAttribute.needsUpdate = true
    geometry.computeVertexNormals()
    return geometry
  }, [size])

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

// Dragon wings component
const DragonWings: React.FC<{ size: number; animationSpeed: number }> = ({ size, animationSpeed }) => {
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

// Main dragon mesh component
const DragonMesh: React.FC<DragonMeshProps> = ({
  size,
  animationSpeed,
  showParticles,
  quality,
  onClick,
  enableHover,
}) => {
  const groupRef = useRef<THREE.Group>(null)
  const [hovered, setHovered] = useState(false)
  
  // LOD system based on quality
  const particleCount = useMemo(() => {
    switch (quality) {
      case 'low': return 50
      case 'medium': return 100
      case 'high': return 200
      default: return 100
    }
  }, [quality])

  useFrame((state) => {
    if (!groupRef.current) return
    
    const time = state.clock.getElapsedTime() * animationSpeed
    
    // Floating animation
    groupRef.current.position.y = Math.sin(time * 1.5) * size * 0.1
    groupRef.current.rotation.y = Math.sin(time * 0.3) * 0.1
    
    // Hover effect
    if (hovered && enableHover) {
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
      <DragonBody size={size} animationSpeed={animationSpeed} />
      <DragonHead size={size} animationSpeed={animationSpeed} />
      <DragonWings size={size} animationSpeed={animationSpeed} />
      
      {/* Particle effects */}
      {showParticles && (
        <ParticleSystem count={particleCount} size={size} />
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

// Main Dragon3D component
const Dragon3D: React.FC<Dragon3DProps> = ({
  size = 'lg',
  className = '',
  onClick,
  enableHover = true,
  enableInteraction = true,
  animationSpeed = 1,
  showParticles = true,
  autoRotate = false,
  quality = 'medium',
}) => {
  const { size: dragonSize, canvasSize } = sizeMap[size]
  
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
          animationSpeed={animationSpeed}
          showParticles={showParticles}
          quality={quality}
          onClick={onClick}
          enableHover={enableHover}
        />
        
        {/* Controls */}
        {enableInteraction && (
          <OrbitControls 
            enablePan={false}
            enableZoom={false}
            autoRotate={autoRotate}
            autoRotateSpeed={0.5}
            maxPolarAngle={Math.PI / 2}
            minPolarAngle={Math.PI / 3}
          />
        )}
      </Canvas>
    </motion.div>
  )
}

export default Dragon3D
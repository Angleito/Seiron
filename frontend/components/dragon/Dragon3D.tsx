'use client'

import React, { useRef, useMemo, useEffect, useState, Suspense } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, PerspectiveCamera, useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import { motion } from 'framer-motion'
import { VoiceAnimationState } from './DragonRenderer'
import { 
  useDragonPerformance,
  createPerformancePropComparison,
  adjustParticleCount,
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
  voiceState?: VoiceAnimationState
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
  voiceState?: VoiceAnimationState
}

// Dragon model URL
const DRAGON_MODEL_URL = 'https://rawcdn.githack.com/KhronosGroup/glTF-Sample-Models/master/2.0/DragonAttenuation/glTF-Binary/DragonAttenuation.glb'

// Dragon configuration with red/golden materials
const DragonConfig = {
  colors: {
    red: new THREE.Color(0xdc2626),
    darkRed: new THREE.Color(0x991b1b),
    gold: new THREE.Color(0xfbbf24),
    darkGold: new THREE.Color(0xd97706),
    eyeGlow: new THREE.Color(0x3b82f6), // Blue for voice state
    fire: new THREE.Color(0xff4500),
  },
  materials: {
    // Primary dragon body material - red with metallic finish
    dragonBody: new THREE.MeshStandardMaterial({
      color: 0xdc2626,
      roughness: 0.2,
      metalness: 0.8,
      emissive: 0x3d0000,
      emissiveIntensity: 0.1,
    }),
    // Secondary material for belly/undersides
    dragonBelly: new THREE.MeshStandardMaterial({
      color: 0x991b1b,
      roughness: 0.4,
      metalness: 0.6,
    }),
    // Golden accents for horns, claws, wing bones
    goldAccents: new THREE.MeshPhysicalMaterial({
      color: 0xfbbf24,
      roughness: 0.1,
      metalness: 0.9,
      reflectivity: 0.8,
      clearcoat: 0.5,
      clearcoatRoughness: 0.1,
    }),
    // Wing membrane material - semi-transparent red
    wingMembrane: new THREE.MeshStandardMaterial({
      color: 0xdc2626,
      transparent: true,
      opacity: 0.8,
      side: THREE.DoubleSide,
      roughness: 0.3,
      metalness: 0.2,
      emissive: 0x2d0000,
      emissiveIntensity: 0.1,
    }),
    // Wing bone structure - golden
    wingBone: new THREE.MeshStandardMaterial({
      color: 0xfbbf24,
      roughness: 0.2,
      metalness: 0.9,
    }),
    // Eye material with blue glow
    eye: new THREE.MeshPhongMaterial({
      color: 0x3b82f6,
      emissive: 0x1e40af,
      emissiveIntensity: 0.3,
    }),
  },
}

// Performance-aware particle system for magical effects
const ParticleSystem: React.FC<{ 
  count: number; 
  size: number; 
  performance: ReturnType<typeof useDragonPerformance>;
  animationSpeed: number;
  voiceState?: VoiceAnimationState;
}> = ({ count, size, performance, animationSpeed, voiceState }) => {
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

  // Particle color based on voice state
  const particleColor = useMemo(() => {
    if (voiceState?.isSpeaking) return DragonConfig.colors.fire
    if (voiceState?.isListening) return DragonConfig.colors.eyeGlow
    if (voiceState?.isProcessing) return new THREE.Color(0x8b5cf6) // Purple
    return DragonConfig.colors.gold
  }, [voiceState])

  useFrame(() => {
    if (!meshRef.current || !meshRef.current.geometry.attributes.position || performance.shouldDisableAnimations) return
    
    // Skip frames for performance optimization
    frameCountRef.current++
    const skipFrames = performance.shouldReduceQuality ? 2 : 1
    if (frameCountRef.current % skipFrames !== 0) return
    
    const positions = meshRef.current.geometry.attributes.position.array as Float32Array
    const speedMultiplier = animationSpeed * (performance.shouldReduceQuality ? 0.5 : 1)
    
    // Enhance particle movement based on voice state
    const voiceMultiplier = voiceState?.isSpeaking ? 2 : voiceState?.isListening ? 1.5 : 1
    
    for (let i = 0; i < adjustedCount; i++) {
      const xIndex = i * 3
      const yIndex = i * 3 + 1
      const zIndex = i * 3 + 2
      
      if (positions[xIndex] !== undefined && positions[yIndex] !== undefined && positions[zIndex] !== undefined &&
          velocities[xIndex] !== undefined && velocities[yIndex] !== undefined && velocities[zIndex] !== undefined) {
        positions[xIndex] += velocities[xIndex] * speedMultiplier * voiceMultiplier
        positions[yIndex] += velocities[yIndex] * speedMultiplier * voiceMultiplier
        positions[zIndex] += velocities[zIndex] * speedMultiplier * voiceMultiplier
        
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

  // Adjust particle size based on LOD and voice state
  const particleSize = useMemo(() => {
    const baseSize = size * 0.02
    const currentLOD = getCurrentLOD(performance)
    const voiceMultiplier = voiceState?.isSpeaking ? 1.5 : voiceState?.volume ? 1 + voiceState.volume * 0.5 : 1
    return baseSize * currentLOD.textureQuality * voiceMultiplier
  }, [size, performance.currentLOD, voiceState])

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
        color={particleColor}
        transparent
        opacity={voiceState?.isSpeaking ? 0.9 : 0.6}
        sizeAttenuation={true}
      />
    </points>
  )
}

// Dragon model component using GLTFLoader
const DragonModel: React.FC<{
  size: number
  animationSpeed: number
  performance: ReturnType<typeof useDragonPerformance>
  voiceState?: VoiceAnimationState
}> = ({ size, animationSpeed, performance, voiceState }) => {
  const { scene } = useGLTF(DRAGON_MODEL_URL)
  const dragonRef = useRef<THREE.Group>(null)
  const frameCountRef = useRef(0)
  const [originalMaterials] = useState<Map<string, THREE.Material>>(new Map())
  
  // Scale the dragon model appropriately
  const scaledDragon = useMemo(() => {
    if (!scene) return null
    
    const clonedScene = scene.clone()
    clonedScene.scale.setScalar(size * 0.02) // Scale from the example
    
    // Apply red/golden materials to the dragon
    clonedScene.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        // Store original material for cleanup
        if (child.material && !originalMaterials.has(child.uuid)) {
          originalMaterials.set(child.uuid, child.material)
        }
        
        // Apply new materials based on object name or position
        if (child.name.toLowerCase().includes('eye')) {
          child.material = DragonConfig.materials.eye
        } else if (child.name.toLowerCase().includes('horn') || 
                   child.name.toLowerCase().includes('claw') ||
                   child.name.toLowerCase().includes('tooth')) {
          child.material = DragonConfig.materials.goldAccents
        } else {
          // Main body gets red material
          child.material = DragonConfig.materials.dragonBody
        }
        
        child.castShadow = true
        child.receiveShadow = true
      }
    })
    
    return clonedScene
  }, [scene, size, originalMaterials])

  // Animation loop
  useFrame((state) => {
    if (!dragonRef.current || performance.shouldDisableAnimations) return
    
    frameCountRef.current++
    const skipFrames = performance.shouldReduceQuality ? 2 : 1
    if (frameCountRef.current % skipFrames !== 0) return
    
    const time = state.clock.getElapsedTime() * animationSpeed
    
    // Base breathing animation
    if (!performance.shouldReduceQuality) {
      const breathe = Math.sin(time * 2) * 0.03 + 1
      dragonRef.current.scale.setScalar(breathe * size * 0.02)
    }
    
    // Voice state animations
    if (voiceState) {
      // Listening state - attentive pose
      if (voiceState.isListening) {
        dragonRef.current.rotation.y = Math.sin(time * 1.5) * 0.1
        dragonRef.current.position.y = Math.sin(time * 3) * size * 0.05
      }
      
      // Speaking state - more dramatic movement
      if (voiceState.isSpeaking) {
        dragonRef.current.rotation.y = Math.sin(time * 2) * 0.2
        dragonRef.current.position.y = Math.sin(time * 4) * size * 0.1
        const intensity = voiceState.volume || 0.5
        dragonRef.current.rotation.z = Math.sin(time * 3) * 0.1 * intensity
      }
      
      // Processing state - contemplative movement
      if (voiceState.isProcessing) {
        dragonRef.current.rotation.y = Math.sin(time * 0.5) * 0.05
        dragonRef.current.position.y = Math.sin(time * 1) * size * 0.02
      }
    }
    
    // Default floating animation when idle
    if (!voiceState || voiceState.isIdle) {
      dragonRef.current.position.y = Math.sin(time * 1.5) * size * 0.03
      dragonRef.current.rotation.y = Math.sin(time * 0.3) * 0.05
    }
  })

  // Cleanup
  useEffect(() => {
    return () => {
      originalMaterials.forEach((material) => {
        material.dispose()
      })
      originalMaterials.clear()
    }
  }, [originalMaterials])

  if (!scaledDragon) return null

  return (
    <group ref={dragonRef}>
      <primitive object={scaledDragon} />
    </group>
  )
}

// Anatomically correct dragon wings positioned on the sides above arms
const DragonWings: React.FC<{
  size: number
  animationSpeed: number
  performance: ReturnType<typeof useDragonPerformance>
  voiceState?: VoiceAnimationState
}> = ({ size, animationSpeed, performance, voiceState }) => {
  const leftWingRef = useRef<THREE.Group>(null)
  const rightWingRef = useRef<THREE.Group>(null)
  const frameCountRef = useRef(0)
  
  // Wing dimensions based on dragon size
  const wingSpan = size * 1.5
  const wingHeight = size * 0.8
  const shoulderWidth = size * 0.4
  const shoulderHeight = size * 0.3
  const backOffset = size * 0.1

  // Create anatomically correct wing geometry
  const wingComponents = useMemo(() => {
    // Wing bone structure
    const wingBoneGeometry = new THREE.CylinderGeometry(size * 0.01, size * 0.005, wingSpan * 0.6, 8)
    
    // Wing membrane using shape geometry for natural curves
    const wingShape = new THREE.Shape()
    wingShape.moveTo(0, 0)
    wingShape.bezierCurveTo(
      wingSpan * 0.2, wingHeight * 0.4, 
      wingSpan * 0.6, wingHeight * 0.3, 
      wingSpan * 0.8, wingHeight * 0.1
    )
    wingShape.bezierCurveTo(
      wingSpan * 0.7, -wingHeight * 0.1,
      wingSpan * 0.4, -wingHeight * 0.05,
      wingSpan * 0.1, -wingHeight * 0.02
    )
    wingShape.bezierCurveTo(
      wingSpan * 0.05, -wingHeight * 0.01,
      0, 0,
      0, 0
    )
    
    const wingMembraneGeometry = new THREE.ShapeGeometry(wingShape)
    
    // Secondary wing fingers for more realistic structure
    const fingerBoneGeometry = new THREE.CylinderGeometry(size * 0.005, size * 0.002, wingSpan * 0.4, 6)
    
    return {
      wingBoneGeometry,
      wingMembraneGeometry,
      fingerBoneGeometry
    }
  }, [size, wingSpan, wingHeight])

  useFrame((state) => {
    if (!leftWingRef.current || !rightWingRef.current || performance.shouldDisableAnimations) return
    
    frameCountRef.current++
    const skipFrames = performance.shouldReduceQuality ? 2 : 1
    if (frameCountRef.current % skipFrames !== 0) return
    
    const time = state.clock.getElapsedTime() * animationSpeed
    
    // Base wing animation speed and intensity
    let flapSpeed = 2
    let flapIntensity = 0.3
    let spreadAmount = 0.2
    
    // Modify animation based on voice state
    if (voiceState) {
      if (voiceState.isListening) {
        // Wings spread attentively
        spreadAmount = 0.5
        flapSpeed = 1.5
        flapIntensity = 0.2
      } else if (voiceState.isSpeaking) {
        // Dramatic wing movement
        spreadAmount = 0.8
        flapSpeed = 3
        flapIntensity = 0.6
        const intensity = voiceState.volume || 0.5
        flapIntensity *= (0.5 + intensity)
      } else if (voiceState.isProcessing) {
        // Wings folded contemplatively
        spreadAmount = 0.1
        flapSpeed = 0.8
        flapIntensity = 0.1
      } else if (voiceState.isIdle) {
        // Gentle breathing movement
        spreadAmount = 0.3
        flapSpeed = 1
        flapIntensity = 0.15
      }
    }
    
    // Calculate wing positions and rotations
    const flapAngle = Math.sin(time * flapSpeed) * flapIntensity
    const spreadAngle = spreadAmount * Math.PI / 4
    
    // Left wing animation
    leftWingRef.current.rotation.z = spreadAngle + flapAngle
    leftWingRef.current.rotation.y = Math.sin(time * flapSpeed * 0.5) * 0.1
    leftWingRef.current.position.y = shoulderHeight + Math.sin(time * flapSpeed) * size * 0.02
    
    // Right wing animation (mirrored)
    rightWingRef.current.rotation.z = -(spreadAngle + flapAngle)
    rightWingRef.current.rotation.y = -Math.sin(time * flapSpeed * 0.5) * 0.1
    rightWingRef.current.position.y = shoulderHeight + Math.sin(time * flapSpeed) * size * 0.02
  })

  return (
    <group>
      {/* Left wing - positioned on dragon's left shoulder */}
      <group 
        ref={leftWingRef} 
        position={[-shoulderWidth, shoulderHeight, backOffset]}
      >
        {/* Main wing bone (humerus equivalent) */}
        <mesh 
          geometry={wingComponents.wingBoneGeometry}
          material={DragonConfig.materials.wingBone}
          rotation={[0, 0, Math.PI / 2]}
          position={[wingSpan * 0.3, 0, 0]}
        />
        
        {/* Wing finger bones */}
        <mesh 
          geometry={wingComponents.fingerBoneGeometry}
          material={DragonConfig.materials.wingBone}
          rotation={[0, 0, Math.PI / 3]}
          position={[wingSpan * 0.5, wingHeight * 0.2, 0]}
        />
        <mesh 
          geometry={wingComponents.fingerBoneGeometry}
          material={DragonConfig.materials.wingBone}
          rotation={[0, 0, Math.PI / 6]}
          position={[wingSpan * 0.6, wingHeight * 0.1, 0]}
        />
        
        {/* Wing membrane */}
        <mesh 
          geometry={wingComponents.wingMembraneGeometry}
          material={DragonConfig.materials.wingMembrane}
          position={[0, 0, 0]}
        />
      </group>
      
      {/* Right wing - positioned on dragon's right shoulder */}
      <group 
        ref={rightWingRef} 
        position={[shoulderWidth, shoulderHeight, backOffset]}
      >
        {/* Main wing bone (humerus equivalent) */}
        <mesh 
          geometry={wingComponents.wingBoneGeometry}
          material={DragonConfig.materials.wingBone}
          rotation={[0, 0, -Math.PI / 2]}
          position={[-wingSpan * 0.3, 0, 0]}
        />
        
        {/* Wing finger bones */}
        <mesh 
          geometry={wingComponents.fingerBoneGeometry}
          material={DragonConfig.materials.wingBone}
          rotation={[0, 0, -Math.PI / 3]}
          position={[-wingSpan * 0.5, wingHeight * 0.2, 0]}
        />
        <mesh 
          geometry={wingComponents.fingerBoneGeometry}
          material={DragonConfig.materials.wingBone}
          rotation={[0, 0, -Math.PI / 6]}
          position={[-wingSpan * 0.6, wingHeight * 0.1, 0]}
        />
        
        {/* Wing membrane (mirrored) */}
        <mesh 
          geometry={wingComponents.wingMembraneGeometry}
          material={DragonConfig.materials.wingMembrane}
          scale={[-1, 1, 1]}
          position={[0, 0, 0]}
        />
      </group>
    </group>
  )
}

// Main dragon mesh component with model and wings
const DragonMesh: React.FC<DragonMeshProps> = ({
  size,
  animationSpeed,
  showParticles,
  quality,
  onClick,
  enableHover,
  performance,
  maxAnimationQuality,
  voiceState
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
    const adjustedAnimationSpeed = animationSpeed * maxAnimationQuality * currentLOD.animationQuality
    
    // Hover effect (only in high quality mode)
    if (hovered && enableHover && !performance.shouldReduceQuality) {
      groupRef.current.scale.setScalar(1.05)
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
      {/* Dragon model */}
      <DragonModel 
        size={size} 
        animationSpeed={animationSpeed} 
        performance={performance}
        voiceState={voiceState}
      />
      
      {/* Anatomically correct wings */}
      <DragonWings 
        size={size} 
        animationSpeed={animationSpeed} 
        performance={performance}
        voiceState={voiceState}
      />
      
      {/* Particle effects */}
      {showParticles && (performance.currentLOD?.particles?.enabled ?? true) && (
        <ParticleSystem 
          count={particleCount} 
          size={size} 
          performance={performance}
          animationSpeed={animationSpeed}
          voiceState={voiceState}
        />
      )}
      
      {/* Enhanced lighting for red/golden dragon */}
      <ambientLight intensity={0.3} color={0x2d1b1b} />
      <directionalLight 
        position={[size * 2, size * 2, size]} 
        intensity={1.2} 
        color={DragonConfig.colors.gold}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
      />
      <pointLight 
        position={[size * 0.5, size * 0.5, size * 0.5]} 
        intensity={0.8} 
        color={DragonConfig.colors.red}
      />
      <pointLight 
        position={[-size * 0.5, size * 0.5, size * 0.5]} 
        intensity={0.6} 
        color={DragonConfig.colors.gold}
      />
      
      {/* Voice state specific lighting */}
      {voiceState?.isSpeaking && (
        <pointLight 
          position={[0, size * 0.2, size * 0.4]} 
          intensity={1.5 * (voiceState.volume || 0.5)} 
          color={DragonConfig.colors.fire}
        />
      )}
      {voiceState?.isListening && (
        <pointLight 
          position={[0, size * 0.3, size * 0.3]} 
          intensity={0.8} 
          color={DragonConfig.colors.eyeGlow}
        />
      )}
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
const propComparison = createPerformancePropComparison<Dragon3DProps>(['voiceState'])

// Loading fallback component
const DragonLoadingFallback: React.FC<{ size: string }> = ({ size }) => (
  <div className={`${sizeMap[size as keyof typeof sizeMap].canvasSize} flex items-center justify-center bg-black rounded-lg`}>
    <div className="text-red-400 animate-pulse">Loading Dragon...</div>
  </div>
)

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
  targetFPS = 60,
  voiceState
}) => {
  const { size: dragonSize, canvasSize } = sizeMap[size]
  
  // Performance monitoring
  const performance = useDragonPerformance({
    config: {
      targetFPS,
      adaptiveLOD: enableLOD,
      autoOptimization: enablePerformanceMode,
      maxMemoryMB: 1024 // Increased for GLTF model + wings
    }
  })
  
  return (
    <motion.div
      className={`${canvasSize} ${className} cursor-pointer select-none`}
      whileHover={enableHover ? { scale: 1.02 } : undefined}
      whileTap={{ scale: 0.98 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
    >
      <Suspense fallback={<DragonLoadingFallback size={size} />}>
        <Canvas
          camera={{ position: [0, 0, 8], fov: 50 }}
          style={{ width: '100%', height: '100%' }}
          shadows
        >
          <PerspectiveCamera makeDefault />
          
          {/* Scene setup */}
          <color attach="background" args={['#000000']} />
          <fog attach="fog" args={['#1a1a1a', 5, 20]} />
          
          {/* Dragon mesh with voice integration */}
          <DragonMesh
            size={dragonSize}
            animationSpeed={animationSpeed * maxAnimationQuality}
            showParticles={showParticles}
            quality={quality}
            onClick={onClick}
            enableHover={enableHover}
            performance={performance}
            maxAnimationQuality={maxAnimationQuality}
            voiceState={voiceState}
          />
          
          {/* Performance-aware controls */}
          {enableInteraction && !performance.shouldReduceQuality && (
            <OrbitControls 
              enablePan={false}
              enableZoom={false}
              autoRotate={autoRotate && !performance.shouldDisableAnimations}
              autoRotateSpeed={0.5 * maxAnimationQuality}
              maxPolarAngle={Math.PI / 1.8}
              minPolarAngle={Math.PI / 3}
            />
          )}
        </Canvas>
      </Suspense>
    </motion.div>
  )
}

// Memoized component with performance-aware prop comparison
const Dragon3D = React.memo(Dragon3DInternal, (prevProps, nextProps) => {
  return propComparison(prevProps, nextProps)
})

// Add display name for debugging
Dragon3D.displayName = 'Dragon3D'

// Preload the dragon model
useGLTF.preload(DRAGON_MODEL_URL)

export default Dragon3D
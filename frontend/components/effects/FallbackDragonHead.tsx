'use client'

import React, { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

interface FallbackDragonHeadProps {
  enableEyeTracking?: boolean
  lightningActive?: boolean
  intensity?: number
}

// Procedural fallback dragon head when GLB fails to load
export function FallbackDragonHead({
  enableEyeTracking = true,
  lightningActive = false,
  intensity = 1
}: FallbackDragonHeadProps) {
  const groupRef = useRef<THREE.Group>(null)
  const headRef = useRef<THREE.Mesh>(null)
  const leftEyeRef = useRef<THREE.Mesh>(null)
  const rightEyeRef = useRef<THREE.Mesh>(null)

  // Create materials
  const dragonMaterial = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(0.8, 0.1, 0.05), // Deep red
    metalness: 0.9,
    roughness: 0.2,
    clearcoat: 0.5,
    clearcoatRoughness: 0.1,
    emissive: new THREE.Color(0.6, 0.05, 0.02), // Red glow
    emissiveIntensity: lightningActive ? 0.8 : 0.2,
  })

  const goldMaterial = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(0.9, 0.7, 0.2), // Gold
    metalness: 1.0,
    roughness: 0.1,
    emissive: new THREE.Color(0.8, 0.6, 0.1), // Golden glow
    emissiveIntensity: lightningActive ? 0.6 : 0.2,
  })

  const eyeMaterial = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(1, 0.8, 0),
    emissive: new THREE.Color(1, 0.5, 0),
    emissiveIntensity: lightningActive ? 2 : 1,
    metalness: 0.5,
    roughness: 0.1,
  })

  // Animation
  useFrame((state, delta) => {
    if (!groupRef.current) return

    // Breathing animation
    const breathe = Math.sin(state.clock.elapsedTime * 0.8) * 0.05
    if (headRef.current) {
      headRef.current.scale.set(1 + breathe, 1 + breathe, 1 + breathe)
    }

    // Eye glow pulsation
    if (leftEyeRef.current && rightEyeRef.current) {
      const pulsate = 0.5 + Math.sin(state.clock.elapsedTime * 3) * 0.5
      const eyeMat = leftEyeRef.current.material as THREE.MeshPhysicalMaterial
      eyeMat.emissiveIntensity = lightningActive ? pulsate * 3 : pulsate
    }

    // Intensity-based scaling
    const targetScale = 5 * intensity // Big fallback dragon
    groupRef.current.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), delta * 2)
  })

  return (
    <group ref={groupRef} position={[0, 0, -2]} scale={0}>
      {/* Main head shape */}
      <mesh ref={headRef} material={dragonMaterial}>
        <coneGeometry args={[0.8, 1.5, 8]} />
        <mesh position={[0, 0.7, 0]} rotation={[Math.PI, 0, 0]}>
          <coneGeometry args={[0.8, 0.5, 8]} />
        </mesh>
      </mesh>

      {/* Horns */}
      <mesh position={[-0.4, 0.6, 0]} rotation={[0, 0, -0.3]} material={goldMaterial}>
        <coneGeometry args={[0.1, 0.8, 4]} />
      </mesh>
      <mesh position={[0.4, 0.6, 0]} rotation={[0, 0, 0.3]} material={goldMaterial}>
        <coneGeometry args={[0.1, 0.8, 4]} />
      </mesh>

      {/* Eyes */}
      <mesh ref={leftEyeRef} position={[-0.3, 0.2, 0.4]} material={eyeMaterial}>
        <sphereGeometry args={[0.15, 16, 16]} />
      </mesh>
      <mesh ref={rightEyeRef} position={[0.3, 0.2, 0.4]} material={eyeMaterial}>
        <sphereGeometry args={[0.15, 16, 16]} />
      </mesh>

      {/* Snout */}
      <mesh position={[0, -0.1, 0.6]} rotation={[Math.PI / 2, 0, 0]} material={dragonMaterial}>
        <coneGeometry args={[0.3, 0.6, 6]} />
      </mesh>

      {/* Lights */}
      <pointLight
        position={[0, 2, 2]}
        intensity={lightningActive ? 3 : 1.5}
        color="#ff6600"
      />
      <spotLight
        position={[0, 3, 3]}
        target-position={[0, 0, 0]}
        angle={0.6}
        penumbra={0.3}
        intensity={lightningActive ? 2 : 1}
        color="#ff0000"
        castShadow
      />
    </group>
  )
}
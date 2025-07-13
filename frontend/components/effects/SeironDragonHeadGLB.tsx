'use client'

import React, { useRef, useEffect } from 'react'
import { useFrame, useLoader } from '@react-three/fiber'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader'
import * as THREE from 'three'
import { useMouseTracking } from '@/hooks/useMouseTracking'

interface SeironDragonHeadGLBProps {
  enableEyeTracking?: boolean
  lightningActive?: boolean
  intensity?: number
}

// Seiron Dragon Head using actual GLB model
export function SeironDragonHeadGLB({
  enableEyeTracking = true,
  lightningActive = false,
  intensity = 1
}: SeironDragonHeadGLBProps) {
  const groupRef = useRef<THREE.Group>(null)
  const modelRef = useRef<THREE.Group>(null)
  const initialSetupDone = useRef(false)
  
  // Load the GLB model
  const gltf = useLoader(GLTFLoader, '/models/seiron_head.glb')
  
  // Mouse tracking for eye movement
  const { mousePosition, isMouseActive } = useMouseTracking(undefined, {
    smoothing: true,
    smoothingFactor: 0.08
  })

  // Setup model on load
  useEffect(() => {
    if (gltf && gltf.scene && modelRef.current && !initialSetupDone.current) {
      // Clear any existing children
      modelRef.current.clear()
      
      // Clone the scene to avoid issues
      const clonedScene = gltf.scene.clone()
      
      // Make it MASSIVE - scale up significantly
      clonedScene.scale.set(5, 5, 5)
      
      // Rotate to face the user (adjust based on model's original orientation)
      clonedScene.rotation.y = Math.PI // 180 degrees if model is facing away
      clonedScene.position.set(0, -2, -3) // Position so head is centered
      
      // Apply RED dragon materials with GOLDEN accents
      clonedScene.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          // Create new material for red dragon with golden accents
          const material = new THREE.MeshPhysicalMaterial({
            color: new THREE.Color(0.8, 0.1, 0.05), // Deep red
            metalness: 0.9,
            roughness: 0.2,
            clearcoat: 0.5,
            clearcoatRoughness: 0.1,
            emissive: new THREE.Color(0.6, 0.05, 0.02), // Red glow
            emissiveIntensity: lightningActive ? 0.8 : 0.2,
          })
          
          // Check if this part should be golden (based on material name or mesh name)
          const meshName = child.name.toLowerCase()
          if (meshName.includes('horn') || meshName.includes('spike') || 
              meshName.includes('accent') || meshName.includes('detail')) {
            // Golden accents for horns and details
            material.color = new THREE.Color(0.9, 0.7, 0.2) // Gold
            material.emissive = new THREE.Color(0.8, 0.6, 0.1) // Golden glow
            material.metalness = 1.0
            material.roughness = 0.1
          }
          
          child.material = material
          child.castShadow = true
          child.receiveShadow = true
        }
      })
      
      // Add to scene
      modelRef.current.add(clonedScene)
      initialSetupDone.current = true
    }
  }, [gltf, lightningActive])

  // Animation
  useFrame((state, delta) => {
    if (!groupRef.current || !modelRef.current) return

    // Breathing animation - subtle on the already massive model
    const breathe = Math.sin(state.clock.elapsedTime * 0.8) * 0.02
    const baseScale = modelRef.current.children[0]?.scale.x || 5
    modelRef.current.children.forEach(child => {
      child.scale.setScalar(baseScale * (1 + breathe))
    })

    // Eye tracking with head movement - looking at the user
    if (enableEyeTracking && isMouseActive) {
      const normalizedX = (mousePosition.x / window.innerWidth) * 2 - 1
      const normalizedY = -(mousePosition.y / window.innerHeight) * 2 + 1

      // Head follows mouse to maintain eye contact
      groupRef.current.rotation.y = normalizedX * 0.2
      groupRef.current.rotation.x = -0.1 + normalizedY * 0.15 // Slight downward tilt
    } else {
      // Return to looking straight at user
      groupRef.current.rotation.x = THREE.MathUtils.lerp(groupRef.current.rotation.x, -0.1, delta * 2)
      groupRef.current.rotation.y = THREE.MathUtils.lerp(groupRef.current.rotation.y, 0, delta * 2)
    }

    // Intensity-based scaling - make it grow dramatically on appearance
    const targetScale = 1.2 * intensity // Even bigger!
    groupRef.current.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), delta * 2)

    // Lightning effect - enhance red glow and golden accents
    if (lightningActive && modelRef.current) {
      modelRef.current.traverse((child) => {
        if (child instanceof THREE.Mesh && child.material) {
          const material = child.material as THREE.MeshPhysicalMaterial
          if (material.emissive) {
            const pulsate = 0.5 + Math.sin(state.clock.elapsedTime * 10) * 0.5
            material.emissiveIntensity = pulsate
          }
        }
      })
    }
  })

  return (
    <group ref={groupRef} position={[0, 1, -2]} scale={0}>
      <group ref={modelRef}>
        {/* Model will be added here programmatically */}
      </group>
      
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
}
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
  
  // Load the GLB model
  const gltf = useLoader(GLTFLoader, '/models/seiron_head.glb')
  
  // Mouse tracking for eye movement
  const { mousePosition, isMouseActive } = useMouseTracking(undefined, {
    smoothing: true,
    smoothingFactor: 0.08
  })

  // Setup model on load
  useEffect(() => {
    if (gltf && gltf.scene) {
      // Clone the scene to avoid issues
      const clonedScene = gltf.scene.clone()
      
      // Apply materials and setup
      clonedScene.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          // Apply dragon-like materials
          if (child.material) {
            const material = child.material as THREE.MeshStandardMaterial
            material.metalness = 0.8
            material.roughness = 0.3
            material.envMapIntensity = 1
            
            // Add emissive glow during lightning
            if (material.emissive) {
              material.emissiveIntensity = lightningActive ? 0.5 : 0.1
            }
          }
          
          child.castShadow = true
          child.receiveShadow = true
        }
      })
      
      // Store reference
      if (modelRef.current) {
        modelRef.current.add(clonedScene)
      }
    }
  }, [gltf, lightningActive])

  // Animation
  useFrame((state, delta) => {
    if (!groupRef.current || !modelRef.current) return

    // Breathing animation
    const breathe = Math.sin(state.clock.elapsedTime * 0.8) * 0.02
    modelRef.current.scale.setScalar(1 + breathe)

    // Eye tracking with head movement
    if (enableEyeTracking && isMouseActive) {
      const normalizedX = (mousePosition.x / window.innerWidth) * 2 - 1
      const normalizedY = -(mousePosition.y / window.innerHeight) * 2 + 1

      // Subtle head movement following mouse
      groupRef.current.rotation.y = normalizedX * 0.15
      groupRef.current.rotation.x = 0.1 + normalizedY * 0.1
    } else {
      // Return to center
      groupRef.current.rotation.x = THREE.MathUtils.lerp(groupRef.current.rotation.x, 0.1, delta * 2)
      groupRef.current.rotation.y = THREE.MathUtils.lerp(groupRef.current.rotation.y, 0, delta * 2)
    }

    // Intensity-based scaling
    const targetScale = 0.8 * intensity
    groupRef.current.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), delta * 2)

    // Lightning effect - make model glow
    if (lightningActive && modelRef.current) {
      modelRef.current.traverse((child) => {
        if (child instanceof THREE.Mesh && child.material) {
          const material = child.material as THREE.MeshStandardMaterial
          if (material.emissive) {
            material.emissiveIntensity = 0.5 + Math.sin(state.clock.elapsedTime * 10) * 0.3
          }
        }
      })
    }
  })

  return (
    <group ref={groupRef} position={[0, 0, 0]} scale={0}>
      <group ref={modelRef}>
        {/* Model will be added here programmatically */}
      </group>
      
      {/* Add dramatic lighting for the model */}
      <pointLight
        position={[0, 2, 2]}
        intensity={lightningActive ? 2 : 1}
        color={lightningActive ? '#ffaa00' : '#ffffff'}
      />
    </group>
  )
}
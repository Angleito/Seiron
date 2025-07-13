'use client'

import React, { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useMouseTracking } from '@/hooks/useMouseTracking'

interface SeironDragonHeadProps {
  enableEyeTracking?: boolean
  lightningActive?: boolean
  intensity?: number
}

// Procedural Seiron Dragon Head using Three.js geometry
export function SeironDragonHead({
  enableEyeTracking = true,
  lightningActive = false,
  intensity = 1
}: SeironDragonHeadProps) {
  const groupRef = useRef<THREE.Group>(null)
  const headRef = useRef<THREE.Mesh>(null)
  const leftEyeRef = useRef<THREE.Mesh>(null)
  const rightEyeRef = useRef<THREE.Mesh>(null)
  const leftPupilRef = useRef<THREE.Mesh>(null)
  const rightPupilRef = useRef<THREE.Mesh>(null)
  
  // Mouse tracking for eye movement
  const { mousePosition, isMouseActive } = useMouseTracking(undefined, {
    smoothing: true,
    smoothingFactor: 0.08
  })

  // Create materials
  const materials = useMemo(() => {
    // Dragon skin material - dark metallic with red tint
    const dragonMaterial = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(0.2, 0.05, 0.05), // Very dark red
      metalness: 0.9,
      roughness: 0.3,
      clearcoat: 0.3,
      clearcoatRoughness: 0.2,
      emissive: new THREE.Color(0.8, 0.1, 0.05),
      emissiveIntensity: lightningActive ? 0.5 : 0.1,
    })

    // Glowing eye material
    const eyeMaterial = new THREE.MeshPhongMaterial({
      color: new THREE.Color(1, 0.8, 0.2), // Golden yellow
      emissive: new THREE.Color(1, 0.6, 0.1),
      emissiveIntensity: 2,
      transparent: true,
      opacity: 0.9
    })

    // Pupil material
    const pupilMaterial = new THREE.MeshBasicMaterial({
      color: new THREE.Color(0, 0, 0),
    })

    // Horn material
    const hornMaterial = new THREE.MeshPhongMaterial({
      color: new THREE.Color(0.1, 0.1, 0.1),
      emissive: new THREE.Color(0.3, 0.1, 0.05),
      emissiveIntensity: lightningActive ? 0.3 : 0.05,
      shininess: 100
    })

    return { dragonMaterial, eyeMaterial, pupilMaterial, hornMaterial }
  }, [lightningActive])

  // Create geometries
  const geometries = useMemo(() => {
    // Main head - elongated sphere
    const headGeometry = new THREE.SphereGeometry(1, 32, 24)
    headGeometry.scale(1, 0.8, 1.3) // Elongate forward

    // Snout - cone for dragon muzzle
    const snoutGeometry = new THREE.ConeGeometry(0.5, 1.2, 16)
    snoutGeometry.rotateX(Math.PI / 2)
    snoutGeometry.translate(0, -0.2, 1.2)

    // Eye socket geometry
    const eyeGeometry = new THREE.SphereGeometry(0.2, 16, 16)

    // Pupil geometry
    const pupilGeometry = new THREE.SphereGeometry(0.1, 8, 8)

    // Horn geometry
    const hornGeometry = new THREE.ConeGeometry(0.15, 0.8, 8)
    
    // Jaw geometry
    const jawGeometry = new THREE.BoxGeometry(1.4, 0.3, 1)
    jawGeometry.translate(0, -0.6, 0.6)

    return { 
      headGeometry, 
      snoutGeometry, 
      eyeGeometry, 
      pupilGeometry, 
      hornGeometry,
      jawGeometry 
    }
  }, [])

  // Animation
  useFrame((state, delta) => {
    if (!groupRef.current) return

    // Breathing animation
    const breathe = Math.sin(state.clock.elapsedTime * 0.8) * 0.02
    if (headRef.current) {
      headRef.current.scale.setScalar(1 + breathe)
    }

    // Eye tracking
    if (enableEyeTracking && isMouseActive) {
      const normalizedX = (mousePosition.x / window.innerWidth) * 2 - 1
      const normalizedY = -(mousePosition.y / window.innerHeight) * 2 + 1

      // Move pupils based on mouse
      const maxPupilOffset = 0.05
      const pupilX = normalizedX * maxPupilOffset
      const pupilY = normalizedY * maxPupilOffset

      if (leftPupilRef.current) {
        leftPupilRef.current.position.x = -0.35 + pupilX
        leftPupilRef.current.position.y = 0.2 + pupilY
        leftPupilRef.current.position.z = 0.92
      }

      if (rightPupilRef.current) {
        rightPupilRef.current.position.x = 0.35 + pupilX
        rightPupilRef.current.position.y = 0.2 + pupilY
        rightPupilRef.current.position.z = 0.92
      }

      // Subtle head movement
      groupRef.current.rotation.y = normalizedX * 0.15
      groupRef.current.rotation.x = 0.1 + normalizedY * 0.1
    } else {
      // Return to center
      if (leftPupilRef.current) {
        leftPupilRef.current.position.lerp(new THREE.Vector3(-0.35, 0.2, 0.92), delta * 3)
      }
      if (rightPupilRef.current) {
        rightPupilRef.current.position.lerp(new THREE.Vector3(0.35, 0.2, 0.92), delta * 3)
      }
      groupRef.current.rotation.x = THREE.MathUtils.lerp(groupRef.current.rotation.x, 0.1, delta * 2)
      groupRef.current.rotation.y = THREE.MathUtils.lerp(groupRef.current.rotation.y, 0, delta * 2)
    }

    // Intensity-based scaling
    const targetScale = 0.8 * intensity
    groupRef.current.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), delta * 2)

    // Lightning effect - make eyes glow more
    if (lightningActive && leftEyeRef.current && rightEyeRef.current) {
      const glowIntensity = 2 + Math.sin(state.clock.elapsedTime * 10) * 0.5
      if (leftEyeRef.current.material instanceof THREE.MeshPhongMaterial) {
        leftEyeRef.current.material.emissiveIntensity = glowIntensity
      }
      if (rightEyeRef.current.material instanceof THREE.MeshPhongMaterial) {
        rightEyeRef.current.material.emissiveIntensity = glowIntensity
      }
    }
  })

  return (
    <group ref={groupRef} position={[0, 0, 0]} scale={0}>
      {/* Main head */}
      <mesh ref={headRef} geometry={geometries.headGeometry} material={materials.dragonMaterial} castShadow receiveShadow />
      
      {/* Snout */}
      <mesh geometry={geometries.snoutGeometry} material={materials.dragonMaterial} castShadow receiveShadow />
      
      {/* Jaw */}
      <mesh geometry={geometries.jawGeometry} material={materials.dragonMaterial} castShadow />
      
      {/* Left horn */}
      <mesh 
        geometry={geometries.hornGeometry} 
        material={materials.hornMaterial} 
        position={[-0.4, 0.6, -0.2]} 
        rotation={[0.3, 0, -0.3]}
        castShadow 
      />
      
      {/* Right horn */}
      <mesh 
        geometry={geometries.hornGeometry} 
        material={materials.hornMaterial} 
        position={[0.4, 0.6, -0.2]} 
        rotation={[0.3, 0, 0.3]}
        castShadow 
      />
      
      {/* Left eye */}
      <mesh 
        ref={leftEyeRef}
        geometry={geometries.eyeGeometry} 
        material={materials.eyeMaterial} 
        position={[-0.35, 0.2, 0.9]}
      />
      
      {/* Right eye */}
      <mesh 
        ref={rightEyeRef}
        geometry={geometries.eyeGeometry} 
        material={materials.eyeMaterial} 
        position={[0.35, 0.2, 0.9]}
      />
      
      {/* Left pupil */}
      <mesh 
        ref={leftPupilRef}
        geometry={geometries.pupilGeometry} 
        material={materials.pupilMaterial} 
        position={[-0.35, 0.2, 0.92]}
      />
      
      {/* Right pupil */}
      <mesh 
        ref={rightPupilRef}
        geometry={geometries.pupilGeometry} 
        material={materials.pupilMaterial} 
        position={[0.35, 0.2, 0.92]}
      />
      
      {/* Ridge spikes along the head */}
      {[0, 1, 2, 3].map((i) => (
        <mesh
          key={`spike-${i}`}
          geometry={geometries.hornGeometry}
          material={materials.hornMaterial}
          position={[0, 0.7 - i * 0.15, -0.5 - i * 0.3]}
          rotation={[0.5, 0, 0]}
          scale={[0.5, 0.6 - i * 0.1, 0.5]}
          castShadow
        />
      ))}
    </group>
  )
}
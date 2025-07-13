'use client'

import React, { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

interface DragonParticlesProps {
  count?: number
  lightningActive?: boolean
  intensity?: number
}

export function DragonParticles({ 
  count = 200,
  lightningActive = false,
  intensity = 1 
}: DragonParticlesProps) {
  const particlesRef = useRef<THREE.Points>(null)
  
  // Create particle geometry and material
  const [geometry, material] = useMemo(() => {
    // Create positions for particles
    const positions = new Float32Array(count * 3)
    const colors = new Float32Array(count * 3)
    const sizes = new Float32Array(count)
    
    for (let i = 0; i < count; i++) {
      // Random positions in a sphere around the dragon
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos((Math.random() * 2) - 1)
      const radius = 2 + Math.random() * 3
      
      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta)
      positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta)
      positions[i * 3 + 2] = radius * Math.cos(phi)
      
      // Colors - mix of orange, red, and yellow
      const colorChoice = Math.random()
      if (colorChoice < 0.33) {
        // Orange
        colors[i * 3] = 1
        colors[i * 3 + 1] = 0.5
        colors[i * 3 + 2] = 0
      } else if (colorChoice < 0.66) {
        // Red
        colors[i * 3] = 1
        colors[i * 3 + 1] = 0.2
        colors[i * 3 + 2] = 0
      } else {
        // Yellow
        colors[i * 3] = 1
        colors[i * 3 + 1] = 0.9
        colors[i * 3 + 2] = 0.2
      }
      
      // Random sizes
      sizes[i] = Math.random() * 0.1 + 0.05
    }
    
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1))
    
    const material = new THREE.PointsMaterial({
      size: 0.1,
      sizeAttenuation: true,
      vertexColors: true,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    })
    
    return [geometry, material]
  }, [count])
  
  // Animation
  useFrame((state) => {
    if (!particlesRef.current) return
    
    const time = state.clock.elapsedTime
    
    // Rotate particle system
    particlesRef.current.rotation.y = time * 0.1
    
    // Update particle positions for swirling effect
    const positions = particlesRef.current.geometry.attributes.position as THREE.BufferAttribute
    const sizes = particlesRef.current.geometry.attributes.size as THREE.BufferAttribute
    
    if (!positions || !sizes) return
    
    const posArray = positions.array as Float32Array
    const sizeArray = sizes.array as Float32Array
    
    for (let i = 0; i < count; i++) {
      const i3 = i * 3
      
      // Get current position
      const x = posArray[i3] || 0
      const y = posArray[i3 + 1] || 0
      const z = posArray[i3 + 2] || 0
      
      // Calculate distance from center
      const distance = Math.sqrt(x * x + y * y + z * z)
      
      // Spiral motion
      const angle = time * 0.5 + i * 0.1
      const spiralRadius = distance + Math.sin(angle) * 0.2
      
      // Update position with swirl
      posArray[i3] = Math.cos(angle + time) * spiralRadius * Math.sin(i * 0.1 + time * 0.2)
      posArray[i3 + 1] = y + Math.sin(time * 2 + i * 0.1) * 0.1
      posArray[i3 + 2] = Math.sin(angle + time) * spiralRadius * Math.cos(i * 0.1 + time * 0.2)
      
      // Pulsing size based on lightning
      if (lightningActive) {
        sizeArray[i] = (Math.random() * 0.15 + 0.1) * (1 + Math.sin(time * 10) * 0.5)
      } else {
        sizeArray[i] = (Math.random() * 0.1 + 0.05) * intensity
      }
    }
    
    positions.needsUpdate = true
    sizes.needsUpdate = true
    
    // Update material opacity based on intensity
    if (particlesRef.current.material instanceof THREE.PointsMaterial) {
      particlesRef.current.material.opacity = 0.6 * intensity
      
      // Make particles brighter during lightning
      if (lightningActive) {
        particlesRef.current.material.size = 0.15
      } else {
        particlesRef.current.material.size = 0.1
      }
    }
  })
  
  return <points ref={particlesRef} geometry={geometry} material={material} />
}
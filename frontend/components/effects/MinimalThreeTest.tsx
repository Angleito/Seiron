'use client'

import React, { useRef, useEffect } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import * as THREE from 'three'

// Simple rotating cube to test Three.js pipeline
function TestCube() {
  const meshRef = useRef<THREE.Mesh>(null)

  useFrame((state, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.x += delta
      meshRef.current.rotation.y += delta * 0.5
    }
  })

  console.log('🎯 TestCube: Component rendering')

  return (
    <mesh ref={meshRef}>
      <boxGeometry args={[2, 2, 2]} />
      <meshStandardMaterial color="orange" />
    </mesh>
  )
}

// Minimal scene to test Three.js
export function MinimalThreeTest({ className }: { className?: string }) {
  console.log('🎯 MinimalThreeTest: Component mounting')

  useEffect(() => {
    console.log('🎯 MinimalThreeTest: useEffect running - Canvas should mount soon')
  }, [])

  return (
    <div className={`${className} w-full h-full`}>
      <Canvas
        style={{ width: '100%', height: '100%' }}
        onCreated={(state) => {
          console.log('🎯 MinimalThreeTest: Canvas created successfully!', state)
        }}
        onError={(error) => {
          console.error('🎯 MinimalThreeTest: Canvas error:', error)
        }}
      >
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} />
        <TestCube />
      </Canvas>
    </div>
  )
}

export default MinimalThreeTest
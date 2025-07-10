import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import { Canvas } from '@react-three/fiber'
import { SeironGLBDragon, SeironGLBDragonWithCanvas } from './SeironGLBDragon'

// Mock useGLTF hook
jest.mock('@react-three/drei', () => {
  const mockUseGLTF = jest.fn(() => ({
    scene: {
      clone: jest.fn(() => ({
        traverse: jest.fn(),
        position: { sub: jest.fn(), add: jest.fn() },
        scale: { setScalar: jest.fn() },
        rotation: { set: jest.fn() },
        clear: jest.fn()
      })),
      traverse: jest.fn()
    },
    animations: []
  }))
  
  mockUseGLTF.preload = jest.fn()
  
  return {
    useGLTF: mockUseGLTF,
    PerspectiveCamera: jest.fn(() => null)
  }
})

// Mock Three.js objects
jest.mock('three', () => ({
  ...jest.requireActual('three'),
  Box3: jest.fn(() => ({
    setFromObject: jest.fn(() => ({
      getCenter: jest.fn(() => ({ x: 0, y: 0, z: 0 })),
      getSize: jest.fn(() => ({ x: 1, y: 1, z: 1 }))
    }))
  })),
  Vector3: jest.fn(() => ({ x: 0, y: 0, z: 0 })),
  AnimationMixer: jest.fn(() => ({
    clipAction: jest.fn(() => ({
      setLoop: jest.fn(),
      play: jest.fn()
    })),
    stopAllAction: jest.fn(),
    uncacheRoot: jest.fn(),
    update: jest.fn()
  })),
  LoopRepeat: 'LoopRepeat'
}))

// Mock WebGL recovery hook
jest.mock('../../utils/webglRecovery', () => ({
  useWebGLRecovery: jest.fn(() => ({
    initializeRecovery: jest.fn(),
    diagnostics: {
      contextLossCount: 0,
      contextLossRisk: 'low',
      qualityLevel: 3
    },
    shouldFallback: false,
    isRecovering: false,
    currentRecoveryAttempt: 0,
    resetDiagnostics: jest.fn(),
    getQualitySettings: jest.fn(() => ({
      antialias: true,
      shadows: true
    })),
    setQualityLevel: jest.fn()
  }))
}))

// Mock WebGL error boundary
jest.mock('../error-boundaries/WebGLErrorBoundary', () => ({
  WebGLErrorBoundary: ({ children }: { children: React.ReactNode }) => children
}))

describe('SeironGLBDragon Dynamic Model Switching', () => {
  const mockCallbacks = {
    onLoadStart: jest.fn(),
    onLoadProgress: jest.fn(),
    onLoadComplete: jest.fn(),
    onLoadError: jest.fn(),
    onModelSwitch: jest.fn(),
    onError: jest.fn(),
    onFallback: jest.fn()
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('should render Canvas wrapper without crashing', () => {
    render(
      <SeironGLBDragonWithCanvas
        modelPath="/models/seiron.glb"
        {...mockCallbacks}
      />
    )

    // Should render a canvas element
    const canvas = document.querySelector('canvas')
    expect(canvas).toBeInTheDocument()
  })

  test('should handle new props without errors', () => {
    const modelSpecificConfig = {
      '/models/seiron_custom.glb': {
        scale: 2.0,
        position: [1, 2, 3] as [number, number, number],
        rotation: [0, Math.PI, 0] as [number, number, number],
        animationName: 'flying',
        quality: 'high' as const
      }
    }

    // Test that the component can be created with all new props
    expect(() => {
      render(
        <SeironGLBDragonWithCanvas
          modelPath="/models/seiron_custom.glb"
          modelSpecificConfig={modelSpecificConfig}
          enableModelPreloading={true}
          supportedFormats={['glb', 'gltf']}
          fallbackModelPath="/models/seiron.glb"
          onLoadStart={mockCallbacks.onLoadStart}
          onLoadProgress={mockCallbacks.onLoadProgress}
          onLoadComplete={mockCallbacks.onLoadComplete}
          onLoadError={mockCallbacks.onLoadError}
          onModelSwitch={mockCallbacks.onModelSwitch}
          {...mockCallbacks}
        />
      )
    }).not.toThrow()
  })

  test('should handle all callback props', () => {
    expect(() => {
      render(
        <SeironGLBDragonWithCanvas
          modelPath="/models/seiron.glb"
          onLoadStart={mockCallbacks.onLoadStart}
          onLoadProgress={mockCallbacks.onLoadProgress}
          onLoadComplete={mockCallbacks.onLoadComplete}
          onLoadError={mockCallbacks.onLoadError}
          onModelSwitch={mockCallbacks.onModelSwitch}
          onError={mockCallbacks.onError}
          onFallback={mockCallbacks.onFallback}
        />
      )
    }).not.toThrow()
  })

  test('should handle model-specific configuration structure', () => {
    const modelSpecificConfig = {
      '/models/seiron_low.glb': {
        quality: 'low' as const,
        optimizations: {
          shadows: false,
          reflections: false,
          antialiasing: false
        }
      },
      '/models/seiron_high.glb': {
        quality: 'high' as const,
        optimizations: {
          shadows: true,
          reflections: true,
          antialiasing: true
        }
      }
    }

    expect(() => {
      render(
        <SeironGLBDragonWithCanvas
          modelPath="/models/seiron_low.glb"
          modelSpecificConfig={modelSpecificConfig}
          {...mockCallbacks}
        />
      )
    }).not.toThrow()
  })

  test('should handle supported formats array', () => {
    expect(() => {
      render(
        <SeironGLBDragonWithCanvas
          modelPath="/models/seiron.glb"
          supportedFormats={['glb', 'gltf']}
          {...mockCallbacks}
        />
      )
    }).not.toThrow()
  })

  test('should handle fallback model path', () => {
    expect(() => {
      render(
        <SeironGLBDragonWithCanvas
          modelPath="/models/seiron.glb"
          fallbackModelPath="/models/seiron_fallback.glb"
          {...mockCallbacks}
        />
      )
    }).not.toThrow()
  })

  test('should accept preloading configuration', () => {
    expect(() => {
      render(
        <SeironGLBDragonWithCanvas
          modelPath="/models/seiron.glb"
          enableModelPreloading={true}
          fallbackModelPath="/models/seiron_fallback.glb"
          {...mockCallbacks}
        />
      )
    }).not.toThrow()
  })

  test('should render with voice state', () => {
    const voiceState = {
      isListening: true,
      isSpeaking: false,
      isProcessing: false,
      isIdle: false,
      volume: 0.8,
      emotion: 'excited' as const
    }

    expect(() => {
      render(
        <SeironGLBDragonWithCanvas
          modelPath="/models/seiron.glb"
          voiceState={voiceState}
          {...mockCallbacks}
        />
      )
    }).not.toThrow()
  })
})
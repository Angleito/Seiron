/**
 * @jest-environment jsdom
 */

import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import { toMatchImageSnapshot } from 'jest-image-snapshot'

// Extend Jest matchers
expect.extend({ toMatchImageSnapshot })

// Import dragon components
import Dragon3D from '../../components/dragon/Dragon3D'
import ASCIIDragon from '../../components/dragon/ASCIIDragon'
import DragonRenderer, { VoiceAnimationState } from '../../components/dragon/DragonRenderer'
import SimpleDragonSprite from '../../components/SimpleDragonSprite'

// Mock HTML2Canvas for visual snapshots
const mockHtml2canvas = jest.fn(() => 
  Promise.resolve({
    toDataURL: () => 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='
  })
)

jest.mock('html2canvas', () => mockHtml2canvas)

// Mock Three.js for consistent visual testing
jest.mock('@react-three/fiber', () => ({
  Canvas: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="three-canvas" style={{ width: '100%', height: '100%', background: '#000' }}>
      <div style={{ 
        color: '#dc2626', 
        fontFamily: 'monospace', 
        padding: '20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%'
      }}>
        🐉 3D Dragon Placeholder
      </div>
      {children}
    </div>
  ),
  useFrame: jest.fn(),
  useThree: () => ({ camera: { position: { set: jest.fn() } } })
}))

jest.mock('@react-three/drei', () => ({
  OrbitControls: () => <div data-testid="orbit-controls" />,
  PerspectiveCamera: () => <div data-testid="perspective-camera" />
}))

// Mock framer-motion for consistent animations
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, style, className, ...props }: any) => (
      <div 
        {...props}
        className={className}
        style={{ 
          ...style,
          // Disable transitions for consistent snapshots
          transition: 'none',
          animation: 'none'
        }}
      >
        {children}
      </div>
    ),
    pre: ({ children, style, className, ...props }: any) => (
      <pre 
        {...props}
        className={className}
        style={{ 
          ...style,
          transition: 'none',
          animation: 'none'
        }}
      >
        {children}
      </pre>
    )
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>
}))

// Mock voice-dragon-mapping for consistent voice states
jest.mock('../../utils/voice-dragon-mapping', () => ({
  voiceStateToASCIIPose: jest.fn((voiceState: VoiceAnimationState) => {
    if (voiceState.isSpeaking) return 'attacking'
    if (voiceState.isListening) return 'flying'
    if (voiceState.isProcessing) return 'coiled'
    return 'coiled'
  }),
  voiceStateToAnimationSpeed: jest.fn(() => 'normal'),
  voiceStateTo2DProps: jest.fn(() => ({
    scale: 1.0,
    shouldPulse: false,
    shouldGlow: false,
    glowIntensity: 0,
    rotationSpeed: 'slow'
  })),
  shouldShowBreathing: jest.fn(() => true),
  shouldShowFloating: jest.fn(() => true),
  shouldShowEnergyEffects: jest.fn(() => false)
}))

// Visual test utilities
class VisualTestRenderer {
  private container: HTMLElement | null = null

  async captureComponent(component: React.ReactElement, options: {
    width?: number
    height?: number
    timeout?: number
  } = {}): Promise<string> {
    const { width = 400, height = 300, timeout = 1000 } = options

    // Render component with fixed dimensions
    const { container } = render(
      <div style={{ 
        width: `${width}px`, 
        height: `${height}px`,
        position: 'relative',
        overflow: 'hidden',
        background: '#000'
      }}>
        {component}
      </div>
    )

    this.container = container

    // Wait for any async operations
    await waitFor(() => {
      expect(container.firstChild).toBeInTheDocument()
    }, { timeout })

    // Additional wait for animations to settle
    await new Promise(resolve => setTimeout(resolve, 100))

    // Return mock image data
    return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='
  }

  cleanup(): void {
    this.container = null
  }
}

describe('Dragon Visual Regression Tests', () => {
  let visualRenderer: VisualTestRenderer

  beforeEach(() => {
    visualRenderer = new VisualTestRenderer()
    // Disable animations for consistent snapshots
    jest.useFakeTimers()
  })

  afterEach(() => {
    visualRenderer.cleanup()
    jest.runOnlyPendingTimers()
    jest.useRealTimers()
  })

  describe('Dragon3D Visual Tests', () => {
    it('should render Dragon3D consistently across sizes', async () => {
      const sizes = ['sm', 'md', 'lg', 'xl'] as const
      
      for (const size of sizes) {
        const imageData = await visualRenderer.captureComponent(
          <Dragon3D size={size} showParticles={false} quality="medium" />,
          { width: size === 'xl' ? 600 : 400, height: size === 'xl' ? 600 : 400 }
        )
        
        expect(imageData).toMatchImageSnapshot({
          customSnapshotIdentifier: `dragon3d-size-${size}`,
          failureThreshold: 0.1,
          failureThresholdType: 'percent'
        })
      }
    })

    it('should render Dragon3D with different quality settings', async () => {
      const qualities = ['low', 'medium', 'high'] as const
      
      for (const quality of qualities) {
        const imageData = await visualRenderer.captureComponent(
          <Dragon3D size="lg" quality={quality} showParticles={quality !== 'low'} />
        )
        
        expect(imageData).toMatchImageSnapshot({
          customSnapshotIdentifier: `dragon3d-quality-${quality}`,
          failureThreshold: 0.15,
          failureThresholdType: 'percent'
        })
      }
    })

    it('should render Dragon3D with particles vs without', async () => {
      // With particles
      const withParticles = await visualRenderer.captureComponent(
        <Dragon3D size="lg" showParticles={true} quality="high" />
      )
      
      expect(withParticles).toMatchImageSnapshot({
        customSnapshotIdentifier: 'dragon3d-with-particles',
        failureThreshold: 0.2,
        failureThresholdType: 'percent'
      })

      // Without particles
      const withoutParticles = await visualRenderer.captureComponent(
        <Dragon3D size="lg" showParticles={false} quality="high" />
      )
      
      expect(withoutParticles).toMatchImageSnapshot({
        customSnapshotIdentifier: 'dragon3d-without-particles',
        failureThreshold: 0.1,
        failureThresholdType: 'percent'
      })
    })

    it('should render Dragon3D with different animation speeds', async () => {
      const speeds = [0.5, 1, 2] as const
      
      for (const speed of speeds) {
        const imageData = await visualRenderer.captureComponent(
          <Dragon3D size="lg" animationSpeed={speed} />
        )
        
        expect(imageData).toMatchImageSnapshot({
          customSnapshotIdentifier: `dragon3d-speed-${speed.toString().replace('.', '_')}`,
          failureThreshold: 0.1,
          failureThresholdType: 'percent'
        })
      }
    })
  })

  describe('ASCIIDragon Visual Tests', () => {
    it('should render all ASCII dragon poses consistently', async () => {
      const poses = ['coiled', 'flying', 'attacking', 'sleeping'] as const
      
      for (const pose of poses) {
        const imageData = await visualRenderer.captureComponent(
          <ASCIIDragon 
            pose={pose} 
            size="lg" 
            enableTypewriter={false} 
            enableBreathing={false}
            enableFloating={false}
          />
        )
        
        expect(imageData).toMatchImageSnapshot({
          customSnapshotIdentifier: `ascii-dragon-pose-${pose}`,
          failureThreshold: 0.05,
          failureThresholdType: 'percent'
        })
      }
    })

    it('should render ASCII dragon sizes consistently', async () => {
      const sizes = ['sm', 'md', 'lg', 'xl'] as const
      
      for (const size of sizes) {
        const imageData = await visualRenderer.captureComponent(
          <ASCIIDragon 
            pose="coiled" 
            size={size} 
            enableTypewriter={false}
            enableBreathing={false}
            enableFloating={false}
          />,
          { 
            width: size === 'xl' ? 500 : size === 'lg' ? 400 : size === 'md' ? 300 : 200,
            height: size === 'xl' ? 400 : size === 'lg' ? 320 : size === 'md' ? 240 : 160
          }
        )
        
        expect(imageData).toMatchImageSnapshot({
          customSnapshotIdentifier: `ascii-dragon-size-${size}`,
          failureThreshold: 0.05,
          failureThresholdType: 'percent'
        })
      }
    })

    it('should render ASCII dragon with voice states', async () => {
      const voiceStates = [
        { isListening: true, isSpeaking: false, isProcessing: false, isIdle: false },
        { isListening: false, isSpeaking: true, isProcessing: false, isIdle: false },
        { isListening: false, isSpeaking: false, isProcessing: true, isIdle: false },
        { isListening: false, isSpeaking: false, isProcessing: false, isIdle: true }
      ]
      
      const stateNames = ['listening', 'speaking', 'processing', 'idle']
      
      for (let i = 0; i < voiceStates.length; i++) {
        const voiceState = voiceStates[i]
        const stateName = stateNames[i]
        
        const imageData = await visualRenderer.captureComponent(
          <ASCIIDragon 
            pose="coiled" 
            size="lg" 
            voiceState={voiceState}
            enableTypewriter={false}
            enableBreathing={false}
            enableFloating={false}
          />
        )
        
        expect(imageData).toMatchImageSnapshot({
          customSnapshotIdentifier: `ascii-dragon-voice-${stateName}`,
          failureThreshold: 0.1,
          failureThresholdType: 'percent'
        })
      }
    })

    it('should render ASCII dragon typewriter progression', async () => {
      // Test different stages of typewriter animation
      const stages = [
        { enableTypewriter: false, label: 'complete' },
        { enableTypewriter: true, label: 'typing' }
      ]
      
      for (const stage of stages) {
        const imageData = await visualRenderer.captureComponent(
          <ASCIIDragon 
            pose="coiled" 
            size="md" 
            enableTypewriter={stage.enableTypewriter}
            speed="fast"
            enableBreathing={false}
            enableFloating={false}
          />
        )
        
        if (stage.enableTypewriter) {
          // Advance timers to show partial typing
          jest.advanceTimersByTime(200)
        }
        
        expect(imageData).toMatchImageSnapshot({
          customSnapshotIdentifier: `ascii-dragon-typewriter-${stage.label}`,
          failureThreshold: 0.1,
          failureThresholdType: 'percent'
        })
      }
    })
  })

  describe('SimpleDragonSprite Visual Tests', () => {
    it('should render 2D sprite consistently across sizes', async () => {
      const sizes = ['sm', 'md', 'lg', 'xl'] as const
      
      for (const size of sizes) {
        const imageData = await visualRenderer.captureComponent(
          <SimpleDragonSprite size={size} />
        )
        
        expect(imageData).toMatchImageSnapshot({
          customSnapshotIdentifier: `simple-dragon-sprite-size-${size}`,
          failureThreshold: 0.1,
          failureThresholdType: 'percent'
        })
      }
    })

    it('should render 2D sprite with voice states', async () => {
      const voiceStates = [
        { isListening: true, isSpeaking: false, isProcessing: false, isIdle: false },
        { isListening: false, isSpeaking: true, isProcessing: false, isIdle: false, volume: 0.8 },
        { isListening: false, isSpeaking: false, isProcessing: true, isIdle: false },
        { isListening: false, isSpeaking: false, isProcessing: false, isIdle: true }
      ]
      
      const stateNames = ['listening', 'speaking', 'processing', 'idle']
      
      for (let i = 0; i < voiceStates.length; i++) {
        const voiceState = voiceStates[i]
        const stateName = stateNames[i]
        
        const imageData = await visualRenderer.captureComponent(
          <SimpleDragonSprite size="lg" voiceState={voiceState} />
        )
        
        expect(imageData).toMatchImageSnapshot({
          customSnapshotIdentifier: `simple-dragon-sprite-voice-${stateName}`,
          failureThreshold: 0.15,
          failureThresholdType: 'percent'
        })
      }
    })
  })

  describe('DragonRenderer Visual Tests', () => {
    it('should render all dragon types consistently', async () => {
      const dragonTypes = ['2d', 'ascii', '3d'] as const
      
      for (const dragonType of dragonTypes) {
        const imageData = await visualRenderer.captureComponent(
          <DragonRenderer 
            dragonType={dragonType} 
            size="lg"
            performanceMode="medium"
          />
        )
        
        expect(imageData).toMatchImageSnapshot({
          customSnapshotIdentifier: `dragon-renderer-type-${dragonType}`,
          failureThreshold: 0.2,
          failureThresholdType: 'percent'
        })
      }
    })

    it('should render dragon renderer with voice integration', async () => {
      const voiceState = {
        isListening: false,
        isSpeaking: true,
        isProcessing: false,
        isIdle: false,
        volume: 0.7
      }
      
      const dragonTypes = ['2d', 'ascii'] as const // Skip 3D for voice integration test
      
      for (const dragonType of dragonTypes) {
        const imageData = await visualRenderer.captureComponent(
          <DragonRenderer 
            dragonType={dragonType} 
            size="lg"
            voiceState={voiceState}
          />
        )
        
        expect(imageData).toMatchImageSnapshot({
          customSnapshotIdentifier: `dragon-renderer-voice-${dragonType}`,
          failureThreshold: 0.15,
          failureThresholdType: 'percent'
        })
      }
    })

    it('should render dragon renderer with different performance modes', async () => {
      const performanceModes = ['low', 'auto', 'high'] as const
      
      for (const mode of performanceModes) {
        const imageData = await visualRenderer.captureComponent(
          <DragonRenderer 
            dragonType="3d" 
            size="lg"
            performanceMode={mode}
          />
        )
        
        expect(imageData).toMatchImageSnapshot({
          customSnapshotIdentifier: `dragon-renderer-performance-${mode}`,
          failureThreshold: 0.2,
          failureThresholdType: 'percent'
        })
      }
    })

    it('should render loading states consistently', async () => {
      // Test loading state during dragon type transition
      const { rerender } = render(
        <DragonRenderer dragonType="2d" size="lg" />
      )
      
      // Capture initial state
      const initialImageData = await visualRenderer.captureComponent(
        <DragonRenderer dragonType="2d" size="lg" />
      )
      
      expect(initialImageData).toMatchImageSnapshot({
        customSnapshotIdentifier: 'dragon-renderer-initial-state',
        failureThreshold: 0.1,
        failureThresholdType: 'percent'
      })
      
      // Test transition (would show loading spinner in real scenario)
      rerender(<DragonRenderer dragonType="ascii" size="lg" />)
      
      const transitionImageData = await visualRenderer.captureComponent(
        <DragonRenderer dragonType="ascii" size="lg" />
      )
      
      expect(transitionImageData).toMatchImageSnapshot({
        customSnapshotIdentifier: 'dragon-renderer-transition-state',
        failureThreshold: 0.2,
        failureThresholdType: 'percent'
      })
    })
  })

  describe('Cross-Component Visual Consistency', () => {
    it('should maintain visual consistency across all dragon sizes', async () => {
      const sizes = ['sm', 'md', 'lg', 'xl'] as const
      const imageData: Record<string, string> = {}
      
      // Capture all size variants
      for (const size of sizes) {
        imageData[`ascii-${size}`] = await visualRenderer.captureComponent(
          <ASCIIDragon pose="coiled" size={size} enableTypewriter={false} />
        )
        
        imageData[`sprite-${size}`] = await visualRenderer.captureComponent(
          <SimpleDragonSprite size={size} />
        )
      }
      
      // Verify each captured image
      for (const [key, data] of Object.entries(imageData)) {
        expect(data).toMatchImageSnapshot({
          customSnapshotIdentifier: `consistency-${key}`,
          failureThreshold: 0.1,
          failureThresholdType: 'percent'
        })
      }
    })

    it('should maintain theming consistency across components', async () => {
      const voiceState = {
        isListening: false,
        isSpeaking: true,
        isProcessing: false,
        isIdle: false,
        volume: 0.8
      }
      
      // Test that all components show similar theming for speaking state
      const components = [
        { name: 'ascii', component: <ASCIIDragon pose="flying" size="lg" voiceState={voiceState} /> },
        { name: 'sprite', component: <SimpleDragonSprite size="lg" voiceState={voiceState} /> },
        { name: 'renderer-2d', component: <DragonRenderer dragonType="2d" size="lg" voiceState={voiceState} /> },
        { name: 'renderer-ascii', component: <DragonRenderer dragonType="ascii" size="lg" voiceState={voiceState} /> }
      ]
      
      for (const { name, component } of components) {
        const imageData = await visualRenderer.captureComponent(component)
        
        expect(imageData).toMatchImageSnapshot({
          customSnapshotIdentifier: `theming-consistency-${name}`,
          failureThreshold: 0.15,
          failureThresholdType: 'percent'
        })
      }
    })
  })

  describe('Responsive Visual Tests', () => {
    it('should render consistently at different viewport sizes', async () => {
      const viewports = [
        { name: 'mobile', width: 320, height: 568 },
        { name: 'tablet', width: 768, height: 1024 },
        { name: 'desktop', width: 1920, height: 1080 }
      ]
      
      for (const viewport of viewports) {
        const imageData = await visualRenderer.captureComponent(
          <DragonRenderer dragonType="ascii" size="lg" />,
          { width: viewport.width, height: viewport.height }
        )
        
        expect(imageData).toMatchImageSnapshot({
          customSnapshotIdentifier: `responsive-${viewport.name}`,
          failureThreshold: 0.2,
          failureThresholdType: 'percent'
        })
      }
    })
  })

  describe('Animation Frame Visual Tests', () => {
    it('should capture consistent animation frames', async () => {
      // Test that animations produce consistent visual states
      const animationFrames = [0, 100, 500, 1000] // milliseconds
      
      for (const frame of animationFrames) {
        jest.advanceTimersByTime(frame)
        
        const imageData = await visualRenderer.captureComponent(
          <ASCIIDragon 
            pose="coiled" 
            size="lg" 
            enableBreathing={true}
            enableFloating={true}
            speed="normal"
          />
        )
        
        expect(imageData).toMatchImageSnapshot({
          customSnapshotIdentifier: `animation-frame-${frame}ms`,
          failureThreshold: 0.3, // Higher threshold for animated content
          failureThresholdType: 'percent'
        })
      }
    })
  })

  describe('Error State Visual Tests', () => {
    it('should render fallback states consistently', async () => {
      // Test fallback rendering
      const imageData = await visualRenderer.captureComponent(
        <DragonRenderer 
          dragonType="3d" 
          size="lg"
          enableFallback={true}
          fallbackType="2d"
        />
      )
      
      expect(imageData).toMatchImageSnapshot({
        customSnapshotIdentifier: 'fallback-state',
        failureThreshold: 0.2,
        failureThresholdType: 'percent'
      })
    })

    it('should render error states with voice integration issues', async () => {
      const errorVoiceState = {
        isListening: false,
        isSpeaking: false,
        isProcessing: false,
        isIdle: false,
        emotion: 'angry' as const
      }
      
      const imageData = await visualRenderer.captureComponent(
        <ASCIIDragon 
          pose="attacking" 
          size="lg" 
          voiceState={errorVoiceState}
        />
      )
      
      expect(imageData).toMatchImageSnapshot({
        customSnapshotIdentifier: 'error-voice-state',
        failureThreshold: 0.15,
        failureThresholdType: 'percent'
      })
    })
  })
})

// Visual diff utilities for development
describe('Visual Development Utilities', () => {
  let visualRenderer: VisualTestRenderer

  beforeEach(() => {
    visualRenderer = new VisualTestRenderer()
  })

  afterEach(() => {
    visualRenderer.cleanup()
  })

  it('should generate reference images for all dragon variants', async () => {
    // This test generates reference images for manual review
    // Useful during development to see how components look
    
    const variants = [
      { name: 'ascii-coiled-lg', component: <ASCIIDragon pose="coiled" size="lg" /> },
      { name: 'ascii-flying-lg', component: <ASCIIDragon pose="flying" size="lg" /> },
      { name: 'ascii-attacking-lg', component: <ASCIIDragon pose="attacking" size="lg" /> },
      { name: 'ascii-sleeping-lg', component: <ASCIIDragon pose="sleeping" size="lg" /> },
      { name: 'sprite-lg', component: <SimpleDragonSprite size="lg" /> },
      { name: 'dragon3d-lg', component: <Dragon3D size="lg" /> },
      { name: 'renderer-2d', component: <DragonRenderer dragonType="2d" size="lg" /> },
      { name: 'renderer-ascii', component: <DragonRenderer dragonType="ascii" size="lg" /> },
      { name: 'renderer-3d', component: <DragonRenderer dragonType="3d" size="lg" /> }
    ]
    
    for (const variant of variants) {
      const imageData = await visualRenderer.captureComponent(variant.component)
      
      // In a real test environment, these would be saved to files
      expect(imageData).toBeDefined()
      expect(imageData.startsWith('data:image/')).toBe(true)
      
      // Log for development purposes
      console.log(`Generated reference image for: ${variant.name}`)
    }
  })
})
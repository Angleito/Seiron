/**
 * Dragon Testing Utilities
 * 
 * Comprehensive utilities for testing dragon components and hooks.
 * Includes mocks, generators, performance testing, and visual regression helpers.
 */

import { renderHook, RenderHookResult } from '@testing-library/react'
import { render, RenderResult } from '@testing-library/react'
import React from 'react'
import * as fc from 'fast-check'
import * as TE from 'fp-ts/TaskEither'
import * as O from 'fp-ts/Option'

// Types
import { 
  DragonState, 
  DragonMood, 
  SpecialAnimation,
  Dragon3DState,
  UseDragon3DOptions
} from '../../hooks/voice/useDragon3D'

import {
  ASCIIDragonPose,
  ASCIIDragonSize,
  ASCIIDragonSpeed,
  ASCIIDragonState,
  UseASCIIDragonOptions
} from '../../hooks/voice/useASCIIDragon'

import { 
  DragonType, 
  VoiceAnimationState, 
  DragonRendererProps 
} from '../../components/dragon/DragonRenderer'

// Mock implementations
export const mockThreeJS = () => {
  const mockGeometry = {
    attributes: {
      position: {
        array: new Float32Array(300),
        needsUpdate: false
      }
    },
    computeVertexNormals: jest.fn()
  }

  return {
    Color: jest.fn().mockImplementation((color) => ({ color })),
    MeshPhongMaterial: jest.fn().mockImplementation((props) => ({ ...props, type: 'MeshPhongMaterial' })),
    MeshStandardMaterial: jest.fn().mockImplementation((props) => ({ ...props, type: 'MeshStandardMaterial' })),
    SphereGeometry: jest.fn().mockImplementation(() => mockGeometry),
    TubeGeometry: jest.fn().mockImplementation(() => mockGeometry),
    ConeGeometry: jest.fn().mockImplementation(() => mockGeometry),
    ShapeGeometry: jest.fn().mockImplementation(() => mockGeometry),
    PlaneGeometry: jest.fn().mockImplementation(() => mockGeometry),
    CatmullRomCurve3: jest.fn().mockImplementation((points) => ({ points })),
    Vector3: jest.fn().mockImplementation((x, y, z) => ({ x, y, z })),
    Shape: jest.fn().mockImplementation(() => ({
      moveTo: jest.fn(),
      bezierCurveTo: jest.fn()
    })),
    DoubleSide: 'DoubleSide'
  }
}

export const mockReactThreeFiber = () => ({
  Canvas: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="three-canvas">{children}</div>
  ),
  useFrame: jest.fn(),
  useThree: () => ({ camera: { position: { set: jest.fn() } } })
})

export const mockFramerMotion = () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    pre: ({ children, ...props }: any) => <pre {...props}>{children}</pre>
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>
})

export const mockPerformanceMonitor = (overrides: any = {}) => ({
  performanceScore: 75,
  isHighPerformance: true,
  shouldReduceQuality: false,
  shouldDisableAnimations: false,
  ...overrides
})

// Property-based test generators
export const dragonPropertyGenerators = {
  dragonState: fc.constantFrom<DragonState>(
    'idle', 'attention', 'ready', 'active', 'speaking', 'listening', 'processing'
  ),
  
  dragonMood: fc.constantFrom<DragonMood>(
    'calm', 'excited', 'focused', 'playful', 'powerful', 'mystical', 'alert'
  ),
  
  specialAnimation: fc.constantFrom<SpecialAnimation>(
    'roar', 'powerUp', 'spin', 'pulse', 'shake', 'breatheFire', 'orbit', 'charge'
  ),
  
  asciiPose: fc.constantFrom<ASCIIDragonPose>(
    'coiled', 'flying', 'attacking', 'sleeping'
  ),
  
  asciiSize: fc.constantFrom<ASCIIDragonSize>(
    'sm', 'md', 'lg', 'xl'
  ),
  
  asciiSpeed: fc.constantFrom<ASCIIDragonSpeed>(
    'slow', 'normal', 'fast'
  ),
  
  dragonType: fc.constantFrom<DragonType>(
    '2d', '3d', 'ascii'
  ),
  
  powerLevel: fc.integer({ min: 0, max: 100 }),
  
  intensity: fc.float({ min: 0, max: 1 }),
  
  speedFactor: fc.float({ min: 0.1, max: 5 }),
  
  voiceState: fc.record({
    isListening: fc.boolean(),
    isSpeaking: fc.boolean(),
    isProcessing: fc.boolean(),
    isIdle: fc.boolean(),
    volume: fc.option(fc.float({ min: 0, max: 1 })),
    emotion: fc.option(fc.constantFrom('neutral', 'happy', 'angry', 'sleeping', 'excited'))
  }).map(state => ({
    ...state,
    volume: state.volume ?? undefined,
    emotion: state.emotion ?? undefined,
    // Ensure one state is always true
    isIdle: !state.isListening && !state.isSpeaking && !state.isProcessing
  }))
}

// Test data factories
export class DragonTestDataFactory {
  static createDefaultDragon3DState(overrides: Partial<Dragon3DState> = {}): Dragon3DState {
    return {
      state: 'idle',
      mood: 'calm',
      powerLevel: 30,
      isCharging: false,
      isAnimating: false,
      specialAnimation: O.none,
      animationConfig: {
        breathing: { enabled: true, speed: 1, intensity: 0.5 },
        floating: { enabled: true, speed: 0.8, amplitude: 0.3 },
        wingFlapping: { enabled: true, speed: 1.2, intensity: 0.6 },
        particles: { enabled: true, count: 100, intensity: 0.5 },
        aura: { enabled: true, intensity: 0.4, color: '#ef4444' }
      },
      voiceIntegration: {
        reactToVoice: true,
        isListening: false,
        isSpeaking: false,
        isProcessing: false,
        transcriptLength: 0
      },
      performance: {
        enabled: true,
        quality: 'medium',
        fps: 60,
        shouldOptimize: false
      },
      ...overrides
    }
  }

  static createDefaultASCIIDragonState(overrides: Partial<ASCIIDragonState> = {}): ASCIIDragonState {
    return {
      pose: 'coiled',
      size: 'lg',
      speed: 'normal',
      state: 'idle',
      animationConfig: {
        typewriter: { enabled: true, speed: 100, cursor: true },
        breathing: { enabled: true, speed: 4000, intensity: 0.15, characterMapping: true },
        floating: { enabled: true, speed: 8000, amplitude: 10, rotationEnabled: true },
        transitions: { enabled: true, duration: 1000, easing: 'ease-in-out' },
        performance: { enabled: true, throttleMs: 16, maxFPS: 60 }
      },
      typewriter: {
        displayedLines: [],
        currentLineIndex: 0,
        currentCharIndex: 0,
        isComplete: false,
        isActive: false
      },
      breathing: { intensity: 1, phase: 0, lastUpdate: 0 },
      floating: { offsetY: 0, offsetX: 0, rotation: 0, lastUpdate: 0 },
      transitions: {
        isTransitioning: false,
        fromPose: O.none,
        toPose: O.none,
        progress: 0,
        startTime: 0
      },
      voiceIntegration: {
        reactToVoice: true,
        isListening: false,
        isSpeaking: false,
        isProcessing: false,
        transcriptLength: 0,
        currentMessage: ''
      },
      performance: {
        fps: 60,
        shouldOptimize: false,
        animationFrameId: null,
        lastFrameTime: 0
      },
      keyboard: {
        enableShortcuts: true,
        shortcuts: { '1': 'coiled', '2': 'flying', '3': 'attacking', '4': 'sleeping' }
      },
      ...overrides
    }
  }

  static createVoiceState(overrides: Partial<VoiceAnimationState> = {}): VoiceAnimationState {
    return {
      isListening: false,
      isSpeaking: false,
      isProcessing: false,
      isIdle: true,
      volume: 0.5,
      emotion: 'neutral',
      ...overrides
    }
  }

  static createDragonRendererProps(overrides: Partial<DragonRendererProps> = {}): DragonRendererProps {
    return {
      dragonType: '2d',
      size: 'lg',
      className: '',
      enableHover: true,
      enableFallback: true,
      fallbackType: '2d',
      performanceMode: 'auto',
      ...overrides
    }
  }
}

// Performance testing utilities
export class DragonPerformanceTester {
  private measurements: number[] = []
  private startTime: number = 0

  start(): void {
    this.startTime = performance.now()
  }

  record(): void {
    const elapsed = performance.now() - this.startTime
    this.measurements.push(elapsed)
  }

  finish(): number {
    return performance.now() - this.startTime
  }

  getAverageTime(): number {
    return this.measurements.reduce((a, b) => a + b, 0) / this.measurements.length
  }

  getMaxTime(): number {
    return Math.max(...this.measurements)
  }

  getMinTime(): number {
    return Math.min(...this.measurements)
  }

  reset(): void {
    this.measurements = []
    this.startTime = 0
  }

  static async measureAsyncOperation<T>(operation: () => Promise<T>): Promise<{ result: T; time: number }> {
    const start = performance.now()
    const result = await operation()
    const time = performance.now() - start
    return { result, time }
  }

  static measureSyncOperation<T>(operation: () => T): { result: T; time: number } {
    const start = performance.now()
    const result = operation()
    const time = performance.now() - start
    return { result, time }
  }
}

// Animation testing utilities
export class DragonAnimationTester {
  static advanceAnimations(ms: number): void {
    jest.advanceTimersByTime(ms)
  }

  static async waitForAnimationFrame(): Promise<void> {
    return new Promise(resolve => {
      requestAnimationFrame(() => resolve())
    })
  }

  static async waitForAnimationFrames(count: number): Promise<void> {
    for (let i = 0; i < count; i++) {
      await this.waitForAnimationFrame()
    }
  }

  static expectAnimationCompleted(isComplete: boolean, timeElapsed: number, expectedDuration: number): void {
    if (timeElapsed >= expectedDuration) {
      expect(isComplete).toBe(true)
    } else {
      expect(isComplete).toBe(false)
    }
  }

  static expectValueInRange(value: number, min: number, max: number, context: string = ''): void {
    expect(value).toBeGreaterThanOrEqual(min)
    expect(value).toBeLessThanOrEqual(max)
    if (context) {
      expect(value).toBeDefined() // Additional context for debugging
    }
  }
}

// State validation utilities
export class DragonStateValidator {
  static validateDragon3DState(state: Dragon3DState): void {
    expect(state.powerLevel).toBeGreaterThanOrEqual(0)
    expect(state.powerLevel).toBeLessThanOrEqual(100)
    expect(['idle', 'attention', 'ready', 'active', 'speaking', 'listening', 'processing']).toContain(state.state)
    expect(['calm', 'excited', 'focused', 'playful', 'powerful', 'mystical', 'alert']).toContain(state.mood)
    expect(typeof state.isCharging).toBe('boolean')
    expect(typeof state.isAnimating).toBe('boolean')
  }

  static validateASCIIDragonState(state: ASCIIDragonState): void {
    expect(['coiled', 'flying', 'attacking', 'sleeping']).toContain(state.pose)
    expect(['sm', 'md', 'lg', 'xl']).toContain(state.size)
    expect(['slow', 'normal', 'fast']).toContain(state.speed)
    expect(['idle', 'typing', 'breathing', 'floating', 'reacting', 'transitioning']).toContain(state.state)
    expect(state.breathing.intensity).toBeGreaterThan(0)
    expect(typeof state.typewriter.isActive).toBe('boolean')
    expect(typeof state.typewriter.isComplete).toBe('boolean')
  }

  static validateVoiceState(state: VoiceAnimationState): void {
    expect(typeof state.isListening).toBe('boolean')
    expect(typeof state.isSpeaking).toBe('boolean')
    expect(typeof state.isProcessing).toBe('boolean')
    expect(typeof state.isIdle).toBe('boolean')
    
    if (state.volume !== undefined) {
      expect(state.volume).toBeGreaterThanOrEqual(0)
      expect(state.volume).toBeLessThanOrEqual(1)
    }
    
    if (state.emotion !== undefined) {
      expect(['neutral', 'happy', 'angry', 'sleeping', 'excited']).toContain(state.emotion)
    }
  }
}

// Hook testing utilities
export class DragonHookTester {
  static async testStateTransition<T>(
    hook: RenderHookResult<T, any>,
    setState: (newState: any) => TE.TaskEither<any, void>,
    newState: any,
    getCurrentState: () => any
  ): Promise<void> {
    const result = await setState(newState)()
    expect(TE.isRight(result)).toBe(true)
    expect(getCurrentState()).toBe(newState)
  }

  static expectHookStable<T>(
    hook: RenderHookResult<T, any>,
    accessor: (result: T) => any
  ): void {
    const value1 = accessor(hook.result.current)
    hook.rerender()
    const value2 = accessor(hook.result.current)
    expect(value1).toEqual(value2)
  }

  static async testAsyncHookAction<T, U>(
    action: () => TE.TaskEither<any, U>
  ): Promise<U> {
    const result = await action()()
    expect(TE.isRight(result)).toBe(true)
    if (TE.isRight(result)) {
      return result.right
    }
    throw new Error('Hook action failed')
  }
}

// Component testing utilities
export class DragonComponentTester {
  static expectComponentRendered(container: HTMLElement, testId: string): void {
    const element = container.querySelector(`[data-testid="${testId}"]`)
    expect(element).toBeInTheDocument()
  }

  static expectPropsApplied(element: HTMLElement, expectedProps: Record<string, any>): void {
    Object.entries(expectedProps).forEach(([key, value]) => {
      if (key === 'className') {
        expect(element).toHaveClass(value)
      } else if (key.startsWith('data-')) {
        expect(element).toHaveAttribute(key, String(value))
      }
    })
  }

  static expectSizeClass(element: HTMLElement, size: ASCIIDragonSize | 'sm' | 'md' | 'lg' | 'xl'): void {
    const sizeClasses = {
      sm: ['text-xs', 'w-16', 'w-32'],
      md: ['text-sm', 'w-24', 'w-48'],
      lg: ['text-base', 'w-32', 'w-64'],
      xl: ['text-lg', 'w-48', 'w-96']
    }
    
    const expectedClasses = sizeClasses[size]
    const hasAnyExpectedClass = expectedClasses.some(cls => element.classList.contains(cls))
    expect(hasAnyExpectedClass).toBe(true)
  }
}

// Property-based test runners
export class DragonPropertyTester {
  static runDragon3DPropertyTest(
    property: (state: DragonState, mood: DragonMood, power: number) => boolean,
    options: { numRuns?: number } = {}
  ): void {
    fc.assert(fc.property(
      dragonPropertyGenerators.dragonState,
      dragonPropertyGenerators.dragonMood,
      dragonPropertyGenerators.powerLevel,
      property
    ), { numRuns: options.numRuns ?? 50 })
  }

  static runASCIIPropertyTest(
    property: (pose: ASCIIDragonPose, size: ASCIIDragonSize, speed: ASCIIDragonSpeed) => boolean,
    options: { numRuns?: number } = {}
  ): void {
    fc.assert(fc.property(
      dragonPropertyGenerators.asciiPose,
      dragonPropertyGenerators.asciiSize,
      dragonPropertyGenerators.asciiSpeed,
      property
    ), { numRuns: options.numRuns ?? 50 })
  }

  static runVoiceStatePropertyTest(
    property: (voiceState: VoiceAnimationState) => boolean,
    options: { numRuns?: number } = {}
  ): void {
    fc.assert(fc.property(
      dragonPropertyGenerators.voiceState,
      property
    ), { numRuns: options.numRuns ?? 50 })
  }
}

// Integration test utilities
export class DragonIntegrationTester {
  static async testVoiceIntegration(
    dragon3DHook: any,
    asciiHook: any,
    voiceState: VoiceAnimationState
  ): Promise<void> {
    // Test that both hooks respond to voice state changes
    dragon3DHook.result.current.onVoiceListeningStart()
    asciiHook.result.current.onVoiceListeningStart()
    
    expect(dragon3DHook.result.current.voiceIntegration.isListening).toBe(true)
    expect(asciiHook.result.current.voiceIntegration.isListening).toBe(true)
  }

  static expectCrossComponentConsistency(
    dragon3DState: DragonState,
    asciiPose: ASCIIDragonPose,
    voiceState: VoiceAnimationState
  ): void {
    // Verify that different dragon components respond consistently to voice states
    if (voiceState.isSpeaking) {
      expect(dragon3DState).toBe('speaking')
      expect(['attacking', 'flying']).toContain(asciiPose)
    }
    
    if (voiceState.isListening) {
      expect(dragon3DState).toBe('listening')
      expect(['coiled', 'flying']).toContain(asciiPose)
    }
    
    if (voiceState.isProcessing) {
      expect(dragon3DState).toBe('processing')
      expect(asciiPose).toBe('attacking')
    }
  }
}

// Test suite builder
export class DragonTestSuiteBuilder {
  private testSuite: { name: string; test: () => void }[] = []

  addComponentTest(name: string, component: React.ReactElement, assertions: (container: HTMLElement) => void): this {
    this.testSuite.push({
      name: `Component: ${name}`,
      test: () => {
        const { container } = render(component)
        assertions(container)
      }
    })
    return this
  }

  addHookTest<T>(name: string, hook: () => T, assertions: (result: T) => void): this {
    this.testSuite.push({
      name: `Hook: ${name}`,
      test: () => {
        const { result } = renderHook(hook)
        assertions(result.current)
      }
    })
    return this
  }

  addPerformanceTest(name: string, operation: () => void, maxTime: number): this {
    this.testSuite.push({
      name: `Performance: ${name}`,
      test: () => {
        const { time } = DragonPerformanceTester.measureSyncOperation(operation)
        expect(time).toBeLessThan(maxTime)
      }
    })
    return this
  }

  addPropertyTest(name: string, property: () => boolean, numRuns: number = 50): this {
    this.testSuite.push({
      name: `Property: ${name}`,
      test: () => {
        fc.assert(fc.property(fc.constant(null), property), { numRuns })
      }
    })
    return this
  }

  build(): { name: string; test: () => void }[] {
    return [...this.testSuite]
  }
}

// Export all utilities
export const dragonTestUtils = {
  mocks: {
    threeJS: mockThreeJS,
    reactThreeFiber: mockReactThreeFiber,
    framerMotion: mockFramerMotion,
    performanceMonitor: mockPerformanceMonitor
  },
  generators: dragonPropertyGenerators,
  factories: DragonTestDataFactory,
  performance: DragonPerformanceTester,
  animation: DragonAnimationTester,
  validation: DragonStateValidator,
  hooks: DragonHookTester,
  components: DragonComponentTester,
  properties: DragonPropertyTester,
  integration: DragonIntegrationTester,
  builder: DragonTestSuiteBuilder
}

export default dragonTestUtils
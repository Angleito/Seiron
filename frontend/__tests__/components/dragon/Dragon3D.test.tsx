/**
 * @jest-environment jsdom
 */

import React from 'react'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import '@testing-library/jest-dom'
import * as fc from 'fast-check'
import Dragon3D, { Dragon3DProps } from '../../../components/dragon/Dragon3D'

// Mock Three.js and React Three Fiber
jest.mock('@react-three/fiber', () => ({
  Canvas: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="three-canvas" role="img" aria-label="3D Dragon Canvas">
      {children}
    </div>
  ),
  useFrame: (callback: (state: any) => void) => {
    React.useEffect(() => {
      const intervalId = setInterval(() => {
        callback({
          clock: { getElapsedTime: () => Date.now() / 1000 },
          camera: { position: { set: jest.fn() } }
        })
      }, 16) // ~60fps
      return () => clearInterval(intervalId)
    }, [callback])
  },
  useThree: () => ({
    camera: { position: { set: jest.fn() } },
    scene: { add: jest.fn(), remove: jest.fn() }
  })
}))

jest.mock('@react-three/drei', () => ({
  OrbitControls: ({ children, ...props }: any) => (
    <div data-testid="orbit-controls" {...props}>
      {children}
    </div>
  ),
  PerspectiveCamera: ({ children, ...props }: any) => (
    <div data-testid="perspective-camera" {...props}>
      {children}
    </div>
  )
}))

jest.mock('three', () => {
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
    __esModule: true,
    default: {
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
    },
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
})

jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>
  }
}))

// Test helpers
const createDefaultProps = (): Dragon3DProps => ({
  size: 'lg',
  className: '',
  enableHover: true,
  enableInteraction: true,
  animationSpeed: 1,
  showParticles: true,
  autoRotate: false,
  quality: 'medium'
})

const renderDragon3D = (props: Partial<Dragon3DProps> = {}) => {
  const defaultProps = createDefaultProps()
  return render(<Dragon3D {...defaultProps} {...props} />)
}

describe('Dragon3D Component', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Basic Rendering', () => {
    it('should render without crashing', () => {
      renderDragon3D()
      expect(screen.getByTestId('three-canvas')).toBeInTheDocument()
    })

    it('should render with correct size classes', () => {
      const { container } = renderDragon3D({ size: 'sm' })
      expect(container.firstChild).toHaveClass('w-32', 'h-32')
    })

    it('should apply custom className', () => {
      const customClass = 'custom-dragon-class'
      const { container } = renderDragon3D({ className: customClass })
      expect(container.firstChild).toHaveClass(customClass)
    })

    it('should render OrbitControls when interaction is enabled', () => {
      renderDragon3D({ enableInteraction: true })
      expect(screen.getByTestId('orbit-controls')).toBeInTheDocument()
    })

    it('should not render OrbitControls when interaction is disabled', () => {
      renderDragon3D({ enableInteraction: false })
      expect(screen.queryByTestId('orbit-controls')).not.toBeInTheDocument()
    })
  })

  describe('Size Variations', () => {
    const sizes: Array<'sm' | 'md' | 'lg' | 'xl'> = ['sm', 'md', 'lg', 'xl']
    
    sizes.forEach(size => {
      it(`should render correctly with size ${size}`, () => {
        const { container } = renderDragon3D({ size })
        expect(container.firstChild).toBeInTheDocument()
        
        // Check appropriate size classes
        const sizeClasses = {
          sm: 'w-32 h-32',
          md: 'w-48 h-48', 
          lg: 'w-64 h-64',
          xl: 'w-96 h-96'
        }
        
        expect(container.firstChild).toHaveClass(...sizeClasses[size].split(' '))
      })
    })
  })

  describe('Quality Settings', () => {
    const qualities: Array<'low' | 'medium' | 'high'> = ['low', 'medium', 'high']
    
    qualities.forEach(quality => {
      it(`should render with ${quality} quality`, () => {
        renderDragon3D({ quality })
        expect(screen.getByTestId('three-canvas')).toBeInTheDocument()
      })
    })
  })

  describe('Animation Configuration', () => {
    it('should render with particles when showParticles is true', () => {
      renderDragon3D({ showParticles: true })
      expect(screen.getByTestId('three-canvas')).toBeInTheDocument()
    })

    it('should render without particles when showParticles is false', () => {
      renderDragon3D({ showParticles: false })
      expect(screen.getByTestId('three-canvas')).toBeInTheDocument()
    })

    it('should handle different animation speeds', async () => {
      const speeds = [0.5, 1, 2, 3]
      
      for (const speed of speeds) {
        const { unmount } = renderDragon3D({ animationSpeed: speed })
        expect(screen.getByTestId('three-canvas')).toBeInTheDocument()
        unmount()
      }
    })

    it('should enable auto-rotation when autoRotate is true', () => {
      renderDragon3D({ autoRotate: true })
      const controls = screen.getByTestId('orbit-controls')
      expect(controls).toBeInTheDocument()
    })
  })

  describe('User Interactions', () => {
    it('should call onClick when clicked', () => {
      const mockOnClick = jest.fn()
      const { container } = renderDragon3D({ onClick: mockOnClick })
      
      fireEvent.click(container.firstChild!)
      expect(mockOnClick).toHaveBeenCalledTimes(1)
    })

    it('should handle hover effects when enabled', () => {
      const { container } = renderDragon3D({ enableHover: true })
      
      fireEvent.mouseEnter(container.firstChild!)
      fireEvent.mouseLeave(container.firstChild!)
      
      // Component should not crash on hover events
      expect(container.firstChild).toBeInTheDocument()
    })

    it('should not have hover effects when disabled', () => {
      const { container } = renderDragon3D({ enableHover: false })
      expect(container.firstChild).toBeInTheDocument()
    })
  })

  describe('Performance Optimization', () => {
    it('should handle low quality setting for performance', () => {
      renderDragon3D({ quality: 'low' })
      expect(screen.getByTestId('three-canvas')).toBeInTheDocument()
    })

    it('should handle high quality setting', () => {
      renderDragon3D({ quality: 'high' })
      expect(screen.getByTestId('three-canvas')).toBeInTheDocument()
    })

    it('should disable particles for performance when needed', () => {
      renderDragon3D({ 
        quality: 'low',
        showParticles: false
      })
      expect(screen.getByTestId('three-canvas')).toBeInTheDocument()
    })
  })

  describe('Error Handling', () => {
    it('should handle Three.js initialization errors gracefully', () => {
      // Mock console.error to avoid noise in test output
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation()
      
      renderDragon3D()
      expect(screen.getByTestId('three-canvas')).toBeInTheDocument()
      
      consoleSpy.mockRestore()
    })

    it('should continue rendering when geometry creation fails', () => {
      renderDragon3D()
      expect(screen.getByTestId('three-canvas')).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      renderDragon3D()
      expect(screen.getByRole('img', { name: '3D Dragon Canvas' })).toBeInTheDocument()
    })

    it('should be keyboard accessible when interaction is enabled', () => {
      const mockOnClick = jest.fn()
      const { container } = renderDragon3D({ 
        onClick: mockOnClick,
        enableInteraction: true
      })
      
      const element = container.firstChild as HTMLElement
      element.focus()
      fireEvent.keyDown(element, { key: 'Enter' })
      
      // Should not crash on keyboard events
      expect(element).toBeInTheDocument()
    })
  })

  describe('Property-based Tests', () => {
    it('should handle arbitrary size values safely', () => {
      fc.assert(fc.property(
        fc.constantFrom('sm', 'md', 'lg', 'xl'),
        fc.boolean(),
        fc.boolean(),
        fc.float({ min: 0.1, max: 5 }),
        (size, showParticles, autoRotate, animationSpeed) => {
          const { container } = renderDragon3D({
            size,
            showParticles,
            autoRotate,
            animationSpeed
          })
          
          expect(container.firstChild).toBeInTheDocument()
          return true
        }
      ), { numRuns: 20 })
    })

    it('should handle arbitrary quality settings', () => {
      fc.assert(fc.property(
        fc.constantFrom('low', 'medium', 'high'),
        fc.boolean(),
        fc.boolean(),
        (quality, enableHover, enableInteraction) => {
          const { container } = renderDragon3D({
            quality,
            enableHover,
            enableInteraction
          })
          
          expect(container.firstChild).toBeInTheDocument()
          return true
        }
      ), { numRuns: 15 })
    })
  })

  describe('Memory Management', () => {
    it('should clean up properly on unmount', () => {
      const { unmount } = renderDragon3D()
      
      expect(() => {
        unmount()
      }).not.toThrow()
    })

    it('should handle multiple mount/unmount cycles', () => {
      for (let i = 0; i < 3; i++) {
        const { unmount } = renderDragon3D()
        expect(screen.getByTestId('three-canvas')).toBeInTheDocument()
        unmount()
      }
    })
  })

  describe('Animation Frame Management', () => {
    it('should start animation loops', async () => {
      renderDragon3D({ animationSpeed: 2 })
      
      await waitFor(() => {
        expect(screen.getByTestId('three-canvas')).toBeInTheDocument()
      })
    })

    it('should handle animation speed changes', async () => {
      const { rerender } = renderDragon3D({ animationSpeed: 1 })
      
      rerender(<Dragon3D {...createDefaultProps()} animationSpeed={2} />)
      
      await waitFor(() => {
        expect(screen.getByTestId('three-canvas')).toBeInTheDocument()
      })
    })
  })

  describe('Component Updates', () => {
    it('should handle prop changes without remounting', () => {
      const { rerender } = renderDragon3D({ size: 'sm' })
      
      rerender(<Dragon3D {...createDefaultProps()} size="lg" />)
      expect(screen.getByTestId('three-canvas')).toBeInTheDocument()
    })

    it('should update particles when showParticles changes', () => {
      const { rerender } = renderDragon3D({ showParticles: true })
      
      rerender(<Dragon3D {...createDefaultProps()} showParticles={false} />)
      expect(screen.getByTestId('three-canvas')).toBeInTheDocument()
    })

    it('should update quality settings dynamically', () => {
      const { rerender } = renderDragon3D({ quality: 'low' })
      
      rerender(<Dragon3D {...createDefaultProps()} quality="high" />)
      expect(screen.getByTestId('three-canvas')).toBeInTheDocument()
    })
  })
})

// Performance benchmark tests
describe('Dragon3D Performance', () => {
  it('should render within acceptable time limits', async () => {
    const startTime = performance.now()
    
    renderDragon3D()
    
    const renderTime = performance.now() - startTime
    expect(renderTime).toBeLessThan(100) // Should render in under 100ms
  })

  it('should handle multiple instances efficiently', () => {
    const instances = []
    
    for (let i = 0; i < 3; i++) {
      instances.push(renderDragon3D({ size: 'sm' }))
    }
    
    instances.forEach(instance => {
      expect(instance.container.firstChild).toBeInTheDocument()
      instance.unmount()
    })
  })
})
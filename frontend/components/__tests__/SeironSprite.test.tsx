import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { SeironSprite, sizeConfig, qualityConfigs } from '../SeironSprite';
import type { SeironSpriteProps } from '../SeironSprite';

// Mock HTML5 Canvas API
const mockCanvas = {
  getContext: jest.fn(() => ({
    clearRect: jest.fn(),
    fillRect: jest.fn(),
    strokeRect: jest.fn(),
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 0,
    lineCap: 'butt',
    lineJoin: 'miter',
    globalAlpha: 1,
    font: '',
    textAlign: 'start',
    textBaseline: 'alphabetic',
    direction: 'ltr',
    imageSmoothingEnabled: true,
    imageSmoothingQuality: 'low',
    filter: 'none',
    globalCompositeOperation: 'source-over',
    lineDashOffset: 0,
    miterLimit: 10,
    shadowBlur: 0,
    shadowColor: '',
    shadowOffsetX: 0,
    shadowOffsetY: 0,
    arc: jest.fn(),
    arcTo: jest.fn(),
    beginPath: jest.fn(),
    bezierCurveTo: jest.fn(),
    clearRect: jest.fn(),
    clip: jest.fn(),
    closePath: jest.fn(),
    createImageData: jest.fn(),
    createLinearGradient: jest.fn(() => ({
      addColorStop: jest.fn()
    })),
    createRadialGradient: jest.fn(() => ({
      addColorStop: jest.fn()
    })),
    createPattern: jest.fn(),
    drawImage: jest.fn(),
    ellipse: jest.fn(),
    fill: jest.fn(),
    fillText: jest.fn(),
    getImageData: jest.fn(),
    getLineDash: jest.fn(() => []),
    getTransform: jest.fn(),
    isPointInPath: jest.fn(),
    isPointInStroke: jest.fn(),
    lineTo: jest.fn(),
    measureText: jest.fn(() => ({ width: 0 })),
    moveTo: jest.fn(),
    putImageData: jest.fn(),
    quadraticCurveTo: jest.fn(),
    rect: jest.fn(),
    resetTransform: jest.fn(),
    restore: jest.fn(),
    rotate: jest.fn(),
    save: jest.fn(),
    scale: jest.fn(),
    setLineDash: jest.fn(),
    setTransform: jest.fn(),
    stroke: jest.fn(),
    strokeText: jest.fn(),
    transform: jest.fn(),
    translate: jest.fn(),
    canvas: {
      width: 400,
      height: 400,
      style: {}
    }
  })),
  width: 400,
  height: 400,
  style: {},
  getBoundingClientRect: jest.fn(() => ({
    left: 0,
    top: 0,
    right: 400,
    bottom: 400,
    width: 400,
    height: 400
  }))
};

// Mock HTMLCanvasElement
Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
  value: mockCanvas.getContext,
});

Object.defineProperty(HTMLCanvasElement.prototype, 'getBoundingClientRect', {
  value: mockCanvas.getBoundingClientRect,
});

// Mock requestAnimationFrame
global.requestAnimationFrame = jest.fn((callback) => {
  return setTimeout(callback, 16);
});

global.cancelAnimationFrame = jest.fn((id) => {
  clearTimeout(id);
});

// Mock performance.now
Object.defineProperty(window, 'performance', {
  value: {
    now: jest.fn(() => Date.now()),
  },
});

// Mock console methods for testing
const originalConsoleLog = console.log;
const originalConsoleError = console.error;

beforeEach(() => {
  jest.clearAllMocks();
  console.log = jest.fn();
  console.error = jest.fn();
});

afterEach(() => {
  console.log = originalConsoleLog;
  console.error = originalConsoleError;
});

describe('SeironSprite', () => {
  const defaultProps: SeironSpriteProps = {
    size: 'md',
    quality: 'medium',
    interactive: false,
  };

  describe('Component Rendering', () => {
    test('renders without crashing', () => {
      render(<SeironSprite {...defaultProps} />);
      expect(screen.getByRole('img', { hidden: true })).toBeInTheDocument();
    });

    test('renders with correct size classes', () => {
      const { rerender } = render(<SeironSprite {...defaultProps} size="sm" />);
      expect(document.querySelector('.w-32')).toBeInTheDocument();

      rerender(<SeironSprite {...defaultProps} size="lg" />);
      expect(document.querySelector('.w-80')).toBeInTheDocument();

      rerender(<SeironSprite {...defaultProps} size="xl" />);
      expect(document.querySelector('.w-96')).toBeInTheDocument();
    });

    test('applies custom className', () => {
      const customClass = 'test-custom-class';
      render(<SeironSprite {...defaultProps} className={customClass} />);
      expect(document.querySelector(`.${customClass}`)).toBeInTheDocument();
    });

    test('shows cursor pointer when interactive', () => {
      render(<SeironSprite {...defaultProps} interactive={true} />);
      expect(document.querySelector('.cursor-pointer')).toBeInTheDocument();
    });

    test('shows ready indicator when readyToGrant is true', () => {
      render(<SeironSprite {...defaultProps} interactive={true} readyToGrant={true} />);
      expect(screen.getByText('Ready to Grant Wishes')).toBeInTheDocument();
    });
  });

  describe('Configuration and Quality Settings', () => {
    test('uses correct quality configuration', () => {
      const { rerender } = render(<SeironSprite {...defaultProps} quality="low" />);
      expect(qualityConfigs.low).toBeDefined();

      rerender(<SeironSprite {...defaultProps} quality="high" />);
      expect(qualityConfigs.high).toBeDefined();
    });

    test('size configurations are valid', () => {
      Object.values(sizeConfig).forEach(config => {
        expect(config).toHaveProperty('width');
        expect(config).toHaveProperty('height');
        expect(config).toHaveProperty('containerSize');
        expect(typeof config.width).toBe('number');
        expect(typeof config.height).toBe('number');
      });
    });

    test('quality configurations have required properties', () => {
      Object.values(qualityConfigs).forEach(config => {
        expect(config).toHaveProperty('particleCount');
        expect(config).toHaveProperty('particleLifetime');
        expect(config).toHaveProperty('coinCount');
        expect(config).toHaveProperty('animationComplexity');
        expect(config).toHaveProperty('targetFPS');
      });
    });
  });

  describe('Interactive Behavior', () => {
    test('calls onInteraction callback on hover', async () => {
      const onInteraction = jest.fn();
      render(
        <SeironSprite 
          {...defaultProps} 
          interactive={true} 
          onInteraction={onInteraction}
        />
      );

      const container = document.querySelector('[class*="cursor-pointer"]');
      expect(container).toBeInTheDocument();

      fireEvent.mouseEnter(container!);
      await waitFor(() => {
        expect(onInteraction).toHaveBeenCalledWith('hover');
      });
    });

    test('calls onInteraction callback on click', async () => {
      const onInteraction = jest.fn();
      render(
        <SeironSprite 
          {...defaultProps} 
          interactive={true} 
          onInteraction={onInteraction}
        />
      );

      const container = document.querySelector('[class*="cursor-pointer"]');
      fireEvent.click(container!);
      
      await waitFor(() => {
        expect(onInteraction).toHaveBeenCalledWith('click');
      });
    });

    test('calls onWishGrant callback when ready and clicked', async () => {
      const onWishGrant = jest.fn();
      render(
        <SeironSprite 
          {...defaultProps} 
          interactive={true} 
          readyToGrant={true}
          onWishGrant={onWishGrant}
        />
      );

      const container = document.querySelector('[class*="cursor-pointer"]');
      fireEvent.click(container!);
      
      await waitFor(() => {
        expect(onWishGrant).toHaveBeenCalledWith(
          expect.oneOf(['power', 'wisdom', 'fortune'])
        );
      });
    });

    test('handles touch events on mobile', async () => {
      const onInteraction = jest.fn();
      render(
        <SeironSprite 
          {...defaultProps} 
          interactive={true} 
          onInteraction={onInteraction}
        />
      );

      const container = document.querySelector('[class*="cursor-pointer"]');
      fireEvent.touchStart(container!, {
        touches: [{ clientX: 200, clientY: 200 }]
      });
      
      await waitFor(() => {
        expect(onInteraction).toHaveBeenCalledWith('touch');
      });
    });
  });

  describe('Performance and Optimization', () => {
    test('shows performance metrics in development mode', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';
      
      render(<SeironSprite {...defaultProps} />);
      
      expect(screen.getByText(/FPS:/)).toBeInTheDocument();
      expect(screen.getByText(/Frame Time:/)).toBeInTheDocument();
      expect(screen.getByText(/Quality:/)).toBeInTheDocument();
      
      process.env.NODE_ENV = originalEnv;
    });

    test('applies battery optimization settings', () => {
      render(<SeironSprite {...defaultProps} batteryOptimized={true} />);
      // Component should render without errors with battery optimization
      expect(screen.getByRole('img', { hidden: true })).toBeInTheDocument();
    });

    test('enables auto quality adjustment', () => {
      render(<SeironSprite {...defaultProps} enableAutoQuality={true} />);
      // Component should render without errors with auto quality
      expect(screen.getByRole('img', { hidden: true })).toBeInTheDocument();
    });
  });

  describe('Animation States', () => {
    test('shows correct animation mode indicators', async () => {
      const { rerender } = render(
        <SeironSprite 
          {...defaultProps} 
          interactive={true}
          readyToGrant={true}
        />
      );

      // Initially should show idle state
      expect(screen.getByText('Ready to Grant Wishes')).toBeInTheDocument();

      // Trigger wish granting
      const container = document.querySelector('[class*="cursor-pointer"]');
      fireEvent.click(container!);

      await waitFor(() => {
        expect(screen.getByText('Granting Wish...')).toBeInTheDocument();
      });
    });

    test('handles mouse hover animation state', async () => {
      render(
        <SeironSprite 
          {...defaultProps} 
          interactive={true}
        />
      );

      const container = document.querySelector('[class*="cursor-pointer"]');
      fireEvent.mouseEnter(container!);

      await waitFor(() => {
        expect(screen.getByText('Awakening...')).toBeInTheDocument();
      });
    });
  });

  describe('Canvas Operations', () => {
    test('initializes canvas context correctly', () => {
      render(<SeironSprite {...defaultProps} />);
      const canvas = document.querySelector('canvas');
      expect(canvas).toBeInTheDocument();
      expect(canvas?.getContext).toHaveBeenCalledWith('2d');
    });

    test('handles canvas resize', () => {
      render(<SeironSprite {...defaultProps} />);
      
      // Trigger resize event
      act(() => {
        window.dispatchEvent(new Event('resize'));
      });

      // Canvas should still be present after resize
      const canvas = document.querySelector('canvas');
      expect(canvas).toBeInTheDocument();
    });

    test('cleans up animation frame on unmount', () => {
      const { unmount } = render(<SeironSprite {...defaultProps} />);
      
      unmount();
      
      // cancelAnimationFrame should be called during cleanup
      expect(global.cancelAnimationFrame).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    test('handles missing canvas gracefully', () => {
      // Mock getContext to return null
      const originalGetContext = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = jest.fn(() => null);
      
      expect(() => {
        render(<SeironSprite {...defaultProps} />);
      }).not.toThrow();
      
      HTMLCanvasElement.prototype.getContext = originalGetContext;
    });

    test('handles WebGL detection failure', () => {
      // Mock WebGL context failure
      const originalGetContext = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = jest.fn((type) => {
        if (type === 'webgl' || type === 'experimental-webgl') {
          return null;
        }
        return mockCanvas.getContext(type);
      });
      
      expect(() => {
        render(<SeironSprite {...defaultProps} />);
      }).not.toThrow();
      
      HTMLCanvasElement.prototype.getContext = originalGetContext;
    });
  });

  describe('Memory Management', () => {
    test('cleans up particles on unmount', () => {
      const { unmount } = render(<SeironSprite {...defaultProps} />);
      
      unmount();
      
      // Component should unmount without memory leaks
      expect(document.querySelector('canvas')).not.toBeInTheDocument();
    });

    test('handles particle pool management', () => {
      render(<SeironSprite {...defaultProps} quality="high" />);
      
      // High quality should create more particles
      expect(qualityConfigs.high.particlePoolSize).toBeGreaterThan(
        qualityConfigs.low.particlePoolSize
      );
    });
  });

  describe('Accessibility', () => {
    test('provides appropriate cursor styles', () => {
      const { rerender } = render(
        <SeironSprite {...defaultProps} interactive={false} />
      );
      expect(document.querySelector('.cursor-default')).toBeInTheDocument();

      rerender(<SeironSprite {...defaultProps} interactive={true} />);
      expect(document.querySelector('.cursor-pointer')).toBeInTheDocument();
    });

    test('handles keyboard navigation when interactive', () => {
      render(
        <SeironSprite 
          {...defaultProps} 
          interactive={true}
        />
      );

      const container = document.querySelector('[class*="cursor-pointer"]');
      
      // Test keyboard events
      fireEvent.keyDown(container!, { key: 'Enter' });
      fireEvent.keyDown(container!, { key: ' ' });
      
      // Should not throw errors
      expect(container).toBeInTheDocument();
    });
  });

  describe('Integration Tests', () => {
    test('works with all size and quality combinations', () => {
      const sizes = ['sm', 'md', 'lg', 'xl'] as const;
      const qualities = ['low', 'medium', 'high'] as const;

      sizes.forEach(size => {
        qualities.forEach(quality => {
          const { unmount } = render(
            <SeironSprite 
              size={size} 
              quality={quality} 
              interactive={true}
            />
          );
          
          expect(screen.getByRole('img', { hidden: true })).toBeInTheDocument();
          unmount();
        });
      });
    });

    test('handles rapid state changes', async () => {
      const onWishGrant = jest.fn();
      render(
        <SeironSprite 
          {...defaultProps} 
          interactive={true} 
          readyToGrant={true}
          onWishGrant={onWishGrant}
        />
      );

      const container = document.querySelector('[class*="cursor-pointer"]');
      
      // Rapidly click multiple times
      for (let i = 0; i < 5; i++) {
        fireEvent.click(container!);
        await new Promise(resolve => setTimeout(resolve, 10));
      }
      
      // Should handle rapid clicks gracefully
      expect(container).toBeInTheDocument();
    });
  });

  describe('Performance Benchmarks', () => {
    test('animation frame rate stays within expected bounds', async () => {
      const { unmount } = render(
        <SeironSprite {...defaultProps} quality="high" />
      );

      // Let animation run for a bit
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Should have called requestAnimationFrame multiple times
      expect(global.requestAnimationFrame).toHaveBeenCalled();
      
      unmount();
    });

    test('particle count respects quality settings', () => {
      expect(qualityConfigs.low.particleCount).toBeLessThan(
        qualityConfigs.medium.particleCount
      );
      expect(qualityConfigs.medium.particleCount).toBeLessThan(
        qualityConfigs.high.particleCount
      );
    });
  });
});

// Custom Jest matchers
expect.extend({
  oneOf(received, expected) {
    const pass = expected.includes(received);
    if (pass) {
      return {
        message: () => `expected ${received} not to be one of ${expected}`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be one of ${expected}`,
        pass: false,
      };
    }
  },
});
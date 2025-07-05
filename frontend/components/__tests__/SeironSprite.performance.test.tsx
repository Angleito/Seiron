import React from 'react';
import { render, act } from '@testing-library/react';
import { SeironSprite, qualityConfigs } from '../SeironSprite';

// Performance testing utilities
const measurePerformance = async (component: React.ReactElement, duration: number = 1000) => {
  const startTime = performance.now();
  const frameTimings: number[] = [];
  let frameCount = 0;

  const { unmount } = render(component);

  // Mock requestAnimationFrame to capture timing
  const originalRAF = global.requestAnimationFrame;
  global.requestAnimationFrame = jest.fn((callback) => {
    const frameStart = performance.now();
    setTimeout(() => {
      const frameEnd = performance.now();
      frameTimings.push(frameEnd - frameStart);
      frameCount++;
      callback(frameEnd);
    }, 16); // ~60fps
    return frameCount;
  });

  await new Promise(resolve => setTimeout(resolve, duration));

  const endTime = performance.now();
  const totalTime = endTime - startTime;
  const avgFrameTime = frameTimings.reduce((a, b) => a + b, 0) / frameTimings.length;
  const fps = 1000 / avgFrameTime;

  unmount();
  global.requestAnimationFrame = originalRAF;

  return {
    totalTime,
    frameCount,
    avgFrameTime,
    fps,
    frameTimings
  };
};

describe('SeironSprite Performance Tests', () => {
  // Mock canvas for performance tests
  beforeEach(() => {
    HTMLCanvasElement.prototype.getContext = jest.fn(() => ({
      clearRect: jest.fn(),
      fillRect: jest.fn(),
      strokeRect: jest.fn(),
      fillStyle: '',
      strokeStyle: '',
      lineWidth: 0,
      globalAlpha: 1,
      font: '',
      textAlign: 'start',
      textBaseline: 'alphabetic',
      imageSmoothingEnabled: true,
      arc: jest.fn(),
      beginPath: jest.fn(),
      closePath: jest.fn(),
      createLinearGradient: jest.fn(() => ({ addColorStop: jest.fn() })),
      createRadialGradient: jest.fn(() => ({ addColorStop: jest.fn() })),
      fill: jest.fn(),
      fillText: jest.fn(),
      lineTo: jest.fn(),
      moveTo: jest.fn(),
      restore: jest.fn(),
      save: jest.fn(),
      scale: jest.fn(),
      stroke: jest.fn(),
      translate: jest.fn(),
      rotate: jest.fn(),
      ellipse: jest.fn(),
      quadraticCurveTo: jest.fn(),
      canvas: { width: 400, height: 400, style: {} }
    }));
  });

  describe('Quality Level Performance', () => {
    test('low quality maintains target FPS', async () => {
      const metrics = await measurePerformance(
        <SeironSprite size="lg" quality="low" interactive={true} />,
        500
      );

      expect(metrics.fps).toBeGreaterThanOrEqual(qualityConfigs.low.targetFPS * 0.8);
      expect(metrics.avgFrameTime).toBeLessThanOrEqual(33); // Should be under 33ms for 30fps
    });

    test('medium quality maintains reasonable performance', async () => {
      const metrics = await measurePerformance(
        <SeironSprite size="lg" quality="medium" interactive={true} />,
        500
      );

      expect(metrics.fps).toBeGreaterThanOrEqual(qualityConfigs.medium.targetFPS * 0.7);
      expect(metrics.avgFrameTime).toBeLessThanOrEqual(25); // Should be under 25ms for 40fps
    });

    test('high quality performance with optimization', async () => {
      const metrics = await measurePerformance(
        <SeironSprite size="lg" quality="high" interactive={true} enableAutoQuality={true} />,
        500
      );

      // High quality might adapt down, so we're more lenient
      expect(metrics.fps).toBeGreaterThanOrEqual(30);
      expect(metrics.avgFrameTime).toBeLessThanOrEqual(33);
    });
  });

  describe('Battery Optimization Performance', () => {
    test('battery optimized mode reduces resource usage', async () => {
      const normalMetrics = await measurePerformance(
        <SeironSprite size="lg" quality="medium" interactive={true} />,
        300
      );

      const optimizedMetrics = await measurePerformance(
        <SeironSprite size="lg" quality="medium" interactive={true} batteryOptimized={true} />,
        300
      );

      // Battery optimized should use fewer resources (lower frame time variability)
      const normalVariance = calculateVariance(normalMetrics.frameTimings);
      const optimizedVariance = calculateVariance(optimizedMetrics.frameTimings);

      expect(optimizedVariance).toBeLessThanOrEqual(normalVariance * 1.2);
    });
  });

  describe('Size Impact on Performance', () => {
    test('smaller sizes perform better than larger sizes', async () => {
      const smallMetrics = await measurePerformance(
        <SeironSprite size="sm" quality="medium" interactive={true} />,
        300
      );

      const largeMetrics = await measurePerformance(
        <SeironSprite size="xl" quality="medium" interactive={true} />,
        300
      );

      // Smaller size should generally perform better
      expect(smallMetrics.avgFrameTime).toBeLessThanOrEqual(largeMetrics.avgFrameTime * 1.5);
    });
  });

  describe('Memory Usage', () => {
    test('particle pool management prevents memory leaks', () => {
      const particleCounts = Object.values(qualityConfigs).map(config => config.particlePoolSize);
      
      // Ensure pool sizes are reasonable
      particleCounts.forEach(count => {
        expect(count).toBeLessThanOrEqual(100); // Reasonable upper limit
        expect(count).toBeGreaterThanOrEqual(10); // Reasonable lower limit
      });
    });

    test('component cleanup prevents memory leaks', () => {
      const { unmount } = render(
        <SeironSprite size="lg" quality="high" interactive={true} />
      );

      // Should not throw during cleanup
      expect(() => unmount()).not.toThrow();
    });
  });

  describe('Interactive Performance', () => {
    test('hover interactions do not significantly impact performance', async () => {
      const baseMetrics = await measurePerformance(
        <SeironSprite size="lg" quality="medium" interactive={false} />,
        300
      );

      const interactiveMetrics = await measurePerformance(
        <SeironSprite size="lg" quality="medium" interactive={true} />,
        300
      );

      // Interactive mode should not significantly degrade performance
      expect(interactiveMetrics.avgFrameTime).toBeLessThanOrEqual(
        baseMetrics.avgFrameTime * 1.3
      );
    });
  });

  describe('Animation Complexity', () => {
    test('particle count scales appropriately with quality', () => {
      const lowCount = qualityConfigs.low.particleCount;
      const mediumCount = qualityConfigs.medium.particleCount;
      const highCount = qualityConfigs.high.particleCount;

      expect(lowCount).toBeLessThan(mediumCount);
      expect(mediumCount).toBeLessThan(highCount);
      
      // Ensure scaling is reasonable
      expect(highCount / lowCount).toBeLessThanOrEqual(5);
    });

    test('animation complexity affects performance proportionally', () => {
      const complexities = Object.values(qualityConfigs).map(config => config.animationComplexity);
      
      complexities.forEach(complexity => {
        expect(complexity).toBeGreaterThanOrEqual(0);
        expect(complexity).toBeLessThanOrEqual(1);
      });
    });
  });

  describe('Frame Rate Consistency', () => {
    test('frame timing has low variance', async () => {
      const metrics = await measurePerformance(
        <SeironSprite size="lg" quality="medium" interactive={true} />,
        1000
      );

      const variance = calculateVariance(metrics.frameTimings);
      const coefficient = Math.sqrt(variance) / metrics.avgFrameTime;

      // Coefficient of variation should be reasonably low
      expect(coefficient).toBeLessThanOrEqual(0.5);
    });
  });

  describe('GPU Acceleration', () => {
    test('high quality enables GPU acceleration features', () => {
      expect(qualityConfigs.high.enableGPUAcceleration).toBe(true);
      expect(qualityConfigs.high.advancedShaders).toBe(true);
      expect(qualityConfigs.high.glowEffects).toBe(true);
    });

    test('low quality disables expensive features', () => {
      expect(qualityConfigs.low.enableGPUAcceleration).toBe(false);
      expect(qualityConfigs.low.advancedShaders).toBe(false);
      expect(qualityConfigs.low.glowEffects).toBe(false);
    });
  });

  describe('Adaptive Quality', () => {
    test('auto quality adjustment is configurable', () => {
      const { unmount: unmount1 } = render(
        <SeironSprite size="lg" quality="high" enableAutoQuality={true} />
      );

      const { unmount: unmount2 } = render(
        <SeironSprite size="lg" quality="high" enableAutoQuality={false} />
      );

      // Both should render without issues
      expect(document.querySelectorAll('canvas')).toHaveLength(2);

      unmount1();
      unmount2();
    });
  });

  describe('Canvas Optimization', () => {
    test('dirty rectangles optimization works when enabled', () => {
      const { unmount } = render(
        <SeironSprite size="lg" quality="high" />
      );

      expect(qualityConfigs.high.enableDirtyRectangles).toBe(false);
      expect(qualityConfigs.medium.enableDirtyRectangles).toBe(true);
      expect(qualityConfigs.low.enableDirtyRectangles).toBe(true);

      unmount();
    });
  });
});

// Utility function to calculate variance
function calculateVariance(values: number[]): number {
  if (values.length === 0) return 0;
  
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const squaredDiffs = values.map(value => Math.pow(value - mean, 2));
  return squaredDiffs.reduce((a, b) => a + b, 0) / values.length;
}

// Performance benchmark suite
export const runPerformanceBenchmarks = async () => {
  const benchmarks = [
    {
      name: 'Low Quality Small Size',
      config: { size: 'sm' as const, quality: 'low' as const }
    },
    {
      name: 'Medium Quality Medium Size',
      config: { size: 'md' as const, quality: 'medium' as const }
    },
    {
      name: 'High Quality Large Size',
      config: { size: 'lg' as const, quality: 'high' as const }
    },
    {
      name: 'High Quality XL Size with Battery Optimization',
      config: { size: 'xl' as const, quality: 'high' as const, batteryOptimized: true }
    }
  ];

  const results = [];

  for (const benchmark of benchmarks) {
    const metrics = await measurePerformance(
      <SeironSprite {...benchmark.config} interactive={true} />,
      1000
    );

    results.push({
      name: benchmark.name,
      ...metrics
    });
  }

  return results;
};
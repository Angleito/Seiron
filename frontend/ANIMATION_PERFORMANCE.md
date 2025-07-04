# Dragon Animation Performance Optimization Guide

## Overview

The dragon animation system has been optimized to deliver smooth 60fps animations across all device types, from high-end desktops to low-end mobile devices. The system automatically adjusts quality levels based on real-time performance metrics.

## Key Features

### 1. **Automatic Quality Adjustment**
- **High Quality**: Full physics simulation, all effects enabled
- **Medium Quality**: Balanced performance with key animations
- **Low Quality**: Essential animations only for smooth performance

### 2. **Performance Monitoring**
- Real-time FPS tracking
- Frame time measurement
- Dropped frame detection
- CPU/Memory usage estimation

### 3. **Device Detection**
- Automatic detection of device capabilities
- Respects `prefers-reduced-motion` system preference
- Mobile-optimized defaults

## Components

### OptimizedFloatingDragonLogo

Enhanced version of the floating dragon with performance optimizations:

```tsx
import { OptimizedFloatingDragonLogo } from '@/components/OptimizedFloatingDragonLogo'

<OptimizedFloatingDragonLogo 
  size="lg"
  showDragonBalls={true}
  enablePerformanceMonitoring={true}
  onQualityChange={(level) => console.log('Quality:', level)}
/>
```

### OptimizedCirclingDragonBalls

Physics-based dragon balls with automatic quality adjustment:

```tsx
import { OptimizedCirclingDragonBalls } from '@/components/OptimizedCirclingDragonBalls'

<OptimizedCirclingDragonBalls 
  radius={150}
  speed="normal"
  interactive={true}
  enablePerformanceMonitoring={true}
/>
```

### AnimationPerformanceDebugger

Development tool for monitoring animation performance:

```tsx
import { AnimationPerformanceDebugger } from '@/components/AnimationPerformanceDebugger'

// Only visible in development or with ?debug=true
<AnimationPerformanceDebugger 
  position="top-right"
  expanded={true}
/>
```

## Hooks

### useAnimationPerformance

Core hook for animation performance monitoring:

```tsx
import { useAnimationPerformance } from '@/hooks/useAnimationPerformance'

const {
  qualityLevel,        // Current quality: 'low' | 'medium' | 'high'
  metrics,            // Performance metrics
  isMonitoring,       // Monitoring status
  shouldReduceMotion, // System preference
  startMonitoring,    // Start performance monitoring
  stopMonitoring,     // Stop performance monitoring
  forceQualityLevel,  // Override quality level
  resetMetrics        // Reset performance metrics
} = useAnimationPerformance()
```

## Quality Levels

### Low Quality (Mobile/Low-end devices)
- Basic floating animation
- Simple orbital motion
- No particle effects
- Disabled: shadows, glows, complex physics
- Target: 30+ FPS

### Medium Quality (Mid-range devices)
- Floating + breathing animations
- Enhanced orbital patterns
- Basic particle effects
- Enabled: shadows, basic glows
- Target: 45+ FPS

### High Quality (High-end devices)
- Full physics simulation
- All micro-animations
- Rich particle effects
- Enabled: all visual effects
- Target: 55+ FPS

## Optimization Techniques

### 1. **GPU Acceleration**
```css
.gpu-accelerated {
  transform: translateZ(0);
  will-change: transform;
}
```

### 2. **CSS Containment**
```css
.animation-container {
  contain: layout style paint;
}
```

### 3. **Visibility Detection**
- Animations pause when off-screen
- Uses IntersectionObserver API
- Reduces CPU usage on hidden tabs

### 4. **Memory Management**
- Cleanup on unmount
- Event listener management
- Resource pooling for particles

### 5. **Batch Updates**
```tsx
import { domBatcher } from '@/utils/animationPerformance'

// Batch DOM reads
domBatcher.read(() => {
  const width = element.offsetWidth
})

// Batch DOM writes
domBatcher.write(() => {
  element.style.transform = 'translateX(100px)'
})
```

## Performance Utilities

### Animation Scheduler
```tsx
import { animationScheduler } from '@/utils/animationPerformance'

// Schedule high-priority animation
animationScheduler.schedule('dragon-float', () => {
  updateDragonPosition()
}, 10)

// Schedule low-priority animation
animationScheduler.schedule('particles', () => {
  updateParticles()
}, 1)
```

### Debounced RAF
```tsx
import { debounceRAF } from '@/utils/animationPerformance'

const debouncedUpdate = debounceRAF((x, y) => {
  updatePosition(x, y)
}, 16) // ~60fps
```

### Device Detection
```tsx
import { isLowEndDevice } from '@/utils/animationPerformance'

if (isLowEndDevice()) {
  // Use simpler animations
}
```

## Best Practices

### 1. **Use Optimized Components**
Always prefer the optimized versions for production:
```tsx
// ✅ Good
import { OptimizedFloatingDragonLogo } from '@/components/OptimizedFloatingDragonLogo'

// ❌ Avoid in production
import { FloatingDragonLogo } from '@/components/FloatingDragonLogo'
```

### 2. **Enable Performance Monitoring**
```tsx
<OptimizedFloatingDragonLogo 
  enablePerformanceMonitoring={true}
  onQualityChange={(level) => {
    // Track quality changes
    analytics.track('animation_quality_change', { level })
  }}
/>
```

### 3. **Respect User Preferences**
The system automatically respects `prefers-reduced-motion`:
```tsx
const { shouldReduceMotion } = useAnimationPerformance()

if (shouldReduceMotion) {
  // Use minimal animations
}
```

### 4. **Test on Real Devices**
- Test on low-end Android devices
- Test on older iPhones
- Test with CPU throttling in DevTools
- Monitor performance metrics

### 5. **Progressive Enhancement**
Start with low quality and enhance:
```tsx
const [manualQuality, setManualQuality] = useState<QualityLevel>('low')

useEffect(() => {
  // Enhance quality after initial load
  requestIdleCallback(() => {
    setManualQuality('high')
  })
}, [])
```

## Debugging

### Enable Debug Mode
Add `?debug=true` to URL to show performance debugger in production:
```
https://yourapp.com/animation-demo?debug=true
```

### Chrome DevTools
1. Open Performance tab
2. Enable CPU 4x/6x slowdown
3. Record while interacting with animations
4. Check for:
   - Consistent frame rate
   - No long tasks
   - Minimal repaints

### Performance Metrics to Monitor
- **FPS**: Should stay above 30 (low), 45 (medium), 55 (high)
- **Frame Time**: Should be under 33ms (low), 22ms (medium), 18ms (high)
- **Dropped Frames**: Should be minimal (<5%)
- **CPU Usage**: Should stay under 80%

## Migration Guide

### From Standard to Optimized Components

1. Replace imports:
```tsx
// Before
import { FloatingDragonLogo } from '@/components/FloatingDragonLogo'
import { CirclingDragonBalls } from '@/components/CirclingDragonBalls'

// After
import { OptimizedFloatingDragonLogo } from '@/components/OptimizedFloatingDragonLogo'
import { OptimizedCirclingDragonBalls } from '@/components/OptimizedCirclingDragonBalls'
```

2. Add performance monitoring:
```tsx
// Before
<FloatingDragonLogo size="lg" />

// After
<OptimizedFloatingDragonLogo 
  size="lg"
  enablePerformanceMonitoring={true}
/>
```

3. Handle quality changes:
```tsx
const [quality, setQuality] = useState<QualityLevel>('high')

<OptimizedFloatingDragonLogo 
  onQualityChange={setQuality}
/>

// Adjust other animations based on quality
{quality === 'high' && <ComplexAnimation />}
```

## Troubleshooting

### Animation Stuttering
1. Check if performance monitoring is enabled
2. Look for quality level changes in debugger
3. Verify no other heavy JS running
4. Check for memory leaks

### Quality Stuck on Low
1. Check device capabilities
2. Verify no CPU throttling
3. Check `prefers-reduced-motion` setting
4. Try manual quality override

### High Memory Usage
1. Ensure components unmount properly
2. Check for animation cleanup
3. Verify event listeners are removed
4. Monitor particle pool size

## Future Enhancements

- WebGL-based rendering for complex effects
- WASM physics engine for better performance
- Adaptive particle density based on GPU
- Network-aware quality adjustment
- Battery-aware performance modes
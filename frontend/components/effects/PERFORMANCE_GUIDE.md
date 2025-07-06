# Storm Theme Performance Optimization Guide

This guide covers the performance optimizations implemented in the storm theme components to ensure smooth animations across all devices while maintaining visual impact.

## 🚀 Performance Features

### 1. **useStormPerformance Hook**
- **Real-time FPS monitoring**: Tracks frame rate and automatically adjusts quality
- **Memory usage tracking**: Monitors JavaScript heap usage
- **Device detection**: Identifies mobile, tablet, or desktop for appropriate optimizations
- **Battery level awareness**: Reduces effects on low battery devices
- **Connection speed detection**: Adapts to slow connections
- **Automatic quality adjustment**: Dynamically reduces complexity based on performance

### 2. **Lazy Loading**
- **Code splitting**: Heavy effects are loaded only when needed
- **Viewport-based loading**: Components load when entering viewport
- **Progressive enhancement**: Fallback states for loading
- **Suspense boundaries**: Graceful loading states

### 3. **Mobile Optimizations**
- **Reduced particle counts**: Fewer particles on mobile devices
- **Simplified animations**: Lower complexity animations on low-end devices
- **Touch-optimized**: Optimized for touch interactions
- **Battery considerations**: Automatic quality reduction on low battery

### 4. **Memory Management**
- **Canvas cleanup**: Proper disposal of canvas contexts
- **Event listener cleanup**: Removes all event listeners on unmount
- **Animation frame cleanup**: Cancels requestAnimationFrame calls
- **DOM element cleanup**: Removes unused DOM elements

## 📱 Device-Specific Optimizations

### Mobile (< 768px)
```typescript
// Reduced settings for mobile
{
  particleCount: 3,
  cloudLayers: 2,
  maxLightningBolts: 1,
  fogDensity: 0.2,
  enableParallax: false
}
```

### Tablet (768px - 1024px)
```typescript
// Balanced settings for tablet
{
  particleCount: 4,
  cloudLayers: 3,
  maxLightningBolts: 2,
  fogDensity: 0.25,
  enableParallax: true
}
```

### Desktop (> 1024px)
```typescript
// Full settings for desktop
{
  particleCount: 6,
  cloudLayers: 3,
  maxLightningBolts: 3,
  fogDensity: 0.3,
  enableParallax: true
}
```

## 🎛️ Quality Levels

### Low Quality (FPS < 36)
- Minimal particles and effects
- No advanced effects (lightning disabled)
- No parallax scrolling
- Simplified animations
- Reduced fog density

### Medium Quality (FPS 36-54)
- Moderate particle count
- Basic lightning effects
- Limited parallax
- Standard animations
- Moderate fog density

### High Quality (FPS > 54)
- Full particle effects
- Advanced lightning with multiple bolts
- Full parallax effects
- Complex animations
- Maximum fog density

## 🔧 Usage Examples

### Basic Usage
```tsx
import { StormBackground } from './effects/StormBackground'

function MyComponent() {
  return (
    <StormBackground intensity={0.7}>
      <div>Your content here</div>
    </StormBackground>
  )
}
```

### With Performance Monitoring
```tsx
import { StormBackground } from './effects/StormBackground'
import { StormPerformanceMonitor } from '@/hooks/useStormPerformance'

function MyComponent() {
  return (
    <div>
      <StormPerformanceMonitor /> {/* Only in development */}
      <StormBackground intensity={0.7}>
        <div>Your content here</div>
      </StormBackground>
    </div>
  )
}
```

### Manual Performance Control
```tsx
import { useStormPerformance } from '@/hooks/useStormPerformance'

function MyComponent() {
  const { setQuality, metrics, isLowPerformance } = useStormPerformance()
  
  return (
    <div>
      <button onClick={() => setQuality('low')}>Low Quality</button>
      <button onClick={() => setQuality('high')}>High Quality</button>
      <p>FPS: {metrics.fps}</p>
      <StormBackground intensity={isLowPerformance ? 0.3 : 0.7}>
        <div>Your content here</div>
      </StormBackground>
    </div>
  )
}
```

## 🎯 Performance Metrics

### Monitored Metrics
- **FPS**: Frames per second (target: 45+ FPS)
- **Memory**: JavaScript heap usage (threshold: 100MB)
- **Battery Level**: Device battery percentage
- **Connection Speed**: Network connection quality
- **Device Type**: Mobile, tablet, or desktop classification

### Automatic Adjustments
- **FPS < 80% of target**: Switch to low quality
- **FPS < 90% of target**: Switch to medium quality
- **Memory > threshold**: Reduce particle count
- **Battery < 20%**: Enable power saving mode
- **Slow connection**: Disable advanced effects

## 🔄 Performance Monitoring

### Real-time Monitoring
```typescript
const { metrics, config, isLowPerformance } = useStormPerformance({
  targetFPS: 45,
  enableAutoQualityAdjustment: true,
  memoryThreshold: 100 * 1024 * 1024 // 100MB
})

// Monitor performance
useEffect(() => {
  console.log('Performance:', {
    fps: metrics.fps,
    memory: metrics.memoryUsage,
    quality: config.animationQuality,
    isLowPerf: isLowPerformance
  })
}, [metrics, config, isLowPerformance])
```

### Development Debug Info
The `StormPerformanceMonitor` component shows real-time performance data in development:
- Current FPS
- Memory usage
- Device type
- Animation quality
- Particle count
- Cloud layers
- Performance status

## 🎨 CSS Optimizations

### Hardware Acceleration
```css
.storm-background {
  transform: translate3d(0, 0, 0);
  will-change: transform;
}

/* Disable on mobile for better performance */
@media (max-width: 768px) {
  .storm-background {
    will-change: auto;
  }
}
```

### Reduced Motion Support
```css
@media (prefers-reduced-motion: reduce) {
  .storm-background * {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

## 🧪 Testing Performance

### Load Testing
1. Monitor FPS during various intensity levels
2. Check memory usage over time
3. Test on different device types
4. Verify battery impact on mobile

### Performance Benchmarks
- **Desktop**: Should maintain 60 FPS at high quality
- **Tablet**: Should maintain 45 FPS at medium quality  
- **Mobile**: Should maintain 30 FPS at low quality
- **Memory**: Should stay under 100MB additional usage

## 🚨 Troubleshooting

### Common Performance Issues

#### Low FPS on Desktop
- Check if other heavy animations are running
- Verify hardware acceleration is enabled
- Consider reducing storm intensity

#### High Memory Usage
- Ensure components are properly unmounted
- Check for memory leaks in event listeners
- Verify canvas contexts are disposed

#### Poor Mobile Performance
- Reduce particle count manually
- Disable parallax effects
- Lower fog density
- Check device capabilities

### Debug Commands
```typescript
// Force quality level
const { setQuality } = useStormPerformance()
setQuality('low') // 'low' | 'medium' | 'high'

// Get current metrics
const { metrics } = useStormPerformance()
console.log('Performance metrics:', metrics)

// Manual cleanup
const { cleanup } = useStormPerformance()
cleanup() // Call on component unmount
```

## 📊 Performance Targets

### Target Metrics by Device

| Device | Target FPS | Max Memory | Particle Count | Features |
|--------|------------|------------|----------------|----------|
| Mobile | 30+ FPS | 50MB | 1-3 | Basic |
| Tablet | 45+ FPS | 75MB | 2-4 | Standard |
| Desktop | 60+ FPS | 100MB | 4-6 | Full |

### Quality Thresholds

| Quality | Min FPS | Features Enabled |
|---------|---------|------------------|
| Low | < 36 | Minimal effects, no parallax |
| Medium | 36-54 | Standard effects, limited parallax |
| High | 54+ | All effects, full parallax |

This performance optimization system ensures the storm theme provides an excellent user experience across all devices while maintaining its visual appeal.
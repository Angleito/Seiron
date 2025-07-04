# Responsive Dragon Animation System

A comprehensive, mobile-optimized, and accessible dragon animation system for the Seiron project. This system ensures magical dragon experiences work beautifully across all devices and screen sizes.

## 🐉 Features

### 1. **Responsive Scaling System**
- Automatic breakpoint-based sizing (xs, sm, md, lg, xl, 2xl)
- Viewport-aware animation intensity
- Orientation-specific optimizations (portrait/landscape)
- Container query support for component-level responsiveness

### 2. **Mobile Touch Optimization**
- Touch-friendly interaction areas (minimum 44px targets)
- Swipe gesture support for dragon interactions
- Press-and-hold for power-up states
- Visual feedback for all touch interactions
- Multi-touch support (pinch, rotate)

### 3. **Performance Adaptations**
- Automatic quality adjustment based on device capabilities
- Battery-aware animation scaling
- Network-aware asset loading
- Real-time performance monitoring
- Configurable performance modes (high, balanced, low)

### 4. **Accessibility Features**
- Full `prefers-reduced-motion` support
- Keyboard navigation with clear focus indicators
- Screen reader announcements for dragon states
- High contrast mode compatibility
- WCAG 2.1 AA compliant

## 📦 Components

### ResponsiveDragonAnimation
The main responsive wrapper that handles all device adaptations.

```tsx
import { ResponsiveDragonAnimation } from '@/components/ResponsiveDragonAnimation'

<ResponsiveDragonAnimation
  showDragonBalls={true}
  interactive={true}
  autoScale={true}
  performanceMode="auto"
/>
```

### AccessibleDragonAnimation
Enhanced version with full accessibility support.

```tsx
import { AccessibleDragonAnimation } from '@/components/AccessibleDragonAnimation'

<AccessibleDragonAnimation
  showDragonBalls={true}
  interactive={true}
  announceStateChanges={true}
  highContrastMode="auto"
/>
```

## 🎯 Hooks

### useResponsive
Provides comprehensive responsive utilities.

```tsx
const {
  breakpoint,      // Current breakpoint (xs, sm, md, lg, xl, 2xl)
  isAtLeast,       // Check if screen is at least a breakpoint
  isPortrait,      // Portrait orientation check
  isTouchDevice,   // Touch capability detection
  prefersReducedMotion, // Accessibility preference
  isLowBattery,    // Battery status
  pixelRatio       // Device pixel ratio
} = useResponsive()
```

### useDragonGestures
Handles all touch gesture interactions.

```tsx
const gestures = useDragonGestures({
  onTap: () => console.log('Tapped!'),
  onLongPress: () => console.log('Long pressed!'),
  onSwipe: (direction, velocity) => console.log(`Swiped ${direction}`),
  onPinch: (scale) => console.log(`Pinch scale: ${scale}`),
  minSwipeDistance: 50,
  longPressDelay: 500
})
```

### usePerformanceMonitor
Real-time performance monitoring.

```tsx
const {
  metrics,              // FPS, frame time, etc.
  isPerformanceGood,    // Boolean performance check
  performanceScore,     // 0-100 score
  recommendation,       // Performance recommendations
  shouldReduceQuality   // Auto quality adjustment flag
} = usePerformanceMonitor()
```

## 🎨 Responsive Styles

### CSS Variables
```css
.dragon-xs { --dragon-size: 120px; }
.dragon-sm { --dragon-size: 160px; }
.dragon-md { --dragon-size: 200px; }
.dragon-lg { --dragon-size: 300px; }
.dragon-xl { --dragon-size: 400px; }
```

### Performance Classes
```css
.quality-high    /* Full effects, shadows, particles */
.quality-balanced /* Reduced effects for better performance */
.quality-low     /* Minimal effects for low-end devices */
```

### Accessibility Classes
```css
.motion-reduce   /* Disables complex animations */
.dragon-high-contrast /* High contrast mode styles */
.touch-target    /* Ensures 44px minimum touch targets */
```

## 🚀 Performance Guidelines

### Mobile Optimization
1. Dragon balls reduced from 7 to 5 on portrait mobile
2. Simplified animations below 768px width
3. Automatic quality reduction on high pixel ratio displays
4. Touch gesture debouncing to prevent performance issues

### Battery Optimization
- Animations pause when battery < 20%
- Reduced particle effects in low battery mode
- Option to manually enable battery saver mode

### Network Awareness
- Lazy loading for dragon assets
- Progressive enhancement based on connection speed
- Fallback static images for slow connections

## ♿ Accessibility Guidelines

### Keyboard Navigation
- **Space/Enter**: Activate dragon
- **Arrow Up**: Increase power
- **Arrow Down**: Decrease power
- **Tab**: Navigate between elements
- **Escape**: Cancel interaction

### Screen Reader Support
- All dragon states announced
- Clear role and aria-label attributes
- Live regions for dynamic updates
- Descriptive text alternatives

### Visual Accessibility
- Respects `prefers-reduced-motion`
- High contrast mode support
- Clear focus indicators
- No reliance on color alone

## 📱 Breakpoint Reference

| Breakpoint | Width | Dragon Size | Ball Count |
|------------|-------|-------------|------------|
| xs         | <475px | 120px | 3-5 |
| sm         | <640px | 160px | 5 |
| md         | <768px | 200px | 5-7 |
| lg         | <1024px | 300px | 7 |
| xl         | <1280px | 400px | 7 |
| 2xl        | ≥1536px | 400px | 7 |

## 🧪 Testing Strategies

### Device Testing
```bash
# Test on various viewports
npm run test:responsive

# Test touch interactions
npm run test:touch

# Test performance metrics
npm run test:performance
```

### Accessibility Testing
```bash
# Run accessibility audit
npm run test:a11y

# Test with screen readers
npm run test:screen-reader
```

## 🔧 Configuration

### Environment Variables
```env
NEXT_PUBLIC_DRAGON_PERFORMANCE_MODE=auto
NEXT_PUBLIC_DRAGON_MAX_QUALITY=high
NEXT_PUBLIC_ENABLE_PERFORMANCE_MONITOR=false
```

### Custom Configuration
```tsx
// dragon.config.ts
export const dragonConfig = {
  responsive: {
    breakpoints: { /* custom breakpoints */ },
    scalingFactor: 1.0,
  },
  performance: {
    targetFPS: 60,
    autoQuality: true,
    maxParticles: 10,
  },
  accessibility: {
    announceAll: true,
    reducedMotionFallback: 'static',
  }
}
```

## 📈 Performance Metrics

Target performance across devices:
- **Desktop**: 60 FPS, < 16ms frame time
- **Tablet**: 60 FPS, < 20ms frame time  
- **Mobile**: 30-60 FPS, < 33ms frame time
- **Low-end**: 30 FPS minimum, graceful degradation

## 🎯 Best Practices

1. **Always use ResponsiveDragonAnimation** as the base component
2. **Enable performance monitoring** during development
3. **Test on real devices**, not just browser DevTools
4. **Respect user preferences** (motion, contrast, battery)
5. **Provide fallbacks** for all interactive elements
6. **Use semantic HTML** and proper ARIA attributes
7. **Optimize assets** for different screen densities

## 🐛 Troubleshooting

### Common Issues

**Animation stuttering on mobile**
- Check performance mode setting
- Reduce dragon ball count
- Enable battery saver mode

**Touch gestures not working**
- Verify touch event listeners are attached
- Check for CSS `pointer-events: none`
- Ensure minimum touch target sizes

**Accessibility warnings**
- Add proper ARIA labels
- Ensure keyboard navigation works
- Test with screen readers

## 🚀 Future Enhancements

- [ ] WebGL renderer for high-performance mode
- [ ] Progressive Web App optimizations
- [ ] Offline support with service workers
- [ ] Advanced gesture recognition
- [ ] Voice control integration
- [ ] AR/VR dragon experiences

---

Built with 🐉 magic and ❤️ for the Seiron project
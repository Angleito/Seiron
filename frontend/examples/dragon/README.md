# Dragon Examples

This directory contains comprehensive examples demonstrating various implementations and use cases of the SVG Dragon system.

## Examples Overview

### 1. BasicSVGDragon.tsx
**Purpose**: Demonstrates the simplest implementation of the SVG dragon system.

**Features Shown**:
- Basic SVG rendering with standard quality
- Essential interactions and animations
- Default configuration setup
- Simple event handling

**Use Cases**:
- Quick implementation for demos
- Understanding core features
- Starting point for custom implementations

**Run Example**:
```bash
npm run dev
# Navigate to /examples/dragon/basic
```

---

### 2. HighPerformanceDragon.tsx
**Purpose**: Showcases advanced performance optimization techniques for mobile and low-end devices.

**Features Shown**:
- Adaptive quality adjustment based on device capability
- Real-time FPS monitoring and optimization
- Dynamic configuration based on performance metrics
- Mobile-specific optimizations
- Performance debugging tools

**Key Techniques**:
- Device type detection
- Automatic quality scaling
- Performance metrics monitoring
- Memory-efficient rendering
- Conditional feature enabling

**Use Cases**:
- Mobile applications
- Performance-critical implementations
- Low-end device support
- Progressive enhancement

---

### 3. AccessibleDragon.tsx
**Purpose**: Demonstrates comprehensive accessibility features and WCAG 2.1 compliance.

**Features Shown**:
- Keyboard navigation and focus management
- Screen reader compatibility and announcements
- High contrast mode support
- Reduced motion preferences
- ARIA labels and semantic markup
- Audio feedback options

**Accessibility Features**:
- Tab navigation through interactive elements
- Space/Enter activation
- Arrow key controls for power level
- Live announcements for state changes
- Focus indicators and visual feedback
- System preference detection

**Use Cases**:
- Enterprise applications requiring accessibility compliance
- Government and educational platforms
- Inclusive design implementations
- International accessibility standards

---

### 4. TradingInterfaceDragon.tsx
**Purpose**: Shows integration with a real-world DeFi trading interface, demonstrating how the dragon responds to application state.

**Features Shown**:
- Dynamic dragon behavior based on portfolio performance
- Integration with trading events and market data
- Responsive animations to user actions
- Complex state management integration
- Real-time data visualization through dragon states

**Integration Patterns**:
- Portfolio performance → Dragon mood/state
- Trading volume → Dragon power level
- Market activity → Animation intensity
- User interactions → Lucky boost mechanics
- Error states → Dragon feedback

**Use Cases**:
- DeFi applications
- Trading platforms
- Financial dashboards
- Gamified user experiences
- Real-time data visualization

---

## Usage Patterns

### Basic Implementation Pattern
```tsx
import { EnhancedDragonCharacter } from '@/components/dragon'

export function MyDragonApp() {
  return (
    <EnhancedDragonCharacter
      size="lg"
      renderMode="svg"
      svgQuality="standard"
      interactive={true}
    />
  )
}
```

### Performance-Optimized Pattern
```tsx
import { EnhancedDragonCharacter, detectDeviceType } from '@/components/dragon'

export function OptimizedDragonApp() {
  const deviceType = detectDeviceType()
  
  const config = {
    svgQuality: deviceType === 'mobile' ? 'minimal' : 'standard',
    enableSVGAnimations: deviceType !== 'mobile',
    animationConfig: {
      performanceMode: deviceType === 'mobile' ? 'performance' : 'balanced'
    }
  }
  
  return <EnhancedDragonCharacter {...config} />
}
```

### Accessibility-First Pattern
```tsx
export function AccessibleDragonApp() {
  return (
    <EnhancedDragonCharacter
      renderMode="svg"
      accessibilityConfig={{
        enableScreenReader: true,
        enableKeyboardNavigation: true,
        announceStateChanges: true,
        focusIndicators: true
      }}
      onStateChange={(state) => announceToUser(`Dragon is now ${state}`)}
    />
  )
}
```

### Application Integration Pattern
```tsx
export function IntegratedDragonApp() {
  const { portfolioData, isTrading } = useTrading()
  
  const dragonState = useMemo(() => {
    if (isTrading) return 'active'
    if (portfolioData.changePercent > 10) return 'powering-up'
    if (portfolioData.changePercent < -10) return 'sleeping'
    return 'idle'
  }, [portfolioData, isTrading])
  
  return (
    <EnhancedDragonCharacter
      renderMode="svg"
      initialState={dragonState}
      onInteraction={(type) => {
        if (type === 'click') triggerLuckyBoost()
      }}
    />
  )
}
```

## Implementation Guidelines

### 1. Choose the Right Example

- **BasicSVGDragon**: For simple implementations and prototypes
- **HighPerformanceDragon**: For mobile apps and performance-critical scenarios
- **AccessibleDragon**: For applications requiring accessibility compliance
- **TradingInterfaceDragon**: For complex integrations with business logic

### 2. Customization Approach

1. **Start with the closest example** to your use case
2. **Copy the relevant patterns** and configuration
3. **Modify the dragon config** for your specific needs
4. **Add your business logic** integration
5. **Test across devices** and accessibility requirements

### 3. Performance Considerations

- Use `detectDeviceType()` for adaptive configurations
- Monitor FPS with `useAnimationPerformance()`
- Enable `autoQualityAdjustment` for dynamic optimization
- Test on actual mobile devices, not just browser dev tools

### 4. Accessibility Best Practices

- Always include meaningful ARIA labels
- Test with actual screen readers (NVDA, JAWS, VoiceOver)
- Implement keyboard navigation for all interactive features
- Respect user preferences for reduced motion
- Provide alternative text descriptions for visual effects

## Development Workflow

### 1. Local Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Navigate to examples
http://localhost:3000/examples/dragon/basic
http://localhost:3000/examples/dragon/performance
http://localhost:3000/examples/dragon/accessible
http://localhost:3000/examples/dragon/trading
```

### 2. Testing

```bash
# Run unit tests
npm test

# Run accessibility tests
npm run test:a11y

# Run performance tests
npm run test:performance

# Run visual regression tests
npm run test:visual
```

### 3. Building for Production

```bash
# Build optimized bundle
npm run build

# Analyze bundle size
npm run analyze

# Test production build
npm run preview
```

## Troubleshooting

### Common Issues

1. **Performance Problems**
   - Solution: Use HighPerformanceDragon patterns
   - Check device capabilities with `detectDeviceType()`
   - Enable `autoQualityAdjustment`

2. **Accessibility Issues**
   - Solution: Follow AccessibleDragon implementation
   - Test with screen readers
   - Ensure keyboard navigation works

3. **Integration Problems**
   - Solution: Study TradingInterfaceDragon patterns
   - Use proper state management
   - Handle loading and error states

4. **Mobile Issues**
   - Solution: Use mobile-specific configurations
   - Test touch interactions
   - Optimize for smaller screens

### Debug Tools

```tsx
// Enable debug mode in development
<EnhancedDragonCharacter
  renderMode="svg"
  className={process.env.NODE_ENV === 'development' ? 'debug-mode' : ''}
/>

// Monitor performance
const { metrics } = useAnimationPerformance()
console.log('Dragon Performance:', metrics)

// Check accessibility
import { axe } from '@axe-core/react'
if (process.env.NODE_ENV === 'development') {
  axe(React, ReactDOM, 1000)
}
```

## Contributing

When contributing new examples:

1. **Follow naming conventions**: `[Purpose]Dragon.tsx`
2. **Include comprehensive comments** explaining the implementation
3. **Add to this README** with description and use cases
4. **Test across devices** and accessibility requirements
5. **Include TypeScript types** for all configurations
6. **Document performance implications**

## Support

For questions about these examples:

- **Documentation**: See `/docs/SVG_DRAGON_GUIDE.md`
- **API Reference**: See `/docs/API_REFERENCE.md`
- **Issues**: Check the troubleshooting section above
- **Advanced Usage**: Study the TradingInterfaceDragon example

---

These examples provide a comprehensive foundation for implementing the SVG Dragon system in various scenarios, from simple demos to complex production applications.
# SeironSprite Component Documentation

## Overview

The `SeironSprite` component is a high-performance, canvas-based dragon animation system with advanced particle effects, orbital coin animations, and interactive features. It's designed to be the centerpiece visual element for the Seiron application, providing an engaging and mystical user experience.

## Features

- 🐉 **Serpentine Dragon Animation**: Fluid, undulating dragon body with realistic movement
- ✨ **Advanced Particle System**: Three types of particles (sparkles, embers, energy orbs) with physics simulation
- 🪙 **Orbital Coins**: Bitcoin and SEI coins that orbit around the dragon with 3D depth effects
- 🎮 **Interactive Controls**: Responds to hover, click, and touch interactions
- ⚡ **Performance Optimized**: Adaptive quality levels, battery optimization, and device detection
- 🔮 **Wish Granting**: Special animation sequences for different types of wishes
- 📱 **Responsive Design**: Works across different screen sizes and devices

## Installation

The component is already integrated into the project. Import it from the components index:

```typescript
import { SeironSprite } from '@/components'
// or
import SeironSprite from '@/components/SeironSprite'
```

## Basic Usage

```tsx
import React from 'react'
import { SeironSprite } from '@/components'

function MyComponent() {
  return (
    <div>
      <SeironSprite 
        size="lg"
        interactive={true}
        quality="medium"
      />
    </div>
  )
}
```

## Props

### SeironSpriteProps

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `size` | `'sm' \| 'md' \| 'lg' \| 'xl'` | `'lg'` | Size of the dragon sprite |
| `quality` | `'low' \| 'medium' \| 'high'` | `'medium'` | Rendering quality level |
| `interactive` | `boolean` | `false` | Enable interactive features |
| `className` | `string` | `''` | Additional CSS classes |
| `onInteraction` | `(type: 'hover' \| 'click' \| 'touch') => void` | - | Interaction callback |
| `onWishGrant` | `(wishType: 'power' \| 'wisdom' \| 'fortune') => void` | - | Wish granting callback |
| `readyToGrant` | `boolean` | `false` | Whether dragon is ready to grant wishes |
| `enableAutoQuality` | `boolean` | `true` | Enable automatic quality adjustment |
| `batteryOptimized` | `boolean` | `false` | Enable battery optimization mode |

## Size Configurations

| Size | Dimensions | Container Class | Use Case |
|------|------------|-----------------|----------|
| `sm` | 120x120 | `w-32 h-32` | Small UI elements, thumbnails |
| `md` | 200x200 | `w-52 h-52` | Standard components |
| `lg` | 300x300 | `w-80 h-80` | Feature highlights |
| `xl` | 400x400 | `w-96 h-96` | Hero sections, full displays |

## Quality Levels

### Low Quality
- **Target FPS**: 30
- **Particles**: 5
- **Coins**: 6
- **Effects**: Basic rendering, no glow effects
- **Use Case**: Low-end devices, battery saving

### Medium Quality  
- **Target FPS**: 45
- **Particles**: 10
- **Coins**: 10
- **Effects**: Moderate glow effects, GPU acceleration
- **Use Case**: Standard devices, balanced performance

### High Quality
- **Target FPS**: 60
- **Particles**: 20
- **Coins**: 14
- **Effects**: Full glow effects, advanced shaders
- **Use Case**: High-end devices, premium experience

## Interactive Features

### Hover Effects
When `interactive={true}` and the user hovers over the dragon:
- Enhanced particle generation
- Increased glow intensity
- Animation mode changes to 'hover'
- Triggers `onInteraction('hover')`

### Click/Touch Interactions
- Triggers `onInteraction('click')` or `onInteraction('touch')`
- If `readyToGrant={true}`, triggers wish granting sequence
- Calls `onWishGrant()` with random wish type

### Wish Granting Animation
Special animation sequence with:
- Enhanced particle effects
- Unique color schemes
- Extended duration animations
- Power-up effects

## Performance Features

### Adaptive Quality
- Automatically adjusts quality based on performance
- Monitors FPS and frame timing
- Reduces particle count and effects when needed
- Can be disabled with `enableAutoQuality={false}`

### Battery Optimization
When `batteryOptimized={true}`:
- Reduces particle count by 50%
- Disables glow effects
- Lowers target FPS to 30
- Increases update frequency intervals

### Device Detection
- Automatically detects low-end devices
- Checks GPU capabilities
- Monitors battery status (when available)
- Adjusts quality accordingly

### Memory Management
- Object pooling for particles
- Efficient canvas rendering
- Automatic cleanup on unmount
- Dirty rectangle optimization (where applicable)

## Animation States

| State | Description | Visual Changes |
|-------|-------------|----------------|
| `idle` | Default resting state | Gentle breathing, slow particles |
| `hover` | Mouse over dragon | Enhanced glow, more particles |
| `wishGranting` | Granting a wish | Special colors, intense effects |
| `powerUp` | Post-wish power surge | Maximum effects, bright colors |

## Advanced Usage

### Custom Interaction Handling

```tsx
import { SeironSprite } from '@/components'

function InteractiveDragon() {
  const [wishes, setWishes] = useState(0)
  const [isReady, setIsReady] = useState(true)

  const handleWishGrant = (wishType: 'power' | 'wisdom' | 'fortune') => {
    console.log(`Granted wish: ${wishType}`)
    setWishes(prev => prev + 1)
    setIsReady(false)
    
    // Cooldown period
    setTimeout(() => setIsReady(true), 10000)
  }

  return (
    <SeironSprite
      size="xl"
      interactive={true}
      readyToGrant={isReady}
      onWishGrant={handleWishGrant}
      quality="high"
      enableAutoQuality={true}
    />
  )
}
```

### Performance Monitoring

```tsx
import { SeironSprite } from '@/components'

function MonitoredDragon() {
  const handleInteraction = (type: string) => {
    // Track user interactions
    analytics.track('dragon_interaction', { type })
  }

  return (
    <SeironSprite
      size="lg"
      interactive={true}
      onInteraction={handleInteraction}
      batteryOptimized={navigator.userAgent.includes('Mobile')}
      enableAutoQuality={true}
    />
  )
}
```

### Custom Styling

```tsx
import { SeironSprite } from '@/components'

function StyledDragon() {
  return (
    <div className="relative">
      <SeironSprite
        size="lg"
        interactive={true}
        className="border-2 border-orange-500 rounded-xl shadow-2xl"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />
    </div>
  )
}
```

## Configuration Objects

### Exported Configuration

```typescript
import { sizeConfig, qualityConfigs } from '@/components/SeironSprite'

// Access size configurations
const lgConfig = sizeConfig.lg // { width: 300, height: 300, containerSize: 'w-80 h-80' }

// Access quality settings
const mediumQuality = qualityConfigs.medium
```

## TypeScript Types

All component types are exported for use in your application:

```typescript
import type {
  SeironSpriteProps,
  AnimationState,
  CoinConfig,
  ParticleConfig,
  QualitySettings,
  PerformanceMetrics
} from '@/components/SeironSprite'
```

## Browser Compatibility

- **Modern Browsers**: Full feature support
- **WebGL Support**: Required for GPU acceleration
- **Canvas 2D**: Fallback rendering mode
- **Mobile Browsers**: Touch interaction support
- **Battery API**: Optional, for battery optimization

## Performance Recommendations

### For Low-End Devices
```tsx
<SeironSprite
  size="md"
  quality="low"
  batteryOptimized={true}
  enableAutoQuality={false}
/>
```

### For High-End Devices
```tsx
<SeironSprite
  size="xl"
  quality="high"
  interactive={true}
  enableAutoQuality={true}
/>
```

### For Battery Conservation
```tsx
<SeironSprite
  size="lg"
  quality="medium"
  batteryOptimized={true}
  enableAutoQuality={true}
/>
```

## Development Mode

In development mode, the component shows performance metrics:
- FPS counter
- Frame time
- Active particles count
- Battery status
- Device capabilities

## Testing

The component includes comprehensive tests:
- Unit tests for all functionality
- Performance benchmarks
- Integration tests
- Accessibility tests

Run tests with:
```bash
npm test SeironSprite
npm run test:performance
```

## Troubleshooting

### Common Issues

1. **Canvas not rendering**
   - Check console for WebGL errors
   - Ensure container has proper dimensions
   - Verify browser support

2. **Poor performance**
   - Enable `batteryOptimized={true}`
   - Use lower quality setting
   - Reduce size to 'md' or 'sm'

3. **Interactions not working**
   - Ensure `interactive={true}`
   - Check for CSS pointer-events blocking
   - Verify touch device support

### Debug Information

Enable debug mode by setting `NODE_ENV=development` to see:
- Performance metrics overlay
- Frame rate monitoring
- Particle count display
- Quality level indicators

## Contributing

When modifying the SeironSprite component:

1. **Performance**: Always test on low-end devices
2. **Memory**: Check for memory leaks with long-running animations
3. **Accessibility**: Ensure interactive elements are keyboard accessible
4. **Testing**: Update tests for new features
5. **Documentation**: Update this documentation for API changes

## License

Part of the Seiron project. See main project license for details.
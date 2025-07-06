# Dragon Components

## Dragon3D Component

A comprehensive 3D dragon component built with Three.js and React Three Fiber, featuring procedural geometry, animations, and particle effects.

### Features

- **Procedural Geometry**: Custom-built dragon using Three.js geometry primitives
- **Serpentine Body**: TubeGeometry-based body with realistic curves
- **Animated Wings**: Custom wing geometry with realistic flapping motion
- **Detailed Head**: Procedurally generated head with glowing eyes and golden horns
- **Particle Effects**: Golden particle system for magical ambiance
- **Performance Optimized**: LOD system and quality settings for optimal performance
- **Interactive**: Click handlers, hover effects, and orbital controls

### Usage

```tsx
import { Dragon3D } from '@/components/dragon'

// Basic usage
<Dragon3D size="lg" />

// Advanced usage with all options
<Dragon3D
  size="xl"
  className="custom-dragon"
  onClick={() => console.log('Dragon clicked!')}
  enableHover={true}
  enableInteraction={true}
  animationSpeed={1.2}
  showParticles={true}
  autoRotate={false}
  quality="high"
/>
```

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `size` | `'sm' \| 'md' \| 'lg' \| 'xl'` | `'lg'` | Size of the dragon |
| `className` | `string` | `''` | Additional CSS classes |
| `onClick` | `() => void` | `undefined` | Click handler |
| `enableHover` | `boolean` | `true` | Enable hover effects |
| `enableInteraction` | `boolean` | `true` | Enable orbital controls |
| `animationSpeed` | `number` | `1` | Animation speed multiplier |
| `showParticles` | `boolean` | `true` | Show particle effects |
| `autoRotate` | `boolean` | `false` | Auto-rotate the dragon |
| `quality` | `'low' \| 'medium' \| 'high'` | `'medium'` | Rendering quality |

### Size Variants

- **sm**: 0.5x scale, 128px canvas
- **md**: 0.8x scale, 192px canvas  
- **lg**: 1.2x scale, 256px canvas
- **xl**: 1.8x scale, 384px canvas

### Animation System

#### Breathing Animation
- Subtle scale pulsing (2 second cycle)
- Realistic chest rise and fall

#### Floating Animation
- Gentle Y-axis movement (1.5 second cycle)
- Slight rotation for natural movement

#### Wing Flapping
- Realistic wing movement (4 beats per second)
- Synchronized with body movement

#### Eye Glow
- Pulsing emissive intensity
- Alternating pattern for lifelike effect

### Materials and Colors

#### Primary Colors
- **Dragon Red**: `#dc2626` (main body)
- **Dark Red**: `#991b1b` (shadows/accents)
- **Gold**: `#fbbf24` (horns, particles)
- **Dark Gold**: `#d97706` (details)

#### Materials
- **Scales**: Phong material with high shininess
- **Belly**: Darker red with lower shininess
- **Gold Parts**: Metallic finish with high reflectivity
- **Wings**: Semi-transparent with double-sided rendering
- **Eyes**: Emissive material with animated glow

### Performance Optimization

#### LOD System
- Particle count varies by quality setting
- Geometry complexity adapts to performance needs

#### Quality Settings
- **Low**: 50 particles, simplified geometry
- **Medium**: 100 particles, balanced detail
- **High**: 200 particles, full detail

#### Render Optimization
- Efficient geometry reuse
- Minimal re-renders with proper ref usage
- Optimized animation loops

### Integration Examples

#### Basic Integration
```tsx
import { Dragon3D } from '@/components/dragon'

function DragonDisplay() {
  return (
    <div className="flex justify-center">
      <Dragon3D size="lg" />
    </div>
  )
}
```

#### Interactive Dragon
```tsx
import { Dragon3D } from '@/components/dragon'
import { useState } from 'react'

function InteractiveDragon() {
  const [clicked, setClicked] = useState(false)
  
  return (
    <Dragon3D
      size="xl"
      onClick={() => setClicked(!clicked)}
      animationSpeed={clicked ? 2 : 1}
      showParticles={clicked}
      className={clicked ? 'animate-pulse' : ''}
    />
  )
}
```

#### Performance-Optimized Dragon
```tsx
import { Dragon3D } from '@/components/dragon'
import { useReducedMotion } from 'framer-motion'

function OptimizedDragon() {
  const prefersReducedMotion = useReducedMotion()
  
  return (
    <Dragon3D
      size="md"
      quality="medium"
      animationSpeed={prefersReducedMotion ? 0.5 : 1}
      showParticles={!prefersReducedMotion}
      enableInteraction={false}
    />
  )
}
```

### Accessibility

- Respects user motion preferences
- Keyboard navigation support through orbital controls
- Screen reader friendly with proper ARIA labels
- High contrast mode compatibility

### Browser Support

- Modern browsers with WebGL support
- Fallback handling for older browsers
- Mobile-optimized performance settings

### Dependencies

- `three`: 3D graphics library
- `@react-three/fiber`: React renderer for Three.js
- `@react-three/drei`: Three.js utilities
- `framer-motion`: Animation library

### Development Notes

- Uses React Three Fiber's declarative approach
- Implements proper cleanup for Three.js objects
- Follows React patterns for state management
- Optimized for both development and production builds

### Future Enhancements

- [ ] Additional animation states (idle, active, roar)
- [ ] Sound integration for immersive experience
- [ ] Multiple dragon variants (colors, sizes)
- [ ] Advanced particle systems (fire breathing)
- [ ] Physics integration for realistic movement
- [ ] Shadow and reflection improvements
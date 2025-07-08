# EnhancedHeroSection Component

The `EnhancedHeroSection` is an anime-themed hero section component that builds upon the existing Seiron homepage with power level displays, animated taglines, and enhanced visual effects.

## Features

- **Power Level Integration**: Displays animated power level counter above the main title
- **Rotating Taglines**: Animated subtitle that cycles through configurable taglines
- **Floating Power Indicators**: Animated power icons that float around the hero section
- **Energy Particles**: Floating particles that enhance the mystical atmosphere
- **Enhanced Buttons**: Improved button styling with power aura effects
- **Storm Background**: Maintains existing storm theming and effects
- **Responsive Design**: Adapts to different screen sizes with configurable sizing
- **Accessibility**: Supports reduced motion preferences

## Props Interface

```typescript
interface EnhancedHeroSectionProps {
  onNavigate?: (path: string) => void     // Navigation handler for button clicks
  showPowerLevel?: boolean                // Show/hide power level counter (default: true)
  powerValue?: number                     // Power level value (default: 42000)
  enableAnimations?: boolean              // Enable/disable animations (default: true)
  customTaglines?: string[]               // Custom taglines array (optional)
  size?: 'sm' | 'md' | 'lg' | 'xl'       // Component sizing (default: 'lg')
  className?: string                      // Additional CSS classes
}
```

## Usage Examples

### Basic Usage

```tsx
import { EnhancedHeroSection } from '@/components/homepage'

// Simple implementation with defaults
<EnhancedHeroSection
  onNavigate={(path) => router.push(path)}
/>
```

### Custom Configuration

```tsx
import { EnhancedHeroSection } from '@/components/homepage'

const customTaglines = [
  "Grant your wildest Sei investing wishes",
  "Unleash your DeFi Saiyan power",
  "Master the art of yield fusion",
  "Become the legendary portfolio warrior"
]

<EnhancedHeroSection
  onNavigate={handleNavigation}
  showPowerLevel={true}
  powerValue={150000}
  enableAnimations={true}
  customTaglines={customTaglines}
  size="xl"
  className="custom-hero-styling"
/>
```

### Minimal Setup (No Animations)

```tsx
<EnhancedHeroSection
  onNavigate={handleNavigation}
  showPowerLevel={false}
  enableAnimations={false}
  size="md"
  customTaglines={["Simple and powerful DeFi platform"]}
/>
```

## Customization Options

### Size Variants

- **sm**: Smaller title (text-4xl), compact layout
- **md**: Medium title (text-6xl), balanced layout
- **lg**: Large title (text-8xl), full experience (default)
- **xl**: Extra large title (text-9xl), maximum impact

### Animation Features

- **Power Level Counter**: Animated counting from 0 to target value
- **Rotating Taglines**: Smooth transitions between different taglines
- **Floating Indicators**: Power icons with floating animations
- **Energy Particles**: Ambient particle effects
- **Button Enhancements**: Hover effects and power auras

### Default Taglines

```typescript
const DEFAULT_TAGLINES = [
  "Grant your wildest Sei investing wishes",
  "Unleash your DeFi Saiyan power", 
  "Master the art of yield fusion",
  "Become the legendary portfolio warrior",
  "Ascend to Super Saiyan trading level",
  "Channel your inner financial warrior"
]
```

## Integration with Existing Code

The component seamlessly integrates with existing Seiron components:

- **StormBackground**: Reuses existing storm effect system
- **PowerLevelCounter**: Integrates existing power level component
- **Existing Button Styles**: Maintains and enhances existing button styling
- **Storm Animation Classes**: Uses existing CSS classes for consistency

## Navigation Integration

```tsx
// With React Router
import { useNavigate } from 'react-router-dom'

const navigate = useNavigate()

<EnhancedHeroSection
  onNavigate={(path) => navigate(path)}
/>

// With Next.js Router
import { useRouter } from 'next/router'

const router = useRouter()

<EnhancedHeroSection
  onNavigate={(path) => router.push(path)}
/>
```

## Performance Considerations

- **Lazy Loading**: Heavy animations are conditionally rendered
- **Reduced Motion**: Respects user's reduced motion preferences
- **Optimized Particles**: Limited particle count for performance
- **Efficient Animations**: Uses framer-motion for optimized animations

## Accessibility

- **Reduced Motion Support**: Automatically disables animations when preferred
- **Keyboard Navigation**: Buttons are fully keyboard accessible
- **Screen Reader Friendly**: Proper ARIA labels and semantic structure
- **High Contrast**: Works with high contrast themes

## Dependencies

- `framer-motion`: For smooth animations
- `lucide-react`: For icons
- `@/lib/utils`: For className utilities
- Existing Seiron components: `StormBackground`, `PowerLevelCounter`

## Browser Support

- Modern browsers with CSS Grid and Flexbox support
- WebGL support recommended for storm effects
- Graceful degradation on older browsers
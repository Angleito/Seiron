# ScrollProgressIndicator Component

A Dragon Ball Z-inspired power meter scroll progress indicator for the Seiron homepage. Features a vertical energy bar that tracks scroll progress through homepage sections with Saiyan power level theming.

## Features

- **Saiyan Energy Meter**: Vertical progress bar styled like Dragon Ball power meters
- **Section-Based Progress**: Tracks progress through different homepage sections
- **Power Level Display**: Shows current power level based on scroll position
- **Interactive Navigation**: Click segments to scroll to specific sections
- **Mobile Responsive**: Horizontal bar variant for mobile devices
- **Performance Optimized**: Throttled scroll events and reduced motion support
- **Accessibility**: Proper ARIA labels and keyboard navigation

## Usage

### Basic Implementation

```tsx
import { ScrollProgressIndicator, ScrollProgressIndicatorMobile } from '@/components/homepage'

export const Homepage = () => {
  return (
    <div>
      {/* Your homepage sections with IDs matching the indicator */}
      <section id="hero">Hero Content</section>
      <section id="features">Features Content</section>
      <section id="capabilities">Capabilities Content</section>
      <section id="cta">Call to Action</section>

      {/* Desktop Progress Indicator */}
      <ScrollProgressIndicator />
      
      {/* Mobile Progress Indicator */}
      <ScrollProgressIndicatorMobile />
    </div>
  )
}
```

### Custom Configuration

```tsx
const customSections = [
  {
    id: 'intro',
    name: 'Base Form',
    powerLevel: 1000,
    color: 'text-gray-400',
    aura: 'bg-gray-400/20',
    icon: Activity,
    description: 'Starting the journey'
  },
  // ... more sections
]

<ScrollProgressIndicator
  sections={customSections}
  position="left"
  size="lg"
  showLabels={true}
  enableParticles={true}
/>
```

## Props

### ScrollProgressIndicator

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `sections` | `ScrollSection[]` | Default sections | Array of scroll sections to track |
| `className` | `string` | `''` | Additional CSS classes |
| `showLabels` | `boolean` | `true` | Show power level labels |
| `enableParticles` | `boolean` | `true` | Enable particle effects |
| `enableSounds` | `boolean` | `false` | Enable sound effects (future) |
| `position` | `'right' \| 'left'` | `'right'` | Position on screen |
| `size` | `'sm' \| 'md' \| 'lg'` | `'md'` | Size variant |

### ScrollSection Interface

```tsx
interface ScrollSection {
  id: string                    // Element ID to track
  name: string                  // Display name (e.g., "Super Saiyan")
  powerLevel: number           // Power level value
  color: string                // Text color class
  aura: string                 // Background aura effect
  icon: React.ComponentType    // Icon component
  description: string          // Accessibility description
}
```

## Default Sections

The component comes with pre-configured Dragon Ball themed sections:

1. **Base Form** (1,000) - Hero section
2. **Training** (25,000) - Features showcase  
3. **Power Up** (75,000) - Capabilities grid
4. **Ultra Instinct** (150,000) - Call to action

## Styling

The component uses Tailwind CSS classes and follows the Seiron design system:

- Uses anime color variables from `tailwind.config.ts`
- Respects the 8pt grid spacing system
- Follows the 60/30/10 color hierarchy
- Includes mystical gradient backgrounds
- Power surge and cosmic glow animations

## Performance

- **Throttled Scroll Events**: 60fps throttling for smooth performance
- **Intersection Observer**: Visibility detection for efficiency
- **Performance Monitoring**: Auto-reduces effects on low-end devices
- **Reduced Motion**: Respects user motion preferences
- **Mobile Optimization**: Lightweight horizontal variant

## Accessibility

- Semantic HTML structure
- ARIA labels for screen readers
- Keyboard navigation support
- High contrast color combinations
- Reduced motion support
- Focus indicators

## Animation States

The power meter includes various animation states:

- **Idle**: Gentle glow effect
- **Charging**: Active scroll animation with particles
- **Section Transition**: Power level change animations
- **Hover**: Scale and glow effects
- **Click**: Touch feedback animations

## Mobile Behavior

On mobile devices (`md:hidden`), the component automatically switches to a horizontal progress bar at the bottom of the screen with simplified interactions.

## Browser Support

- Modern browsers with CSS Grid support
- Progressive enhancement for older browsers
- Graceful degradation without JavaScript
- Works with reduced motion settings

## Examples

See `ScrollProgressIndicator.demo.tsx` for complete implementation examples including:

- Basic usage
- Custom sections
- Performance optimized configuration
- Different size variants
- Mobile-first responsive design
# Seiron Mystical Components

A collection of Dragon Ball-inspired UI components for the Seiron AI Portfolio Manager, featuring mystical dragon themes with modern React and Tailwind CSS.

## Components

### 🐉 DragonLoader
Dragon Ball-inspired loading animation with multiple variants.

```tsx
import { DragonLoader } from '@/components';

<DragonLoader 
  size="md" 
  variant="pulsing" 
  className="my-4" 
/>
```

**Props:**
- `size`: 'sm' | 'md' | 'lg' | 'xl' (default: 'md')
- `variant`: 'classic' | 'spinning' | 'pulsing' (default: 'classic')
- `className`: Additional CSS classes

### 🏮 SeiroonLogo
Animated dragon logo with hover effects and multiple display variants.

```tsx
import { SeiroonLogo } from '@/components';

<SeiroonLogo 
  size="lg" 
  variant="full" 
  interactive={true}
/>
```

**Props:**
- `size`: 'sm' | 'md' | 'lg' | 'xl' (default: 'md')
- `variant`: 'full' | 'icon' | 'text' (default: 'full')
- `interactive`: Enable hover effects (default: true)
- `className`: Additional CSS classes

### ✨ MysticalBackground
Particle effects and dragon scale patterns for immersive backgrounds.

```tsx
import { MysticalBackground } from '@/components';

<MysticalBackground 
  variant="cosmic" 
  particleCount={30}
  enableDragonScales={true}
  enableFloatingOrbs={true}
/>
```

**Props:**
- `variant`: 'subtle' | 'intense' | 'cosmic' (default: 'subtle')
- `particleCount`: Number of floating particles (default: 20)
- `enableDragonScales`: Show dragon scale patterns (default: true)
- `enableFloatingOrbs`: Show floating orbs (default: true)
- `className`: Additional CSS classes

### 🌟 DragonBallProgress
Progress indicators using Dragon Ball metaphor with 7 orbs.

```tsx
import { DragonBallProgress } from '@/components';

<DragonBallProgress 
  progress={65} 
  variant="classic"
  size="md"
  showPercentage={true}
  showLabels={false}
/>
```

**Props:**
- `progress`: Progress value 0-100 (required)
- `variant`: 'classic' | 'compact' | 'vertical' (default: 'classic')
- `size`: 'sm' | 'md' | 'lg' (default: 'md')
- `showPercentage`: Display percentage (default: true)
- `showLabels`: Show star labels (default: false)
- `className`: Additional CSS classes

### 🎮 SeiroonDemo
Complete demo component showcasing all mystical components.

```tsx
import { SeiroonDemo } from '@/components';

<SeiroonDemo />
```

## Design System

### Color Palette
- **Dragon Red**: Primary red tones (`dragon-red-*`)
- **Gold**: Power and energy (`gold-*`)
- **Cosmic Purple**: Mystical elements (`cosmic-purple-*`)
- **Sei Gray**: Neutral tones (`sei-gray-*`)

### Animations
- `animate-dragon-pulse`: Pulsing dragon effect
- `animate-mystical-glow`: Glowing mystical aura
- `animate-cosmic-float`: Floating particle motion
- `animate-power-surge`: Power surge effects
- `animate-scale-shimmer`: Shimmering scale patterns

### Shadows
- `shadow-dragon`: Dragon-themed shadow
- `shadow-mystical`: Mystical purple glow
- `shadow-gold-glow`: Golden energy glow

## Usage Examples

### Basic Loading Screen
```tsx
<div className="min-h-screen bg-sei-gray-900 flex items-center justify-center">
  <MysticalBackground variant="subtle" />
  <div className="relative z-10 text-center">
    <SeiroonLogo size="xl" />
    <DragonLoader size="lg" variant="pulsing" className="mt-8" />
  </div>
</div>
```

### Progress Tracking
```tsx
<div className="p-8">
  <DragonBallProgress 
    progress={portfolioValue} 
    variant="classic"
    size="lg"
    showPercentage={true}
  />
</div>
```

### Hero Section
```tsx
<div className="relative">
  <MysticalBackground variant="cosmic" particleCount={50} />
  <div className="relative z-10 py-20 text-center">
    <SeiroonLogo size="xl" variant="full" />
    <p className="text-sei-gray-300 mt-4">
      Harness the power of the dragon
    </p>
  </div>
</div>
```

## Technical Details

- Built with React 18+ and TypeScript
- Styled with Tailwind CSS
- Responsive design principles
- Optimized animations and effects
- Accessible component structure
- Clean prop interfaces

## Dependencies

- React 18+
- TypeScript
- Tailwind CSS
- Tailwind configuration with Seiron theme colors and animations
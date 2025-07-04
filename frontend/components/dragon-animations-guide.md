# Seiron Dragon Animation Guide

## Overview
This guide provides comprehensive documentation for implementing sophisticated dragon animations using CSS and Framer Motion.

## Animation States

### 1. **Idle State**
- Subtle breathing animation (chest rise/fall)
- Micro-movements (wing twitch, slight head movements)
- Gentle floating motion
- CSS Classes: `.dragon-idle`, `.dragon-breathe`, `.dragon-float-enhanced`

### 2. **Attention State**
- Eyes follow cursor movement
- Slight head turn toward user
- Increased glow intensity
- CSS Classes: `.dragon-attention`

### 3. **Ready State**
- Anticipatory pose with faster breathing
- Increased aura glow
- Power rings appear
- CSS Classes: `.dragon-ready`

### 4. **Active State**
- Full power aura
- Dramatic scale and rotation effects
- Maximum glow and particle effects
- CSS Classes: `.dragon-active`, `.dragon-aura`

## CSS Animation Classes

### Basic Animations
```css
.dragon-breathe          /* Breathing animation */
.dragon-float-enhanced   /* Complex floating pattern */
.dragon-idle            /* Combined idle animations */
.dragon-wing            /* Wing twitch animation */
```

### State Animations
```css
.dragon-anticipate      /* Anticipation animation */
.dragon-attention       /* Attention tracking */
.dragon-ready          /* Ready state pulse */
.dragon-active         /* Active power state */
```

### Effect Animations
```css
.dragon-aura           /* Glowing aura effect */
.dragon-magic-particles /* Magical particle system */
.dragon-transform      /* Performance-optimized transforms */
.dragon-3d-container   /* 3D perspective container */
```

## Framer Motion Components

### EnhancedDragonAnimation
Main dragon component with full animation support.

```tsx
<EnhancedDragonAnimation 
  size="lg"                // 'sm' | 'md' | 'lg' | 'xl'
  showDragonBalls={true}   // Show orbiting dragon balls
  enableGestures={true}    // Enable mouse tracking
  className=""             // Additional CSS classes
/>
```

### useDragonAnimation Hook
Advanced control hook for dragon animations.

```tsx
const {
  dragonState,              // Current state
  dragonMood,              // Current mood
  controls,                // Animation controls
  setDragonState,          // State setter
  setDragonMood,           // Mood setter
  triggerSpecialAnimation, // Special effects
  powerLevel,              // Power meter (0-100)
  isCharging               // Charging state
} = useDragonAnimation({
  enableAutoState: true,
  enableProximityDetection: true,
  proximityThreshold: 300,
  enableTimeBasedStates: true
})
```

## Animation Timing & Easing

### Breathing
- Duration: 4s
- Easing: ease-in-out
- Scale: 1 → 1.02 → 1

### Floating
- Duration: 8s
- Easing: cubic-bezier(0.4, 0, 0.2, 1)
- Complex Y/X/Rotate transforms

### Wind Drift
- Duration: 15s
- Easing: ease-in-out
- X translation with skew

### State Transitions
- Duration: 0.3-3s (varies by state)
- Spring physics for responsive feel
- Stiffness: 200-300
- Damping: 20-25

## Performance Optimization

### CSS Optimizations
```css
.dragon-transform {
  will-change: transform, filter;
  transform: translateZ(0);
  backface-visibility: hidden;
  -webkit-font-smoothing: antialiased;
}
```

### Framer Motion Best Practices
1. Use `AnimatePresence` for exit animations
2. Batch animations with `useAnimation` hook
3. Minimize re-renders with proper state management
4. Use CSS for continuous animations, Framer for interactions

## Special Effects

### Power-Up Animation
```tsx
triggerSpecialAnimation('powerUp')
```

### Roar Effect
```tsx
triggerSpecialAnimation('roar')
```

### Spin Animation
```tsx
triggerSpecialAnimation('spin')
```

### Pulse Effect
```tsx
triggerSpecialAnimation('pulse')
```

### Shake Animation
```tsx
triggerSpecialAnimation('shake')
```

## Mobile Optimization

- Gesture controls adapt to touch
- Reduced particle count on mobile
- Simplified shadows for performance
- Touch-friendly interaction zones

## Integration Example

```tsx
import { EnhancedDragonAnimation } from '@/components/EnhancedDragonAnimation'
import { useDragonAnimation } from '@/hooks/useDragonAnimation'

function MyComponent() {
  const { triggerSpecialAnimation } = useDragonAnimation()

  return (
    <div>
      <EnhancedDragonAnimation size="lg" />
      <button onClick={() => triggerSpecialAnimation('roar')}>
        Make Dragon Roar!
      </button>
    </div>
  )
}
```

## Customization

### Custom Dragon States
Extend the `DragonState` type and add new animation variants.

### Custom Particle Effects
Modify particle generation in `EnhancedDragonAnimation`.

### Theme Integration
Use CSS variables for color customization:
```css
:root {
  --dragon-primary: #ef4444;
  --dragon-secondary: #fb923c;
  --dragon-tertiary: #fcd34d;
}
```
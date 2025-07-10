# HomePage Error #310 Fix Testing Guide

## What We Fixed

1. **Router Issue**: The app was using `next/router` but this is a **Vite + React Router** app, not Next.js
2. **Import Issue**: Changed from `import { useRouter } from 'next/router'` to `import { useNavigate } from 'react-router-dom'`
3. **Navigation Fix**: Changed from `router.push(path)` to `navigate(path)`

## Testing Steps

### Step 1: Basic HomePage (Current)
- ✅ HomePage loads without errors
- ✅ React Router navigation works
- ✅ Error boundary catches any issues
- ❌ StormBackground disabled for testing

### Step 2: Add StormBackground
```bash
# Test with StormBackground enabled
# Replace current HomePage with this import:
import { StormBackground } from '../components/effects/StormBackground'

# Add to render:
<StormBackground 
  className="min-h-screen" 
  intensity={0.3}
  animated={false}
>
  {/* content */}
</StormBackground>
```

### Step 3: Add Dragon Components
- Test with dragonType="ascii" (safest)
- Test with dragonType="2d" 
- Test with dragonType="3d" (most complex)

### Step 4: Add Homepage Components
- Add ScrollProgressIndicator
- Add EnhancedHeroSection  
- Add DragonBallFeatureCards
- Add FeatureShowcaseGrid

## File Structure

- `/pages/HomePage.tsx` - Current working version
- `/pages/HomePage.original.tsx` - Original version with all features
- `/pages/HomePage.debug.tsx` - Debug version with extensive logging
- `/pages/index.tsx` - Re-exports HomePage

## Next Steps

1. Test the current basic version
2. Gradually add components back
3. Test dragon rendering
4. Add full homepage features

## Key Changes Made

```typescript
// BEFORE (causing React Error #310)
import { useRouter } from 'next/router'
const router = useRouter()
router.push(path)

// AFTER (working with Vite + React Router)
import { useNavigate } from 'react-router-dom'
const navigate = useNavigate()
navigate(path)
```

The app should now load successfully! 🎉
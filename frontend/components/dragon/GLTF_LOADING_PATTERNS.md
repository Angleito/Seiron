# GLTF Loading Patterns for Dragon Components

This document provides comprehensive usage examples for the new robust GLTF loading patterns implemented in the Seiron dragon components.

## Architecture Overview

The new GLTF loading system follows engineering best practices with:

### 1. Proper Suspense Integration
- **Hooks called unconditionally** at the top level
- **Suspense boundaries** handle async loading gracefully
- **No manual conditional logic** for loading states

### 2. Specialized Error Boundaries
- **GLTFErrorBoundary** for model-specific errors
- **WebGLErrorBoundary** for rendering context issues
- **Automatic recovery** strategies based on error type

### 3. Safe Model Switching
- **DragonModelManager** handles model transitions
- **Resource cleanup** prevents memory leaks
- **Fallback chains** ensure reliability

## Components Overview

### DragonGLTFLoader

A React component that uses proper Suspense patterns for loading GLTF models.

```typescript
import { DragonGLTFLoader } from '@/components/dragon'

<DragonGLTFLoader
  modelPath="/models/dragon.glb"
  voiceState={voiceState}
  size="lg"
  enableAnimations={true}
  enablePreloading={true}
  onLoad={(gltf) => console.log('Model loaded:', gltf)}
  onError={(error) => console.error('Loading error:', error)}
  onProgress={(progress) => console.log('Progress:', progress)}
/>
```

**Key Features:**
- Built-in Suspense boundary with loading fallback
- Automatic GLTF validation and error handling
- Voice state integration for reactive animations
- Configurable size and animation settings

### GLTFErrorBoundary

Specialized error boundary for GLTF and Three.js errors.

```typescript
import { GLTFErrorBoundary } from '@/components/dragon'

<GLTFErrorBoundary
  modelPath="/models/dragon.glb"
  enableAutoRecovery={true}
  maxRetries={3}
  enableDebugInfo={true}
  onError={(error, errorInfo) => {
    console.error('GLTF Error:', error)
    analytics.track('gltf_error', { error: error.message })
  }}
  onRecovery={() => {
    console.log('Recovery successful')
    showNotification('Dragon model recovered')
  }}
  onFallback={() => {
    console.log('Falling back to alternative model')
    setFallbackMode(true)
  }}
>
  <YourGLTFComponent />
</GLTFErrorBoundary>
```

**Error Types Handled:**
- Network errors (retry with exponential backoff)
- Parsing errors (immediate fallback)
- Memory errors (cleanup and retry)
- Validation errors (fallback to simpler model)
- Animation errors (disable animations, keep model)

### DragonModelManager

Advanced component for managing multiple models with safe switching.

```typescript
import { DragonModelManager } from '@/components/dragon'

<DragonModelManager
  initialModelId="seiron-primary"
  voiceState={voiceState}
  size="xl"
  enableAnimations={true}
  enablePreloading={true}
  enableAutoFallback={true}
  onModelSwitch={(from, to) => {
    console.log(`Model switched: ${from.displayName} → ${to.displayName}`)
    analytics.track('model_switch', {
      from: from.id,
      to: to.id,
      reason: 'performance'
    })
  }}
  onLoadProgress={(progress, modelId) => {
    setLoadingProgress(progress)
    console.log(`Loading ${modelId}: ${progress}%`)
  }}
  onError={(error, modelId) => {
    console.error(`Error loading ${modelId}:`, error)
  }}
  onFallback={(fromModelId, toModelId) => {
    console.log(`Fallback triggered: ${fromModelId} → ${toModelId}`)
    showNotification('Switched to backup dragon model')
  }}
/>
```

**Model Configurations:**
- `seiron-primary`: High-quality primary model
- `seiron-low`: Low-quality mobile-optimized model
- `seiron-animated`: Ultra-quality with complex animations

## Usage Patterns

### 1. Basic GLTF Loading with Suspense

```typescript
import React, { Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import { DragonGLTFLoader } from '@/components/dragon'

const DragonScene = () => {
  return (
    <Canvas>
      <Suspense fallback={<LoadingIndicator />}>
        <DragonGLTFLoader
          modelPath="/models/dragon.glb"
          size="md"
          enableAnimations={true}
        />
      </Suspense>
    </Canvas>
  )
}

// Loading indicator using Three.js objects
const LoadingIndicator = () => (
  <group>
    <mesh>
      <sphereGeometry args={[0.5, 16, 16]} />
      <meshStandardMaterial color="#fbbf24" emissive="#f59e0b" />
    </mesh>
    <pointLight position={[0, 5, 5]} intensity={1} color="#fbbf24" />
  </group>
)
```

### 2. Error Handling with Recovery

```typescript
import React, { useState } from 'react'
import { GLTFErrorBoundary, DragonGLTFLoader } from '@/components/dragon'

const RobustDragonLoader = () => {
  const [errorCount, setErrorCount] = useState(0)
  const [fallbackActive, setFallbackActive] = useState(false)

  return (
    <GLTFErrorBoundary
      enableAutoRecovery={true}
      maxRetries={3}
      onError={(error) => {
        setErrorCount(prev => prev + 1)
        console.error(`Dragon loading error #${errorCount + 1}:`, error)
      }}
      onRecovery={() => {
        console.log('Dragon model recovered successfully')
        setErrorCount(0)
      }}
      onFallback={() => {
        setFallbackActive(true)
        console.log('Activated fallback dragon mode')
      }}
    >
      <DragonGLTFLoader
        modelPath={fallbackActive ? '/models/dragon-simple.glb' : '/models/dragon.glb'}
        size="lg"
        enableAnimations={!fallbackActive}
        onLoad={() => console.log('Dragon loaded successfully')}
      />
    </GLTFErrorBoundary>
  )
}
```

### 3. Model Management with Performance Optimization

```typescript
import React, { useState, useEffect } from 'react'
import { DragonModelManager } from '@/components/dragon'

const AdaptiveDragonRenderer = () => {
  const [performanceMode, setPerformanceMode] = useState<'high' | 'medium' | 'low'>('high')
  const [currentModelId, setCurrentModelId] = useState('seiron-primary')

  // Monitor performance and adapt model quality
  useEffect(() => {
    const performanceMonitor = setInterval(() => {
      const fps = measureFPS() // Your FPS measurement logic
      
      if (fps < 30 && performanceMode === 'high') {
        setPerformanceMode('medium')
        setCurrentModelId('seiron-low')
      } else if (fps < 15 && performanceMode === 'medium') {
        setPerformanceMode('low')
        setCurrentModelId('seiron-minimal')
      } else if (fps > 50 && performanceMode === 'low') {
        setPerformanceMode('high')
        setCurrentModelId('seiron-primary')
      }
    }, 5000)

    return () => clearInterval(performanceMonitor)
  }, [performanceMode])

  return (
    <DragonModelManager
      initialModelId={currentModelId}
      enablePreloading={true}
      enableAutoFallback={true}
      performanceThreshold={30}
      onModelSwitch={(from, to) => {
        console.log(`Performance optimization: ${from.displayName} → ${to.displayName}`)
        showNotification(`Switched to ${to.displayName} for better performance`)
      }}
    />
  )
}
```

### 4. Voice-Reactive Dragon with Model Switching

```typescript
import React, { useState, useCallback } from 'react'
import { VoiceAnimationState } from '@/components/dragon'
import { DragonModelManager } from '@/components/dragon'

const VoiceReactiveDragon = () => {
  const [voiceState, setVoiceState] = useState<VoiceAnimationState>({
    isListening: false,
    isSpeaking: false,
    isProcessing: false,
    isIdle: true,
    volume: 0
  })

  const handleVoiceStateChange = useCallback((newState: Partial<VoiceAnimationState>) => {
    setVoiceState(prev => ({ ...prev, ...newState }))
  }, [])

  return (
    <div className="w-full h-screen">
      <DragonModelManager
        initialModelId="seiron-animated"
        voiceState={voiceState}
        size="gigantic"
        enableAnimations={true}
        enablePreloading={true}
        onModelSwitch={(from, to) => {
          console.log(`Voice-triggered model switch: ${from.displayName} → ${to.displayName}`)
        }}
      />
      
      <VoiceControls onChange={handleVoiceStateChange} />
    </div>
  )
}

const VoiceControls = ({ onChange }) => (
  <div className="absolute bottom-4 left-4 space-x-2">
    <button
      onClick={() => onChange({ isListening: true, isSpeaking: false, isIdle: false })}
      className="px-4 py-2 bg-blue-600 text-white rounded"
    >
      Listen
    </button>
    <button
      onClick={() => onChange({ isSpeaking: true, isListening: false, isIdle: false })}
      className="px-4 py-2 bg-green-600 text-white rounded"
    >
      Speak
    </button>
    <button
      onClick={() => onChange({ isIdle: true, isListening: false, isSpeaking: false })}
      className="px-4 py-2 bg-gray-600 text-white rounded"
    >
      Idle
    </button>
  </div>
)
```

### 5. Enhanced SeironGLBDragon Integration

```typescript
import React from 'react'
import { 
  SeironGLBDragonWithModelManager,
  SeironGLBDragonWithWebGLErrorBoundary 
} from '@/components/dragon'

// Using the enhanced SeironGLBDragon with model management
const EnhancedDragonExample = () => {
  return (
    <div className="dragon-container">
      <SeironGLBDragonWithModelManager
        enableModelManager={true}
        initialModelId="seiron-primary"
        voiceState={voiceState}
        size="xl"
        enableAnimations={true}
        onModelSwitch={(from, to) => {
          console.log(`Model switched: ${from.displayName} → ${to.displayName}`)
        }}
        onError={(error) => {
          console.error('Dragon error:', error)
        }}
        onFallback={() => {
          console.log('Dragon fallback activated')
        }}
      />
    </div>
  )
}

// Using the standard SeironGLBDragon with WebGL error boundary
const StandardDragonExample = () => {
  return (
    <SeironGLBDragonWithWebGLErrorBoundary
      modelPath="/models/seiron.glb"
      voiceState={voiceState}
      size="lg"
      enableAnimations={true}
      onError={(error) => {
        console.error('WebGL error:', error)
      }}
      onFallback={() => {
        console.log('WebGL fallback triggered')
      }}
    />
  )
}
```

## Best Practices

### 1. Always Use Error Boundaries

```typescript
// ✅ Good: Proper error boundary usage
<GLTFErrorBoundary enableAutoRecovery={true} maxRetries={3}>
  <DragonGLTFLoader modelPath="/models/dragon.glb" />
</GLTFErrorBoundary>

// ❌ Bad: No error boundary
<DragonGLTFLoader modelPath="/models/dragon.glb" />
```

### 2. Use Suspense for Loading States

```typescript
// ✅ Good: Proper Suspense usage
<Suspense fallback={<LoadingDragon />}>
  <DragonGLTFLoader modelPath="/models/dragon.glb" />
</Suspense>

// ❌ Bad: Manual loading states
const BadExample = () => {
  const [loading, setLoading] = useState(true)
  
  if (loading) {
    return <LoadingSpinner />
  }
  
  return <DragonGLTFLoader modelPath="/models/dragon.glb" />
}
```

### 3. Call Hooks Unconditionally

```typescript
// ✅ Good: Hooks at top level
const GoodComponent = () => {
  const [voiceState, setVoiceState] = useState(initialState)
  const [modelId, setModelId] = useState('seiron-primary')
  
  return (
    <DragonModelManager
      initialModelId={modelId}
      voiceState={voiceState}
    />
  )
}

// ❌ Bad: Conditional hooks
const BadComponent = ({ enableVoice }) => {
  const [modelId, setModelId] = useState('seiron-primary')
  
  // Don't do this!
  if (enableVoice) {
    const [voiceState, setVoiceState] = useState(initialState)
  }
  
  return <DragonModelManager initialModelId={modelId} />
}
```

### 4. Handle Resource Cleanup

```typescript
// ✅ Good: Proper cleanup
const DragonComponent = () => {
  useEffect(() => {
    // Setup
    const cleanup = setupDragonResources()
    
    return () => {
      // Cleanup
      cleanup()
    }
  }, [])
  
  return <DragonGLTFLoader modelPath="/models/dragon.glb" />
}
```

## Performance Considerations

### 1. Model Preloading

```typescript
// Preload models based on user interaction patterns
const PreloadingExample = () => {
  useEffect(() => {
    // Preload high-priority models
    const preloadPromises = [
      preloadGLTFModel('/models/seiron-primary.glb'),
      preloadGLTFModel('/models/seiron-low.glb')
    ]
    
    Promise.all(preloadPromises).then(() => {
      console.log('Critical models preloaded')
    })
  }, [])
  
  return (
    <DragonModelManager
      initialModelId="seiron-primary"
      enablePreloading={true}
    />
  )
}
```

### 2. Memory Management

```typescript
// Monitor memory usage and trigger cleanup
const MemoryAwareDragon = () => {
  useEffect(() => {
    const memoryMonitor = setInterval(() => {
      const memoryUsage = getMemoryUsage()
      
      if (memoryUsage > 512 * 1024 * 1024) { // 512MB
        console.log('High memory usage detected, cleaning up')
        clearGLTFCache()
      }
    }, 10000)
    
    return () => clearInterval(memoryMonitor)
  }, [])
  
  return <DragonGLTFLoader modelPath="/models/dragon.glb" />
}
```

## Migration Guide

### From Legacy SeironGLBDragon

```typescript
// Old approach
<SeironGLBDragon
  modelPath="/models/dragon.glb"
  size="lg"
  onError={(error) => console.error(error)}
/>

// New approach with enhanced patterns
<SeironGLBDragonWithModelManager
  enableModelManager={true}
  initialModelId="seiron-primary"
  size="lg"
  onError={(error) => console.error(error)}
  onModelSwitch={(from, to) => console.log('Model switched')}
/>
```

### From Manual GLTF Loading

```typescript
// Old approach
const OldDragonLoader = () => {
  const [gltf, setGltf] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  
  useEffect(() => {
    loadGLTF('/models/dragon.glb')
      .then(setGltf)
      .catch(setError)
      .finally(() => setLoading(false))
  }, [])
  
  if (loading) return <LoadingSpinner />
  if (error) return <ErrorDisplay error={error} />
  
  return <DragonMesh gltf={gltf} />
}

// New approach with Suspense
const NewDragonLoader = () => (
  <GLTFErrorBoundary>
    <Suspense fallback={<LoadingDragon />}>
      <DragonGLTFLoader modelPath="/models/dragon.glb" />
    </Suspense>
  </GLTFErrorBoundary>
)
```

## Troubleshooting

### Common Issues

1. **Model Not Loading**
   - Check console for GLTF-specific errors
   - Verify model path is correct
   - Ensure model file is not corrupted

2. **Performance Issues**
   - Use lower quality models for mobile
   - Enable preloading for critical models
   - Monitor memory usage

3. **Error Boundary Not Catching**
   - Ensure error boundaries wrap async components
   - Check error boundary placement in component tree

### Debug Mode

```typescript
// Enable debug logging
const DebugDragon = () => (
  <GLTFErrorBoundary
    enableDebugInfo={true}
    onError={(error, errorInfo) => {
      console.error('Debug info:', { error, errorInfo })
    }}
  >
    <DragonGLTFLoader
      modelPath="/models/dragon.glb"
      onLoad={(gltf) => console.log('Debug: GLTF loaded', gltf)}
      onProgress={(progress) => console.log('Debug: Progress', progress)}
    />
  </GLTFErrorBoundary>
)
```

## Conclusion

The new GLTF loading patterns provide a robust, performant, and maintainable way to handle 3D dragon models in React applications. By following these patterns, you ensure:

- **Reliability**: Proper error handling and recovery
- **Performance**: Efficient loading and resource management
- **Maintainability**: Clean separation of concerns
- **User Experience**: Smooth loading states and fallbacks

Remember to always use error boundaries, call hooks unconditionally, and handle resource cleanup properly for the best results.
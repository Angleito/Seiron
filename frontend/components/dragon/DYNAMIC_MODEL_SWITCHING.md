# SeironGLBDragon Dynamic Model Switching

## Overview

The enhanced SeironGLBDragon component now supports dynamic model switching with comprehensive loading callbacks, error handling, and resource management. This allows real-time switching between different dragon models while maintaining optimal performance and providing detailed feedback.

## Key Features

### 🔄 Dynamic Model Switching
- **Real-time switching**: Change models on-the-fly without component remounting
- **Format support**: Handles both GLB and GLTF formats with automatic detection
- **Fallback system**: Automatic fallback to backup models when loading fails
- **Resource cleanup**: Proper disposal of previous model resources to prevent memory leaks

### 📊 Loading Progress Tracking
- **Real-time progress**: Track loading progress with percentage feedback
- **Loading states**: Detailed loading state management (start, progress, complete, error)
- **Visual feedback**: Built-in loading indicators and model switching overlays

### ⚙️ Model-Specific Configuration
- **Per-model settings**: Custom scale, position, rotation, and animation per model
- **Quality levels**: Different optimization settings for different models
- **Material overrides**: Custom material properties for specific models
- **Performance optimization**: Automatic quality adjustments based on model requirements

### 🎮 Enhanced Error Handling
- **Comprehensive error types**: Handle different types of loading errors
- **Automatic recovery**: Intelligent fallback mechanisms
- **Error callbacks**: Detailed error reporting with model-specific context

## Usage Examples

### Basic Dynamic Model Switching

```typescript
import React, { useState } from 'react'
import { SeironGLBDragonWithCanvas } from './SeironGLBDragon'

const MyDragonApp = () => {
  const [currentModel, setCurrentModel] = useState('/models/seiron.glb')
  const [loadingProgress, setLoadingProgress] = useState(0)

  return (
    <SeironGLBDragonWithCanvas
      modelPath={currentModel}
      onLoadStart={(modelPath) => {
        console.log(`Loading started: ${modelPath}`)
      }}
      onLoadProgress={(progress, modelPath) => {
        setLoadingProgress(progress)
        console.log(`Loading: ${progress}% - ${modelPath}`)
      }}
      onLoadComplete={(modelPath) => {
        console.log(`Loading completed: ${modelPath}`)
      }}
      onModelSwitch={(fromPath, toPath) => {
        console.log(`Switched from ${fromPath} to ${toPath}`)
      }}
    />
  )
}
```

### Advanced Configuration with Model-Specific Settings

```typescript
const modelSpecificConfig = {
  '/models/seiron_low.glb': {
    scale: 2.0,
    position: [0, -1, 0],
    rotation: [0, 0, 0],
    animationName: 'idle',
    quality: 'low',
    optimizations: {
      shadows: false,
      reflections: false,
      antialiasing: false,
      particles: false
    }
  },
  '/models/seiron_high.glb': {
    scale: 3.0,
    position: [0, 0, 0],
    rotation: [0, 0, 0],
    animationName: 'flying',
    quality: 'high',
    optimizations: {
      shadows: true,
      reflections: true,
      antialiasing: true,
      particles: true
    },
    materialOverrides: {
      roughness: 0.2,
      metalness: 0.3,
      colorMultiplier: 1.5
    }
  }
}

<SeironGLBDragonWithCanvas
  modelPath={selectedModel}
  modelSpecificConfig={modelSpecificConfig}
  fallbackModelPath="/models/seiron.glb"
  enableModelPreloading={true}
  supportedFormats={['glb', 'gltf']}
  onLoadStart={handleLoadStart}
  onLoadProgress={handleLoadProgress}
  onLoadComplete={handleLoadComplete}
  onLoadError={handleLoadError}
  onModelSwitch={handleModelSwitch}
/>
```

## New Props

### Loading Callbacks
- `onLoadStart?: (modelPath: string) => void` - Called when model loading begins
- `onLoadProgress?: (progress: number, modelPath: string) => void` - Called during loading with progress updates
- `onLoadComplete?: (modelPath: string) => void` - Called when model loading completes successfully
- `onLoadError?: (error: Error, modelPath: string) => void` - Called when model loading fails
- `onModelSwitch?: (fromPath: string, toPath: string) => void` - Called when switching between models

### Model Configuration
- `fallbackModelPath?: string` - Path to fallback model (default: '/models/seiron.glb')
- `enableModelPreloading?: boolean` - Enable automatic model preloading (default: true)
- `supportedFormats?: ('glb' | 'gltf')[]` - Supported model formats (default: ['glb', 'gltf'])
- `modelSpecificConfig?: ModelSpecificConfig` - Per-model configuration object

### ModelSpecificConfig Interface

```typescript
interface ModelSpecificConfig {
  [modelPath: string]: {
    scale?: number
    position?: [number, number, number]
    rotation?: [number, number, number]
    animationName?: string
    materialOverrides?: any
    lodLevels?: number[]
    quality?: 'low' | 'medium' | 'high'
    optimizations?: {
      shadows?: boolean
      reflections?: boolean
      antialiasing?: boolean
      particles?: boolean
    }
  }
}
```

## Resource Management

### Automatic Cleanup
- **Memory management**: Automatic disposal of geometries, materials, and textures
- **Animation cleanup**: Proper cleanup of animation mixers and actions
- **WebGL resource disposal**: Comprehensive WebGL resource cleanup
- **Loading cache management**: Intelligent caching with automatic cleanup

### Performance Optimization
- **Progressive loading**: Support for progressive model loading
- **Quality adaptation**: Automatic quality adjustment based on device capabilities
- **LOD system**: Level-of-detail optimization for better performance
- **Preloading**: Intelligent preloading of frequently used models

## Error Handling Strategies

### Model Loading Errors
1. **Format validation**: Check if model format is supported
2. **Fallback cascade**: Try fallback model if primary fails
3. **Error reporting**: Detailed error information with context
4. **Recovery attempts**: Automatic retry mechanisms

### WebGL Context Errors
1. **Context loss detection**: Detect and handle WebGL context loss
2. **Automatic recovery**: Attempt to recover from context loss
3. **Graceful degradation**: Fall back to simpler rendering when needed

## Performance Considerations

### Loading Performance
- **Preloading**: Preload commonly used models
- **Caching**: Intelligent caching of loaded models
- **Progressive loading**: Load models in stages for better UX

### Runtime Performance
- **Quality adaptation**: Adjust quality based on performance
- **LOD system**: Use appropriate level of detail
- **Resource limits**: Respect memory and performance limits

## Best Practices

### Model Organization
```
models/
├── seiron.glb              # Default/fallback model
├── seiron_low.glb          # Low quality for mobile
├── seiron_medium.glb       # Medium quality for standard devices
├── seiron_high.glb         # High quality for powerful devices
└── seiron_animated.gltf    # Animated version with complex animations
```

### Configuration Management
```typescript
const createModelConfig = (quality: 'low' | 'medium' | 'high') => ({
  quality,
  scale: quality === 'low' ? 2.0 : quality === 'medium' ? 2.5 : 3.0,
  optimizations: {
    shadows: quality !== 'low',
    reflections: quality === 'high',
    antialiasing: quality !== 'low',
    particles: quality !== 'low'
  }
})
```

### Error Handling
```typescript
const handleLoadError = (error: Error, modelPath: string) => {
  console.error(`Model loading failed: ${modelPath}`, error)
  
  // Log error for analytics
  analytics.track('model_load_error', {
    modelPath,
    error: error.message,
    timestamp: Date.now()
  })
  
  // Show user-friendly message
  showNotification('Dragon model loading failed, using fallback')
}
```

## Migration Guide

### From Basic to Dynamic Model Switching

**Before:**
```typescript
<SeironGLBDragonWithCanvas
  modelPath="/models/seiron.glb"
  onError={handleError}
/>
```

**After:**
```typescript
<SeironGLBDragonWithCanvas
  modelPath={selectedModel}
  fallbackModelPath="/models/seiron.glb"
  enableModelPreloading={true}
  onLoadStart={handleLoadStart}
  onLoadProgress={handleLoadProgress}
  onLoadComplete={handleLoadComplete}
  onLoadError={handleLoadError}
  onModelSwitch={handleModelSwitch}
  onError={handleError}
/>
```

## Testing

### Unit Tests
```bash
npm test -- SeironGLBDragon.test.tsx
```

### Integration Tests
```bash
npm test -- dragon-model-switching.test.tsx
```

### Performance Tests
```bash
npm run test:performance -- dragon-models
```

## Troubleshooting

### Common Issues

1. **Model Not Loading**
   - Check model path is correct
   - Verify model format is supported
   - Check network connectivity
   - Review browser console for errors

2. **Poor Performance**
   - Reduce model quality settings
   - Disable expensive optimizations
   - Use appropriate LOD levels
   - Check device capabilities

3. **Memory Issues**
   - Ensure proper cleanup callbacks
   - Limit number of preloaded models
   - Use lower quality models on mobile
   - Monitor memory usage

### Debug Mode
```typescript
<SeironGLBDragonWithCanvas
  modelPath={selectedModel}
  // Enable debug logging
  debug={process.env.NODE_ENV === 'development'}
  // Show performance metrics
  showMetrics={true}
/>
```

## Future Enhancements

### Planned Features
- **Streaming models**: Support for streaming large models
- **Compression**: Automatic model compression
- **CDN integration**: Intelligent CDN-based model loading
- **A/B testing**: Built-in A/B testing for model variants

### Experimental Features
- **Procedural generation**: Runtime model generation
- **Morphing**: Smooth transitions between models
- **Collaborative loading**: Shared model cache across instances

---

For more examples and advanced usage patterns, see the `SeironGLBDragon.example.tsx` file.
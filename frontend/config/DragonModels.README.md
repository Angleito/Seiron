# Dragon Model Configuration System

A comprehensive configuration system for managing dragon 3D models with metadata, performance profiles, device compatibility, and optimization settings.

## Overview

The Dragon Model Configuration System provides:

- **Centralized Model Management**: All dragon models in one configuration file
- **Device Compatibility Detection**: Automatic device capability analysis
- **Performance Optimization**: Quality settings based on device capabilities
- **Intelligent Fallback Chains**: Graceful degradation when models fail
- **Preloading Strategies**: Efficient model loading and caching
- **Performance Monitoring**: Real-time performance tracking and optimization

## Quick Start

```typescript
import { 
  getRecommendedModel, 
  getOptimalQualitySettings,
  DeviceCapabilityDetector 
} from '@config/dragonModels'

// Get the best model for current device
const model = await getRecommendedModel('high', 'voice-interface')

// Get optimal quality settings
const capabilities = await DeviceCapabilityDetector.getInstance().detectCapabilities()
const qualitySettings = getOptimalQualitySettings(model, capabilities)
```

## Model Configurations

### Available Models

#### Production Models
- **seiron-primary**: Main production dragon model (1MB, High Quality)
- **seiron-animated**: High-quality animated dragon (2MB, Ultra Quality)
- **seiron-lod-high**: Ultra-high quality with LOD (3MB, Ultra Quality)

#### Specialized Models
- **dragon-head**: Focused head model for close-up interactions (1.5MB, High Quality)
- **dragon-head-optimized**: Mobile-optimized head model (512KB, Medium Quality)

#### Fallback Models
- **dragon-2d-sprite**: CSS-based 2D sprite (0KB, Low Quality)
- **dragon-ascii**: Terminal-style ASCII art (0KB, Low Quality)

### Model Metadata

Each model includes comprehensive metadata:

```typescript
interface DragonModelConfig {
  // Basic information
  id: string
  name: string
  displayName: string
  description: string
  path: string
  format: 'glb' | 'gltf' | 'obj'
  fileSize: number
  quality: 'low' | 'medium' | 'high' | 'ultra'
  
  // Performance characteristics
  performance: {
    renderComplexity: number      // 1-10 scale
    memoryUsageMB: number
    loadTimeMs: number
    frameTimeMs: number
    vertexCount: number
    triangleCount: number
    textureMemoryMB: number
    recommendedFPS: number
    minDeviceMemoryMB: number
    cpuIntensity: number         // 1-10 scale
    gpuIntensity: number         // 1-10 scale
    batteryImpact: 'low' | 'medium' | 'high'
  }
  
  // Device compatibility
  compatibility: {
    desktop: { supported: boolean, performance: string, fallbackRequired: boolean }
    mobile: { supported: boolean, performance: string, fallbackRequired: boolean }
    tablet: { supported: boolean, performance: string, fallbackRequired: boolean }
    lowEndDevice: { supported: boolean, performance: string, fallbackRequired: boolean }
  }
  
  // Features and capabilities
  features: {
    hasLevelOfDetail: boolean
    hasAnimations: boolean
    hasVoiceIntegration: boolean
    hasEmotionSystem: boolean
    hasParticleEffects: boolean
    hasPhysics: boolean
    // ... more features
  }
  
  // Quality settings for different performance levels
  qualitySettings: {
    low: { enabled: boolean, polygonReduction: number, textureSize: number, ... }
    medium: { enabled: boolean, polygonReduction: number, textureSize: number, ... }
    high: { enabled: boolean, polygonReduction: number, textureSize: number, ... }
    ultra: { enabled: boolean, polygonReduction: number, textureSize: number, ... }
  }
}
```

## Device Capability Detection

The system automatically detects device capabilities:

```typescript
const detector = DeviceCapabilityDetector.getInstance()
const capabilities = await detector.detectCapabilities()

// Detected capabilities include:
// - WebGL support (1.0, 2.0)
// - Device memory
// - Device type (desktop, mobile, tablet)
// - GPU tier (low, medium, high)
// - CPU cores
// - Maximum texture size
// - HDR and float texture support
```

## Model Selection

### Automatic Selection

```typescript
// Get recommended model based on device and use case
const model = await getRecommendedModel('high', 'voice-interface')

// Get models filtered by device capability
const capabilities = await DeviceCapabilityDetector.getInstance().detectCapabilities()
const compatibleModels = getModelsByDeviceCapability(capabilities)
```

### Manual Selection

```typescript
// Get models by specific criteria
const highQualityModels = getModelsByQuality('high')
const animatedModels = getModelsByType('animated')
const voiceModels = getModelsByUseCase('voice-interface')

// Get specific model
const model = getModelConfig('seiron-primary')
```

## Quality Optimization

The system provides optimal quality settings based on device capabilities:

```typescript
const capabilities = await DeviceCapabilityDetector.getInstance().detectCapabilities()
const model = getModelConfig('seiron-primary')
const qualitySettings = getOptimalQualitySettings(model, capabilities)

// Quality settings include:
// - Texture size (256px to 4096px)
// - Shadow quality (none to high)
// - Anti-aliasing level (0x to 8x)
// - Effects level (none to full)
// - Polygon reduction (0% to 80%)
```

## Fallback System

Intelligent fallback chains ensure graceful degradation:

```typescript
// Create fallback chain for a model
const fallbackChain = createFallbackChain('seiron-animated')

// Example chain:
// 1. seiron-animated (primary)
// 2. seiron-primary (fallback)
// 3. dragon-head-optimized (mobile fallback)
// 4. dragon-2d-sprite (emergency fallback)
// 5. dragon-ascii (ultimate fallback)
```

### Fallback Triggers

- **WebGL Context Loss**: Automatically falls back to 2D/ASCII
- **Memory Constraints**: Reduces model complexity
- **Performance Issues**: Switches to lower quality models
- **Load Failures**: Uses cached or simplified models

## Model Preloading

Efficient preloading strategies for optimal performance:

```typescript
const preloader = ModelPreloader.getInstance()

// Preload single model
await preloader.preloadModel(model)

// Preload model set
await preloadModelSet(['seiron-primary', 'dragon-head-optimized'])

// Check preload status
const isPreloaded = preloader.isModelPreloaded('seiron-primary')
```

### Preloading Strategies

- **Critical Priority**: Load immediately (primary models)
- **High Priority**: Load on visibility (fallback models)
- **Medium Priority**: Load on hover (detailed models)
- **Low Priority**: Load during idle time (showcase models)

## Performance Monitoring

Real-time performance tracking and optimization:

```typescript
const monitor = ModelPerformanceMonitor.getInstance()

// Record performance metrics
monitor.recordModelPerformance('seiron-primary', {
  loadTimeMs: 1250,
  memoryUsageMB: 28,
  frameTimeMs: 14
})

// Get performance data
const performance = monitor.getModelPerformance('seiron-primary')
const avgPerformance = monitor.getAveragePerformance()
```

## Integration with DragonRenderer

The configuration system integrates seamlessly with existing components:

```typescript
import { DragonRenderer } from '@components/dragon/DragonRenderer'
import { getRecommendedModel } from '@config/dragonModels'

const MyComponent = () => {
  const [model, setModel] = useState(null)
  
  useEffect(() => {
    const loadModel = async () => {
      const recommendedModel = await getRecommendedModel('high', 'voice-interface')
      setModel(recommendedModel)
    }
    loadModel()
  }, [])
  
  return (
    <DragonRenderer
      dragonType="glb"
      modelPath={model?.path}
      size="lg"
      enableFallback={true}
      fallbackType="2d"
      enablePerformanceMonitor={true}
    />
  )
}
```

## Use Cases

### Voice Interface
```typescript
const voiceModel = await getRecommendedModel('medium', 'voice-interface')
// Optimized for voice responsiveness and emotion display
```

### Mobile Optimization
```typescript
const mobileModel = await getRecommendedModel('low', 'mobile-optimized')
// Optimized for battery life and quick loading
```

### Desktop Showcase
```typescript
const showcaseModel = await getRecommendedModel('ultra', 'desktop-showcase')
// Maximum quality for impressive demonstrations
```

### High-End Devices
```typescript
const premiumModel = await getRecommendedModel('ultra', 'high-end-devices')
// Full feature set for capable devices
```

## Advanced Features

### LOD (Level of Detail)
```typescript
// Models with LOD support automatically adjust complexity based on:
// - Distance from camera
// - Screen size
// - Performance requirements
// - Battery constraints
```

### Progressive Loading
```typescript
// Load low-quality version first, then upgrade
const model = await getRecommendedModel('high', 'voice-interface')
if (model.features.hasLevelOfDetail) {
  // Start with low quality, upgrade progressively
}
```

### Texture Compression
```typescript
// Automatic texture format selection based on device support
// - BASIS Universal (modern devices)
// - DDS (DirectX-compatible)
// - ASTC (mobile devices)
// - WebP fallback
```

## Configuration Constants

```typescript
export const DRAGON_MODEL_CONSTANTS = {
  DEFAULT_CACHE_SIZE: 50,              // MB
  DEFAULT_PRELOAD_TIMEOUT: 10000,      // 10 seconds
  DEFAULT_QUALITY_FALLBACK_THRESHOLD: 30, // FPS
  DEFAULT_MEMORY_THRESHOLD: 512,       // MB
  DEFAULT_TEXTURE_SIZE: 1024,
  MAX_CONCURRENT_LOADS: 3,
  PERFORMANCE_SAMPLE_RATE: 1000,       // ms
  FALLBACK_DELAY: 500,                 // ms
  ERROR_RECOVERY_TIMEOUT: 2000,        // ms
}
```

## Best Practices

### Model Selection
1. **Start with getRecommendedModel()** - Let the system choose optimally
2. **Consider use case** - Voice interface vs. showcase have different needs
3. **Test on target devices** - Verify performance on actual hardware
4. **Monitor performance** - Use ModelPerformanceMonitor for optimization

### Performance Optimization
1. **Use quality settings** - Don't load ultra-quality on low-end devices
2. **Implement preloading** - Load models before they're needed
3. **Monitor memory usage** - Clean up unused models
4. **Respect battery constraints** - Reduce quality on mobile devices

### Fallback Strategy
1. **Always have fallbacks** - Never assume WebGL support
2. **Test fallback chains** - Verify graceful degradation
3. **Monitor fallback usage** - Track which devices need fallbacks
4. **Update fallback logic** - Adapt based on real-world usage

### Error Handling
1. **Handle load failures** - Models may fail to load
2. **Implement timeouts** - Don't wait forever for models
3. **Log performance issues** - Track problems for improvement
4. **Provide user feedback** - Show loading states and errors

## Troubleshooting

### Common Issues

#### Model Not Loading
```typescript
// Check if model exists
const model = getModelConfig('my-model-id')
if (!model) {
  console.error('Model not found')
}

// Check device compatibility
const capabilities = await DeviceCapabilityDetector.getInstance().detectCapabilities()
const compatible = getModelsByDeviceCapability(capabilities)
```

#### Performance Issues
```typescript
// Check performance metrics
const monitor = ModelPerformanceMonitor.getInstance()
const performance = monitor.getModelPerformance('model-id')

// Adjust quality settings
const lowerQuality = getOptimalQualitySettings(model, capabilities)
```

#### Memory Issues
```typescript
// Check memory usage
const totalMemory = capabilities.memoryMB
const modelMemory = model.performance.memoryUsageMB

if (modelMemory > totalMemory * 0.3) {
  // Consider lower quality model
  const fallbackChain = createFallbackChain(model.id)
  const betterModel = fallbackChain[1] // Next in chain
}
```

## Migration Guide

### From Manual Model Selection
```typescript
// Before
const modelPath = '/models/seiron.glb'

// After
const model = await getRecommendedModel('high', 'voice-interface')
const modelPath = model.path
```

### From Static Quality Settings
```typescript
// Before
const quality = 'high'

// After
const capabilities = await DeviceCapabilityDetector.getInstance().detectCapabilities()
const qualitySettings = getOptimalQualitySettings(model, capabilities)
```

### From Manual Fallbacks
```typescript
// Before
const fallbacks = ['seiron.glb', 'dragon_head.glb', '2d-sprite']

// After
const fallbackChain = createFallbackChain('seiron-primary')
const fallbacks = fallbackChain.map(model => model.path)
```

## API Reference

### Core Functions
- `getRecommendedModel(quality, useCase)` - Get optimal model for device
- `getOptimalQualitySettings(model, capabilities)` - Get quality settings
- `createFallbackChain(modelId)` - Create fallback sequence
- `preloadModelSet(modelIds)` - Preload multiple models
- `getModelsByDeviceCapability(capabilities)` - Filter compatible models

### Classes
- `DeviceCapabilityDetector` - Detect device capabilities
- `DragonModelSelector` - Select optimal models
- `ModelPreloader` - Handle model preloading
- `ModelPerformanceMonitor` - Track performance metrics

### Utility Functions
- `getModelConfig(id)` - Get model configuration
- `getAllModelIds()` - Get all available model IDs
- `getModelsByQuality(quality)` - Filter models by quality
- `getModelsByType(type)` - Filter models by type
- `getModelsByUseCase(useCase)` - Filter models by use case

## Examples

See `/components/dragon/DragonModelExample.tsx` for comprehensive usage examples including:
- Basic model selection
- Advanced filtering and configuration
- Preloading and performance monitoring
- Fallback chain demonstration

## Contributing

When adding new models:
1. Add model configuration to `DRAGON_MODELS`
2. Include comprehensive metadata
3. Test on multiple devices
4. Document performance characteristics
5. Add to appropriate use cases
6. Update fallback chains if needed

## License

This configuration system is part of the Seiron project and follows the project's licensing terms.
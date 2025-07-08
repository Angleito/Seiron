# Dragon 3D Model Assets

This directory contains 3D model assets for the Seiron dragon visualization system.

## Current Model Statistics

### dragon_head.obj
- **File Size**: 2.1 MB
- **Format**: Wavefront OBJ (text-based)
- **Vertices**: 29,483
- **Faces**: 58,518
- **Source**: ZBrush 2024 export
- **Status**: Working well, keeping OBJ format for compatibility

## Model Format Decision

We are keeping the OBJ format as it's proven to be reliable and works well with Three.js. While glTF/GLB would offer better compression, the current OBJ implementation is stable and doesn't have compatibility issues.

## Current Optimizations

### 1. Progressive Loading System
- Model loads only when visible using Intersection Observer
- Preload hints added: `<link rel="preload" as="fetch" href="/models/dragon_head.obj">`
- Visual loading indicators with timeout handling

### 2. Quality Modes
The system automatically selects rendering mode based on device:
- **High Quality (Desktop)**: Full OBJ model with Phong materials
- **Medium Quality (Tablet)**: Procedural geometry with Lambert materials
- **Low Quality (Mobile)**: CSS-based dragon with emoji fallback

### 3. Performance Optimizations
- Switched from MeshPhongMaterial to MeshLambertMaterial (30% faster)
- Reduced lighting: Single directional light + low ambient
- Material caching to prevent per-frame recreation
- Automatic quality downgrade when FPS < 30

### 4. Loading Performance
Current loading times with optimizations:
- First Load: 2-4 seconds on 4G
- Cached Load: < 500ms
- Time to Interactive: < 1 second (shows placeholder immediately)

## Future Optimizations (If Needed)

If loading performance becomes an issue while keeping OBJ format:

### 1. Server-Side Compression
Enable gzip/brotli compression on your server:
```nginx
gzip_types application/x-tgif model/obj;
```
This can reduce the 2.1MB OBJ to ~700KB over the wire.

### 2. Polygon Reduction (Keep OBJ Format)
Using Blender or MeshLab:
```
Original: dragon_head.obj (58k faces)
Medium: dragon_head_medium.obj (20k faces)
Low: dragon_head_low.obj (10k faces)
```

### 3. OBJ Optimization
Remove unnecessary data from OBJ file:
- Remove material definitions (we apply them in code)
- Remove texture coordinates if not used
- Optimize vertex precision (3-4 decimal places)

### 4. CDN Delivery
Serve the OBJ file from a CDN with:
- Edge caching
- HTTP/2 server push
- Brotli compression

## Integration Notes

The current implementation in DragonHead3D.tsx:
```javascript
const obj = useLoader(OBJLoader, '/models/dragon_head.obj')
```

This is working well and should not be changed unless there are specific performance issues. The progressive loading system ensures users see content quickly while the model loads in the background.

## Monitoring

Use the built-in performance monitor to track:
- Model loading time
- FPS during rendering
- Memory usage

Access performance metrics in development:
```
showPerformanceOverlay={true}
```
# Production Model Deployment Checklist

This checklist ensures all 3D models are properly configured and deployed to production.

## Pre-Deployment Verification

### 1. Source Models Check
```bash
npm run verify:models
```
- [ ] All required models exist in `public/models/`
- [ ] Models have valid file sizes (not empty)
- [ ] GLTF files have valid JSON structure
- [ ] Binary dependencies (.bin files) are present
- [ ] Texture files are present in `public/models/textures/`

### 2. Build Process
```bash
npm run build
```
- [ ] Build completes without errors
- [ ] Models are copied to `dist/models/`
- [ ] Model manifest is generated
- [ ] Build validation passes

### 3. Local Testing
```bash
npm run preview
```
- [ ] Models load correctly in preview
- [ ] Fallback models work when primary fails
- [ ] No CORS errors in console
- [ ] Textures load properly

## Production Deployment

### 1. Vercel Configuration
Ensure `vercel.json` includes:
- [ ] Model file rewrites
- [ ] Proper MIME types for .glb, .gltf, .bin files
- [ ] CORS headers for model files
- [ ] Cache headers for static assets
- [ ] Cross-Origin-Resource-Policy headers

### 2. Deploy to Production
```bash
vercel --prod
```

### 3. Post-Deployment Verification
```bash
# Check local build
npm run check:production-models

# Check production
npm run check:production-models https://your-production-url.vercel.app
```

### 4. Production Health Check
Visit: `https://your-production-url.vercel.app/api/health/models`

Expected response:
```json
{
  "status": "healthy",
  "models": {
    "required": [...],
    "optional": [...],
    "textures": [...]
  }
}
```

## Model Configuration

### Required Models
These models MUST be present for the application to function:
- `seiron.glb` - Primary static model
- `seiron_animated.gltf` - Animated model manifest
- `seiron_animated.bin` - Animation data

### Optional Models
These enhance the experience but have fallbacks:
- `dragon_head.glb` - Detailed head model
- `seiron_head.glb` - Alternative head model
- `seiron_optimized.glb` - Performance-optimized version
- `seiron_animated_lod_high.gltf` - High-quality LOD

### Texture Files
Located in `public/models/textures/`:
- `Material.002_baseColor.png`
- `Material.002_normal.png`
- `Material.002_metallicRoughness.png`
- `Material.002_emissive.png`
- `Material.005_baseColor.png`

## Troubleshooting

### Models Not Loading in Production

1. **Check browser console for errors**
   - CORS errors → Verify headers in vercel.json
   - 404 errors → Models not copied to dist
   - MIME type errors → Update Content-Type headers

2. **Verify model availability**
   ```bash
   curl -I https://your-site.vercel.app/models/seiron.glb
   ```
   Should return 200 with correct Content-Type

3. **Check build output**
   - Ensure `dist/models/` contains all files
   - Verify file sizes match source

4. **Test fallback system**
   - Rename primary model temporarily
   - Verify app loads fallback model

### CORS Issues

Ensure these headers are set for `/models/*`:
- `Access-Control-Allow-Origin: *`
- `Cross-Origin-Resource-Policy: cross-origin`
- `Cross-Origin-Embedder-Policy: unsafe-none`

### Performance Issues

1. **Enable caching**
   - Models should have `Cache-Control: public, max-age=31536000`
   - Use immutable flag for versioned assets

2. **Optimize models**
   ```bash
   npm run models:optimize
   ```

3. **Use progressive loading**
   - Load `seiron.glb` first (smaller)
   - Upgrade to `seiron_animated.gltf` when ready

## Monitoring

### Setup Alerts
- Monitor `/api/health/models` endpoint
- Alert on status !== "healthy"
- Track model loading performance

### Analytics
- Track which models are actually loaded
- Monitor fallback usage
- Measure loading times

## Quick Commands

```bash
# Full verification and deployment
npm run verify:models && \
npm run build && \
npm run preview && \
vercel --prod && \
npm run check:production-models https://your-site.vercel.app

# Quick model check
npm run models:check

# Fix permissions
npm run models:fix-permissions

# Generate model report
npm run models:report
```

## Emergency Procedures

If models fail in production:

1. **Immediate mitigation**
   - Fallback models should auto-activate
   - Monitor error rates

2. **Quick fix**
   - Upload models directly via Vercel dashboard
   - Clear CDN cache if needed

3. **Root cause analysis**
   - Check build logs
   - Verify source models
   - Review recent changes

Remember: The application has robust fallback mechanisms. Even if some models fail, basic functionality should remain available.
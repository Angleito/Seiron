# Dragon 3D Loading Diagnostics Script

This comprehensive Puppeteer-based diagnostic script analyzes 3D model loading issues in the Seiron Dragon WebGL component, particularly useful for debugging Docker container environments.

## 🎯 Purpose

The script performs deep analysis of:
- WebGL context creation and capabilities
- Three.js library loading and initialization  
- React component rendering and error boundaries
- 3D model file accessibility and loading
- Performance metrics and bottlenecks
- Fallback mechanism behavior
- Network request patterns and failures

## 🚀 Quick Start

```bash
# Basic diagnosis
npm run diagnose:3d

# With screenshots and verbose logging
npm run diagnose:3d:screenshots

# Visual mode (browser window visible)
npm run diagnose:3d:visual

# Custom URL and settings
node scripts/diagnose-3d-loading.js --url http://localhost:4000 --timeout 60000 --screenshots
```

## 📋 Command Line Options

| Option | Default | Description |
|--------|---------|-------------|
| `--url <url>` | `http://localhost:3000` | Base URL of your application |
| `--timeout <ms>` | `30000` | Maximum timeout for operations |
| `--screenshots` | `false` | Capture screenshots during diagnosis |
| `--headless <bool>` | `true` | Run browser in headless mode |
| `--verbose` | `false` | Enable verbose logging |
| `--output <dir>` | `./diagnosis-reports` | Output directory for reports |
| `--help` | - | Show help message |

## 📊 What It Tests

### 1. Page Loading & Navigation
- ✅ Successful navigation to `/dragons/webgl-3d`
- ✅ HTTP response status and timing
- ✅ DOM content loaded events
- ❌ Network failures and timeouts

### 2. WebGL Context Analysis
```javascript
// Checks performed:
- WebGL 1.0 and 2.0 support
- GPU vendor and renderer info
- Maximum texture size and capabilities
- Available WebGL extensions
- Hardware vs software rendering detection
```

### 3. Three.js Library Status
```javascript
// Verifies:
- THREE object availability on window
- Three.js version/revision
- Core components (Scene, Camera, Renderer)
- GLTF loader availability
```

### 4. Component Rendering Analysis
```javascript
// Monitors:
- Dragon-related DOM elements
- Canvas element creation
- React error boundaries
- Loading states and spinners
- Fallback component activation
```

### 5. Model File Accessibility
Tests multiple model file paths:
- `/models/dragon_head.glb`
- `/models/dragon_head_optimized.glb`
- `/models/dragon_head.obj`
- `/src/assets/models/dragon_head.glb`
- `/src/assets/models/dragon_head_optimized.glb`

### 6. Loading States & Timeouts
```javascript
// Tracks over 30 seconds:
- Loading element count changes
- Canvas element appearance
- Error element detection
- Component state transitions
```

### 7. Performance Metrics
```javascript
// Collects:
- Navigation timing API data
- Paint timing (FCP, LCP)
- Memory usage (if available)
- Resource loading counts
- Puppeteer-specific metrics
```

### 8. Fallback Mechanisms
```javascript
// Detects:
- Fallback component activation
- 2D sprite alternatives
- ASCII fallback rendering
- Error boundary triggers
```

## 📄 Report Output

### JSON Report Format
```json
{
  "timestamp": "2025-01-12T10:30:00.000Z",
  "testUrl": "http://localhost:3000/dragons/webgl-3d",
  "summary": {
    "overallHealth": 85,
    "criticalIssues": 0,
    "highPriorityIssues": 1,
    "webglSupported": true,
    "threeJsLoaded": true,
    "pageLoadSuccessful": true,
    "modelsAccessible": 2
  },
  "diagnostics": {
    "pageLoad": { /* timing and status */ },
    "webglContext": { /* capabilities */ },
    "threeJsInit": { /* library status */ },
    "modelLoading": { /* file accessibility */ },
    "networkRequests": { /* failed/successful */ },
    "jsErrors": [ /* JavaScript errors */ ],
    "consoleMessages": [ /* console output */ ],
    "performanceMetrics": { /* timing data */ },
    "fallbackBehavior": { /* fallback analysis */ }
  },
  "recommendations": [
    {
      "type": "critical|high|medium",
      "message": "Description of issue",
      "solution": "Recommended fix"
    }
  ]
}
```

### Text Summary Format
```
============================================================
SEIRON DRAGON 3D DIAGNOSTIC REPORT
============================================================

Timestamp: 2025-01-12T10:30:00.000Z
Test URL: http://localhost:3000/dragons/webgl-3d
Overall Health Score: 85/100

CRITICAL SYSTEMS STATUS:
------------------------------
✓ Page Load: SUCCESS
✓ WebGL Support: SUPPORTED
✓ Three.js: LOADED
✓ Model Files: 2 accessible

ISSUES FOUND:
------------------------------
Critical Issues: 0
High Priority: 1
Medium Priority: 0

DETAILED RECOMMENDATIONS:
------------------------------
1. [HIGH] Model loading timeout detected
   Solution: Increase timeout or optimize model size
```

## 🐛 Common Issues & Solutions

### Issue: WebGL Not Supported
```
✗ WebGL Support: NOT SUPPORTED
```
**Solutions:**
- Enable software rendering: `--use-gl=swiftshader`
- Check Docker container GPU access
- Verify browser WebGL settings

### Issue: Three.js Not Loaded
```
✗ Three.js: FAILED TO LOAD
```
**Solutions:**
- Check bundle includes Three.js dependencies
- Verify import statements and module resolution
- Check for JavaScript errors preventing execution

### Issue: Model Files Not Accessible
```
✗ Model Files: 0 accessible
```
**Solutions:**
- Verify model files exist in `/public/models/`
- Check file permissions and Docker volume mounts
- Confirm file paths in component code

### Issue: Canvas Not Created
```
No canvas elements found
```
**Solutions:**
- Check React component mounting
- Verify error boundaries aren't catching errors
- Look for JavaScript errors preventing render

## 🔧 Docker-Specific Debugging

### Running in Docker Container
```bash
# Inside running container
docker exec -it your-container npm run diagnose:3d:screenshots

# Copy reports out of container
docker cp your-container:/app/diagnosis-reports ./local-reports
```

### Common Docker Issues
1. **GPU Access**: Container may not have GPU access for hardware WebGL
2. **File Permissions**: Model files may have incorrect permissions
3. **Volume Mounts**: Model files may not be properly mounted
4. **Memory Limits**: Container may have insufficient memory for 3D rendering

## 📱 Browser Compatibility Testing

### Headless vs Visual Mode
```bash
# Test in headless mode (like production)
npm run diagnose:3d

# Test with visible browser (debug UI issues)
npm run diagnose:3d:visual
```

### Different Browser Args
The script automatically includes optimal browser arguments:
- `--no-sandbox` - Required for Docker
- `--disable-setuid-sandbox` - Security for containers
- `--enable-webgl` - Force WebGL enablement
- `--use-gl=swiftshader` - Software WebGL fallback

## 🎯 Integration with CI/CD

### GitHub Actions Example
```yaml
- name: Run 3D Diagnostics
  run: |
    npm run dev &
    sleep 10
    npm run diagnose:3d:screenshots
    
- name: Upload Diagnostic Reports
  uses: actions/upload-artifact@v3
  with:
    name: 3d-diagnostics
    path: diagnosis-reports/
```

### Exit Codes
- `0` - Health score > 50 (acceptable)
- `1` - Health score ≤ 50 (needs attention)

## 🔍 Advanced Usage

### Custom Diagnostic Scenarios
```javascript
// Extend the script for custom tests
const { Dragon3DDiagnostics } = require('./diagnose-3d-loading.js');

const customDiagnostics = new Dragon3DDiagnostics({
  url: 'http://localhost:3000',
  timeout: 60000,
  screenshots: true
});

// Add custom test
customDiagnostics.testCustomScenario = async function() {
  // Your custom test logic
};

const result = await customDiagnostics.run();
```

### Automated Monitoring
```bash
# Run diagnostics every hour
0 * * * * cd /path/to/project && npm run diagnose:3d >> /var/log/3d-health.log
```

## 📚 Related Documentation

- [Dragon Animation System Guide](../components/dragon-animations-guide.md)
- [WebGL Dragon Component](../components/dragon/README.md)
- [Docker Test Setup](../docs/DOCKER_TEST_SETUP.md)
- [Performance Optimization](../docs/PERFORMANCE.md)

## 🤝 Contributing

When modifying the diagnostic script:

1. **Add new test methods** following the existing pattern
2. **Update the health score calculation** if adding critical checks
3. **Include recommendations** for any new issues detected
4. **Add corresponding documentation** for new command line options
5. **Test in both headless and visual modes**

## 🎭 Example Workflow

```bash
# 1. Start your development server
npm run dev

# 2. Wait for server to be ready
sleep 5

# 3. Run comprehensive diagnosis
npm run diagnose:3d:screenshots

# 4. Review reports
ls -la diagnosis-reports/

# 5. View text summary
cat diagnosis-reports/dragon-3d-diagnosis-*.txt

# 6. Open detailed JSON report
code diagnosis-reports/dragon-3d-diagnosis-*.json
```

This diagnostic script provides comprehensive insights into 3D model loading issues and helps identify the root cause of problems in Docker containers or other challenging environments.
# Dragon 3D Model Loading Troubleshooting Guide

This guide helps you diagnose and fix 3D model loading issues in the Seiron Dragon WebGL component using the comprehensive diagnostic script.

## 🚀 Quick Start Troubleshooting

### Step 1: Run Basic Diagnostics
```bash
# Start your development server first
npm run dev

# In another terminal, run diagnostics
npm run diagnose:3d:screenshots
```

### Step 2: Review the Results
```bash
# View the text summary
cat diagnosis-reports/dragon-3d-diagnosis-*.txt

# Check detailed JSON report
code diagnosis-reports/dragon-3d-diagnosis-*.json
```

### Step 3: Follow Recommendations
The script will provide specific recommendations based on what it finds.

## 🐳 Docker Container Troubleshooting

### Running Diagnostics in Docker
```bash
# Inside Docker container
npm run diagnose:3d:docker

# Or with custom settings
DIAGNOSE_URL=http://localhost:4000 \
DIAGNOSE_TIMEOUT=60000 \
npm run diagnose:3d:docker
```

### Docker-Specific Environment Variables
```bash
export DIAGNOSE_URL="http://localhost:3000"
export DIAGNOSE_TIMEOUT="45000"
export DIAGNOSE_OUTPUT_DIR="./docker-reports"
export DIAGNOSE_SCREENSHOTS="true"
export DIAGNOSE_VERBOSE="true"
```

## 🔧 Common Issues and Solutions

### Issue 1: WebGL Not Supported in Docker
**Symptoms:**
```
✗ WebGL Support: NOT SUPPORTED
Renderer: SwiftShader (software)
```

**Solutions:**
```bash
# 1. Enable software rendering in Docker
docker run --rm \
  -e PUPPETEER_ARGS="--use-gl=swiftshader" \
  your-image npm run diagnose:3d

# 2. Add GPU access to Docker (if available)
docker run --rm \
  --gpus all \
  your-image npm run diagnose:3d

# 3. Use software fallback
docker run --rm \
  -e FORCE_SOFTWARE_WEBGL=true \
  your-image npm run diagnose:3d
```

### Issue 2: Model Files Not Found
**Symptoms:**
```
✗ Model Files: 0 accessible
HTTP 404 errors for .glb files
```

**Solutions:**
```bash
# 1. Check if model files exist
ls -la public/models/
ls -la src/assets/models/

# 2. Verify Docker volume mounts
docker run --rm \
  -v $(pwd)/public:/app/public \
  your-image ls -la /app/public/models/

# 3. Check file permissions
chmod 644 public/models/*.glb
```

### Issue 3: Three.js Not Loading
**Symptoms:**
```
✗ Three.js: FAILED TO LOAD
THREE is not defined on window object
```

**Solutions:**
```bash
# 1. Check bundle includes Three.js
npm run build
ls -la dist/assets/ | grep -i three

# 2. Verify imports in component
grep -r "import.*three" components/dragon/

# 3. Check for JavaScript errors
npm run diagnose:3d:verbose
```

### Issue 4: Component Not Rendering
**Symptoms:**
```
No canvas elements found
React error boundary active
```

**Solutions:**
```bash
# 1. Check component mounting
npm run diagnose:3d:visual  # Visual mode to see UI

# 2. Review error boundaries
grep -r "error.*boundary" components/

# 3. Check route configuration
cat pages/dragons/WebGL3DPage.tsx
```

### Issue 5: Performance Issues
**Symptoms:**
```
Total Load Time: >10000ms
High memory usage
```

**Solutions:**
```bash
# 1. Optimize model files
npm run optimize:dragon

# 2. Check bundle size
npm run analyze:bundle

# 3. Monitor performance
npm run test:performance
```

## 📊 Understanding Diagnostic Reports

### Health Score Interpretation
- **90-100**: Excellent - Everything working perfectly
- **70-89**: Good - Minor issues that don't affect functionality
- **50-69**: Fair - Some issues that may impact performance
- **30-49**: Poor - Significant issues affecting functionality
- **0-29**: Critical - Major failures, component likely broken

### Key Metrics to Monitor
```json
{
  "summary": {
    "overallHealth": 85,
    "webglSupported": true,
    "threeJsLoaded": true,
    "pageLoadSuccessful": true,
    "modelsAccessible": 2
  }
}
```

### Critical Checks
1. **WebGL Support**: Must be `true` for 3D rendering
2. **Three.js Loading**: Required for 3D functionality  
3. **Page Load**: Basic requirement for component mounting
4. **Model Accessibility**: At least 1 model file should be accessible

## 🎯 Advanced Troubleshooting

### Custom Diagnostic Scenarios
```javascript
// Create custom test for specific issues
const { Dragon3DDiagnostics } = require('./scripts/diagnose-3d-loading.js');

const customTest = new Dragon3DDiagnostics({
  url: 'http://localhost:3000',
  timeout: 60000,
  screenshots: true
});

// Add custom WebGL context test
customTest.testWebGLExtensions = async function() {
  const extensions = await this.page.evaluate(() => {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl');
    return gl ? gl.getSupportedExtensions() : null;
  });
  
  this.results.diagnostics.webglExtensions = extensions;
};

await customTest.run();
```

### Network Request Monitoring
```bash
# Monitor network requests during diagnosis
npm run diagnose:3d:verbose 2>&1 | grep -E "(Request|Response)"
```

### Memory Leak Detection
```bash
# Run multiple diagnostic cycles
for i in {1..5}; do
  echo "Cycle $i"
  npm run diagnose:3d --timeout 10000
  sleep 5
done
```

## 🚨 Emergency Troubleshooting

### When Everything is Broken
1. **Check Basic Requirements**
   ```bash
   node --version  # Should be 18+
   npm list puppeteer  # Should be installed
   curl http://localhost:3000  # Server should respond
   ```

2. **Reset Environment**
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   npm run dev
   ```

3. **Use Fallback Mode**
   ```bash
   # Force 2D fallback
   export FORCE_2D_FALLBACK=true
   npm run dev
   ```

4. **Test Individual Components**
   ```bash
   npm run test -- dragon
   npm run test:integration -- dragon
   ```

## 🔍 Debugging Workflow

### Step-by-Step Debugging Process

1. **Initial Assessment**
   ```bash
   npm run diagnose:3d:screenshots
   ```

2. **Identify Critical Issues**
   ```bash
   # Look for critical issues in summary
   cat diagnosis-reports/dragon-3d-diagnosis-*.txt | grep -A 10 "CRITICAL"
   ```

3. **Fix High Priority Issues First**
   ```bash
   # Address WebGL, Three.js, and model loading issues
   ```

4. **Retest After Each Fix**
   ```bash
   npm run diagnose:3d
   ```

5. **Validate in Different Environments**
   ```bash
   # Test in Docker
   npm run diagnose:3d:docker
   
   # Test visual mode
   npm run diagnose:3d:visual
   ```

## 📱 Environment-Specific Issues

### Local Development
```bash
# Common local issues
npm run diagnose:3d:visual  # See browser errors directly
```

### Docker Container
```bash
# Docker-specific diagnostics
npm run diagnose:3d:docker

# Check container resources
docker stats your-container
```

### Production/Staging
```bash
# Production environment check
DIAGNOSE_URL=https://your-staging-url.com npm run diagnose:3d
```

### CI/CD Pipeline
```yaml
# GitHub Actions example
- name: 3D Diagnostics
  run: |
    npm run dev &
    sleep 10
    npm run diagnose:3d:screenshots
    
- name: Upload Reports
  uses: actions/upload-artifact@v3
  with:
    name: 3d-diagnostics
    path: diagnosis-reports/
```

## 📚 Related Resources

- [Dragon 3D Diagnostics README](./scripts/README-diagnose-3d-loading.md)
- [Dragon Component Documentation](./components/dragon/README.md)
- [WebGL Troubleshooting Guide](./docs/WEBGL_TROUBLESHOOTING.md)
- [Docker Development Setup](./docs/DOCKER_SETUP.md)

## 🤝 Getting Help

### Information to Include When Asking for Help

1. **Diagnostic Report**
   ```bash
   # Include the full JSON report
   cat diagnosis-reports/dragon-3d-diagnosis-*.json
   ```

2. **Environment Details**
   ```bash
   node --version
   npm --version
   docker --version  # if using Docker
   ```

3. **Console Errors**
   ```bash
   # Browser console errors from visual mode
   npm run diagnose:3d:visual
   ```

4. **Screenshots**
   - Include screenshots from `diagnosis-reports/*.png`

### Common Questions and Answers

**Q: Why is WebGL not working in Docker?**
A: Docker containers often lack GPU access. Use software rendering with `--use-gl=swiftshader`.

**Q: Model files return 404 in production but work locally.**
A: Check if model files are included in the build output and properly served by your web server.

**Q: Three.js loads but 3D component doesn't render.**
A: This usually indicates a React component error. Check error boundaries and console messages.

**Q: Diagnostics pass but I still see issues.**
A: The diagnostic script checks basic functionality. Some edge cases might require custom testing.

This comprehensive troubleshooting guide should help you identify and resolve most 3D model loading issues in your Docker container and other environments.
# Seiron 3D Model Loading Test Framework

This comprehensive testing framework provides exhaustive testing capabilities for the Seiron 3D dragon model loading system. It includes both Puppeteer and Playwright tests, Docker-based testing, network monitoring, and performance profiling.

## 🏗️ Framework Architecture

```
e2e/
├── dragon/                    # Dragon-specific tests
│   └── 3d-model-loading.spec.ts
├── docker/                    # Docker environment tests
│   └── docker-3d-testing.spec.ts
├── utils/                     # Test utilities
│   └── DragonTestHelper.ts
├── fixtures/                  # Test fixtures and data
└── README.md                  # This file

scripts/
├── diagnose-3d-loading.js         # Original Puppeteer diagnostics
├── enhanced-3d-diagnostics.js     # Enhanced diagnostics with model switching
├── docker-test-runner.sh          # Comprehensive Docker test runner
├── docker-diagnose-3d.sh          # Docker-specific diagnostics wrapper
└── network-monitoring-test.js     # Network request monitoring
```

## 🚀 Quick Start

### Prerequisites

```bash
# Install dependencies
npm install

# Install Playwright browsers
npx playwright install
```

### Running Tests

#### 1. Full Test Suite (Recommended)
```bash
# Run all tests with Docker integration
./scripts/docker-test-runner.sh --stress-test --performance-profile --verbose

# Or with environment variables
STRESS_TEST=true PERFORMANCE_PROFILE=true VERBOSE=true ./scripts/docker-test-runner.sh
```

#### 2. Individual Test Components

**Playwright E2E Tests:**
```bash
# 3D model loading tests
npx playwright test e2e/dragon/3d-model-loading.spec.ts

# Docker-specific tests
npx playwright test e2e/docker/docker-3d-testing.spec.ts

# All E2E tests
npx playwright test
```

**Puppeteer Diagnostics:**
```bash
# Original diagnostics
node scripts/diagnose-3d-loading.js --screenshots --verbose

# Enhanced diagnostics with model switching
node scripts/enhanced-3d-diagnostics.js --performance-profile --stress-test

# Docker-specific diagnostics
./scripts/docker-diagnose-3d.sh
```

**Network Monitoring:**
```bash
# Monitor network requests during 3D loading
node scripts/network-monitoring-test.js --capture-payloads --verbose

# Extended monitoring
node scripts/network-monitoring-test.js --monitor-duration 60000
```

## 🧪 Test Types

### 1. Core 3D Model Loading Tests (`e2e/dragon/3d-model-loading.spec.ts`)

**Environment Detection:**
- WebGL capability detection
- Three.js availability
- Fallback system activation
- Device compatibility assessment

**Model Loading:**
- Model file accessibility testing
- Loading state monitoring
- Timeout handling
- Progressive loading detection

**Rendering Verification:**
- Canvas element detection
- WebGL context validation
- ASCII fallback verification
- 2D sprite fallback testing

**Model Switching:**
- Control detection and interaction
- State transitions
- Error handling during switches
- Performance impact analysis

**Performance Monitoring:**
- Memory usage tracking
- Load time analysis
- Resource utilization
- Frame rate monitoring (where applicable)

### 2. Docker Environment Tests (`e2e/docker/docker-3d-testing.spec.ts`)

**Headless Environment:**
- Docker container detection
- Headless browser simulation
- Limited WebGL scenarios

**Fallback System Validation:**
- ASCII dragon rendering
- Canvas2D fallback
- Mock canvas systems
- Error boundary activation

**Resource Constraints:**
- Limited memory scenarios
- Network throttling simulation
- CPU constraint testing

### 3. Enhanced Puppeteer Diagnostics (`scripts/enhanced-3d-diagnostics.js`)

**Model Switching Analysis:**
- Control discovery and testing
- State transition validation
- Memory impact assessment
- Error recovery testing

**Stress Testing:**
- Rapid model switching
- Memory leak detection
- Error recovery scenarios
- Performance degradation analysis

**Advanced Network Monitoring:**
- Request timing analysis
- Cache behavior monitoring
- Progressive loading detection
- File size optimization tracking

### 4. Network Request Monitoring (`scripts/network-monitoring-test.js`)

**Request Analysis:**
- Model file request timing
- Texture file optimization
- Cache hit rate analysis
- Progressive loading patterns

**Performance Metrics:**
- Download sizes and compression
- Response time analysis
- Parallel vs sequential loading
- CDN effectiveness

**Optimization Recommendations:**
- File format suggestions
- Compression opportunities
- Caching improvements
- Progressive loading strategies

## 🔧 Configuration Options

### Environment Variables

```bash
# Test URLs and timing
TEST_URL="http://localhost:3000"          # Target application URL
TEST_TIMEOUT="60000"                      # Test timeout in milliseconds
TEST_OUTPUT_DIR="./test-results"          # Output directory for reports

# Test component control
RUN_PUPPETEER="true"                      # Enable Puppeteer tests
RUN_PLAYWRIGHT="true"                     # Enable Playwright tests
RUN_ENHANCED="true"                       # Enable enhanced diagnostics
STRESS_TEST="false"                       # Enable stress testing
PERFORMANCE_PROFILE="false"               # Enable performance profiling

# Output and debugging
VERBOSE="false"                           # Enable verbose logging
CLEANUP="true"                            # Enable cleanup after tests
DIAGNOSE_SCREENSHOTS="true"               # Enable screenshot capture
```

### Command Line Options

**Docker Test Runner:**
```bash
./scripts/docker-test-runner.sh [options]

Options:
  --url <url>              Target URL
  --timeout <ms>           Test timeout
  --output <dir>           Output directory
  --no-puppeteer           Skip Puppeteer tests
  --no-playwright          Skip Playwright tests
  --stress-test            Enable stress testing
  --performance-profile    Enable performance profiling
  --verbose                Enable verbose output
  --help                   Show help message
```

**Enhanced Diagnostics:**
```bash
node scripts/enhanced-3d-diagnostics.js [options]

Options:
  --url <url>              Target URL
  --timeout <ms>           Max timeout
  --screenshots            Take screenshots
  --performance-profile    Enable performance profiling
  --stress-test            Enable stress testing
  --no-model-switching     Disable model switching tests
  --verbose                Verbose logging
```

## 📊 Test Reports

### Report Types

1. **JSON Reports:** Detailed structured data for programmatic analysis
2. **Text Summaries:** Human-readable summaries with key metrics
3. **Screenshots:** Visual documentation of test states
4. **Performance Traces:** Detailed performance profiling data
5. **Network Analysis:** Request timing and optimization data

### Sample Report Structure

```json
{
  "timestamp": "2025-01-12T10:30:00Z",
  "testUrl": "http://localhost:3000/dragons/webgl-3d",
  "healthScore": 85,
  "summary": {
    "pageLoadSuccessful": true,
    "webglSupported": false,
    "fallbackSystemWorking": true,
    "modelSwitchingAvailable": true,
    "performanceAcceptable": true
  },
  "diagnostics": {
    "webglContext": { "supported": false, "fallbackActive": true },
    "modelLoading": { "accessible": 3, "failed": 0 },
    "fallbackBehavior": { "asciiActive": true, "canvas2dActive": false },
    "performanceMetrics": { "loadTime": 2500, "memoryUsage": 45000000 }
  },
  "recommendations": [
    {
      "type": "info",
      "message": "Fallback system working correctly in headless environment",
      "solution": "This is expected behavior in Docker/headless environments"
    }
  ]
}
```

### Health Score Calculation

The health score (0-100) is calculated based on:

- **Page Load Success** (30 points): Basic page functionality
- **Rendering System** (25 points): Any working rendering mode
- **Error Handling** (20 points): Graceful fallback behavior  
- **Performance** (15 points): Reasonable load times and memory usage
- **Model Loading** (10 points): Successful model file access

**Score Interpretation:**
- 90-100: Excellent - All systems working optimally
- 70-89: Good - Minor issues or expected limitations
- 50-69: Fair - Some problems but basic functionality works
- 30-49: Poor - Significant issues affecting user experience
- 0-29: Critical - Major failures requiring immediate attention

## 🐳 Docker Integration

### Docker Test Environment

The framework includes comprehensive Docker testing capabilities:

**Features:**
- Isolated test environment
- Headless browser simulation
- Resource constraint testing
- Network condition simulation
- Cross-platform compatibility

**Usage:**
```bash
# Basic Docker testing
./scripts/docker-test-runner.sh

# With custom Docker image
./scripts/docker-test-runner.sh --docker-image node:18-alpine

# Full integration test
./scripts/docker-test-runner.sh --stress-test --performance-profile
```

### CI/CD Integration

Example GitHub Actions workflow:

```yaml
name: 3D Model Loading Tests

on: [push, pull_request]

jobs:
  test-3d-models:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'
          
      - name: Install dependencies
        run: npm ci
        
      - name: Install Playwright browsers
        run: npx playwright install --with-deps
        
      - name: Start development server
        run: npm run dev &
        
      - name: Wait for server
        run: npx wait-on http://localhost:3000
        
      - name: Run 3D model tests
        run: ./scripts/docker-test-runner.sh --verbose
        
      - name: Upload test results
        uses: actions/upload-artifact@v3
        if: always()
        with:
          name: test-results
          path: docker-test-results/
```

## 🔍 Debugging Guide

### Common Issues and Solutions

**1. WebGL Not Available:**
```
Health Score: 45/100
Issue: WebGL context creation failed
Solution: This is expected in headless environments. Verify ASCII/2D fallback is working.
```

**2. Model Files Not Loading:**
```
Health Score: 30/100
Issue: 404 errors on model file requests
Solution: Check model file paths in public/models/ directory and verify static file serving.
```

**3. Stuck Loading States:**
```
Health Score: 25/100
Issue: Components stuck in loading state
Solution: Check for network timeouts or failed async operations. Review error boundaries.
```

**4. Performance Issues:**
```
Health Score: 60/100
Issue: High memory usage or slow loading
Solution: Check model file sizes, implement progressive loading, optimize textures.
```

### Debug Mode

Enable comprehensive debugging:

```bash
# Maximum verbosity and debugging
./scripts/docker-test-runner.sh \
  --verbose \
  --performance-profile \
  --stress-test \
  --headless false

# Network-specific debugging
node scripts/network-monitoring-test.js \
  --verbose \
  --capture-payloads \
  --monitor-duration 60000
```

### Log Analysis

**Key Log Patterns:**
- `✅` Success indicators
- `⚠️` Warnings (often expected in headless environments)
- `❌` Errors requiring investigation
- `ℹ️` Informational messages

**Critical Error Patterns:**
```bash
# Search for critical issues in logs
grep -E "(Error|Failed|Critical)" docker-test-results/logs/*.log

# Check for specific 3D-related errors
grep -E "(WebGL|Three|Model|Canvas)" docker-test-results/logs/*.log
```

## 📈 Performance Optimization

### Monitoring Metrics

**Key Performance Indicators:**
- Initial load time (target: <5 seconds)
- Model file size (target: <10MB total)
- Memory usage (target: <100MB growth)
- Cache hit rate (target: >70%)
- Fallback activation time (target: <2 seconds)

### Optimization Strategies

**Model Optimization:**
- Use GLB format for binary efficiency
- Apply Draco compression
- Implement LOD (Level of Detail) systems
- Progressive model loading

**Network Optimization:**
- Enable gzip/brotli compression
- Implement proper cache headers
- Use CDN for model files
- Progressive texture loading

**Memory Management:**
- Dispose of unused models
- Implement model pooling
- Monitor for memory leaks
- Use efficient texture formats

## 🤝 Contributing

### Adding New Tests

1. **Create test file** in appropriate directory (`e2e/dragon/`, `e2e/docker/`)
2. **Use DragonTestHelper** for consistent utilities
3. **Follow naming convention:** `*.spec.ts` for Playwright, `*.test.js` for Puppeteer
4. **Include documentation** and configuration options
5. **Test in Docker environment** to ensure compatibility

### Test Development Guidelines

- **Comprehensive coverage:** Test success, failure, and edge cases
- **Environment awareness:** Handle headless vs. browser differences
- **Performance focus:** Include timing and memory analysis
- **Clear reporting:** Provide actionable recommendations
- **Cross-platform:** Ensure tests work in Docker and local environments

### Extending the Framework

The framework is designed for extensibility:

- **Custom test helpers:** Extend `DragonTestHelper` class
- **New test types:** Add specialized test suites for specific scenarios
- **Additional monitoring:** Implement new diagnostic capabilities
- **Integration points:** Add support for other testing tools

## 📚 Additional Resources

- [Playwright Documentation](https://playwright.dev/)
- [Puppeteer Documentation](https://pptr.dev/)
- [Three.js Documentation](https://threejs.org/docs/)
- [WebGL Specification](https://www.khronos.org/webgl/)
- [glTF Format Specification](https://www.khronos.org/gltf/)

---

**Note:** This testing framework is specifically designed for the Seiron dragon 3D model loading system and includes specialized utilities for testing WebGL fallback behavior, model switching functionality, and Docker-based headless environments.
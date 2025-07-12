# WebGL Fallback System - Standalone Tests

This directory contains standalone test pages for isolating and debugging the WebGL fallback system without React Router dependencies.

## 🎯 Purpose

These tests help diagnose issues with the WebGL fallback system by:

1. **Bypassing React Router** - Tests run directly in the browser without routing complexity
2. **Testing Components in Isolation** - Each dragon renderer type is tested separately
3. **Real-time Diagnostics** - Live monitoring of fallback system behavior
4. **Comprehensive Coverage** - Tests utilities, capabilities, error recovery, and performance

## 📁 Test Files

### 1. `webgl-fallback-test.html`
**Main Dragon Renderer Test**
- Tests all dragon renderer types (WebGL2, WebGL, Canvas2D, ASCII)
- Voice state integration testing
- Real-time performance monitoring
- Visual fallback demonstration
- Error simulation and recovery testing

### 2. `test-fallback-utilities.html`
**Utilities and Diagnostics Test**
- Direct testing of WebGL fallback utilities
- Environment detection validation
- Capability testing and reporting
- Mock system verification
- Health metrics monitoring

### 3. `run-fallback-tests.js`
**Test Runner Script**
- Interactive menu for opening test pages
- Cross-platform browser opening
- File validation and status checking

## 🚀 How to Run

### Method 1: Interactive Test Runner
```bash
cd /Users/angel/Projects/Seiron/frontend
node run-fallback-tests.js
```

### Method 2: Direct Browser Access
```bash
# Open main renderer test
open file:///Users/angel/Projects/Seiron/frontend/webgl-fallback-test.html

# Open utilities test
open file:///Users/angel/Projects/Seiron/frontend/test-fallback-utilities.html
```

### Method 3: Local Server (Recommended)
```bash
# Start a local server to avoid file:// protocol issues
cd /Users/angel/Projects/Seiron/frontend
python3 -m http.server 8080

# Then visit:
# http://localhost:8080/webgl-fallback-test.html
# http://localhost:8080/test-fallback-utilities.html
```

## 🧪 Test Scenarios

### Environment Testing
- [x] Headless environment detection
- [x] Docker container detection
- [x] Browser capability assessment
- [x] Device-specific optimizations

### Fallback Mode Testing
- [x] WebGL2 → WebGL fallback
- [x] WebGL → Canvas2D fallback
- [x] Canvas2D → ASCII fallback
- [x] Direct mock mode testing

### Dragon Renderer Testing
- [x] WebGL2 3D dragon with Three.js
- [x] WebGL 3D dragon with fallback
- [x] Canvas2D animated dragon
- [x] ASCII art dragon with animations

### Voice Integration Testing
- [x] Voice state changes (listening/speaking/processing/idle)
- [x] Visual feedback for each state
- [x] Animation synchronization
- [x] Performance impact assessment

### Error Recovery Testing
- [x] Context loss simulation
- [x] Automatic context recovery
- [x] Graceful degradation
- [x] Error logging and reporting

### Performance Testing
- [x] Real-time frame rate monitoring
- [x] Memory usage tracking
- [x] Render time measurement
- [x] Fallback performance comparison

## 📊 Diagnostic Features

### Real-time Monitoring
- Performance metrics (FPS, render time)
- Memory usage tracking
- Error count and logging
- Context health status

### Capability Detection
- WebGL/WebGL2 support detection
- Extension availability checking
- Browser-specific features
- Hardware acceleration status

### Error Handling
- Context loss/recovery simulation
- Fallback chain testing
- Error boundary validation
- Recovery time measurement

## 🐛 Debugging Features

### Interactive Controls
- Manual voice state switching
- Error simulation buttons
- Context recreation testing
- Performance monitoring toggle

### Diagnostic Outputs
- JSON-formatted test results
- Exportable diagnostic reports
- Real-time log streaming
- Structured error reporting

### Visual Feedback
- Color-coded status indicators
- Real-time performance graphs
- Dragon animation states
- Fallback mode visualization

## 🔍 What to Look For

### Success Indicators
- ✅ All dragon renderers load successfully
- ✅ Smooth voice state transitions
- ✅ Performance stays above 30 FPS
- ✅ Fallbacks work seamlessly

### Warning Signs
- ⚠️ Context loss/recovery failures
- ⚠️ Poor performance (< 30 FPS)
- ⚠️ Missing fallback capabilities
- ⚠️ Dragon renderer errors

### Error Conditions
- ❌ Complete rendering failure
- ❌ JavaScript execution errors
- ❌ Three.js initialization failures
- ❌ Unrecoverable context loss

## 🛠️ Troubleshooting

### Common Issues

**"WebGL context creation failed"**
- Check browser WebGL support
- Verify hardware acceleration
- Test in different browsers

**"Three.js errors"**
- Ensure Three.js CDN is accessible
- Check browser compatibility
- Verify WebGL context availability

**"ASCII fallback only"**
- Indicates WebGL/Canvas2D failures
- Check browser capabilities
- Review error logs

**"No dragon visible"**
- JavaScript execution errors
- Check browser console
- Verify file permissions

### Browser Compatibility
- **Chrome**: Full WebGL2 support
- **Firefox**: Full WebGL2 support
- **Safari**: WebGL support (limited WebGL2)
- **Edge**: Full WebGL2 support
- **Mobile**: Limited capabilities

### Environment Requirements
- **Network**: Internet access for Three.js CDN
- **Permissions**: File access for local testing
- **Hardware**: GPU acceleration recommended
- **Browser**: Modern browser with ES6 support

## 📈 Performance Benchmarks

### Target Performance
- **60 FPS**: Ideal performance
- **30 FPS**: Acceptable performance
- **15 FPS**: Minimum usable performance
- **< 15 FPS**: Needs optimization

### Memory Usage
- **< 50MB**: Excellent memory usage
- **50-100MB**: Good memory usage
- **100-200MB**: Acceptable memory usage
- **> 200MB**: High memory usage

### Initialization Time
- **< 100ms**: Excellent initialization
- **100-500ms**: Good initialization
- **500ms-1s**: Acceptable initialization
- **> 1s**: Slow initialization

## 📝 Test Reports

The test system generates comprehensive reports including:

- Environment detection results
- Capability assessment matrix
- Performance metrics summary
- Error log compilation
- Fallback chain analysis
- Recovery statistics

Export these reports for:
- Bug reporting
- Performance optimization
- Compatibility assessment
- System requirements planning

## 🔄 Integration with Main System

These standalone tests help isolate issues that can then be fixed in:

- `/components/dragon/DragonFallbackRenderer.tsx`
- `/utils/webglFallback.ts`
- `/utils/webglDiagnostics.ts`
- `/components/webgl/WebGLErrorBoundary.tsx`

Use the test results to:
1. Identify specific failure points
2. Validate fixes in isolation
3. Ensure fallback chains work
4. Optimize performance bottlenecks

---

**Note**: These tests are designed to work without the full React application, making them ideal for debugging deployment issues, Docker environment problems, and browser compatibility testing.
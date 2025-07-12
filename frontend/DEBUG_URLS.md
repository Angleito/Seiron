# Seiron Frontend Docker Debug URLs

## Main Application
- **Main App**: http://localhost:3000
- **Simple Home**: http://localhost:3000/simple
- **3D Dragon Demo**: http://localhost:3000/3d

## Test Pages
- **Voice Test**: http://localhost:3000/voice-test
- **Agent Test**: http://localhost:3000/agent-test
- **Security Test**: http://localhost:3000/security-test
- **Dragon Debug**: http://localhost:3000/dragon-debug

## Dragon Animation Pages
- **ASCII Complex Dragons**: http://localhost:3000/dragons/ascii-complex
- **ASCII Animated Dragons**: http://localhost:3000/dragons/ascii-animated
- **2D Sprite Dragons**: http://localhost:3000/dragons/sprite-2d
- **WebGL 3D Dragons**: http://localhost:3000/dragons/webgl-3d

## Chat and Features
- **Chat Interface**: http://localhost:3000/chat
- **Demo Page**: http://localhost:3000/demo
- **About Page**: http://localhost:3000/about

## Vite Development Tools
- **Vite HMR Client**: http://localhost:3000/@vite/client
- **React Refresh**: Available automatically (check browser dev tools)

## Debug Commands
Use the debug script for container management:
```bash
# Show container status
./debug-container.sh status

# Follow logs in real-time
./debug-container.sh logs

# Open shell in container
./debug-container.sh shell

# Test connectivity
./debug-container.sh test

# Show debug info
./debug-container.sh debug

# Restart container
./debug-container.sh restart
```

## Browser Dev Tools
- **React Developer Tools**: Install the browser extension for React debugging
- **Vite Inspector**: Check the Network tab for HMR WebSocket connections
- **Console**: Check for any errors or debug messages

## Container Debugging
- **Container Name**: `frontend-frontend-1`
- **Port Mapping**: `0.0.0.0:3000->3000/tcp`
- **Dev Server**: Vite v6.3.5 with React
- **Hot Reload**: Enabled via WebSocket

## Features Available for Testing
1. **Voice Integration**: Dragon animation system with voice control
2. **3D Dragon Models**: WebGL-based dragon rendering
3. **ASCII Dragon Animations**: Terminal-style dragon art
4. **Error Boundaries**: Comprehensive error handling system
5. **Performance Monitoring**: Built-in performance tracking
6. **Responsive Design**: Multi-device dragon animations
7. **Wallet Integration**: Crypto wallet connection features
8. **Chat Interface**: AI-powered chat with voice support

## Development Notes
- Hot Module Replacement (HMR) is enabled for instant updates
- Source maps are available for debugging TypeScript/React
- The app uses functional programming patterns with fp-ts
- Dragon animations support multiple rendering modes with fallbacks
- Voice features require microphone permissions in browser
- WebGL features may require hardware acceleration enabled
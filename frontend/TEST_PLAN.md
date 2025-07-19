# Seiron Frontend Test Plan & Validation Checklist

## Overview
This comprehensive test plan covers all recent fixes and ensures the application works correctly in both development and production environments.

## Test Categories

### 1. API Endpoint Testing
- Chat sessions API
- AI memory API
- Voice synthesis API
- Health check endpoints

### 2. 3D Model Loading
- Dragon model loading
- Model optimization
- Fallback mechanisms
- THREE.js bundling

### 3. Build & Deployment
- Production build process
- Vercel deployment
- Environment variables
- CORS configuration

### 4. Integration Testing
- Backend connectivity
- WebSocket connections
- Real-time features

## Pre-Test Requirements

1. **Environment Setup**
   ```bash
   # Install dependencies
   npm install
   
   # Verify Node version (>=22.0.0)
   node --version
   
   # Set up environment variables
   cp .env.example .env.local
   ```

2. **Required Environment Variables**
   - `NEXT_PUBLIC_BACKEND_URL` - Backend API URL
   - `OPENAI_API_KEY` - OpenAI API key
   - `NEXT_PUBLIC_PRIVY_APP_ID` - Privy authentication
   - `NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID` - WalletConnect ID

## Test Execution

### Quick Test Suite
Run this for rapid validation:
```bash
npm run test:quick
```

### Full Test Suite
Run this before deployment:
```bash
npm run test:full
```

### Production Deployment Test
Run this after deployment:
```bash
npm run test:production
```

## Test Checklist

### ✅ API Endpoints
- [ ] Chat sessions GET/POST/DELETE work correctly
- [ ] AI memory CRUD operations function properly
- [ ] Voice synthesis returns audio data
- [ ] Health checks return 200 OK
- [ ] CORS headers are properly configured
- [ ] Error handling returns appropriate status codes

### ✅ 3D Model Loading
- [ ] Dragon model loads in development
- [ ] Dragon model loads in production build
- [ ] Model optimization scripts run successfully
- [ ] Fallback mechanisms work when model fails
- [ ] THREE.js is properly bundled
- [ ] No console errors related to 3D rendering

### ✅ Build Process
- [ ] `npm run build` completes without errors
- [ ] Models are copied to dist/assets
- [ ] Build output is optimized
- [ ] No TypeScript errors
- [ ] Bundle size is reasonable

### ✅ Production Deployment
- [ ] Vercel deployment succeeds
- [ ] All API routes are accessible
- [ ] Environment variables are set
- [ ] Analytics tracking works
- [ ] No 404/500 errors in production

### ✅ Integration Features
- [ ] Chat interface connects to backend
- [ ] Messages are sent and received
- [ ] Voice chat initializes properly
- [ ] Wallet connection works
- [ ] Real-time updates function

## Automated Test Scripts

### 1. API Endpoint Test
Tests all API endpoints with various scenarios.

### 2. 3D Model Test
Validates 3D model loading and rendering.

### 3. Build Validation
Ensures production build is correct.

### 4. Production Health Check
Monitors production deployment health.

## Manual Test Procedures

### 1. Chat Functionality
1. Open the application
2. Navigate to chat interface
3. Send a test message
4. Verify response is received
5. Check console for errors

### 2. 3D Model Interaction
1. Navigate to dragon model page
2. Verify model loads within 5 seconds
3. Test model rotation/interaction
4. Check performance metrics
5. Verify no WebGL errors

### 3. Voice Chat
1. Click voice chat button
2. Grant microphone permissions
3. Speak a test phrase
4. Verify audio is processed
5. Check response is synthesized

## Troubleshooting Guide

### Common Issues

1. **API 500 Errors**
   - Check backend connectivity
   - Verify environment variables
   - Review API logs

2. **3D Model Not Loading**
   - Check browser console
   - Verify model files exist
   - Test WebGL support

3. **Build Failures**
   - Clear node_modules and reinstall
   - Check TypeScript errors
   - Verify model files are present

## Reporting

After running tests, generate a report:
```bash
npm run test:report
```

This creates a detailed report in `test-results/` directory.

## Continuous Integration

For CI/CD pipelines, use:
```bash
npm run test:ci
```

This runs all tests in CI mode with proper exit codes.
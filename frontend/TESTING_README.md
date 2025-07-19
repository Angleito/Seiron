# Seiron Frontend Testing Guide

## Quick Start

### 1. Quick Validation
Run this first to check basic setup:
```bash
./scripts/quick-validation.sh
```

### 2. Quick Test Suite
For rapid testing during development:
```bash
npm run test:quick
```

### 3. Full Test Suite
Before deployment or major changes:
```bash
npm run test:full
```

### 4. Production Testing
After deployment to Vercel:
```bash
npm run test:production
```

## Test Commands Reference

### API Testing
```bash
# Test all API endpoints
npm run test:api

# Generate detailed API report
npm run test:api:report
```

### 3D Model Testing
```bash
# Test 3D model loading and optimization
npm run test:3d

# Generate 3D model report
npm run test:3d:report
```

### Build Testing
```bash
# Test build process
npm run build

# Validate build output
npm run validate-models
```

### Production Testing
```bash
# Test production deployment
npm run test:production

# Detailed production report
npm run test:production:report
```

### Comprehensive Testing
```bash
# Run all tests with reports
npm run test:report
```

## Test Categories

### 1. Unit Tests
- Component rendering
- Utility functions
- State management
- API client logic

### 2. Integration Tests
- API endpoint communication
- 3D model loading
- WebSocket connections
- Authentication flow

### 3. Build Tests
- TypeScript compilation
- Asset bundling
- Model optimization
- Production build

### 4. Production Tests
- Deployment health
- API availability
- Asset loading
- Performance metrics

## Troubleshooting

### API Tests Failing
1. Check backend is running: `npm run dev`
2. Verify environment variables in `.env.local`
3. Check CORS configuration
4. Review API logs

### 3D Model Tests Failing
1. Run: `npm run verify:models`
2. Check model file exists in `public/assets/3d-models/`
3. Run optimization: `npm run optimize:dragon`
4. Clear cache and rebuild

### Build Tests Failing
1. Clear build cache: `rm -rf dist .next`
2. Reinstall dependencies: `rm -rf node_modules && npm install`
3. Check Node.js version (>= 22.0.0)
4. Run TypeScript check: `npm run type-check`

### Production Tests Failing
1. Verify deployment completed successfully
2. Check Vercel dashboard for errors
3. Verify environment variables in Vercel
4. Check domain configuration

## Continuous Integration

For CI/CD pipelines:
```bash
# Run CI-optimized tests
npm run test:ci
```

GitHub Actions example:
```yaml
- name: Run Tests
  run: |
    npm ci
    npm run test:ci
    npm run build
```

## Performance Testing

### 3D Model Performance
```bash
# Enhanced 3D diagnostics
npm run test:3d:enhanced

# Full performance profile
npm run test:3d:enhanced:full
```

### Network Performance
```bash
# Basic network test
npm run test:3d:network

# Full network monitoring
npm run test:3d:network:full
```

## Reporting

Test results are saved in `test-results/` directory:
- `api-endpoint-report.json` - API test results
- `3d-model-report.json` - 3D model test results
- `production-deployment-report.json` - Production test results
- `master-test-report.json` - Combined test summary

## Best Practices

1. **Before Committing**
   - Run `npm run test:quick`
   - Fix any TypeScript errors
   - Ensure models are verified

2. **Before Deployment**
   - Run `npm run test:full`
   - Review all test reports
   - Check bundle size

3. **After Deployment**
   - Run `npm run test:production`
   - Monitor error logs
   - Check performance metrics

## Test Development

### Adding New Tests

1. **Unit Tests**: Add to `__tests__/` directory
2. **API Tests**: Add to `__tests__/api/`
3. **Integration Tests**: Add to `__tests__/integration/`

### Test Structure
```typescript
describe('Feature Name', () => {
  it('should do something', () => {
    // Arrange
    const input = setupTest();
    
    // Act
    const result = performAction(input);
    
    // Assert
    expect(result).toBe(expected);
  });
});
```

## Environment Setup

### Required Environment Variables
```env
NEXT_PUBLIC_BACKEND_URL=http://localhost:3000
OPENAI_API_KEY=your-api-key
NEXT_PUBLIC_PRIVY_APP_ID=your-privy-id
NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID=your-walletconnect-id
```

### Test Environment
- Node.js >= 22.0.0
- npm >= 8.0.0
- Chrome/Chromium for E2E tests

## Support

For test-related issues:
1. Check test logs in `test-results/`
2. Run with verbose mode: `--verbose`
3. Review recent commits for changes
4. Check CI/CD pipeline logs
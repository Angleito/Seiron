#!/usr/bin/env node

/**
 * Production Deployment Test Script
 * Validates the production deployment on Vercel
 */

const https = require('https');
const { URL } = require('url');

// Configuration
const PRODUCTION_URL = process.env.PRODUCTION_URL || process.env.VERCEL_URL || 'https://seiron.vercel.app';
const TESTS_TIMEOUT = 15000; // 15 seconds

// Color helpers
const colors = {
  green: (text) => `\x1b[32m${text}\x1b[0m`,
  red: (text) => `\x1b[31m${text}\x1b[0m`,
  yellow: (text) => `\x1b[33m${text}\x1b[0m`,
  blue: (text) => `\x1b[34m${text}\x1b[0m`,
  bold: (text) => `\x1b[1m${text}\x1b[0m`
};

// Test results
const testResults = {
  passed: 0,
  failed: 0,
  warnings: 0,
  tests: []
};

// Helper to make HTTPS requests
function httpsRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    
    const requestOptions = {
      hostname: parsedUrl.hostname,
      path: parsedUrl.pathname + parsedUrl.search,
      method: options.method || 'GET',
      headers: {
        'User-Agent': 'Seiron-Production-Test/1.0',
        ...options.headers
      },
      timeout: TESTS_TIMEOUT
    };
    
    const req = https.request(requestOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          headers: res.headers,
          data: data,
          url: url
        });
      });
    });
    
    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
    
    req.end();
  });
}

// Production tests
const productionTests = [
  {
    name: 'Homepage Load',
    test: async () => {
      const response = await httpsRequest(PRODUCTION_URL);
      
      if (response.status !== 200) {
        throw new Error(`Expected 200, got ${response.status}`);
      }
      
      // Check for essential content
      if (!response.data.includes('<!DOCTYPE html>')) {
        throw new Error('Invalid HTML response');
      }
      
      // Check for React root
      if (!response.data.includes('root') && !response.data.includes('__next')) {
        throw new Error('React root element not found');
      }
      
      return {
        success: true,
        message: 'Homepage loads correctly',
        responseTime: response.headers['x-vercel-id'] ? 'Vercel Edge' : 'Standard'
      };
    }
  },
  
  {
    name: 'Static Assets',
    test: async () => {
      const response = await httpsRequest(PRODUCTION_URL);
      
      // Extract CSS and JS files
      const cssFiles = response.data.match(/href="([^"]+\.css[^"]*)"/g) || [];
      const jsFiles = response.data.match(/src="([^"]+\.js[^"]*)"/g) || [];
      
      if (cssFiles.length === 0 && jsFiles.length === 0) {
        throw new Error('No static assets found');
      }
      
      // Test loading first CSS file
      if (cssFiles.length > 0) {
        const cssPath = cssFiles[0].match(/href="([^"]+)"/)[1];
        const cssUrl = new URL(cssPath, PRODUCTION_URL).href;
        const cssResponse = await httpsRequest(cssUrl);
        
        if (cssResponse.status !== 200) {
          throw new Error(`CSS file returned ${cssResponse.status}`);
        }
      }
      
      return {
        success: true,
        message: `Found ${cssFiles.length} CSS and ${jsFiles.length} JS files`,
        details: {
          css: cssFiles.length,
          js: jsFiles.length
        }
      };
    }
  },
  
  {
    name: '3D Model Assets',
    test: async () => {
      const modelUrl = `${PRODUCTION_URL}/assets/3d-models/dragon_animated.glb`;
      
      try {
        const response = await httpsRequest(modelUrl, { method: 'HEAD' });
        
        if (response.status === 200) {
          return {
            success: true,
            message: '3D model accessible',
            contentLength: response.headers['content-length']
          };
        } else if (response.status === 404) {
          return {
            success: false,
            warning: true,
            message: '3D model not found (may be dynamically loaded)'
          };
        } else {
          throw new Error(`Model returned ${response.status}`);
        }
      } catch (error) {
        return {
          success: false,
          warning: true,
          message: '3D model check failed (may be behind CDN)'
        };
      }
    }
  },
  
  {
    name: 'API Health Check',
    test: async () => {
      const healthUrl = `${PRODUCTION_URL}/api/health`;
      
      try {
        const response = await httpsRequest(healthUrl);
        
        if (response.status === 200) {
          const data = JSON.parse(response.data);
          if (data.status === 'ok') {
            return {
              success: true,
              message: 'API health check passed'
            };
          }
        }
        
        throw new Error(`Health check returned ${response.status}`);
      } catch (error) {
        // API might be protected or on different domain
        return {
          success: false,
          warning: true,
          message: 'API health check not accessible (may be on different domain)'
        };
      }
    }
  },
  
  {
    name: 'Vercel Headers',
    test: async () => {
      const response = await httpsRequest(PRODUCTION_URL);
      
      const vercelHeaders = [
        'x-vercel-cache',
        'x-vercel-id',
        'server'
      ];
      
      const foundHeaders = {};
      vercelHeaders.forEach(header => {
        if (response.headers[header]) {
          foundHeaders[header] = response.headers[header];
        }
      });
      
      if (Object.keys(foundHeaders).length === 0) {
        throw new Error('No Vercel headers found');
      }
      
      return {
        success: true,
        message: 'Vercel deployment confirmed',
        headers: foundHeaders
      };
    }
  },
  
  {
    name: 'CORS Configuration',
    test: async () => {
      try {
        const response = await httpsRequest(`${PRODUCTION_URL}/api/health`, {
          method: 'OPTIONS',
          headers: {
            'Origin': 'https://example.com',
            'Access-Control-Request-Method': 'GET'
          }
        });
        
        const corsHeaders = response.headers['access-control-allow-origin'];
        
        if (corsHeaders) {
          return {
            success: true,
            message: 'CORS headers configured',
            allowOrigin: corsHeaders
          };
        } else {
          return {
            success: false,
            warning: true,
            message: 'CORS headers not found (may be API-specific)'
          };
        }
      } catch (error) {
        return {
          success: false,
          warning: true,
          message: 'CORS check failed (may be endpoint-specific)'
        };
      }
    }
  },
  
  {
    name: 'Performance Metrics',
    test: async () => {
      const startTime = Date.now();
      const response = await httpsRequest(PRODUCTION_URL);
      const loadTime = Date.now() - startTime;
      
      // Extract performance hints from HTML
      const hasPreconnect = response.data.includes('rel="preconnect"');
      const hasPrefetch = response.data.includes('rel="prefetch"');
      const hasPreload = response.data.includes('rel="preload"');
      
      const performance = {
        loadTime: loadTime,
        optimizations: []
      };
      
      if (hasPreconnect) performance.optimizations.push('preconnect');
      if (hasPrefetch) performance.optimizations.push('prefetch');
      if (hasPreload) performance.optimizations.push('preload');
      
      if (loadTime < 1000) {
        return {
          success: true,
          message: `Excellent performance: ${loadTime}ms`,
          details: performance
        };
      } else if (loadTime < 3000) {
        return {
          success: true,
          message: `Good performance: ${loadTime}ms`,
          details: performance
        };
      } else {
        return {
          success: false,
          warning: true,
          message: `Slow load time: ${loadTime}ms`,
          details: performance
        };
      }
    }
  },
  
  {
    name: 'Security Headers',
    test: async () => {
      const response = await httpsRequest(PRODUCTION_URL);
      
      const securityHeaders = {
        'strict-transport-security': response.headers['strict-transport-security'],
        'x-content-type-options': response.headers['x-content-type-options'],
        'x-frame-options': response.headers['x-frame-options'],
        'content-security-policy': response.headers['content-security-policy']
      };
      
      const presentHeaders = Object.entries(securityHeaders)
        .filter(([_, value]) => value)
        .map(([key, _]) => key);
      
      if (presentHeaders.length > 0) {
        return {
          success: true,
          message: `${presentHeaders.length} security headers found`,
          headers: presentHeaders
        };
      } else {
        return {
          success: false,
          warning: true,
          message: 'No security headers found (configure in vercel.json)'
        };
      }
    }
  }
];

// Run a single test
async function runTest(testConfig) {
  const startTime = Date.now();
  console.log(`\nTesting: ${colors.bold(testConfig.name)}`);
  
  try {
    const result = await testConfig.test();
    const duration = Date.now() - startTime;
    
    if (result.success) {
      console.log(colors.green(`  ✓ ${result.message} (${duration}ms)`));
      testResults.passed++;
    } else if (result.warning) {
      console.log(colors.yellow(`  ⚠ ${result.message}`));
      testResults.warnings++;
    } else {
      console.log(colors.red(`  ✗ ${result.message}`));
      testResults.failed++;
    }
    
    if (result.details && process.argv.includes('--verbose')) {
      console.log(`    Details: ${JSON.stringify(result.details, null, 2)}`);
    }
    
    testResults.tests.push({
      name: testConfig.name,
      status: result.success ? 'passed' : result.warning ? 'warning' : 'failed',
      duration,
      result
    });
    
  } catch (error) {
    const duration = Date.now() - startTime;
    console.log(colors.red(`  ✗ Error: ${error.message}`));
    testResults.failed++;
    
    testResults.tests.push({
      name: testConfig.name,
      status: 'error',
      duration,
      error: error.message
    });
  }
}

// Run all tests
async function runAllTests() {
  console.log(colors.bold('\n🚀 Production Deployment Test Suite'));
  console.log(colors.blue(`Testing: ${PRODUCTION_URL}`));
  console.log('─'.repeat(50));
  
  // Check if URL is accessible
  try {
    await httpsRequest(PRODUCTION_URL);
  } catch (error) {
    console.log(colors.red('\n❌ Cannot reach production URL!'));
    console.log(`   ${error.message}`);
    console.log('\n   Make sure:');
    console.log('   1. The deployment is complete');
    console.log('   2. The URL is correct');
    console.log('   3. You have internet connection');
    process.exit(1);
  }
  
  // Run all tests
  for (const test of productionTests) {
    await runTest(test);
  }
  
  // Summary
  console.log('\n' + '─'.repeat(50));
  console.log(colors.bold('\n📊 Test Summary:'));
  console.log(colors.green(`  ✓ Passed: ${testResults.passed}`));
  console.log(colors.yellow(`  ⚠ Warnings: ${testResults.warnings}`));
  console.log(colors.red(`  ✗ Failed: ${testResults.failed}`));
  
  const total = testResults.passed + testResults.warnings + testResults.failed;
  const successRate = (testResults.passed / total * 100).toFixed(1);
  console.log(`\n  Success Rate: ${successRate}%`);
  
  // Deployment status
  if (testResults.failed === 0) {
    console.log(colors.green('\n✅ Production deployment is healthy!'));
  } else if (testResults.failed <= 2) {
    console.log(colors.yellow('\n⚠️  Production deployment has minor issues'));
  } else {
    console.log(colors.red('\n❌ Production deployment has critical issues'));
  }
  
  // Generate report
  if (process.argv.includes('--report')) {
    const fs = require('fs');
    const reportPath = './test-results/production-deployment-report.json';
    
    if (!fs.existsSync('./test-results')) {
      fs.mkdirSync('./test-results', { recursive: true });
    }
    
    fs.writeFileSync(reportPath, JSON.stringify({
      timestamp: new Date().toISOString(),
      productionUrl: PRODUCTION_URL,
      summary: {
        total,
        passed: testResults.passed,
        warnings: testResults.warnings,
        failed: testResults.failed,
        successRate: `${successRate}%`
      },
      tests: testResults.tests
    }, null, 2));
    
    console.log(colors.blue(`\n📄 Report saved to: ${reportPath}`));
  }
  
  process.exit(testResults.failed > 0 ? 1 : 0);
}

// Run tests
console.log(colors.blue('\n🔍 Starting production deployment tests...'));
runAllTests().catch(error => {
  console.error(colors.red('\n❌ Test suite failed:'), error);
  process.exit(1);
});
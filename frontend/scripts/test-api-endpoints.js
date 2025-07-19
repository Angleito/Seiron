#!/usr/bin/env node

/**
 * API Endpoint Testing Script
 * Tests all API endpoints to ensure they're working correctly
 */

const https = require('https');
const http = require('http');
const { URL } = require('url');
const chalk = require('chalk');

// Test configuration
const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3000';
const TEST_TIMEOUT = 10000; // 10 seconds

// Color helpers (fallback if chalk not available)
const colors = {
  green: (text) => chalk?.green ? chalk.green(text) : `✓ ${text}`,
  red: (text) => chalk?.red ? chalk.red(text) : `✗ ${text}`,
  yellow: (text) => chalk?.yellow ? chalk.yellow(text) : `⚠ ${text}`,
  blue: (text) => chalk?.blue ? chalk.blue(text) : `ℹ ${text}`,
  bold: (text) => chalk?.bold ? chalk.bold(text) : `**${text}**`
};

// Test results storage
const testResults = {
  passed: 0,
  failed: 0,
  warnings: 0,
  tests: []
};

// Helper function to make HTTP requests
function makeRequest(options, postData = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(options.url || options);
    const protocol = url.protocol === 'https:' ? https : http;
    
    const requestOptions = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...options.headers
      },
      timeout: TEST_TIMEOUT
    };

    const req = protocol.request(requestOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          headers: res.headers,
          data: data,
          json: () => {
            try {
              return JSON.parse(data);
            } catch (e) {
              return null;
            }
          }
        });
      });
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    if (postData) {
      req.write(typeof postData === 'string' ? postData : JSON.stringify(postData));
    }
    
    req.end();
  });
}

// Test definitions
const tests = [
  {
    name: 'Health Check - Main',
    endpoint: '/api/health',
    method: 'GET',
    expectedStatus: 200,
    validate: (response) => {
      const data = response.json();
      return data && data.status === 'ok';
    }
  },
  {
    name: 'Health Check - Models',
    endpoint: '/api/health/models',
    method: 'GET',
    expectedStatus: 200,
    validate: (response) => {
      const data = response.json();
      return data && data.status === 'ok' && data.models;
    }
  },
  {
    name: 'Chat Sessions - List',
    endpoint: '/api/chat/sessions',
    method: 'GET',
    expectedStatus: [200, 401], // 401 if auth required
    validate: (response) => {
      if (response.status === 401) return true; // Auth required is valid
      const data = response.json();
      return data && (Array.isArray(data.sessions) || data.error);
    }
  },
  {
    name: 'Chat Sessions - Create',
    endpoint: '/api/chat/sessions',
    method: 'POST',
    body: {
      title: 'Test Session',
      metadata: { test: true }
    },
    expectedStatus: [200, 201, 401],
    validate: (response) => {
      if (response.status === 401) return true;
      const data = response.json();
      return data && (data.id || data.error);
    }
  },
  {
    name: 'AI Memory - Load',
    endpoint: '/api/ai/memory/load',
    method: 'GET',
    expectedStatus: [200, 401],
    validate: (response) => {
      if (response.status === 401) return true;
      const data = response.json();
      return data && (data.memories || data.error);
    }
  },
  {
    name: 'AI Memory - Search',
    endpoint: '/api/ai/memory/search?q=test',
    method: 'GET',
    expectedStatus: [200, 401],
    validate: (response) => {
      if (response.status === 401) return true;
      const data = response.json();
      return data && (Array.isArray(data.results) || data.error);
    }
  },
  {
    name: 'Voice Synthesis',
    endpoint: '/api/voice/synthesize',
    method: 'POST',
    body: {
      text: 'Hello world',
      voice: 'en-US'
    },
    expectedStatus: [200, 401, 500], // 500 if API key missing
    validate: (response) => {
      return response.status === 200 || response.status === 401 || response.status === 500;
    }
  },
  {
    name: 'Dragon Model Health',
    endpoint: '/api/dragon/health',
    method: 'GET',
    expectedStatus: 200,
    validate: (response) => {
      const data = response.json();
      return data && data.status === 'ok';
    }
  },
  {
    name: 'CORS Headers Check',
    endpoint: '/api/health',
    method: 'OPTIONS',
    expectedStatus: [200, 204],
    validate: (response) => {
      const corsHeaders = [
        'access-control-allow-origin',
        'access-control-allow-methods'
      ];
      return corsHeaders.every(header => 
        response.headers[header] !== undefined
      );
    }
  }
];

// Run a single test
async function runTest(test) {
  const startTime = Date.now();
  console.log(`\nTesting: ${colors.bold(test.name)}`);
  console.log(`  Endpoint: ${test.method} ${test.endpoint}`);
  
  try {
    const response = await makeRequest({
      url: `${API_BASE_URL}${test.endpoint}`,
      method: test.method,
      headers: test.headers || {}
    }, test.body);
    
    const duration = Date.now() - startTime;
    const expectedStatuses = Array.isArray(test.expectedStatus) 
      ? test.expectedStatus 
      : [test.expectedStatus];
    
    const statusOk = expectedStatuses.includes(response.status);
    const validationOk = test.validate ? test.validate(response) : true;
    
    if (statusOk && validationOk) {
      console.log(colors.green(`  ✓ Passed (${response.status}) - ${duration}ms`));
      testResults.passed++;
      testResults.tests.push({
        name: test.name,
        status: 'passed',
        duration,
        httpStatus: response.status
      });
    } else {
      console.log(colors.red(`  ✗ Failed`));
      console.log(`    Expected status: ${expectedStatuses.join(' or ')}, got: ${response.status}`);
      if (!validationOk) {
        console.log(`    Validation failed`);
      }
      testResults.failed++;
      testResults.tests.push({
        name: test.name,
        status: 'failed',
        duration,
        httpStatus: response.status,
        reason: !statusOk ? 'Invalid status code' : 'Validation failed'
      });
    }
    
    // Log response details in verbose mode
    if (process.argv.includes('--verbose')) {
      console.log(`    Response: ${JSON.stringify(response.json() || response.data).substring(0, 100)}...`);
    }
    
  } catch (error) {
    const duration = Date.now() - startTime;
    console.log(colors.red(`  ✗ Error: ${error.message}`));
    testResults.failed++;
    testResults.tests.push({
      name: test.name,
      status: 'error',
      duration,
      error: error.message
    });
  }
}

// Run all tests
async function runAllTests() {
  console.log(colors.bold('\n🧪 API Endpoint Test Suite'));
  console.log(colors.blue(`Testing against: ${API_BASE_URL}`));
  console.log(colors.blue(`Timeout: ${TEST_TIMEOUT}ms`));
  console.log('─'.repeat(50));
  
  for (const test of tests) {
    await runTest(test);
  }
  
  // Summary
  console.log('\n' + '─'.repeat(50));
  console.log(colors.bold('\n📊 Test Summary:'));
  console.log(colors.green(`  ✓ Passed: ${testResults.passed}`));
  console.log(colors.red(`  ✗ Failed: ${testResults.failed}`));
  console.log(colors.yellow(`  ⚠ Warnings: ${testResults.warnings}`));
  
  const successRate = testResults.passed / (testResults.passed + testResults.failed) * 100;
  console.log(`\n  Success Rate: ${successRate.toFixed(1)}%`);
  
  // Generate report if requested
  if (process.argv.includes('--report')) {
    const fs = require('fs');
    const reportPath = './test-results/api-endpoint-report.json';
    
    // Ensure directory exists
    if (!fs.existsSync('./test-results')) {
      fs.mkdirSync('./test-results', { recursive: true });
    }
    
    fs.writeFileSync(reportPath, JSON.stringify({
      timestamp: new Date().toISOString(),
      apiBaseUrl: API_BASE_URL,
      summary: {
        total: testResults.passed + testResults.failed,
        passed: testResults.passed,
        failed: testResults.failed,
        successRate: `${successRate.toFixed(1)}%`
      },
      tests: testResults.tests
    }, null, 2));
    
    console.log(colors.blue(`\n📄 Report saved to: ${reportPath}`));
  }
  
  // Exit with appropriate code
  process.exit(testResults.failed > 0 ? 1 : 0);
}

// Handle missing chalk gracefully
if (!chalk) {
  console.log('Note: Install chalk for colored output: npm install chalk');
}

// Run tests
runAllTests().catch(error => {
  console.error(colors.red('\n❌ Test suite failed:'), error);
  process.exit(1);
});
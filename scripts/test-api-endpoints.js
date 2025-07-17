#!/usr/bin/env node

/**
 * API Endpoint Testing Script
 * Tests all API endpoints to ensure they're working correctly
 */

const https = require('https');
const http = require('http');

// Configuration
const DEFAULT_BASE_URL = 'http://localhost:3000';
const TIMEOUT = 10000; // 10 seconds

// Test endpoints
const endpoints = [
  {
    name: 'Health Check',
    path: '/api/health?details=true',
    method: 'GET',
    expectedStatus: 200,
    expectedFields: ['status', 'timestamp', 'details']
  },
  {
    name: 'Chat Sessions',
    path: '/api/chat/sessions?page=1&limit=10&archived=false&order=desc',
    method: 'GET',
    expectedStatus: 200,
    expectedFields: ['success', 'sessions', 'pagination', 'stats']
  },
  {
    name: 'Chat Messages',
    path: '/api/chat/messages/session_1752783129668_4bqq7ltta?page=1&limit=20&order=desc',
    method: 'GET',
    expectedStatus: 200,
    expectedFields: ['success', 'session', 'messages', 'pagination']
  },
  {
    name: 'AI Memory Load',
    path: '/api/ai/memory/load?userId=anonymous&sessionId=session_1752783129668_4bqq7ltta',
    method: 'GET',
    expectedStatus: 200,
    expectedFields: ['success', 'memories', 'stats']
  },
  {
    name: 'AI Memory Load (No Session)',
    path: '/api/ai/memory/load?userId=anonymous',
    method: 'GET',
    expectedStatus: 200,
    expectedFields: ['success', 'memories', 'stats']
  },
  {
    name: 'Invalid Session ID (Should return 400)',
    path: '/api/chat/messages/xx?page=1&limit=20',
    method: 'GET',
    expectedStatus: 400,
    expectedFields: ['error']
  },
  {
    name: 'Missing userId (Should return 400)',
    path: '/api/ai/memory/load',
    method: 'GET',
    expectedStatus: 400,
    expectedFields: ['error']
  }
];

// Colors for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

function colorize(text, color) {
  return `${colors[color]}${text}${colors.reset}`;
}

// HTTP request helper
function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const isHttps = urlObj.protocol === 'https:';
    const client = isHttps ? https : http;
    
    const req = client.request(url, {
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'API-Test-Script/1.0',
        ...options.headers
      },
      timeout: TIMEOUT
    }, (res) => {
      let data = '';
      
      res.on('data', chunk => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const parsedData = JSON.parse(data);
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: parsedData
          });
        } catch (error) {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: data,
            parseError: error.message
          });
        }
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

// Test a single endpoint
async function testEndpoint(baseUrl, endpoint) {
  const url = baseUrl + endpoint.path;
  const startTime = Date.now();
  
  try {
    const response = await makeRequest(url, { method: endpoint.method });
    const duration = Date.now() - startTime;
    
    // Check status code
    const statusMatch = response.status === endpoint.expectedStatus;
    const statusText = statusMatch 
      ? colorize(`✓ ${response.status}`, 'green')
      : colorize(`✗ ${response.status} (expected ${endpoint.expectedStatus})`, 'red');
    
    // Check expected fields
    let fieldsMatch = true;
    let missingFields = [];
    
    if (endpoint.expectedFields && typeof response.data === 'object') {
      for (const field of endpoint.expectedFields) {
        if (!(field in response.data)) {
          fieldsMatch = false;
          missingFields.push(field);
        }
      }
    }
    
    const fieldsText = fieldsMatch
      ? colorize('✓ Fields OK', 'green')
      : colorize(`✗ Missing: ${missingFields.join(', ')}`, 'red');
    
    // Check response time
    const timeText = duration < 1000 
      ? colorize(`${duration}ms`, 'green')
      : duration < 3000
        ? colorize(`${duration}ms`, 'yellow')
        : colorize(`${duration}ms`, 'red');
    
    console.log(`  ${statusText} | ${fieldsText} | ${timeText}`);
    
    // Show data source if available
    if (response.headers['x-data-source']) {
      console.log(`    Data source: ${colorize(response.headers['x-data-source'], 'blue')}`);
    }
    
    // Show sample response for successful requests
    if (response.status === endpoint.expectedStatus && response.data) {
      if (response.data.success) {
        const keys = Object.keys(response.data).filter(k => k !== 'success');
        console.log(`    Response: ${colorize(keys.join(', '), 'blue')}`);
      } else if (response.data.error) {
        console.log(`    Error: ${colorize(response.data.error, 'yellow')}`);
      }
    }
    
    return {
      success: statusMatch && fieldsMatch,
      status: response.status,
      duration,
      dataSource: response.headers['x-data-source'],
      response: response.data
    };
    
  } catch (error) {
    console.log(`  ${colorize('✗ ERROR', 'red')} | ${error.message}`);
    return {
      success: false,
      error: error.message,
      duration: Date.now() - startTime
    };
  }
}

// Main test function
async function runTests(baseUrl = DEFAULT_BASE_URL) {
  console.log(colorize(`🧪 API Endpoint Testing`, 'bold'));
  console.log(colorize(`📍 Base URL: ${baseUrl}`, 'blue'));
  console.log('');
  
  const results = [];
  let passed = 0;
  let failed = 0;
  
  for (const endpoint of endpoints) {
    console.log(colorize(`Testing: ${endpoint.name}`, 'bold'));
    console.log(`  ${endpoint.method} ${endpoint.path}`);
    
    const result = await testEndpoint(baseUrl, endpoint);
    results.push({ endpoint: endpoint.name, ...result });
    
    if (result.success) {
      passed++;
    } else {
      failed++;
    }
    
    console.log('');
  }
  
  // Summary
  console.log(colorize('📊 Test Summary', 'bold'));
  console.log(`  ${colorize(`✓ Passed: ${passed}`, 'green')}`);
  console.log(`  ${colorize(`✗ Failed: ${failed}`, failed > 0 ? 'red' : 'green')}`);
  console.log(`  Total: ${passed + failed} tests`);
  
  if (failed > 0) {
    console.log('');
    console.log(colorize('❌ Failed Tests:', 'red'));
    results.filter(r => !r.success).forEach(r => {
      console.log(`  • ${r.endpoint}: ${r.error || 'Status/field mismatch'}`);
    });
  }
  
  // Data source summary
  const dataSources = results.filter(r => r.dataSource).map(r => r.dataSource);
  if (dataSources.length > 0) {
    console.log('');
    console.log(colorize('📡 Data Sources:', 'blue'));
    const sourceCount = dataSources.reduce((acc, source) => {
      acc[source] = (acc[source] || 0) + 1;
      return acc;
    }, {});
    
    Object.entries(sourceCount).forEach(([source, count]) => {
      console.log(`  • ${source}: ${count} endpoint${count > 1 ? 's' : ''}`);
    });
  }
  
  return { passed, failed, results };
}

// Command line interface
if (require.main === module) {
  const baseUrl = process.argv[2] || DEFAULT_BASE_URL;
  
  runTests(baseUrl).then(({ passed, failed }) => {
    process.exit(failed > 0 ? 1 : 0);
  }).catch(error => {
    console.error(colorize(`💥 Test runner error: ${error.message}`, 'red'));
    process.exit(1);
  });
}

module.exports = { runTests, testEndpoint, endpoints };
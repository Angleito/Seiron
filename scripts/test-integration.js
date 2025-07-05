#!/usr/bin/env node

/**
 * Integration test script for Vercel API endpoints
 * Tests both local development and deployed endpoints
 */

const https = require('https');
const http = require('http');

class VercelAPITester {
  constructor(baseUrl = 'http://localhost:3000') {
    this.baseUrl = baseUrl;
    this.testResults = [];
  }

  async runTests() {
    console.log('🧪 Starting Vercel API Integration Tests');
    console.log(`📍 Testing against: ${this.baseUrl}`);
    console.log('=' * 50);

    // Test suite
    await this.testOrchestrate();
    await this.testChat();
    await this.testErrorHandling();
    await this.testRateLimiting();

    // Results summary
    this.printResults();
  }

  async testOrchestrate() {
    console.log('\n🎯 Testing /api/orchestrate endpoint...');
    
    const testCases = [
      {
        name: 'Basic query',
        payload: {
          message: 'What is my portfolio worth?',
          sessionId: 'test-session-1'
        }
      },
      {
        name: 'Lending query',
        payload: {
          message: 'I want to lend 100 USDC',
          sessionId: 'test-session-2',
          walletAddress: '0x1234567890123456789012345678901234567890'
        }
      },
      {
        name: 'Portfolio query',
        payload: {
          message: 'Show me my positions',
          sessionId: 'test-session-3',
          walletAddress: '0x1234567890123456789012345678901234567890'
        }
      }
    ];

    for (const testCase of testCases) {
      try {
        const result = await this.makeRequest('/api/orchestrate', testCase.payload);
        
        if (result.message && result.agentType && result.metadata) {
          this.addResult('✅', `Orchestrate: ${testCase.name}`, 'PASS');
          console.log(`  ✅ ${testCase.name}: ${result.agentType} responded`);
        } else {
          this.addResult('❌', `Orchestrate: ${testCase.name}`, 'FAIL - Invalid response format');
          console.log(`  ❌ ${testCase.name}: Invalid response format`);
        }
      } catch (error) {
        this.addResult('❌', `Orchestrate: ${testCase.name}`, `FAIL - ${error.message}`);
        console.log(`  ❌ ${testCase.name}: ${error.message}`);
      }
    }
  }

  async testChat() {
    console.log('\n💬 Testing /api/chat endpoint...');
    
    try {
      const payload = {
        message: 'Hello Seiron, are you working?',
        sessionId: 'test-session-chat'
      };

      const result = await this.makeRequest('/api/chat', payload);
      
      // Chat endpoint returns a stream, so we expect different handling
      if (result || result === '') {
        this.addResult('✅', 'Chat: Basic streaming', 'PASS');
        console.log('  ✅ Chat streaming endpoint is responsive');
      } else {
        this.addResult('❌', 'Chat: Basic streaming', 'FAIL - No response');
        console.log('  ❌ Chat streaming endpoint not responding');
      }
    } catch (error) {
      this.addResult('❌', 'Chat: Basic streaming', `FAIL - ${error.message}`);
      console.log(`  ❌ Chat test failed: ${error.message}`);
    }
  }

  async testErrorHandling() {
    console.log('\n⚠️  Testing error handling...');
    
    const errorTests = [
      {
        name: 'Missing message',
        endpoint: '/api/orchestrate',
        payload: { sessionId: 'test' },
        expectedStatus: 400
      },
      {
        name: 'Missing sessionId',
        endpoint: '/api/orchestrate',
        payload: { message: 'test' },
        expectedStatus: 400
      },
      {
        name: 'Empty message',
        endpoint: '/api/orchestrate',
        payload: { message: '', sessionId: 'test' },
        expectedStatus: 400
      }
    ];

    for (const test of errorTests) {
      try {
        await this.makeRequest(test.endpoint, test.payload);
        this.addResult('❌', `Error: ${test.name}`, 'FAIL - Should have returned error');
        console.log(`  ❌ ${test.name}: Should have returned error`);
      } catch (error) {
        if (error.message.includes('400') || error.message.includes('Invalid')) {
          this.addResult('✅', `Error: ${test.name}`, 'PASS');
          console.log(`  ✅ ${test.name}: Properly rejected`);
        } else {
          this.addResult('❌', `Error: ${test.name}`, `FAIL - ${error.message}`);
          console.log(`  ❌ ${test.name}: ${error.message}`);
        }
      }
    }
  }

  async testRateLimiting() {
    console.log('\n🚦 Testing rate limiting (basic)...');
    
    try {
      // Make multiple rapid requests
      const requests = Array(5).fill().map(() => 
        this.makeRequest('/api/orchestrate', {
          message: 'rate limit test',
          sessionId: 'rate-test'
        })
      );

      const results = await Promise.allSettled(requests);
      const successful = results.filter(r => r.status === 'fulfilled').length;
      
      if (successful > 0) {
        this.addResult('✅', 'Rate limiting: Basic functionality', 'PASS');
        console.log(`  ✅ Rate limiting allows normal requests (${successful}/5 succeeded)`);
      } else {
        this.addResult('❌', 'Rate limiting: Basic functionality', 'FAIL - No requests succeeded');
        console.log('  ❌ All requests blocked - may be too restrictive');
      }
    } catch (error) {
      this.addResult('⚠️', 'Rate limiting: Basic functionality', `SKIP - ${error.message}`);
      console.log(`  ⚠️  Rate limiting test skipped: ${error.message}`);
    }
  }

  makeRequest(endpoint, payload) {
    return new Promise((resolve, reject) => {
      const url = new URL(endpoint, this.baseUrl);
      const isHttps = url.protocol === 'https:';
      const httpModule = isHttps ? https : http;
      
      const postData = JSON.stringify(payload);
      
      const options = {
        hostname: url.hostname,
        port: url.port || (isHttps ? 443 : 80),
        path: url.pathname,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData),
          'User-Agent': 'Seiron-Integration-Test/1.0'
        }
      };

      const req = httpModule.request(options, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            try {
              const parsed = JSON.parse(data);
              resolve(parsed);
            } catch (e) {
              // For streaming endpoints, we might get non-JSON data
              resolve(data);
            }
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${data}`));
          }
        });
      });

      req.on('error', (error) => {
        reject(error);
      });

      req.setTimeout(10000, () => {
        req.abort();
        reject(new Error('Request timeout'));
      });

      req.write(postData);
      req.end();
    });
  }

  addResult(status, test, result) {
    this.testResults.push({ status, test, result });
  }

  printResults() {
    console.log('\n' + '='.repeat(50));
    console.log('📊 Test Results Summary');
    console.log('='.repeat(50));
    
    const passed = this.testResults.filter(r => r.status === '✅').length;
    const failed = this.testResults.filter(r => r.status === '❌').length;
    const skipped = this.testResults.filter(r => r.status === '⚠️').length;
    
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`⚠️  Skipped: ${skipped}`);
    console.log(`📈 Success Rate: ${Math.round((passed / (passed + failed)) * 100)}%`);
    
    if (failed > 0) {
      console.log('\n❌ Failed Tests:');
      this.testResults
        .filter(r => r.status === '❌')
        .forEach(r => console.log(`  - ${r.test}: ${r.result}`));
    }
    
    console.log('\n🎯 Next Steps:');
    if (failed === 0) {
      console.log('✅ All tests passed! Your integration is ready.');
      console.log('🚀 Deploy with: vercel --prod');
    } else {
      console.log('❌ Some tests failed. Please check the errors above.');
      console.log('🔧 Fix issues and run tests again.');
    }
  }
}

// CLI usage
if (require.main === module) {
  const baseUrl = process.argv[2] || 'http://localhost:3000';
  const tester = new VercelAPITester(baseUrl);
  
  tester.runTests().catch(error => {
    console.error('❌ Test suite failed:', error.message);
    process.exit(1);
  });
}

module.exports = VercelAPITester;
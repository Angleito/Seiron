#!/usr/bin/env node

/**
 * Test runner for the 3D diagnostics script
 * 
 * This script tests the diagnostic functionality and validates it works correctly
 */

const { spawn } = require('child_process');
const fs = require('fs').promises;
const path = require('path');

class DiagnosticsTestRunner {
  constructor() {
    this.testResults = [];
    this.outputDir = './test-diagnosis-output';
  }

  async log(message, level = 'info') {
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${level.toUpperCase()}]`;
    console.log(`${prefix} ${message}`);
  }

  async setupTestEnvironment() {
    this.log('Setting up test environment...');
    
    try {
      await fs.mkdir(this.outputDir, { recursive: true });
      this.log(`Test output directory created: ${this.outputDir}`);
    } catch (error) {
      this.log(`Failed to create test directory: ${error.message}`, 'error');
      throw error;
    }
  }

  async runDiagnosticTest(testName, args = []) {
    this.log(`Running test: ${testName}`);
    
    return new Promise((resolve) => {
      const scriptPath = path.join(__dirname, 'diagnose-3d-loading.js');
      const fullArgs = [
        scriptPath,
        '--output', this.outputDir,
        '--timeout', '15000', // Shorter timeout for tests
        ...args
      ];

      const child = spawn('node', fullArgs, {
        stdio: ['pipe', 'pipe', 'pipe']
      });

      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      child.on('close', (code) => {
        const result = {
          testName,
          exitCode: code,
          stdout,
          stderr,
          success: code !== null,
          timestamp: new Date().toISOString()
        };

        this.testResults.push(result);
        
        if (result.success) {
          this.log(`✅ Test ${testName} completed with exit code: ${code}`);
        } else {
          this.log(`❌ Test ${testName} failed with exit code: ${code}`, 'error');
        }

        resolve(result);
      });

      child.on('error', (error) => {
        const result = {
          testName,
          exitCode: null,
          stdout,
          stderr: stderr + error.message,
          success: false,
          error: error.message,
          timestamp: new Date().toISOString()
        };

        this.testResults.push(result);
        this.log(`❌ Test ${testName} error: ${error.message}`, 'error');
        resolve(result);
      });

      // Give the test a reasonable timeout
      setTimeout(() => {
        if (!child.killed) {
          child.kill('SIGTERM');
          this.log(`⏰ Test ${testName} timed out`, 'warning');
        }
      }, 30000); // 30 second timeout
    });
  }

  async checkServerAvailability() {
    this.log('Checking if development server is available...');
    
    try {
      const http = require('http');
      
      return new Promise((resolve) => {
        const req = http.request({
          hostname: 'localhost',
          port: 3000,
          path: '/',
          method: 'GET',
          timeout: 5000
        }, (res) => {
          resolve({
            available: res.statusCode < 500,
            statusCode: res.statusCode
          });
        });

        req.on('error', () => {
          resolve({ available: false, error: 'Connection failed' });
        });

        req.on('timeout', () => {
          resolve({ available: false, error: 'Timeout' });
        });

        req.end();
      });
    } catch (error) {
      return { available: false, error: error.message };
    }
  }

  async runAllTests() {
    this.log('🧪 Starting diagnostic script tests...');

    try {
      await this.setupTestEnvironment();

      // Check if server is available
      const serverCheck = await this.checkServerAvailability();
      if (!serverCheck.available) {
        this.log(`⚠️  Development server not available: ${serverCheck.error}`, 'warning');
        this.log('Some tests may fail. Consider running `npm run dev` first.');
      } else {
        this.log(`✅ Development server available (HTTP ${serverCheck.statusCode})`);
      }

      // Test 1: Basic diagnostic run with fallback system
      await this.runDiagnosticTest('basic-diagnostic-fallback', [
        '--headless', 'true',
        '--verbose'
      ]);

      // Test 2: WebGL fallback specific test
      await this.runDiagnosticTest('webgl-fallback-test', [
        '--headless', 'true',
        '--screenshots',
        '--timeout', '20000'
      ]);

      // Test 3: DragonFallbackRenderer component test
      await this.runDiagnosticTest('dragon-fallback-renderer', [
        '--headless', 'true',
        '--verbose'
      ]);

      // Test 4: ASCII Dragon fallback validation
      await this.runDiagnosticTest('ascii-dragon-validation', [
        '--headless', 'true',
        '--verbose',
        '--timeout', '15000'
      ]);

      // Test 5: Canvas2D fallback test
      await this.runDiagnosticTest('canvas2d-fallback', [
        '--headless', 'true',
        '--screenshots'
      ]);

      // Test 6: ModelCacheService integration
      await this.runDiagnosticTest('model-cache-service', [
        '--headless', 'true',
        '--verbose'
      ]);

      // Test 7: Custom URL (should fail gracefully)
      await this.runDiagnosticTest('invalid-url-fallback', [
        '--url', 'http://localhost:9999',
        '--headless', 'true',
        '--timeout', '5000'
      ]);

      // Test 8: Help command
      await this.runDiagnosticTest('help-command', [
        '--help'
      ]);

      await this.generateTestReport();

    } catch (error) {
      this.log(`Test runner failed: ${error.message}`, 'error');
      throw error;
    }
  }

  async generateTestReport() {
    this.log('Generating test report...');

    const report = {
      timestamp: new Date().toISOString(),
      totalTests: this.testResults.length,
      passedTests: this.testResults.filter(r => r.success).length,
      failedTests: this.testResults.filter(r => !r.success).length,
      results: this.testResults
    };

    const reportPath = path.join(this.outputDir, 'test-report.json');
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));

    // Generate summary
    const summary = [
      '='.repeat(50),
      'DIAGNOSTIC SCRIPT TEST REPORT',
      '='.repeat(50),
      '',
      `Timestamp: ${report.timestamp}`,
      `Total Tests: ${report.totalTests}`,
      `Passed: ${report.passedTests}`,
      `Failed: ${report.failedTests}`,
      `Success Rate: ${((report.passedTests / report.totalTests) * 100).toFixed(1)}%`,
      '',
      'TEST DETAILS:',
      '-'.repeat(30)
    ];

    this.testResults.forEach((result, index) => {
      const status = result.success ? '✅ PASS' : '❌ FAIL';
      summary.push(`${index + 1}. ${result.testName}: ${status}`);
      
      if (!result.success && result.error) {
        summary.push(`   Error: ${result.error}`);
      }
      
      if (result.exitCode !== null) {
        summary.push(`   Exit Code: ${result.exitCode}`);
      }
      
      summary.push('');
    });

    const summaryPath = path.join(this.outputDir, 'test-summary.txt');
    await fs.writeFile(summaryPath, summary.join('\n'));

    // Output to console
    console.log('\n' + summary.join('\n'));

    this.log(`Test report saved to: ${reportPath}`);
    this.log(`Test summary saved to: ${summaryPath}`);

    return report;
  }
}

// CLI interface
async function main() {
  const testRunner = new DiagnosticsTestRunner();
  
  try {
    const report = await testRunner.runAllTests();
    
    if (report.failedTests === 0) {
      console.log('\n🎉 All tests passed!');
      process.exit(0);
    } else {
      console.log(`\n⚠️  ${report.failedTests} test(s) failed.`);
      process.exit(1);
    }
  } catch (error) {
    console.error(`\n💥 Test runner crashed: ${error.message}`);
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { DiagnosticsTestRunner };
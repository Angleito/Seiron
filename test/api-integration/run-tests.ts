#!/usr/bin/env node

/**
 * API Integration Test Runner
 * Orchestrates running all API integration tests with proper setup and reporting
 */

import { spawn } from 'child_process';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import chalk from 'chalk';

interface TestResult {
  suite: string;
  passed: boolean;
  duration: number;
  tests: {
    total: number;
    passed: number;
    failed: number;
    skipped: number;
  };
  errors: string[];
}

class APIIntegrationTestRunner {
  private results: TestResult[] = [];
  private startTime: number = Date.now();
  
  private testSuites = [
    {
      name: 'Environment Validation',
      file: 'env-validation.test.ts',
      critical: true,
    },
    {
      name: 'Health Check',
      file: 'health-check.test.ts',
      critical: true,
    },
    {
      name: 'Chat Endpoint',
      file: 'chat-endpoint.test.ts',
      critical: true,
    },
    {
      name: 'MCP Connectivity',
      file: 'mcp-connectivity.test.ts',
      critical: false,
    },
    {
      name: 'Authentication & Middleware',
      file: 'auth-middleware.test.ts',
      critical: false,
    },
    {
      name: 'Streaming Responses',
      file: 'streaming-response.test.ts',
      critical: false,
    },
    {
      name: 'Performance Benchmarks',
      file: 'performance-benchmark.test.ts',
      critical: false,
    },
  ];

  async run(): Promise<void> {
    console.log(chalk.bold.cyan('\n🚀 API Integration Test Suite\n'));
    
    // Check prerequisites
    await this.checkPrerequisites();
    
    // Create test results directory
    const resultsDir = join(process.cwd(), 'test-results', 'api-integration');
    if (!existsSync(resultsDir)) {
      mkdirSync(resultsDir, { recursive: true });
    }

    // Run each test suite
    for (const suite of this.testSuites) {
      await this.runTestSuite(suite);
    }

    // Generate summary report
    this.generateSummaryReport(resultsDir);
  }

  private async checkPrerequisites(): Promise<void> {
    console.log(chalk.yellow('Checking prerequisites...\n'));

    // Check if API is running
    try {
      const apiUrl = process.env.API_BASE_URL || 'http://localhost:3000/api';
      const response = await fetch(`${apiUrl}/health`);
      
      if (response.ok) {
        console.log(chalk.green('✅ API server is running'));
      } else {
        console.log(chalk.red('❌ API server returned error status'));
      }
    } catch (error) {
      console.log(chalk.red('❌ API server is not accessible'));
      console.log(chalk.yellow('   Make sure the API server is running before running tests'));
    }

    // Check environment variables
    const requiredEnvVars = ['OPENAI_API_KEY', 'ANTHROPIC_API_KEY'];
    const missingVars = requiredEnvVars.filter(v => !process.env[v]);
    
    if (missingVars.length > 0) {
      console.log(chalk.yellow(`⚠️  Missing environment variables: ${missingVars.join(', ')}`));
      console.log(chalk.yellow('   Some tests may be skipped'));
    } else {
      console.log(chalk.green('✅ All required environment variables are set'));
    }

    console.log('');
  }

  private runTestSuite(suite: { name: string; file: string; critical: boolean }): Promise<void> {
    return new Promise((resolve) => {
      const startTime = Date.now();
      console.log(chalk.bold(`\n📋 Running ${suite.name} tests...`));

      const testPath = join(process.cwd(), 'test', 'api-integration', suite.file);
      
      if (!existsSync(testPath)) {
        console.log(chalk.red(`❌ Test file not found: ${suite.file}`));
        this.results.push({
          suite: suite.name,
          passed: false,
          duration: 0,
          tests: { total: 0, passed: 0, failed: 0, skipped: 0 },
          errors: [`Test file not found: ${suite.file}`],
        });
        resolve();
        return;
      }

      const jest = spawn('npx', [
        'jest',
        testPath,
        '--verbose',
        '--no-cache',
        '--testTimeout=30000',
        '--json',
      ], {
        env: { ...process.env, NODE_ENV: 'test' },
        stdio: ['inherit', 'pipe', 'pipe'],
      });

      let output = '';
      let errorOutput = '';

      jest.stdout.on('data', (data) => {
        output += data.toString();
        process.stdout.write(data);
      });

      jest.stderr.on('data', (data) => {
        errorOutput += data.toString();
        process.stderr.write(data);
      });

      jest.on('close', (code) => {
        const duration = Date.now() - startTime;
        
        try {
          // Try to parse Jest JSON output
          const jsonMatch = output.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const results = JSON.parse(jsonMatch[0]);
            
            this.results.push({
              suite: suite.name,
              passed: results.success,
              duration,
              tests: {
                total: results.numTotalTests,
                passed: results.numPassedTests,
                failed: results.numFailedTests,
                skipped: results.numPendingTests,
              },
              errors: results.testResults?.[0]?.message ? [results.testResults[0].message] : [],
            });
          } else {
            // Fallback if JSON parsing fails
            this.results.push({
              suite: suite.name,
              passed: code === 0,
              duration,
              tests: { total: 0, passed: 0, failed: 0, skipped: 0 },
              errors: code !== 0 ? [errorOutput || 'Test failed'] : [],
            });
          }
        } catch (error) {
          // Error parsing results
          this.results.push({
            suite: suite.name,
            passed: code === 0,
            duration,
            tests: { total: 0, passed: 0, failed: 0, skipped: 0 },
            errors: [`Failed to parse test results: ${error}`],
          });
        }

        if (code === 0) {
          console.log(chalk.green(`✅ ${suite.name} tests passed (${(duration / 1000).toFixed(2)}s)`));
        } else {
          console.log(chalk.red(`❌ ${suite.name} tests failed (${(duration / 1000).toFixed(2)}s)`));
          
          if (suite.critical) {
            console.log(chalk.red('\n⛔ Critical test suite failed. Stopping test run.'));
            this.generateSummaryReport(join(process.cwd(), 'test-results', 'api-integration'));
            process.exit(1);
          }
        }

        resolve();
      });
    });
  }

  private generateSummaryReport(resultsDir: string): void {
    const totalDuration = Date.now() - this.startTime;
    
    console.log(chalk.bold.cyan('\n\n📊 Test Summary Report\n'));
    console.log('=' .repeat(80));

    // Overall statistics
    const totalTests = this.results.reduce((sum, r) => sum + r.tests.total, 0);
    const passedTests = this.results.reduce((sum, r) => sum + r.tests.passed, 0);
    const failedTests = this.results.reduce((sum, r) => sum + r.tests.failed, 0);
    const skippedTests = this.results.reduce((sum, r) => sum + r.tests.skipped, 0);
    const passedSuites = this.results.filter(r => r.passed).length;
    const totalSuites = this.results.length;

    console.log(chalk.bold('Overall Results:'));
    console.log(`  Test Suites: ${chalk.green(passedSuites)} passed, ${chalk.red(totalSuites - passedSuites)} failed, ${totalSuites} total`);
    console.log(`  Tests: ${chalk.green(passedTests)} passed, ${chalk.red(failedTests)} failed, ${chalk.yellow(skippedTests)} skipped, ${totalTests} total`);
    console.log(`  Duration: ${(totalDuration / 1000).toFixed(2)}s`);
    console.log('');

    // Detailed results
    console.log(chalk.bold('Suite Results:'));
    console.log('-'.repeat(80));
    
    this.results.forEach(result => {
      const status = result.passed ? chalk.green('PASS') : chalk.red('FAIL');
      const duration = `${(result.duration / 1000).toFixed(2)}s`;
      
      console.log(`${status} ${result.suite.padEnd(40)} ${duration.padStart(8)}`);
      
      if (result.tests.total > 0) {
        console.log(`     Tests: ${result.tests.passed}/${result.tests.total} passed`);
      }
      
      if (result.errors.length > 0) {
        result.errors.forEach(error => {
          console.log(chalk.red(`     Error: ${error}`));
        });
      }
    });

    console.log('-'.repeat(80));

    // Save JSON report
    const jsonReport = {
      timestamp: new Date().toISOString(),
      duration: totalDuration,
      summary: {
        suites: { total: totalSuites, passed: passedSuites, failed: totalSuites - passedSuites },
        tests: { total: totalTests, passed: passedTests, failed: failedTests, skipped: skippedTests },
      },
      results: this.results,
      environment: {
        nodeVersion: process.version,
        platform: process.platform,
        apiUrl: process.env.API_BASE_URL || 'http://localhost:3000/api',
        hasOpenAI: !!process.env.OPENAI_API_KEY,
        hasAnthropic: !!process.env.ANTHROPIC_API_KEY,
      },
    };

    const reportPath = join(resultsDir, `report-${Date.now()}.json`);
    writeFileSync(reportPath, JSON.stringify(jsonReport, null, 2));
    console.log(`\n📄 Detailed report saved to: ${reportPath}`);

    // Exit code based on results
    const allPassed = this.results.every(r => r.passed);
    
    if (allPassed) {
      console.log(chalk.bold.green('\n✅ All API integration tests passed! 🎉'));
      process.exit(0);
    } else {
      console.log(chalk.bold.red('\n❌ Some API integration tests failed.'));
      process.exit(1);
    }
  }
}

// Run the test suite
const runner = new APIIntegrationTestRunner();
runner.run().catch(error => {
  console.error(chalk.red('\n❌ Test runner encountered an error:'), error);
  process.exit(1);
});